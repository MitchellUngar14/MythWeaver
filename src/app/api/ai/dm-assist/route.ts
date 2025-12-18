import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { db } from '@/lib/db';
import { worlds, characters, gameSessions, actionLog } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

// POST /api/ai/dm-assist - AI DM assistant with streaming
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!session.user.isDm) {
      return new Response(JSON.stringify({ error: 'DM access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { message, worldId, conversationHistory = [] } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Gather context if worldId is provided
    let context = '';

    if (worldId) {
      // Get world details
      const world = await db.query.worlds.findFirst({
        where: eq(worlds.id, worldId),
        with: {
          members: {
            with: {
              character: true,
            },
          },
        },
      });

      if (world) {
        context += `\n\nWORLD: ${world.name}`;
        if (world.description) {
          context += `\nDescription: ${world.description}`;
        }

        // Add character summaries
        const partyCharacters = world.members
          .filter(m => m.character)
          .map(m => m.character!);

        if (partyCharacters.length > 0) {
          context += '\n\nPARTY MEMBERS:';
          for (const char of partyCharacters) {
            const stats = char.stats as any;
            context += `\n- ${char.name}: Level ${char.level} ${char.race || ''} ${char.class || ''}`;
            if (stats) {
              context += ` (HP: ${stats.hp}/${stats.maxHp}, AC: ${stats.ac})`;
            }
          }
        }

        // Get recent actions from the latest session
        const latestSession = await db.query.gameSessions.findFirst({
          where: eq(gameSessions.worldId, worldId),
          orderBy: desc(gameSessions.startedAt),
        });

        if (latestSession) {
          const recentActions = await db.query.actionLog.findMany({
            where: eq(actionLog.sessionId, latestSession.id),
            orderBy: desc(actionLog.createdAt),
            limit: 10,
          });

          if (recentActions.length > 0) {
            context += '\n\nRECENT ACTIONS:';
            for (const action of recentActions.reverse()) {
              context += `\n- ${action.actionType}: ${JSON.stringify(action.payload)}`;
            }
          }
        }
      }
    }

    // Build the system prompt
    const systemPrompt = `You are an experienced Dungeon Master assistant for a D&D 5e game.
You help the DM with storytelling, rulings, NPC dialogue, and encounter management.

Your responses should be:
- Flavorful and immersive when providing narrative content
- Clear and concise when giving rulings or advice
- In-character when generating NPC dialogue (use quotation marks)
- Practical and actionable when suggesting encounter tactics

When suggesting dice checks, include the DC and skill/ability.
When generating NPC dialogue, consider their personality and motivation.
Keep responses focused and not too long unless specifically asked for detail.
${context}`;

    // Build messages array
    const messages = [
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // Stream the response using Vercel AI SDK
    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI DM assist error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate response' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

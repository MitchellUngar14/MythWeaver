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


    const { message, worldId, context: customContext, conversationHistory = [] } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Gather context - use custom context if provided, or gather from worldId
    let context = customContext || '';

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

    // Build the system prompt with D&D 5e codex capabilities
    const systemPrompt = `You are an expert D&D 5e Dungeon Master assistant with comprehensive knowledge of the game.

## YOUR CAPABILITIES

### RULES & MECHANICS (D&D 5e Codex)
- **Spells**: Full details including casting time, range, components (V/S/M), duration, school, classes, and complete effect descriptions
- **Conditions**: All status conditions (Blinded, Charmed, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious, Exhaustion levels)
- **Combat Rules**: Actions, bonus actions, reactions, opportunity attacks, cover, difficult terrain, mounted combat, underwater combat
- **Ability Checks**: Skill applications, advantage/disadvantage, passive checks, contests
- **Saving Throws**: When they apply, DC calculations, effects on success/failure
- **Class Features**: All official class and subclass abilities
- **Monster Knowledge**: Stat blocks, CR calculations, legendary actions, lair actions

### CREATIVE ASSISTANCE
- Narrative scene descriptions with rich sensory detail
- NPC dialogue, personality, and motivations
- Encounter design, pacing, and tactical suggestions
- Story hooks, plot twists, and campaign ideas
- Environmental hazards and puzzle design
- Improvised rulings that maintain game balance

## RESPONSE GUIDELINES

**For Spell/Rules Lookups:**
- Provide accurate RAW (Rules As Written) information
- Use markdown formatting: **bold** for key terms, bullet points for lists
- Include relevant page references when helpful
- Mention common rulings or clarifications if applicable

**For Creative Content:**
- Be flavorful, immersive, and evocative
- Match the tone to the situation (dramatic, humorous, mysterious, etc.)
- Provide actionable content the DM can use immediately

**For Combat/Tactical Questions:**
- Consider the current initiative order and party composition
- Reference specific character abilities when relevant
- Suggest interesting tactical options, not just optimal ones

**General:**
- Keep responses focused unless detail is requested
- Use markdown headers and formatting for readability
- When uncertain, acknowledge it and provide options
${context ? `\n\n## CURRENT CONTEXT\n${context}` : ''}`;

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

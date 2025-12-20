import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { db } from '@/lib/db';
import { worlds, characters, gameSessions, actionLog } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

// Available AI models configuration
export const AI_MODELS = {
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    description: 'Fast and efficient',
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Previous generation',
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast and affordable',
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Most capable',
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'Powerful reasoning',
  },
  'claude-sonnet-4-20250514': {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    description: 'Balanced performance',
  },
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Fast and affordable',
  },
} as const;

export type ModelId = keyof typeof AI_MODELS;

// Get the AI model based on the model ID
function getModel(modelId: ModelId) {
  const config = AI_MODELS[modelId];
  if (!config) {
    // Default to gemini
    return google('gemini-2.5-flash');
  }

  switch (config.provider) {
    case 'openai':
      return openai(config.id);
    case 'anthropic':
      return anthropic(config.id);
    case 'google':
    default:
      return google(config.id);
  }
}

// Helper to check if an error is a rate limit error
function isRateLimitError(error: any): boolean {
  const errorString = JSON.stringify(error) + (error?.message || '') + (error?.cause?.message || '');
  return (
    error?.status === 429 ||
    errorString.includes('429') ||
    errorString.includes('RESOURCE_EXHAUSTED') ||
    errorString.includes('quota') ||
    errorString.includes('rate limit')
  );
}

// Helper to get a user-friendly error message
function getErrorMessage(error: any): string {
  if (isRateLimitError(error)) {
    return 'AI assistant is temporarily unavailable due to rate limits. Please try again in a minute.';
  }
  return error?.message || 'Failed to generate AI response';
}

// GET /api/ai/dm-assist - Get available models
export async function GET() {
  // Check which API keys are available
  const hasGoogleKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  // Filter models based on available API keys
  const models = Object.entries(AI_MODELS)
    .filter(([_, config]) => {
      if (config.provider === 'google') return hasGoogleKey;
      if (config.provider === 'openai') return hasOpenAIKey;
      if (config.provider === 'anthropic') return hasAnthropicKey;
      return false;
    })
    .map(([id, config]) => ({
      id,
      name: config.name,
      provider: config.provider,
      description: config.description,
    }));

  return new Response(JSON.stringify({
    models,
    availableProviders: {
      google: hasGoogleKey,
      openai: hasOpenAIKey,
      anthropic: hasAnthropicKey,
    }
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

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


    const { message, worldId, context: customContext, conversationHistory = [], model: requestedModel } = await req.json();

    // Get the selected model (default to gemini-2.5-flash)
    const modelId = (requestedModel && requestedModel in AI_MODELS) ? requestedModel as ModelId : 'gemini-2.5-flash';

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
    try {
      const result = streamText({
        model: getModel(modelId),
        system: systemPrompt,
        messages,
      });

      // Create a custom stream that handles errors
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.textStream) {
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.close();
          } catch (streamError: any) {
            console.error('Stream error:', streamError);
            const errorMessage = getErrorMessage(streamError);
            controller.enqueue(new TextEncoder().encode(`\n\n⚠️ ${errorMessage}`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    } catch (aiError: any) {
      console.error('AI SDK error:', aiError);
      return new Response(JSON.stringify({
        error: getErrorMessage(aiError)
      }), {
        status: isRateLimitError(aiError) ? 429 : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('AI DM assist outer error:', error);
    return new Response(JSON.stringify({
      error: getErrorMessage(error)
    }), {
      status: isRateLimitError(error) ? 429 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameSessions, sessionParticipants, characters, chatMessages } from '@/lib/schema';
import { restActionSchema } from '@/lib/validation';
import { eq, inArray } from 'drizzle-orm';
import { broadcastToSession, SessionEvents } from '@/lib/pusher-server';
import type { CharacterStats, SpellSlots } from '@/lib/schema';

// POST /api/sessions/[id]/rest - Initiate a short or long rest (DM only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const validation = restActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { type: restType } = validation.data;

    // Get session and verify DM
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: { world: true },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (gameSession.world.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Only the DM can initiate rests' }, { status: 403 });
    }

    if (!gameSession.isActive) {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
    }

    // Get all session participants with characters
    const participants = await db.query.sessionParticipants.findMany({
      where: eq(sessionParticipants.sessionId, id),
    });

    const characterIds = participants
      .map(p => p.characterId)
      .filter((cid): cid is string => cid !== null);

    let affectedCharacters: Array<{
      characterId: string;
      hp: number;
      maxHp: number;
      spellSlots: SpellSlots | null;
    }> = [];

    // For long rest, update all party member characters
    if (restType === 'long' && characterIds.length > 0) {
      // Fetch all characters
      const partyCharacters = await db.query.characters.findMany({
        where: inArray(characters.id, characterIds),
      });

      // Update each character
      for (const char of partyCharacters) {
        const stats = char.stats as CharacterStats;
        const updatedStats: CharacterStats = {
          ...stats,
          hp: stats.maxHp, // Restore HP to max
        };

        // Restore spell slots if character has spellcasting
        if (stats.spellcasting?.spellSlots) {
          const restoredSlots: SpellSlots = { ...stats.spellcasting.spellSlots };
          for (const key of Object.keys(restoredSlots) as (keyof SpellSlots)[]) {
            restoredSlots[key] = { ...restoredSlots[key], used: 0 };
          }
          updatedStats.spellcasting = {
            ...stats.spellcasting,
            spellSlots: restoredSlots,
          };
        }

        await db.update(characters)
          .set({ stats: updatedStats, updatedAt: new Date() })
          .where(eq(characters.id, char.id));

        affectedCharacters.push({
          characterId: char.id,
          hp: updatedStats.hp,
          maxHp: updatedStats.maxHp,
          spellSlots: updatedStats.spellcasting?.spellSlots || null,
        });
      }
    }

    // Create chat message
    const chatContent = restType === 'long'
      ? 'The party takes a Long Rest. After 8 hours of rest, everyone regains their full HP and spell slots.'
      : 'The party takes a Short Rest. After about 1 hour, the party is ready to continue.';

    const [message] = await db.insert(chatMessages)
      .values({
        sessionId: id,
        userId: session.user.id,
        content: chatContent,
      })
      .returning();

    // Broadcast chat message
    await broadcastToSession(id, SessionEvents.CHAT_MESSAGE, {
      id: message.id,
      oduserId: session.user.id,
      userName: session.user.name,
      content: chatContent,
      timestamp: message.createdAt,
    });

    // Broadcast rest completed event (for long rest, includes character updates)
    await broadcastToSession(id, SessionEvents.REST_COMPLETED, {
      restType,
      affectedCharacters,
    });

    return NextResponse.json({
      success: true,
      restType,
      affectedCharacters,
      chatMessage: {
        id: message.id,
        content: chatContent,
        timestamp: message.createdAt,
      },
    });
  } catch (error) {
    console.error('Error processing rest:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

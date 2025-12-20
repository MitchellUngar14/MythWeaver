import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  gameSessions, worlds, worldMembers, sessionParticipants,
  combatInstances, diceRolls, chatMessages, characters
} from '@/lib/schema';
import { updateSessionSchema } from '@/lib/validation';
import { eq, and, desc } from 'drizzle-orm';
import { broadcastToSession, SessionEvents } from '@/lib/pusher-server';

// GET /api/sessions/[id] - Get session details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get session with related data
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: {
        world: true,
        participants: {
          with: {
            user: true,
            character: true,
          },
        },
        combatInstances: true,
      },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check access (DM or world member)
    const isDm = gameSession.world.dmId === session.user.id;

    if (!isDm) {
      const membership = await db.query.worldMembers.findFirst({
        where: and(
          eq(worldMembers.worldId, gameSession.worldId),
          eq(worldMembers.userId, session.user.id)
        ),
      });

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get recent rolls
    const recentRolls = await db.query.diceRolls.findMany({
      where: eq(diceRolls.sessionId, id),
      orderBy: [desc(diceRolls.createdAt)],
      limit: 50,
    });

    // Get chat messages
    const messagesRaw = await db.query.chatMessages.findMany({
      where: eq(chatMessages.sessionId, id),
      orderBy: [desc(chatMessages.createdAt)],
      limit: 100,
      with: {
        user: true,
      },
    });

    // Transform messages to expected format
    const messages = messagesRaw.map(m => ({
      id: m.id,
      oduserId: m.userId,
      userName: m.user?.name || 'Unknown',
      content: m.content,
      timestamp: m.createdAt,
    }));

    // Get user's character in this world (for both DM and players)
    // DMs may also have characters in combat (e.g., NPCs they control or their own PC)
    let userCharacter = null;
    const membership = await db.query.worldMembers.findFirst({
      where: and(
        eq(worldMembers.worldId, gameSession.worldId),
        eq(worldMembers.userId, session.user.id)
      ),
      with: {
        character: true,
      },
    });
    userCharacter = membership?.character || null;

    // Filter active combatants, add type, and sort by initiative
    const activeCombatants = gameSession.combatInstances
      .filter(c => c.isActive)
      .map(c => ({
        ...c,
        // Infer type: if templateId exists, it's an enemy; otherwise it's a character
        type: c.templateId ? 'enemy' : 'character',
        characterId: c.characterId || undefined,
        showHpToPlayers: c.showHpToPlayers || false,
      }))
      .sort((a, b) => (b.position || 0) - (a.position || 0));

    return NextResponse.json({
      session: gameSession,
      participants: gameSession.participants,
      combatants: activeCombatants,
      recentRolls,
      chatMessages: messages.reverse(), // Oldest first for display
      isDm,
      userCharacter,
      worldName: gameSession.world.name,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/sessions/[id] - Update session (DM only)
export async function PATCH(
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
    const parsed = updateSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    // Get session and verify DM
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: { world: true },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (gameSession.world.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Only the DM can update sessions' }, { status: 403 });
    }

    // Update session
    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.isActive === false) {
      updateData.endedAt = new Date();
    }

    const [updated] = await db.update(gameSessions)
      .set(updateData)
      .where(eq(gameSessions.id, id))
      .returning();

    // If session ended, broadcast to participants
    if (parsed.data.isActive === false) {
      await broadcastToSession(id, SessionEvents.SESSION_ENDED, {});
    }

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sessions/[id] - End session (DM only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get session and verify DM
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: { world: true },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (gameSession.world.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Only the DM can end sessions' }, { status: 403 });
    }

    // End the session (don't delete, preserve history)
    await db.update(gameSessions)
      .set({ isActive: false, endedAt: new Date() })
      .where(eq(gameSessions.id, id));

    // Broadcast session ended
    await broadcastToSession(id, SessionEvents.SESSION_ENDED, {});

    return NextResponse.json({ message: 'Session ended' });
  } catch (error) {
    console.error('Error ending session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

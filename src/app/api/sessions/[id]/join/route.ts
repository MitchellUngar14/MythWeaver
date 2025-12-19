import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameSessions, worlds, worldMembers, sessionParticipants } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { broadcastToSession, SessionEvents } from '@/lib/pusher-server';

// POST /api/sessions/[id]/join - Join an active session
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

    // Get session
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: { world: true },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!gameSession.isActive) {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
    }

    // Check if user is DM or member of the world
    const isDm = gameSession.world.dmId === session.user.id;

    let characterId: string | null = null;
    let characterName: string | null = null;

    if (!isDm) {
      const membership = await db.query.worldMembers.findFirst({
        where: and(
          eq(worldMembers.worldId, gameSession.worldId),
          eq(worldMembers.userId, session.user.id)
        ),
        with: { character: true },
      });

      if (!membership) {
        return NextResponse.json({ error: 'You are not a member of this world' }, { status: 403 });
      }

      characterId = membership.characterId;
      characterName = membership.character?.name || null;
    }

    // Check if already a participant
    const existingParticipant = await db.query.sessionParticipants.findFirst({
      where: and(
        eq(sessionParticipants.sessionId, id),
        eq(sessionParticipants.userId, session.user.id)
      ),
    });

    let participant;

    if (existingParticipant) {
      // Update existing participant to online
      [participant] = await db.update(sessionParticipants)
        .set({ isOnline: true, leftAt: null })
        .where(eq(sessionParticipants.id, existingParticipant.id))
        .returning();
    } else {
      // Create new participant
      [participant] = await db.insert(sessionParticipants)
        .values({
          sessionId: id,
          userId: session.user.id,
          characterId,
          isOnline: true,
        })
        .returning();
    }

    // Broadcast to other participants
    await broadcastToSession(id, SessionEvents.PARTICIPANT_JOINED, {
      odparticipantId: participant.id,
      oduserId: session.user.id,
      userName: session.user.name,
      characterName,
    });

    return NextResponse.json({
      participant: {
        id: participant.id,
        oduserId: session.user.id,
        characterId,
        characterName,
      },
      message: 'Joined session successfully'
    });
  } catch (error) {
    console.error('Error joining session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sessions/[id]/join - Leave session
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

    // Update participant to offline
    const [participant] = await db.update(sessionParticipants)
      .set({ isOnline: false, leftAt: new Date() })
      .where(and(
        eq(sessionParticipants.sessionId, id),
        eq(sessionParticipants.userId, session.user.id)
      ))
      .returning();

    if (participant) {
      await broadcastToSession(id, SessionEvents.PARTICIPANT_LEFT, {
        odparticipantId: participant.id,
        oduserId: session.user.id,
      });
    }

    return NextResponse.json({ message: 'Left session' });
  } catch (error) {
    console.error('Error leaving session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

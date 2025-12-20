import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameSessions, combatInstances } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { broadcastToSession, SessionEvents } from '@/lib/pusher-server';
import { DEFAULT_ACTION_ECONOMY } from '@/lib/combat-actions';

// POST /api/sessions/[id]/combat/turn - Advance turn (DM only)
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
    const { currentTurn, round } = body;

    if (!currentTurn || typeof round !== 'number') {
      return NextResponse.json({ error: 'currentTurn and round are required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Only the DM can advance turns' }, { status: 403 });
    }

    // Persist turn state to database
    await db.update(gameSessions)
      .set({ currentTurnId: currentTurn, combatRound: round })
      .where(eq(gameSessions.id, id));

    // Reset action economy for the new current combatant
    await db.update(combatInstances)
      .set({ actionEconomy: { ...DEFAULT_ACTION_ECONOMY } })
      .where(eq(combatInstances.id, currentTurn));

    // Broadcast turn advancement to all participants
    await broadcastToSession(id, SessionEvents.TURN_ADVANCED, {
      currentTurn,
      round,
    });

    return NextResponse.json({ currentTurn, round });
  } catch (error) {
    console.error('Error advancing turn:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

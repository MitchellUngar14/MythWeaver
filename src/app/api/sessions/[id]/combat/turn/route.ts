import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameSessions } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { broadcastToSession, SessionEvents } from '@/lib/pusher-server';

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

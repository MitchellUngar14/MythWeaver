import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameSessions, worlds, diceRolls, worldMembers, sessionParticipants } from '@/lib/schema';
import { sessionRollSchema } from '@/lib/validation';
import { eq, and, desc } from 'drizzle-orm';
import { broadcastToSession, SessionEvents } from '@/lib/pusher-server';
import { rollDiceNotation } from '@/lib/utils';

// GET /api/sessions/[id]/rolls - Get recent rolls
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

    // Verify access
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: { world: true },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

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
    const rolls = await db.query.diceRolls.findMany({
      where: eq(diceRolls.sessionId, id),
      orderBy: [desc(diceRolls.createdAt)],
      limit: 50,
    });

    return NextResponse.json({ rolls });
  } catch (error) {
    console.error('Error fetching rolls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sessions/[id]/rolls - Submit a dice roll
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
    const parsed = sessionRollSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { dice, context } = parsed.data;

    // Verify session exists and user has access
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

    // Verify user is a participant
    const participant = await db.query.sessionParticipants.findFirst({
      where: and(
        eq(sessionParticipants.sessionId, id),
        eq(sessionParticipants.userId, session.user.id)
      ),
    });

    if (!participant) {
      return NextResponse.json({ error: 'You must join the session first' }, { status: 403 });
    }

    // Roll the dice
    const result = rollDiceNotation(dice);

    if (!result) {
      return NextResponse.json({ error: 'Invalid dice notation' }, { status: 400 });
    }

    // Save to database
    const [roll] = await db.insert(diceRolls)
      .values({
        sessionId: id,
        userId: session.user.id,
        rollType: 'custom',
        dice,
        results: result.rolls,
        total: result.total,
        context,
      })
      .returning();

    // Broadcast to session
    await broadcastToSession(id, SessionEvents.ROLL_MADE, {
      id: roll.id,
      oduserId: session.user.id,
      userName: session.user.name,
      dice,
      rolls: result.rolls,
      total: result.total,
      context,
      timestamp: roll.createdAt,
    });

    return NextResponse.json({
      roll: {
        id: roll.id,
        dice,
        rolls: result.rolls,
        total: result.total,
        context,
        createdAt: roll.createdAt,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting roll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

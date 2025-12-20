import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameSessions } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { broadcastToSession, SessionEvents } from '@/lib/pusher-server';
import { updateSessionLocationSchema } from '@/lib/validation';

// POST /api/sessions/[id]/location - Update session location (DM only)
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

    const validation = updateSessionLocationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { currentLocation, currentLocationResourceId } = validation.data;

    // Get session and verify DM
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: { world: true },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (gameSession.world.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Only the DM can change location' }, { status: 403 });
    }

    // Update location in database
    await db.update(gameSessions)
      .set({
        currentLocation,
        currentLocationResourceId: currentLocationResourceId || null,
      })
      .where(eq(gameSessions.id, id));

    // Broadcast location change to all participants
    await broadcastToSession(id, SessionEvents.LOCATION_CHANGED, {
      currentLocation,
      currentLocationResourceId,
    });

    return NextResponse.json({
      currentLocation,
      currentLocationResourceId,
    });
  } catch (error) {
    console.error('Error updating session location:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/sessions/[id]/location - Get current session location
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

    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: {
        currentLocationResource: true,
      },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      currentLocation: gameSession.currentLocation,
      currentLocationResourceId: gameSession.currentLocationResourceId,
      locationResource: gameSession.currentLocationResource,
    });
  } catch (error) {
    console.error('Error fetching session location:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

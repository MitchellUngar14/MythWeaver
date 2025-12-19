import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameSessions, worlds, worldMembers, sessionParticipants, users } from '@/lib/schema';
import { createSessionSchema } from '@/lib/validation';
import { eq, and, desc } from 'drizzle-orm';
import { broadcastToSession, SessionEvents } from '@/lib/pusher-server';

// GET /api/sessions - List sessions for a world (query param: worldId)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const worldId = searchParams.get('worldId');

    if (!worldId) {
      return NextResponse.json({ error: 'worldId is required' }, { status: 400 });
    }

    // Check if user has access to this world (DM or member)
    const world = await db.query.worlds.findFirst({
      where: eq(worlds.id, worldId),
    });

    if (!world) {
      return NextResponse.json({ error: 'World not found' }, { status: 404 });
    }

    const isDm = world.dmId === session.user.id;

    if (!isDm) {
      const membership = await db.query.worldMembers.findFirst({
        where: and(
          eq(worldMembers.worldId, worldId),
          eq(worldMembers.userId, session.user.id)
        ),
      });

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get sessions for this world
    const sessions = await db.query.gameSessions.findMany({
      where: eq(gameSessions.worldId, worldId),
      orderBy: [desc(gameSessions.startedAt)],
      with: {
        participants: {
          with: {
            user: true,
            character: true,
          },
        },
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sessions - Create a new session (DM only)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { name, worldId } = parsed.data;

    // Verify user is DM of this world
    const world = await db.query.worlds.findFirst({
      where: eq(worlds.id, worldId),
    });

    if (!world) {
      return NextResponse.json({ error: 'World not found' }, { status: 404 });
    }

    if (world.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Only the DM can create sessions' }, { status: 403 });
    }

    // End any active sessions for this world
    await db.update(gameSessions)
      .set({ isActive: false, endedAt: new Date() })
      .where(and(
        eq(gameSessions.worldId, worldId),
        eq(gameSessions.isActive, true)
      ));

    // Get session count for this world to determine session number
    const existingSessions = await db.query.gameSessions.findMany({
      where: eq(gameSessions.worldId, worldId),
    });

    // Create new session
    const [newSession] = await db.insert(gameSessions)
      .values({
        name,
        worldId,
        sessionNumber: existingSessions.length + 1,
        isActive: true,
        startedAt: new Date(),
      })
      .returning();

    // Auto-join the DM as a participant
    await db.insert(sessionParticipants)
      .values({
        sessionId: newSession.id,
        userId: session.user.id,
        isOnline: true,
      });

    return NextResponse.json({
      session: newSession,
      message: 'Session created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

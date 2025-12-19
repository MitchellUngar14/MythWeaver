import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher-server';
import { db } from '@/lib/db';
import { gameSessions, worlds, worldMembers, sessionParticipants } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/pusher/auth - Authenticate private channel subscriptions
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!pusherServer) {
      return NextResponse.json({ error: 'Pusher not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const socketId = formData.get('socket_id') as string;
    const channel = formData.get('channel_name') as string;

    if (!socketId || !channel) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
    }

    // Parse channel name to get session ID
    // Format: private-session-{sessionId}
    const match = channel.match(/^private-session-(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid channel format' }, { status: 400 });
    }

    const sessionId = match[1];

    // Verify user has access to this session
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, sessionId),
      with: { world: true },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const isDm = gameSession.world.dmId === session.user.id;

    if (!isDm) {
      // Check if user is a world member
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

    // Generate auth response
    const authResponse = pusherServer.authorizeChannel(socketId, channel, {
      user_id: session.user.id,
      user_info: {
        name: session.user.name,
        isDm,
      },
    });

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Error authenticating Pusher channel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

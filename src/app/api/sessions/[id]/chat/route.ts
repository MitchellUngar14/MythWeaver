import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameSessions, worlds, chatMessages, worldMembers, sessionParticipants } from '@/lib/schema';
import { chatMessageSchema } from '@/lib/validation';
import { eq, and, desc } from 'drizzle-orm';
import { broadcastToSession, SessionEvents } from '@/lib/pusher-server';

// GET /api/sessions/[id]/chat - Get chat history
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

    // Get chat messages
    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.sessionId, id),
      orderBy: [desc(chatMessages.createdAt)],
      limit: 100,
      with: {
        user: true,
      },
    });

    // Return oldest first for display
    return NextResponse.json({
      messages: messages.reverse().map(m => ({
        id: m.id,
        oduserId: m.userId,
        userName: m.user?.name || 'Unknown',
        content: m.content,
        timestamp: m.createdAt,
      }))
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sessions/[id]/chat - Send a message
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
    const parsed = chatMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { content } = parsed.data;

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

    // Save message
    const [message] = await db.insert(chatMessages)
      .values({
        sessionId: id,
        userId: session.user.id,
        content,
      })
      .returning();

    // Broadcast to session
    await broadcastToSession(id, SessionEvents.CHAT_MESSAGE, {
      id: message.id,
      oduserId: session.user.id,
      userName: session.user.name,
      content,
      timestamp: message.createdAt,
    });

    return NextResponse.json({
      message: {
        id: message.id,
        content,
        timestamp: message.createdAt,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { worlds } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { generateRoomKey } from '@/lib/utils';

// GET /api/worlds/[id] - Get world details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const world = await db.query.worlds.findFirst({
      where: eq(worlds.id, id),
      with: {
        members: {
          with: {
            user: true,
            character: true,
          },
        },
        sessions: {
          orderBy: (sessions, { desc }) => [desc(sessions.startedAt)],
          limit: 10,
        },
      },
    });

    if (!world) {
      return NextResponse.json({ error: 'World not found' }, { status: 404 });
    }

    // Check if user is DM or member
    const isDm = world.dmId === session.user.id;
    const isMember = world.members.some(m => m.userId === session.user.id);

    if (!isDm && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If not DM, limit what data is returned
    if (!isDm) {
      return NextResponse.json({
        world: {
          id: world.id,
          name: world.name,
          description: world.description,
          members: world.members.map(m => ({
            id: m.id,
            user: { id: m.user.id, name: m.user.name },
            character: m.character ? {
              id: m.character.id,
              name: m.character.name,
              class: m.character.class,
              race: m.character.race,
              level: m.character.level,
            } : null,
          })),
        },
      });
    }

    return NextResponse.json({ world });
  } catch (error) {
    console.error('Error fetching world:', error);
    return NextResponse.json({ error: 'Failed to fetch world' }, { status: 500 });
  }
}

// PATCH /api/worlds/[id] - Update world settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check ownership
    const world = await db.query.worlds.findFirst({
      where: and(eq(worlds.id, id), eq(worlds.dmId, session.user.id)),
    });

    if (!world) {
      return NextResponse.json({ error: 'World not found or access denied' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, settings, isActive } = body;

    const [updated] = await db.update(worlds)
      .set({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(settings && { settings }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(eq(worlds.id, id))
      .returning();

    return NextResponse.json({ world: updated });
  } catch (error) {
    console.error('Error updating world:', error);
    return NextResponse.json({ error: 'Failed to update world' }, { status: 500 });
  }
}

// DELETE /api/worlds/[id] - Delete a world
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check ownership
    const world = await db.query.worlds.findFirst({
      where: and(eq(worlds.id, id), eq(worlds.dmId, session.user.id)),
    });

    if (!world) {
      return NextResponse.json({ error: 'World not found or access denied' }, { status: 404 });
    }

    await db.delete(worlds).where(eq(worlds.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting world:', error);
    return NextResponse.json({ error: 'Failed to delete world' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { worlds, worldResources, worldMembers } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/worlds/[id]/resources - Get world resources (optionally filtered by type)
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
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'location', 'npc', 'lore', etc.

    // Check if user has access to this world (DM or member)
    const world = await db.query.worlds.findFirst({
      where: eq(worlds.id, id),
    });

    if (!world) {
      return NextResponse.json({ error: 'World not found' }, { status: 404 });
    }

    const isDm = world.dmId === session.user.id;

    if (!isDm) {
      // Check if user is a member
      const membership = await db.query.worldMembers.findFirst({
        where: and(
          eq(worldMembers.worldId, id),
          eq(worldMembers.userId, session.user.id)
        ),
      });

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Build query conditions
    const conditions = [eq(worldResources.worldId, id)];
    if (type) {
      conditions.push(eq(worldResources.type, type));
    }

    // For non-DMs, only show player-visible resources
    if (!isDm) {
      conditions.push(eq(worldResources.isPlayerVisible, true));
    }

    const resources = await db.query.worldResources.findMany({
      where: and(...conditions),
      orderBy: (res, { asc }) => [asc(res.name)],
    });

    return NextResponse.json({ resources });
  } catch (error) {
    console.error('Error fetching world resources:', error);
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
  }
}

// POST /api/worlds/[id]/resources - Create a new resource (DM only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if user is DM of this world
    const world = await db.query.worlds.findFirst({
      where: and(eq(worlds.id, id), eq(worlds.dmId, session.user.id)),
    });

    if (!world) {
      return NextResponse.json({ error: 'World not found or access denied' }, { status: 404 });
    }

    const body = await req.json();
    const { type, name, description, data, isPlayerVisible, parentId } = body;

    if (!type || !name) {
      return NextResponse.json({ error: 'Type and name are required' }, { status: 400 });
    }

    const [resource] = await db.insert(worldResources)
      .values({
        worldId: id,
        parentId: parentId || null,
        type,
        name,
        description: description || null,
        data: data || {},
        isPlayerVisible: isPlayerVisible ?? false,
      })
      .returning();

    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    console.error('Error creating world resource:', error);
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
  }
}

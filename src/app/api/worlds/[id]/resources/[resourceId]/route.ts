import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { worlds, worldResources } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/worlds/[id]/resources/[resourceId] - Get a single resource
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, resourceId } = await params;

    // Check if user is DM of this world
    const world = await db.query.worlds.findFirst({
      where: eq(worlds.id, id),
    });

    if (!world) {
      return NextResponse.json({ error: 'World not found' }, { status: 404 });
    }

    if (world.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const resource = await db.query.worldResources.findFirst({
      where: and(
        eq(worldResources.id, resourceId),
        eq(worldResources.worldId, id)
      ),
      with: {
        parent: true,
        children: true,
      },
    });

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ resource });
  } catch (error) {
    console.error('Error fetching resource:', error);
    return NextResponse.json({ error: 'Failed to fetch resource' }, { status: 500 });
  }
}

// PATCH /api/worlds/[id]/resources/[resourceId] - Update a resource
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, resourceId } = await params;

    // Check if user is DM of this world
    const world = await db.query.worlds.findFirst({
      where: and(eq(worlds.id, id), eq(worlds.dmId, session.user.id)),
    });

    if (!world) {
      return NextResponse.json({ error: 'World not found or access denied' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, data, isPlayerVisible, parentId } = body;

    // Prevent circular references
    if (parentId === resourceId) {
      return NextResponse.json({ error: 'A location cannot be its own parent' }, { status: 400 });
    }

    const [updated] = await db.update(worldResources)
      .set({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(data !== undefined && { data }),
        ...(isPlayerVisible !== undefined && { isPlayerVisible }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        updatedAt: new Date(),
      })
      .where(and(
        eq(worldResources.id, resourceId),
        eq(worldResources.worldId, id)
      ))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ resource: updated });
  } catch (error) {
    console.error('Error updating resource:', error);
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
  }
}

// DELETE /api/worlds/[id]/resources/[resourceId] - Delete a resource
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, resourceId } = await params;

    // Check if user is DM of this world
    const world = await db.query.worlds.findFirst({
      where: and(eq(worlds.id, id), eq(worlds.dmId, session.user.id)),
    });

    if (!world) {
      return NextResponse.json({ error: 'World not found or access denied' }, { status: 404 });
    }

    // Clear parent references from children before deleting
    await db.update(worldResources)
      .set({ parentId: null })
      .where(eq(worldResources.parentId, resourceId));

    await db.delete(worldResources)
      .where(and(
        eq(worldResources.id, resourceId),
        eq(worldResources.worldId, id)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting resource:', error);
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
  }
}

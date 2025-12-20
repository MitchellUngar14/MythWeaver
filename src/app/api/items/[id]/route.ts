import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { updateItemSchema } from '@/lib/validation';

// GET /api/items/[id] - Get a single item
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const item = await db.query.items.findFirst({
      where: eq(items.id, id),
      with: {
        world: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }
}

// PATCH /api/items/[id] - Update an item
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isDm) {
      return NextResponse.json({ error: 'DM access required' }, { status: 403 });
    }

    // Verify ownership
    const existingItem = await db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.dmId, session.user.id)),
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }

    const body = await req.json();
    const validation = updateItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const data = validation.data;

    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.type !== undefined) updates.type = data.type;
    if (data.rarity !== undefined) updates.rarity = data.rarity;
    if (data.weight !== undefined) updates.weight = data.weight;
    if (data.value !== undefined) updates.value = data.value;
    if (data.properties !== undefined) updates.properties = data.properties;
    if (data.requiresAttunement !== undefined) updates.requiresAttunement = data.requiresAttunement;

    const [updatedItem] = await db.update(items)
      .set(updates)
      .where(eq(items.id, id))
      .returning();

    return NextResponse.json({ item: updatedItem });
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// DELETE /api/items/[id] - Delete an item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isDm) {
      return NextResponse.json({ error: 'DM access required' }, { status: 403 });
    }

    // Verify ownership
    const existingItem = await db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.dmId, session.user.id)),
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }

    await db.delete(items).where(eq(items.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}

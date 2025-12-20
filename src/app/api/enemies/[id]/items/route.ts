import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enemyItems, enemyTemplates, items } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { addEnemyItemSchema, updateEnemyItemSchema } from '@/lib/validation';

// GET /api/enemies/[id]/items - Get enemy template's inventory
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

    // Only DMs can view enemy inventories
    if (!session.user.isDm) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify enemy template exists and belongs to DM
    const template = await db.query.enemyTemplates.findFirst({
      where: eq(enemyTemplates.id, id),
    });

    if (!template) {
      return NextResponse.json({ error: 'Enemy template not found' }, { status: 404 });
    }

    if (template.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const inventory = await db.query.enemyItems.findMany({
      where: eq(enemyItems.templateId, id),
      with: {
        item: true,
      },
    });

    return NextResponse.json({ items: inventory });
  } catch (error) {
    console.error('Error fetching enemy items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

// POST /api/enemies/[id]/items - Add item to enemy template inventory
export async function POST(
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
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify enemy template exists and belongs to DM
    const template = await db.query.enemyTemplates.findFirst({
      where: eq(enemyTemplates.id, id),
    });

    if (!template) {
      return NextResponse.json({ error: 'Enemy template not found' }, { status: 404 });
    }

    if (template.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const validation = addEnemyItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { itemId, quantity, equipped } = validation.data;

    // Verify item exists and belongs to same world
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.worldId !== template.worldId) {
      return NextResponse.json({ error: 'Item must be from the same world' }, { status: 400 });
    }

    // Check if enemy already has this item
    const existingItem = await db.query.enemyItems.findFirst({
      where: and(
        eq(enemyItems.templateId, id),
        eq(enemyItems.itemId, itemId)
      ),
    });

    if (existingItem) {
      // Update quantity
      const [updated] = await db.update(enemyItems)
        .set({ quantity: existingItem.quantity + quantity })
        .where(eq(enemyItems.id, existingItem.id))
        .returning();

      return NextResponse.json({
        enemyItem: updated,
        item,
      });
    }

    // Add new item to inventory
    const [newEnemyItem] = await db.insert(enemyItems).values({
      templateId: id,
      itemId,
      quantity,
      equipped,
    }).returning();

    return NextResponse.json({
      enemyItem: newEnemyItem,
      item,
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding item to enemy:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}

// PATCH /api/enemies/[id]/items - Update enemy item
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
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const template = await db.query.enemyTemplates.findFirst({
      where: eq(enemyTemplates.id, id),
    });

    if (!template) {
      return NextResponse.json({ error: 'Enemy template not found' }, { status: 404 });
    }

    if (template.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { enemyItemId, ...updateData } = body;

    if (!enemyItemId) {
      return NextResponse.json({ error: 'enemyItemId is required' }, { status: 400 });
    }

    const validation = updateEnemyItemSchema.safeParse(updateData);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const existingItem = await db.query.enemyItems.findFirst({
      where: and(
        eq(enemyItems.id, enemyItemId),
        eq(enemyItems.templateId, id)
      ),
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not in inventory' }, { status: 404 });
    }

    const data = validation.data;

    // If quantity is 0, remove the item
    if (data.quantity === 0) {
      await db.delete(enemyItems).where(eq(enemyItems.id, enemyItemId));
      return NextResponse.json({ deleted: true });
    }

    const updates: Record<string, unknown> = {};
    if (data.quantity !== undefined) updates.quantity = data.quantity;
    if (data.equipped !== undefined) updates.equipped = data.equipped;

    const [updated] = await db.update(enemyItems)
      .set(updates)
      .where(eq(enemyItems.id, enemyItemId))
      .returning();

    return NextResponse.json({ enemyItem: updated });
  } catch (error) {
    console.error('Error updating enemy item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// DELETE /api/enemies/[id]/items - Remove item from enemy inventory
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
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const template = await db.query.enemyTemplates.findFirst({
      where: eq(enemyTemplates.id, id),
    });

    if (!template) {
      return NextResponse.json({ error: 'Enemy template not found' }, { status: 404 });
    }

    if (template.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const enemyItemId = searchParams.get('enemyItemId');

    if (!enemyItemId) {
      return NextResponse.json({ error: 'enemyItemId is required' }, { status: 400 });
    }

    await db.delete(enemyItems).where(
      and(
        eq(enemyItems.id, enemyItemId),
        eq(enemyItems.templateId, id)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing item:', error);
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
  }
}

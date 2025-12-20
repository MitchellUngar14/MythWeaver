import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { characterItems, characters, items } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { addCharacterItemSchema, updateCharacterItemSchema } from '@/lib/validation';

// GET /api/characters/[id]/items - Get character's inventory
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

    // Verify access to character
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, id),
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Only owner or DM can view
    if (character.userId !== session.user.id && !session.user.isDm) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const inventory = await db.query.characterItems.findMany({
      where: eq(characterItems.characterId, id),
      with: {
        item: true,
      },
      orderBy: (ci, { asc }) => [asc(ci.acquiredAt)],
    });

    return NextResponse.json({ items: inventory });
  } catch (error) {
    console.error('Error fetching character items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

// POST /api/characters/[id]/items - Add item to character inventory
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

    // Verify character exists and user has access
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, id),
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Only owner or DM can add items
    if (character.userId !== session.user.id && !session.user.isDm) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const validation = addCharacterItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { itemId, quantity, equipped, attuned, notes } = validation.data;

    // Verify item exists
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check if character already has this item
    const existingItem = await db.query.characterItems.findFirst({
      where: and(
        eq(characterItems.characterId, id),
        eq(characterItems.itemId, itemId)
      ),
    });

    if (existingItem) {
      // Update quantity
      const [updated] = await db.update(characterItems)
        .set({ quantity: existingItem.quantity + quantity })
        .where(eq(characterItems.id, existingItem.id))
        .returning();

      return NextResponse.json({
        characterItem: updated,
        item,
      });
    }

    // Add new item to inventory
    const [newCharacterItem] = await db.insert(characterItems).values({
      characterId: id,
      itemId,
      quantity,
      equipped,
      attuned,
      notes,
    }).returning();

    return NextResponse.json({
      characterItem: newCharacterItem,
      item,
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding item to character:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}

// PATCH /api/characters/[id]/items - Update character item (by itemId in body)
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

    const character = await db.query.characters.findFirst({
      where: eq(characters.id, id),
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    if (character.userId !== session.user.id && !session.user.isDm) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { characterItemId, ...updateData } = body;

    if (!characterItemId) {
      return NextResponse.json({ error: 'characterItemId is required' }, { status: 400 });
    }

    const validation = updateCharacterItemSchema.safeParse(updateData);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const existingItem = await db.query.characterItems.findFirst({
      where: and(
        eq(characterItems.id, characterItemId),
        eq(characterItems.characterId, id)
      ),
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not in inventory' }, { status: 404 });
    }

    const data = validation.data;

    // If quantity is 0, remove the item
    if (data.quantity === 0) {
      await db.delete(characterItems).where(eq(characterItems.id, characterItemId));
      return NextResponse.json({ deleted: true });
    }

    const updates: Record<string, unknown> = {};
    if (data.quantity !== undefined) updates.quantity = data.quantity;
    if (data.equipped !== undefined) updates.equipped = data.equipped;
    if (data.attuned !== undefined) updates.attuned = data.attuned;
    if (data.notes !== undefined) updates.notes = data.notes;

    const [updated] = await db.update(characterItems)
      .set(updates)
      .where(eq(characterItems.id, characterItemId))
      .returning();

    return NextResponse.json({ characterItem: updated });
  } catch (error) {
    console.error('Error updating character item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// DELETE /api/characters/[id]/items - Remove item from inventory
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

    const character = await db.query.characters.findFirst({
      where: eq(characters.id, id),
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    if (character.userId !== session.user.id && !session.user.isDm) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const characterItemId = searchParams.get('characterItemId');

    if (!characterItemId) {
      return NextResponse.json({ error: 'characterItemId is required' }, { status: 400 });
    }

    await db.delete(characterItems).where(
      and(
        eq(characterItems.id, characterItemId),
        eq(characterItems.characterId, id)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing item:', error);
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
  }
}

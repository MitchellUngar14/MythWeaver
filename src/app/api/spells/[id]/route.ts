import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { spells, worlds } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { updateSpellSchema } from '@/lib/validation';

// GET /api/spells/[id] - Get a specific spell
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

    const spell = await db.query.spells.findFirst({
      where: eq(spells.id, id),
    });

    if (!spell) {
      return NextResponse.json({ error: 'Spell not found' }, { status: 404 });
    }

    return NextResponse.json({ spell });
  } catch (error) {
    console.error('Error fetching spell:', error);
    return NextResponse.json({ error: 'Failed to fetch spell' }, { status: 500 });
  }
}

// PATCH /api/spells/[id] - Update a spell (only custom spells, by creator or DM)
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

    // Find the spell
    const spell = await db.query.spells.findFirst({
      where: eq(spells.id, id),
      with: {
        world: true,
      },
    });

    if (!spell) {
      return NextResponse.json({ error: 'Spell not found' }, { status: 404 });
    }

    // Cannot edit core spells
    if (spell.isCore) {
      return NextResponse.json({ error: 'Cannot edit core spells' }, { status: 403 });
    }

    // Check permissions: creator or DM of the world
    const isCreator = spell.createdBy === session.user.id;
    const isDm = spell.world?.dmId === session.user.id;

    if (!isCreator && !isDm) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSpellSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [updated] = await db.update(spells)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(spells.id, id))
      .returning();

    return NextResponse.json({ spell: updated });
  } catch (error) {
    console.error('Error updating spell:', error);
    return NextResponse.json({ error: 'Failed to update spell' }, { status: 500 });
  }
}

// DELETE /api/spells/[id] - Delete a spell (only custom spells, by creator or DM)
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

    // Find the spell
    const spell = await db.query.spells.findFirst({
      where: eq(spells.id, id),
      with: {
        world: true,
      },
    });

    if (!spell) {
      return NextResponse.json({ error: 'Spell not found' }, { status: 404 });
    }

    // Cannot delete core spells
    if (spell.isCore) {
      return NextResponse.json({ error: 'Cannot delete core spells' }, { status: 403 });
    }

    // Check permissions: creator or DM of the world
    const isCreator = spell.createdBy === session.user.id;
    const isDm = spell.world?.dmId === session.user.id;

    if (!isCreator && !isDm) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.delete(spells).where(eq(spells.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting spell:', error);
    return NextResponse.json({ error: 'Failed to delete spell' }, { status: 500 });
  }
}

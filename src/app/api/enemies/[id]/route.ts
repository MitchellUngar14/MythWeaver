import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enemyTemplates } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/enemies/[id] - Get enemy template details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isDm) {
      return NextResponse.json({ error: 'DM access required' }, { status: 403 });
    }

    const { id } = await params;

    const enemy = await db.query.enemyTemplates.findFirst({
      where: and(
        eq(enemyTemplates.id, id),
        eq(enemyTemplates.dmId, session.user.id)
      ),
    });

    if (!enemy) {
      return NextResponse.json({ error: 'Enemy not found' }, { status: 404 });
    }

    return NextResponse.json({ enemy });
  } catch (error) {
    console.error('Error fetching enemy:', error);
    return NextResponse.json({ error: 'Failed to fetch enemy' }, { status: 500 });
  }
}

// PATCH /api/enemies/[id] - Update enemy template
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isDm) {
      return NextResponse.json({ error: 'DM access required' }, { status: 403 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await db.query.enemyTemplates.findFirst({
      where: and(
        eq(enemyTemplates.id, id),
        eq(enemyTemplates.dmId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Enemy not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, stats, abilities, description, challengeRating, worldId } = body;

    const [updated] = await db.update(enemyTemplates)
      .set({
        ...(name && { name }),
        ...(stats && { stats }),
        ...(abilities && { abilities }),
        ...(description !== undefined && { description }),
        ...(challengeRating !== undefined && { challengeRating }),
        ...(worldId !== undefined && { worldId: worldId || null }),
      })
      .where(eq(enemyTemplates.id, id))
      .returning();

    return NextResponse.json({ enemy: updated });
  } catch (error) {
    console.error('Error updating enemy:', error);
    return NextResponse.json({ error: 'Failed to update enemy' }, { status: 500 });
  }
}

// DELETE /api/enemies/[id] - Delete enemy template
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isDm) {
      return NextResponse.json({ error: 'DM access required' }, { status: 403 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await db.query.enemyTemplates.findFirst({
      where: and(
        eq(enemyTemplates.id, id),
        eq(enemyTemplates.dmId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Enemy not found' }, { status: 404 });
    }

    await db.delete(enemyTemplates).where(eq(enemyTemplates.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting enemy:', error);
    return NextResponse.json({ error: 'Failed to delete enemy' }, { status: 500 });
  }
}

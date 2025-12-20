import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enemyTemplates } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/npcs/[id] - Get NPC details
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

    const npc = await db.query.enemyTemplates.findFirst({
      where: and(
        eq(enemyTemplates.id, id),
        eq(enemyTemplates.dmId, session.user.id),
        eq(enemyTemplates.isNpc, true)
      ),
      with: {
        world: true,
        locationResource: true,
      },
    });

    if (!npc) {
      return NextResponse.json({ error: 'NPC not found' }, { status: 404 });
    }

    return NextResponse.json({ npc });
  } catch (error) {
    console.error('Error fetching NPC:', error);
    return NextResponse.json({ error: 'Failed to fetch NPC' }, { status: 500 });
  }
}

// PATCH /api/npcs/[id] - Update NPC
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
        eq(enemyTemplates.dmId, session.user.id),
        eq(enemyTemplates.isNpc, true)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'NPC not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      stats,
      abilities,
      description,
      challengeRating,
      worldId,
      location,
      locationResourceId,
      defaultHideHp,
    } = body;

    const [updated] = await db.update(enemyTemplates)
      .set({
        ...(name && { name }),
        ...(stats && { stats }),
        ...(abilities && { abilities }),
        ...(description !== undefined && { description }),
        ...(challengeRating !== undefined && { challengeRating }),
        ...(worldId !== undefined && { worldId: worldId || null }),
        ...(location !== undefined && { location: location || null }),
        ...(locationResourceId !== undefined && { locationResourceId: locationResourceId || null }),
        ...(defaultHideHp !== undefined && { defaultHideHp }),
      })
      .where(eq(enemyTemplates.id, id))
      .returning();

    return NextResponse.json({ npc: updated });
  } catch (error) {
    console.error('Error updating NPC:', error);
    return NextResponse.json({ error: 'Failed to update NPC' }, { status: 500 });
  }
}

// DELETE /api/npcs/[id] - Delete NPC
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
        eq(enemyTemplates.dmId, session.user.id),
        eq(enemyTemplates.isNpc, true)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'NPC not found' }, { status: 404 });
    }

    await db.delete(enemyTemplates).where(eq(enemyTemplates.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting NPC:', error);
    return NextResponse.json({ error: 'Failed to delete NPC' }, { status: 500 });
  }
}

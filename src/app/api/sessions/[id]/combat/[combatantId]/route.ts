import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameSessions, worlds, combatInstances, worldMembers } from '@/lib/schema';
import { updateCombatantSchema } from '@/lib/validation';
import { eq, and } from 'drizzle-orm';
import { broadcastToSession, SessionEvents } from '@/lib/pusher-server';

// PATCH /api/sessions/[id]/combat/[combatantId] - Update combatant
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; combatantId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, combatantId } = await params;
    const body = await request.json();
    const parsed = updateCombatantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    // Get session and combatant
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: { world: true },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const combatant = await db.query.combatInstances.findFirst({
      where: eq(combatInstances.id, combatantId),
    });

    if (!combatant || combatant.sessionId !== id) {
      return NextResponse.json({ error: 'Combatant not found' }, { status: 404 });
    }

    // Check permissions: DM can update anything, players can only update their own character's HP
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

      // Players can only update HP on their own character
      // For now, allow any world member to update (we'll add character ownership check later)
      if (parsed.data.statusEffects || parsed.data.isActive || parsed.data.position || parsed.data.showHpToPlayers !== undefined) {
        return NextResponse.json({ error: 'Only the DM can update status effects, activity, initiative, or HP visibility' }, { status: 403 });
      }
    }

    // Update combatant
    const [updated] = await db.update(combatInstances)
      .set(parsed.data)
      .where(eq(combatInstances.id, combatantId))
      .returning();

    // Broadcast update
    await broadcastToSession(id, SessionEvents.COMBATANT_UPDATED, {
      odcombatantId: combatantId,
      changes: parsed.data,
    });

    return NextResponse.json({ combatant: updated });
  } catch (error) {
    console.error('Error updating combatant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sessions/[id]/combat/[combatantId] - Remove combatant (DM only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; combatantId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, combatantId } = await params;

    // Get session and verify DM
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: { world: true },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (gameSession.world.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Only the DM can remove combatants' }, { status: 403 });
    }

    // Verify combatant belongs to this session
    const combatant = await db.query.combatInstances.findFirst({
      where: eq(combatInstances.id, combatantId),
    });

    if (!combatant || combatant.sessionId !== id) {
      return NextResponse.json({ error: 'Combatant not found' }, { status: 404 });
    }

    // Deactivate (soft delete) the combatant
    await db.update(combatInstances)
      .set({ isActive: false })
      .where(eq(combatInstances.id, combatantId));

    // Broadcast removal
    await broadcastToSession(id, SessionEvents.COMBATANT_REMOVED, {
      odcombatantId: combatantId,
    });

    return NextResponse.json({ message: 'Combatant removed' });
  } catch (error) {
    console.error('Error removing combatant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

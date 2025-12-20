import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameSessions, combatInstances, worldMembers } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { broadcastToSession, SessionEvents } from '@/lib/pusher-server';
import { z } from 'zod';
import type { ActionCategory, ActionEconomy, TakenAction } from '@/lib/combat-actions';
import { DEFAULT_ACTION_ECONOMY, consumeAction } from '@/lib/combat-actions';

// Validation schema for taking an action
const takeActionSchema = z.object({
  combatantId: z.string().uuid(),
  actionId: z.string().min(1),
  actionName: z.string().min(1).max(100),
  category: z.enum(['action', 'bonus_action', 'reaction', 'movement', 'free']),
  details: z.string().max(200).optional(),
});

export type TakeActionInput = z.infer<typeof takeActionSchema>;

// POST /api/sessions/[id]/combat/actions - Take a combat action
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = takeActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { combatantId, actionId, actionName, category, details } = parsed.data;

    // Get session and verify access
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: { world: true },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get the combatant
    const combatant = await db.query.combatInstances.findFirst({
      where: eq(combatInstances.id, combatantId),
    });

    if (!combatant || combatant.sessionId !== id) {
      return NextResponse.json({ error: 'Combatant not found' }, { status: 404 });
    }

    // Check permissions: DM can take actions for any combatant, players only for their own character
    const isDm = gameSession.world.dmId === session.user.id;
    let canTakeAction = isDm;

    if (!isDm && combatant.characterId) {
      // Check if this is the player's character
      const membership = await db.query.worldMembers.findFirst({
        where: and(
          eq(worldMembers.worldId, gameSession.worldId),
          eq(worldMembers.userId, session.user.id)
        ),
        with: { character: true },
      });

      if (membership?.characterId === combatant.characterId) {
        canTakeAction = true;
      }
    }

    if (!canTakeAction) {
      return NextResponse.json({ error: 'You cannot take actions for this combatant' }, { status: 403 });
    }

    // Get current action economy or initialize it
    const currentEconomy: ActionEconomy = (combatant.actionEconomy as ActionEconomy) || { ...DEFAULT_ACTION_ECONOMY };

    // Check if action is available (except for free actions which are unlimited)
    if (category !== 'free') {
      const categoryUsed = {
        action: currentEconomy.usedAction,
        bonus_action: currentEconomy.usedBonusAction,
        reaction: currentEconomy.usedReaction,
        movement: currentEconomy.usedMovement,
      }[category];

      if (categoryUsed) {
        return NextResponse.json({
          error: `You have already used your ${category.replace('_', ' ')} this turn`
        }, { status: 400 });
      }
    }

    // Create the taken action record
    const takenAction: TakenAction = {
      actionId,
      actionName,
      category: category as ActionCategory,
      timestamp: new Date().toISOString(),
      details,
    };

    // Update economy
    const updatedEconomy = consumeAction(category as ActionCategory, currentEconomy);
    updatedEconomy.actionsTaken = [...currentEconomy.actionsTaken, takenAction];

    // Persist to database
    await db.update(combatInstances)
      .set({ actionEconomy: updatedEconomy })
      .where(eq(combatInstances.id, combatantId));

    // Broadcast action taken to all participants
    await broadcastToSession(id, SessionEvents.ACTION_TAKEN, {
      combatantId,
      combatantName: combatant.name,
      actionId,
      actionName,
      category,
      details,
      actionEconomy: updatedEconomy,
      timestamp: takenAction.timestamp,
    });

    // Also broadcast a chat message so it appears in the combat log
    const chatMessage = {
      id: crypto.randomUUID(),
      oduserId: 'system',
      userName: 'Combat',
      content: `**${combatant.name}** used **${actionName}**${details ? `: ${details}` : ''}`,
      timestamp: takenAction.timestamp,
    };

    await broadcastToSession(id, SessionEvents.CHAT_MESSAGE, chatMessage);

    return NextResponse.json({
      success: true,
      actionEconomy: updatedEconomy,
      action: takenAction,
    });
  } catch (error) {
    console.error('Error taking combat action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

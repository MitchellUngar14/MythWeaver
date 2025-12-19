import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameSessions, worlds, combatInstances, characters, enemyTemplates, worldMembers } from '@/lib/schema';
import { addCombatantSchema } from '@/lib/validation';
import { eq, and, desc } from 'drizzle-orm';
import { broadcastToSession, SessionEvents } from '@/lib/pusher-server';

// GET /api/sessions/[id]/combat - Get combat state
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get session and verify access
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: { world: true },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

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
    }

    // Get active combatants
    const combatantsRaw = await db.query.combatInstances.findMany({
      where: and(
        eq(combatInstances.sessionId, id),
        eq(combatInstances.isActive, true)
      ),
      orderBy: [desc(combatInstances.position)],
    });

    // Add type field based on templateId
    const combatants = combatantsRaw.map(c => ({
      ...c,
      type: c.templateId ? 'enemy' : 'character',
      characterId: c.characterId || undefined,
      showHpToPlayers: c.showHpToPlayers || false,
    }));

    return NextResponse.json({ combatants });
  } catch (error) {
    console.error('Error fetching combat state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sessions/[id]/combat - Add combatant (DM only)
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
    const parsed = addCombatantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { type, characterId, templateId, initiative, customName } = parsed.data;

    // Get session and verify DM
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: { world: true },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (gameSession.world.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Only the DM can add combatants' }, { status: 403 });
    }

    let combatantData: {
      sessionId: string;
      name: string;
      currentHp: number;
      maxHp: number;
      position: number;
      templateId?: string;
      characterId?: string;
      isActive: boolean;
    };
    let ac = 10;

    if (type === 'character' && characterId) {
      // Add character to combat
      const character = await db.query.characters.findFirst({
        where: eq(characters.id, characterId),
      });

      if (!character) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 });
      }

      ac = character.stats.ac;
      combatantData = {
        sessionId: id,
        characterId,
        name: character.name,
        currentHp: character.stats.hp,
        maxHp: character.stats.maxHp,
        position: initiative,
        isActive: true,
      };
    } else if (type === 'enemy' && templateId) {
      // Add enemy from template
      const template = await db.query.enemyTemplates.findFirst({
        where: eq(enemyTemplates.id, templateId),
      });

      if (!template) {
        return NextResponse.json({ error: 'Enemy template not found' }, { status: 404 });
      }

      ac = template.stats.ac;
      combatantData = {
        sessionId: id,
        templateId,
        name: customName || template.name,
        currentHp: template.stats.hp,
        maxHp: template.stats.hp,
        position: initiative,
        isActive: true,
      };
    } else {
      return NextResponse.json({ error: 'Invalid combatant data' }, { status: 400 });
    }

    const [combatant] = await db.insert(combatInstances)
      .values(combatantData)
      .returning();

    // Broadcast to session
    await broadcastToSession(id, SessionEvents.COMBATANT_ADDED, {
      combatant: {
        id: combatant.id,
        name: combatant.name,
        type,
        currentHp: combatant.currentHp,
        maxHp: combatant.maxHp,
        ac,
        position: combatant.position,
        statusEffects: combatant.statusEffects,
        isActive: combatant.isActive,
        characterId: type === 'character' ? characterId : undefined,
        templateId: type === 'enemy' ? templateId : undefined,
        showHpToPlayers: combatant.showHpToPlayers || false,
      },
    });

    return NextResponse.json({
      combatant: {
        ...combatant,
        ac,
        type,
        characterId: type === 'character' ? characterId : undefined,
        showHpToPlayers: combatant.showHpToPlayers || false,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding combatant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sessions/[id]/combat - End combat (clear all combatants)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get session and verify DM
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: { world: true },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (gameSession.world.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Only the DM can end combat' }, { status: 403 });
    }

    // Deactivate all combatants
    await db.update(combatInstances)
      .set({ isActive: false })
      .where(eq(combatInstances.sessionId, id));

    // Broadcast combat ended
    await broadcastToSession(id, SessionEvents.COMBAT_ENDED, {});

    return NextResponse.json({ message: 'Combat ended' });
  } catch (error) {
    console.error('Error ending combat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

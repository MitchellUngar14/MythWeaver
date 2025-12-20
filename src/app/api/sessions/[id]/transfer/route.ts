import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  gameSessions, characters, characterItems, enemyItems, items, combatInstances
} from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const transferSchema = z.object({
  sourceType: z.enum(['world', 'character', 'enemy', 'combatant']),
  sourceId: z.string().optional(), // Not needed for 'world' type
  targetCharacterId: z.string().uuid(),
  itemId: z.string().uuid(),
  quantity: z.number().min(1).default(1),
});

// POST /api/sessions/[id]/transfer - Transfer item to character
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

    // Only DMs can transfer items
    if (!session.user.isDm) {
      return NextResponse.json({ error: 'Only DMs can transfer items' }, { status: 403 });
    }

    // Verify session exists and DM owns it
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: {
        world: true,
      },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (gameSession.world.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const validation = transferSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { sourceType, sourceId, targetCharacterId, itemId, quantity } = validation.data;

    // Verify target character exists
    const targetCharacter = await db.query.characters.findFirst({
      where: eq(characters.id, targetCharacterId),
    });

    if (!targetCharacter) {
      return NextResponse.json({ error: 'Target character not found' }, { status: 404 });
    }

    // Verify item exists and is from the same world
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.worldId !== gameSession.worldId) {
      return NextResponse.json({ error: 'Item must be from the same world' }, { status: 400 });
    }

    // Handle different source types
    if (sourceType === 'world') {
      // Giving item from world inventory (unlimited)
      // Just add to character
    } else if (sourceType === 'character' && sourceId) {
      // Transfer from another character
      const sourceCharacter = await db.query.characters.findFirst({
        where: eq(characters.id, sourceId),
      });

      if (!sourceCharacter) {
        return NextResponse.json({ error: 'Source character not found' }, { status: 404 });
      }

      // Check source has the item
      const sourceItem = await db.query.characterItems.findFirst({
        where: and(
          eq(characterItems.characterId, sourceId),
          eq(characterItems.itemId, itemId)
        ),
      });

      if (!sourceItem || sourceItem.quantity < quantity) {
        return NextResponse.json({ error: 'Source does not have enough of this item' }, { status: 400 });
      }

      // Remove from source
      if (sourceItem.quantity === quantity) {
        await db.delete(characterItems).where(eq(characterItems.id, sourceItem.id));
      } else {
        await db.update(characterItems)
          .set({ quantity: sourceItem.quantity - quantity })
          .where(eq(characterItems.id, sourceItem.id));
      }
    } else if (sourceType === 'enemy' && sourceId) {
      // Transfer from enemy template
      const sourceItem = await db.query.enemyItems.findFirst({
        where: and(
          eq(enemyItems.templateId, sourceId),
          eq(enemyItems.itemId, itemId)
        ),
      });

      if (!sourceItem || sourceItem.quantity < quantity) {
        return NextResponse.json({ error: 'Enemy does not have enough of this item' }, { status: 400 });
      }

      // Remove from enemy
      if (sourceItem.quantity === quantity) {
        await db.delete(enemyItems).where(eq(enemyItems.id, sourceItem.id));
      } else {
        await db.update(enemyItems)
          .set({ quantity: sourceItem.quantity - quantity })
          .where(eq(enemyItems.id, sourceItem.id));
      }
    } else if (sourceType === 'combatant' && sourceId) {
      // Transfer from combat instance (enemy/NPC in combat)
      const combatant = await db.query.combatInstances.findFirst({
        where: eq(combatInstances.id, sourceId),
      });

      if (!combatant || !combatant.templateId) {
        return NextResponse.json({ error: 'Combatant not found' }, { status: 404 });
      }

      // Check template has the item
      const sourceItem = await db.query.enemyItems.findFirst({
        where: and(
          eq(enemyItems.templateId, combatant.templateId),
          eq(enemyItems.itemId, itemId)
        ),
      });

      if (!sourceItem || sourceItem.quantity < quantity) {
        return NextResponse.json({ error: 'Combatant does not have enough of this item' }, { status: 400 });
      }

      // Note: We don't remove from the template, as the template is shared
      // In a more sophisticated system, we'd track combat-instance-specific inventory
    }

    // Add to target character
    const existingItem = await db.query.characterItems.findFirst({
      where: and(
        eq(characterItems.characterId, targetCharacterId),
        eq(characterItems.itemId, itemId)
      ),
    });

    if (existingItem) {
      await db.update(characterItems)
        .set({ quantity: existingItem.quantity + quantity })
        .where(eq(characterItems.id, existingItem.id));
    } else {
      await db.insert(characterItems).values({
        characterId: targetCharacterId,
        itemId,
        quantity,
        equipped: false,
        attuned: false,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Transferred ${quantity}x ${item.name} to ${targetCharacter.name}`,
    });
  } catch (error) {
    console.error('Error transferring item:', error);
    return NextResponse.json({ error: 'Failed to transfer item' }, { status: 500 });
  }
}

// GET /api/sessions/[id]/transfer - Get available items for transfer
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

    if (!session.user.isDm) {
      return NextResponse.json({ error: 'Only DMs can view transfer options' }, { status: 403 });
    }

    // Get session with world
    const gameSession = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, id),
      with: {
        world: true,
      },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (gameSession.world.dmId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all world items
    const worldItems = await db.query.items.findMany({
      where: eq(items.worldId, gameSession.worldId),
    });

    // Get characters in this world with their items
    const worldCharacters = await db.query.characters.findMany({
      where: eq(characters.worldId, gameSession.worldId),
      with: {
        items: {
          with: {
            item: true,
          },
        },
      },
    });

    // Get combat instances with their template items
    const combatants = await db.query.combatInstances.findMany({
      where: eq(combatInstances.sessionId, id),
      with: {
        template: true,
      },
    });

    // Get enemy items for each combatant
    const combatantsWithItems = await Promise.all(
      combatants.map(async (c) => {
        if (!c.templateId) return { ...c, items: [] };
        const templateItems = await db.query.enemyItems.findMany({
          where: eq(enemyItems.templateId, c.templateId),
          with: {
            item: true,
          },
        });
        return { ...c, items: templateItems };
      })
    );

    return NextResponse.json({
      worldItems,
      characters: worldCharacters,
      combatants: combatantsWithItems,
    });
  } catch (error) {
    console.error('Error fetching transfer options:', error);
    return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 });
  }
}

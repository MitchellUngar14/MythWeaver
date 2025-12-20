import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { characters } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import type { CharacterStats, SpellSlots } from '@/lib/schema';

// PATCH /api/characters/[id]/spell-slots - Update spell slot usage
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: characterId } = await params;

    // Verify ownership
    const character = await db.query.characters.findFirst({
      where: and(
        eq(characters.id, characterId),
        eq(characters.userId, session.user.id)
      ),
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found or access denied' }, { status: 404 });
    }

    const body = await req.json();
    const { level, action } = body; // action: 'use' | 'restore' | 'restoreAll' | 'set'

    const stats = character.stats as CharacterStats;

    if (!stats.spellcasting) {
      return NextResponse.json({ error: 'Character has no spellcasting' }, { status: 400 });
    }

    const spellSlots = { ...stats.spellcasting.spellSlots };

    if (action === 'restoreAll') {
      // Restore all slots to max
      for (const key of Object.keys(spellSlots) as (keyof SpellSlots)[]) {
        spellSlots[key] = { ...spellSlots[key], used: 0 };
      }
    } else if (level && action) {
      const slotKey = `level${level}` as keyof SpellSlots;
      const slot = spellSlots[slotKey];

      if (!slot) {
        return NextResponse.json({ error: 'Invalid spell level' }, { status: 400 });
      }

      switch (action) {
        case 'use':
          if (slot.used >= slot.max) {
            return NextResponse.json({ error: 'No spell slots remaining' }, { status: 400 });
          }
          spellSlots[slotKey] = { ...slot, used: slot.used + 1 };
          break;
        case 'restore':
          if (slot.used <= 0) {
            return NextResponse.json({ error: 'No slots to restore' }, { status: 400 });
          }
          spellSlots[slotKey] = { ...slot, used: slot.used - 1 };
          break;
        case 'set':
          const { used, max } = body;
          if (typeof used === 'number') {
            spellSlots[slotKey] = { ...slot, used: Math.max(0, Math.min(slot.max, used)) };
          }
          if (typeof max === 'number') {
            spellSlots[slotKey] = { ...spellSlots[slotKey], max: Math.max(0, max) };
          }
          break;
        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
    } else if (body.spellSlots) {
      // Direct update of all spell slots
      Object.assign(spellSlots, body.spellSlots);
    } else {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Update character stats
    const updatedStats: CharacterStats = {
      ...stats,
      spellcasting: {
        ...stats.spellcasting,
        spellSlots,
      },
    };

    const [updated] = await db.update(characters)
      .set({
        stats: updatedStats,
        updatedAt: new Date(),
      })
      .where(eq(characters.id, characterId))
      .returning();

    return NextResponse.json({
      spellSlots: (updated.stats as CharacterStats).spellcasting?.spellSlots,
    });
  } catch (error) {
    console.error('Error updating spell slots:', error);
    return NextResponse.json({ error: 'Failed to update spell slots' }, { status: 500 });
  }
}

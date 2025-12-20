import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { spells, users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { CORE_SPELLS } from '@/lib/seed/core-spells';

// POST /api/seed/spells - Seed core spells (admin/DM only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a DM
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user?.isDm) {
      return NextResponse.json({ error: 'Only DMs can seed spells' }, { status: 403 });
    }

    // Check if core spells already exist
    const existingCore = await db.query.spells.findFirst({
      where: eq(spells.isCore, true),
    });

    if (existingCore) {
      return NextResponse.json({
        message: 'Core spells already seeded',
        count: 0,
      });
    }

    // Insert all core spells
    const inserted = await db.insert(spells).values(
      CORE_SPELLS.map(spell => ({
        ...spell,
        isCore: true,
        worldId: null,
        createdBy: null,
      }))
    ).returning();

    return NextResponse.json({
      message: `Successfully seeded ${inserted.length} core spells`,
      count: inserted.length,
    });
  } catch (error) {
    console.error('Error seeding spells:', error);
    return NextResponse.json({ error: 'Failed to seed spells' }, { status: 500 });
  }
}

// GET /api/seed/spells - Check seed status
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const coreSpells = await db.query.spells.findMany({
      where: eq(spells.isCore, true),
    });

    return NextResponse.json({
      seeded: coreSpells.length > 0,
      count: coreSpells.length,
      expectedCount: CORE_SPELLS.length,
    });
  } catch (error) {
    console.error('Error checking seed status:', error);
    return NextResponse.json({ error: 'Failed to check seed status' }, { status: 500 });
  }
}

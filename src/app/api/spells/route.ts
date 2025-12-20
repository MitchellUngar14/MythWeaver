import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { spells, worlds } from '@/lib/schema';
import { eq, or, and, isNull, ilike } from 'drizzle-orm';
import { createSpellSchema } from '@/lib/validation';

// GET /api/spells - List spells (core + world-specific)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const worldId = searchParams.get('worldId');
    const level = searchParams.get('level');
    const school = searchParams.get('school');
    const search = searchParams.get('search');
    const coreOnly = searchParams.get('coreOnly') === 'true';

    // Build query conditions
    let conditions = [];

    if (coreOnly) {
      // Only core spells
      conditions.push(eq(spells.isCore, true));
    } else if (worldId) {
      // Core spells + world-specific spells
      conditions.push(
        or(
          eq(spells.isCore, true),
          eq(spells.worldId, worldId)
        )
      );
    } else {
      // Only core spells if no world specified
      conditions.push(eq(spells.isCore, true));
    }

    if (level !== null && level !== undefined && level !== '') {
      conditions.push(eq(spells.level, parseInt(level)));
    }

    if (school) {
      conditions.push(eq(spells.school, school));
    }

    if (search) {
      conditions.push(ilike(spells.name, `%${search}%`));
    }

    const result = await db.query.spells.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: (spells, { asc }) => [asc(spells.level), asc(spells.name)],
    });

    return NextResponse.json({ spells: result });
  } catch (error) {
    console.error('Error fetching spells:', error);
    return NextResponse.json({ error: 'Failed to fetch spells' }, { status: 500 });
  }
}

// POST /api/spells - Create a custom spell
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSpellSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    // If worldId is provided, verify user is the DM
    if (data.worldId) {
      const world = await db.query.worlds.findFirst({
        where: and(
          eq(worlds.id, data.worldId),
          eq(worlds.dmId, session.user.id)
        ),
      });

      if (!world) {
        return NextResponse.json({ error: 'World not found or access denied' }, { status: 403 });
      }
    }

    const [spell] = await db.insert(spells).values({
      ...data,
      createdBy: session.user.id,
      isCore: false, // User-created spells are never core
    }).returning();

    return NextResponse.json({ spell }, { status: 201 });
  } catch (error) {
    console.error('Error creating spell:', error);
    return NextResponse.json({ error: 'Failed to create spell' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enemyTemplates } from '@/lib/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import { createEnemyTemplateSchema } from '@/lib/validation';

// GET /api/enemies - List DM's enemy templates (excludes NPCs unless filtering by location)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isDm) {
      return NextResponse.json({ error: 'DM access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const worldId = searchParams.get('worldId');
    const locationResourceId = searchParams.get('locationResourceId');
    const location = searchParams.get('location');

    // Build conditions array
    const conditions = [eq(enemyTemplates.dmId, session.user.id)];

    // Filter by world if specified
    if (worldId) {
      conditions.push(eq(enemyTemplates.worldId, worldId));
    }

    // Filter by location if specified (includes both NPCs and enemies)
    if (locationResourceId) {
      conditions.push(eq(enemyTemplates.locationResourceId, locationResourceId));
    } else if (location) {
      conditions.push(eq(enemyTemplates.location, location));
    } else {
      // When not filtering by location, exclude NPCs (default behavior)
      conditions.push(or(eq(enemyTemplates.isNpc, false), isNull(enemyTemplates.isNpc))!);
    }

    const templates = await db.query.enemyTemplates.findMany({
      where: and(...conditions),
      orderBy: (templates, { desc }) => [desc(templates.createdAt)],
      with: {
        world: true,
        locationResource: true,
      },
    });

    return NextResponse.json({ enemies: templates });
  } catch (error) {
    console.error('Error fetching enemies:', error);
    return NextResponse.json({ error: 'Failed to fetch enemies' }, { status: 500 });
  }
}

// POST /api/enemies - Create a new enemy template
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isDm) {
      return NextResponse.json({ error: 'DM access required' }, { status: 403 });
    }

    const body = await req.json();
    const validation = createEnemyTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, stats, abilities, description, challengeRating, worldId, location, locationResourceId } = validation.data;

    const [newEnemy] = await db.insert(enemyTemplates).values({
      dmId: session.user.id,
      name,
      stats,
      abilities,
      description,
      challengeRating,
      worldId,
      location,
      locationResourceId,
      isNpc: false,
    }).returning();

    return NextResponse.json({ enemy: newEnemy }, { status: 201 });
  } catch (error) {
    console.error('Error creating enemy:', error);
    return NextResponse.json({ error: 'Failed to create enemy' }, { status: 500 });
  }
}

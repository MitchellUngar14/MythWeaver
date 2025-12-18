import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enemyTemplates } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { createEnemyTemplateSchema } from '@/lib/validation';

// GET /api/enemies - List DM's enemy templates
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isDm) {
      return NextResponse.json({ error: 'DM access required' }, { status: 403 });
    }

    const templates = await db.query.enemyTemplates.findMany({
      where: eq(enemyTemplates.dmId, session.user.id),
      orderBy: (templates, { desc }) => [desc(templates.createdAt)],
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

    const { name, stats, abilities, description, challengeRating, worldId } = validation.data;

    const [newEnemy] = await db.insert(enemyTemplates).values({
      dmId: session.user.id,
      name,
      stats,
      abilities,
      description,
      challengeRating,
      worldId,
    }).returning();

    return NextResponse.json({ enemy: newEnemy }, { status: 201 });
  } catch (error) {
    console.error('Error creating enemy:', error);
    return NextResponse.json({ error: 'Failed to create enemy' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enemyTemplates } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { createNpcSchema } from '@/lib/validation';

// GET /api/npcs - List DM's NPCs
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isDm) {
      return NextResponse.json({ error: 'DM access required' }, { status: 403 });
    }

    const npcs = await db.query.enemyTemplates.findMany({
      where: and(
        eq(enemyTemplates.dmId, session.user.id),
        eq(enemyTemplates.isNpc, true)
      ),
      orderBy: (templates, { desc }) => [desc(templates.createdAt)],
      with: {
        world: true,
        locationResource: true,
      },
    });

    return NextResponse.json({ npcs });
  } catch (error) {
    console.error('Error fetching NPCs:', error);
    return NextResponse.json({ error: 'Failed to fetch NPCs' }, { status: 500 });
  }
}

// POST /api/npcs - Create a new NPC
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
    const validation = createNpcSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

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
    } = validation.data;

    const [newNpc] = await db.insert(enemyTemplates).values({
      dmId: session.user.id,
      name,
      stats,
      abilities,
      description,
      challengeRating,
      worldId,
      location,
      locationResourceId,
      isNpc: true,
      defaultHideHp: defaultHideHp ?? true,
    }).returning();

    return NextResponse.json({ npc: newNpc }, { status: 201 });
  } catch (error) {
    console.error('Error creating NPC:', error);
    return NextResponse.json({ error: 'Failed to create NPC' }, { status: 500 });
  }
}

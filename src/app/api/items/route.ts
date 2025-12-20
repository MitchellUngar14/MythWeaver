import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { createItemSchema } from '@/lib/validation';

// GET /api/items - List items for a world
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const worldId = searchParams.get('worldId');

    if (!worldId) {
      return NextResponse.json({ error: 'worldId is required' }, { status: 400 });
    }

    // Verify user is DM of this world or has access
    const worldItems = await db.query.items.findMany({
      where: eq(items.worldId, worldId),
      orderBy: (items, { asc }) => [asc(items.type), asc(items.name)],
      with: {
        world: true,
      },
    });

    return NextResponse.json({ items: worldItems });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

// POST /api/items - Create a new item
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
    const validation = createItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, description, type, rarity, weight, value, properties, requiresAttunement, worldId } = validation.data;

    // Verify DM owns this world
    const world = await db.query.worlds.findFirst({
      where: (worlds, { eq, and }) => and(
        eq(worlds.id, worldId),
        eq(worlds.dmId, session.user.id)
      ),
    });

    if (!world) {
      return NextResponse.json({ error: 'World not found or access denied' }, { status: 404 });
    }

    const [newItem] = await db.insert(items).values({
      dmId: session.user.id,
      worldId,
      name,
      description,
      type,
      rarity,
      weight,
      value,
      properties: properties || {},
      requiresAttunement,
    }).returning();

    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}

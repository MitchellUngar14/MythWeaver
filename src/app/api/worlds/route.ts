import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { worlds, worldMembers, characters } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { createWorldSchema } from '@/lib/validation';
import { generateRoomKey } from '@/lib/utils';

// GET /api/worlds - List DM's worlds
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isDm) {
      return NextResponse.json({ error: 'DM access required' }, { status: 403 });
    }

    const userWorlds = await db.query.worlds.findMany({
      where: eq(worlds.dmId, session.user.id),
      with: {
        members: {
          with: {
            user: true,
            character: true,
          },
        },
      },
      orderBy: (worlds, { desc }) => [desc(worlds.updatedAt)],
    });

    return NextResponse.json({ worlds: userWorlds });
  } catch (error) {
    console.error('Error fetching worlds:', error);
    return NextResponse.json({ error: 'Failed to fetch worlds' }, { status: 500 });
  }
}

// POST /api/worlds - Create a new world
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
    const validation = createWorldSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, description } = validation.data;

    // Generate unique room key
    let roomKey = generateRoomKey();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.query.worlds.findFirst({
        where: eq(worlds.roomKey, roomKey),
      });
      if (!existing) break;
      roomKey = generateRoomKey();
      attempts++;
    }

    const [newWorld] = await db.insert(worlds).values({
      dmId: session.user.id,
      name,
      description,
      roomKey,
    }).returning();

    return NextResponse.json({ world: newWorld }, { status: 201 });
  } catch (error) {
    console.error('Error creating world:', error);
    return NextResponse.json({ error: 'Failed to create world' }, { status: 500 });
  }
}

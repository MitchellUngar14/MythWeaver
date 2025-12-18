import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { characters } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { createCharacterSchema } from '@/lib/validation';

// GET /api/characters - List user's characters
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isPlayer) {
      return NextResponse.json({ error: 'Player access required' }, { status: 403 });
    }

    const userCharacters = await db.query.characters.findMany({
      where: eq(characters.userId, session.user.id),
      with: {
        world: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: (characters, { desc }) => [desc(characters.updatedAt)],
    });

    return NextResponse.json({ characters: userCharacters });
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
  }
}

// POST /api/characters - Create a new character
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isPlayer) {
      return NextResponse.json({ error: 'Player access required' }, { status: 403 });
    }

    const body = await req.json();
    const validation = createCharacterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, class: characterClass, race, level, stats, backstory, notes } = validation.data;

    const [newCharacter] = await db.insert(characters).values({
      userId: session.user.id,
      name,
      class: characterClass,
      race,
      level,
      stats,
      backstory,
      notes,
      inventory: [],
      abilities: [],
    }).returning();

    return NextResponse.json({ character: newCharacter }, { status: 201 });
  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json({ error: 'Failed to create character' }, { status: 500 });
  }
}

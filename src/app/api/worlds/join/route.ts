import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { worlds, worldMembers, characters } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const joinWorldSchema = z.object({
  roomKey: z.string().length(6, 'Room key must be 6 characters'),
  characterId: z.string().uuid().optional(),
});

// POST /api/worlds/join - Join a world with room key
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
    const validation = joinWorldSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { roomKey, characterId } = validation.data;

    // Find the world
    const world = await db.query.worlds.findFirst({
      where: and(
        eq(worlds.roomKey, roomKey.toUpperCase()),
        eq(worlds.isActive, true)
      ),
    });

    if (!world) {
      return NextResponse.json(
        { error: 'Invalid room key or world is not active' },
        { status: 404 }
      );
    }

    // Check if user is the DM of this world
    if (world.dmId === session.user.id) {
      return NextResponse.json(
        { error: 'You are the DM of this world' },
        { status: 400 }
      );
    }

    // Check if already a member
    const existingMembership = await db.query.worldMembers.findFirst({
      where: and(
        eq(worldMembers.worldId, world.id),
        eq(worldMembers.userId, session.user.id)
      ),
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this world' },
        { status: 400 }
      );
    }

    // If character is specified, verify ownership and that it's not already in a world
    let character = null;
    if (characterId) {
      character = await db.query.characters.findFirst({
        where: and(
          eq(characters.id, characterId),
          eq(characters.userId, session.user.id)
        ),
      });

      if (!character) {
        return NextResponse.json(
          { error: 'Character not found' },
          { status: 404 }
        );
      }

      if (character.worldId) {
        return NextResponse.json(
          { error: 'This character is already in another world' },
          { status: 400 }
        );
      }
    }

    // Create membership
    const [membership] = await db.insert(worldMembers).values({
      worldId: world.id,
      userId: session.user.id,
      characterId: characterId || null,
    }).returning();

    // Update character's world if specified
    if (characterId) {
      await db.update(characters)
        .set({ worldId: world.id, updatedAt: new Date() })
        .where(eq(characters.id, characterId));
    }

    return NextResponse.json({
      membership,
      world: {
        id: world.id,
        name: world.name,
        description: world.description,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error joining world:', error);
    return NextResponse.json({ error: 'Failed to join world' }, { status: 500 });
  }
}

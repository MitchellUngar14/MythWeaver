import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { characters, characterHistory, worldMembers, worlds } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/characters/[id] - Get character details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const character = await db.query.characters.findFirst({
      where: eq(characters.id, id),
      with: {
        world: {
          columns: {
            id: true,
            name: true,
            dmId: true,
          },
        },
      },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Check access: owner or DM of the world
    const isOwner = character.userId === session.user.id;
    const isDm = character.world?.dmId === session.user.id;

    if (!isOwner && !isDm) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      character,
      canEdit: isOwner,
    });
  } catch (error) {
    console.error('Error fetching character:', error);
    return NextResponse.json({ error: 'Failed to fetch character' }, { status: 500 });
  }
}

// PATCH /api/characters/[id] - Update character
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const character = await db.query.characters.findFirst({
      where: and(eq(characters.id, id), eq(characters.userId, session.user.id)),
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found or access denied' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      class: characterClass,
      race,
      level,
      stats,
      inventory,
      abilities,
      backstory,
      notes,
    } = body;

    // Save history before updating
    await db.insert(characterHistory).values({
      characterId: id,
      version: character.version ?? 1,
      snapshot: {
        name: character.name,
        class: character.class,
        race: character.race,
        level: character.level,
        stats: character.stats,
        inventory: character.inventory,
        abilities: character.abilities,
      },
    });

    const [updated] = await db.update(characters)
      .set({
        ...(name && { name }),
        ...(characterClass !== undefined && { class: characterClass }),
        ...(race !== undefined && { race }),
        ...(level !== undefined && { level }),
        ...(stats && { stats }),
        ...(inventory && { inventory }),
        ...(abilities && { abilities }),
        ...(backstory !== undefined && { backstory }),
        ...(notes !== undefined && { notes }),
        version: (character.version ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(characters.id, id))
      .returning();

    return NextResponse.json({ character: updated });
  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json({ error: 'Failed to update character' }, { status: 500 });
  }
}

// DELETE /api/characters/[id] - Delete character
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const character = await db.query.characters.findFirst({
      where: and(eq(characters.id, id), eq(characters.userId, session.user.id)),
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found or access denied' }, { status: 404 });
    }

    // Remove from world membership if exists
    if (character.worldId) {
      await db.update(worldMembers)
        .set({ characterId: null })
        .where(and(
          eq(worldMembers.characterId, id),
          eq(worldMembers.userId, session.user.id)
        ));
    }

    await db.delete(characters).where(eq(characters.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 });
  }
}

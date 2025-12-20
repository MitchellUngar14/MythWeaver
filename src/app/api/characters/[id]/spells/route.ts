import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { characters, characterSpells, spells } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { addCharacterSpellSchema, updateCharacterSpellSchema } from '@/lib/validation';

// GET /api/characters/[id]/spells - Get character's spells
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: characterId } = await params;

    // Verify character exists and user has access
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, characterId),
      with: {
        world: {
          columns: { dmId: true },
        },
      },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const isOwner = character.userId === session.user.id;
    const isDm = character.world?.dmId === session.user.id;

    if (!isOwner && !isDm) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get character spells with spell details
    const charSpells = await db.query.characterSpells.findMany({
      where: eq(characterSpells.characterId, characterId),
      with: {
        spell: true,
      },
    });

    return NextResponse.json({
      spells: charSpells,
      canEdit: isOwner,
    });
  } catch (error) {
    console.error('Error fetching character spells:', error);
    return NextResponse.json({ error: 'Failed to fetch spells' }, { status: 500 });
  }
}

// POST /api/characters/[id]/spells - Add a spell to character
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: characterId } = await params;

    // Verify ownership
    const character = await db.query.characters.findFirst({
      where: and(
        eq(characters.id, characterId),
        eq(characters.userId, session.user.id)
      ),
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found or access denied' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = addCharacterSpellSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Verify spell exists
    const spell = await db.query.spells.findFirst({
      where: eq(spells.id, parsed.data.spellId),
    });

    if (!spell) {
      return NextResponse.json({ error: 'Spell not found' }, { status: 404 });
    }

    // Check if already added
    const existing = await db.query.characterSpells.findFirst({
      where: and(
        eq(characterSpells.characterId, characterId),
        eq(characterSpells.spellId, parsed.data.spellId)
      ),
    });

    if (existing) {
      return NextResponse.json({ error: 'Spell already added to character' }, { status: 400 });
    }

    const [charSpell] = await db.insert(characterSpells).values({
      characterId,
      ...parsed.data,
    }).returning();

    // Return with spell details
    const result = await db.query.characterSpells.findFirst({
      where: eq(characterSpells.id, charSpell.id),
      with: {
        spell: true,
      },
    });

    return NextResponse.json({ characterSpell: result }, { status: 201 });
  } catch (error) {
    console.error('Error adding spell to character:', error);
    return NextResponse.json({ error: 'Failed to add spell' }, { status: 500 });
  }
}

// PATCH /api/characters/[id]/spells - Update a character spell (body contains spellId)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: characterId } = await params;

    // Verify ownership
    const character = await db.query.characters.findFirst({
      where: and(
        eq(characters.id, characterId),
        eq(characters.userId, session.user.id)
      ),
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found or access denied' }, { status: 404 });
    }

    const body = await req.json();
    const { spellId, ...updates } = body;

    if (!spellId) {
      return NextResponse.json({ error: 'spellId is required' }, { status: 400 });
    }

    const parsed = updateCharacterSpellSchema.safeParse(updates);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Find the character spell
    const charSpell = await db.query.characterSpells.findFirst({
      where: and(
        eq(characterSpells.characterId, characterId),
        eq(characterSpells.spellId, spellId)
      ),
    });

    if (!charSpell) {
      return NextResponse.json({ error: 'Spell not found on character' }, { status: 404 });
    }

    const [updated] = await db.update(characterSpells)
      .set(parsed.data)
      .where(eq(characterSpells.id, charSpell.id))
      .returning();

    // Return with spell details
    const result = await db.query.characterSpells.findFirst({
      where: eq(characterSpells.id, updated.id),
      with: {
        spell: true,
      },
    });

    return NextResponse.json({ characterSpell: result });
  } catch (error) {
    console.error('Error updating character spell:', error);
    return NextResponse.json({ error: 'Failed to update spell' }, { status: 500 });
  }
}

// DELETE /api/characters/[id]/spells - Remove a spell from character (spellId in query)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: characterId } = await params;
    const { searchParams } = new URL(req.url);
    const spellId = searchParams.get('spellId');

    if (!spellId) {
      return NextResponse.json({ error: 'spellId query parameter is required' }, { status: 400 });
    }

    // Verify ownership
    const character = await db.query.characters.findFirst({
      where: and(
        eq(characters.id, characterId),
        eq(characters.userId, session.user.id)
      ),
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found or access denied' }, { status: 404 });
    }

    // Find and delete the character spell
    const charSpell = await db.query.characterSpells.findFirst({
      where: and(
        eq(characterSpells.characterId, characterId),
        eq(characterSpells.spellId, spellId)
      ),
    });

    if (!charSpell) {
      return NextResponse.json({ error: 'Spell not found on character' }, { status: 404 });
    }

    await db.delete(characterSpells).where(eq(characterSpells.id, charSpell.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing spell from character:', error);
    return NextResponse.json({ error: 'Failed to remove spell' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq, and, ne } from 'drizzle-orm';

// PATCH /api/user/profile - Update user profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, isPlayer, isDm } = await req.json();

    // Validate name
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 1)) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Validate email format
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }

      // Check if email is already taken by another user
      const existingUser = await db.query.users.findFirst({
        where: and(
          eq(users.email, email.toLowerCase().trim()),
          ne(users.id, session.user.id)
        ),
      });

      if (existingUser) {
        return NextResponse.json({ error: 'Email is already in use' }, { status: 400 });
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updates.name = name.trim();
    }

    if (email !== undefined) {
      updates.email = email.toLowerCase().trim();
    }

    if (typeof isPlayer === 'boolean') {
      updates.isPlayer = isPlayer;
    }

    if (typeof isDm === 'boolean') {
      updates.isDm = isDm;
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, session.user.id))
      .returning();

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        isPlayer: updatedUser.isPlayer,
        isDm: updatedUser.isDm,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

// GET /api/user/profile - Get current user profile
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isPlayer: user.isPlayer,
        isDm: user.isDm,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

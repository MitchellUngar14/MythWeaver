import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user) {
          return null;
        }

        const isValid = await compare(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isPlayer: user.isPlayer,
          isDm: user.isDm,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in
      if (user) {
        token.id = user.id as string;
        token.isPlayer = user.isPlayer ?? false;
        token.isDm = user.isDm ?? false;
        token.avatarUrl = user.avatarUrl ?? null;
      }

      // Refresh user data from database to get latest roles/profile
      if (token.id) {
        const freshUser = await db.query.users.findFirst({
          where: eq(users.id, token.id),
        });

        if (freshUser) {
          token.name = freshUser.name;
          token.email = freshUser.email;
          token.isPlayer = freshUser.isPlayer ?? false;
          token.isDm = freshUser.isDm ?? false;
          token.avatarUrl = freshUser.avatarUrl ?? null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.isPlayer = token.isPlayer as boolean;
        session.user.isDm = token.isDm as boolean;
        session.user.avatarUrl = token.avatarUrl as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});

// Type augmentation for NextAuth
declare module 'next-auth' {
  interface User {
    isPlayer?: boolean | null;
    isDm?: boolean | null;
    avatarUrl?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      isPlayer: boolean;
      isDm: boolean;
      avatarUrl: string | null;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    isPlayer: boolean;
    isDm: boolean;
    avatarUrl: string | null;
  }
}

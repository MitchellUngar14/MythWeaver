import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { worldMembers, gameSessions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { ArrowLeft, Globe, Play, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function MyWorldsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Get all worlds the player has joined
  const memberships = await db.query.worldMembers.findMany({
    where: eq(worldMembers.userId, session.user.id),
    with: {
      world: true,
      character: true,
    },
  });

  // Get active sessions for each world
  const worldsWithSessions = await Promise.all(
    memberships.map(async (membership) => {
      const activeSession = await db.query.gameSessions.findFirst({
        where: and(
          eq(gameSessions.worldId, membership.world.id),
          eq(gameSessions.isActive, true)
        ),
      });

      return {
        ...membership,
        activeSession,
      };
    })
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Worlds</h1>
            <p className="text-gray-600 dark:text-gray-400">Worlds you&apos;ve joined as a player</p>
          </div>
        </div>

        {worldsWithSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No worlds yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Join a world using a room key from your Dungeon Master
              </p>
              <Link href="/join">
                <Button>Join a World</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {worldsWithSessions.map((membership) => (
              <Card key={membership.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                        <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{membership.world.name}</CardTitle>
                        {membership.character && (
                          <p className="text-sm text-gray-500">
                            Playing as: {membership.character.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {membership.world.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      {membership.world.description}
                    </p>
                  )}

                  {membership.activeSession ? (
                    <Link href={`/session/${membership.activeSession.id}`}>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <div>
                            <span className="font-medium text-green-700 dark:text-green-300">
                              {membership.activeSession.name}
                            </span>
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Session in progress - Click to join
                            </p>
                          </div>
                        </div>
                        <Play className="w-5 h-5 text-green-500" />
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-500">
                      <Users className="w-5 h-5" />
                      <span className="text-sm">No active session</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

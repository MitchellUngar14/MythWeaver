import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { worldMembers, gameSessions, worlds } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
import {
  Users, Crown, Globe, Dice6, Sword, Plus,
  ArrowRight, LogOut, Settings, Play, Package, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { SignOutButton } from '@/components/auth/sign-out-button';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { user } = session;

  // Fetch active sessions in worlds the player has joined
  const activeSessions: { id: string; name: string; worldName: string }[] = [];
  if (user.isPlayer) {
    const memberships = await db.query.worldMembers.findMany({
      where: eq(worldMembers.userId, user.id),
      with: {
        world: {
          with: {
            sessions: true,
          },
        },
      },
    });

    for (const membership of memberships) {
      const activeSession = membership.world.sessions.find(s => s.isActive);
      if (activeSession) {
        activeSessions.push({
          id: activeSession.id,
          name: activeSession.name,
          worldName: membership.world.name,
        });
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sword className="w-8 h-8 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">Mythweaver</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                <p className="text-xs text-gray-500">
                  {user.isPlayer && user.isDm ? 'Player & DM' : user.isPlayer ? 'Player' : 'DM'}
                </p>
              </div>
              <Link href="/settings">
                <Button variant="ghost" size="sm">
                  <Settings className="w-5 h-5" />
                </Button>
              </Link>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user.name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            What would you like to do today?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Player Section */}
          {user.isPlayer && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                    <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle>Player Hub</CardTitle>
                    <CardDescription>Manage your characters and join games</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Active Sessions */}
                {activeSessions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Active Sessions
                    </p>
                    {activeSessions.map((s) => (
                      <Link key={s.id} href={`/session/${s.id}`} className="block">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <Play className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <div>
                              <span className="font-medium text-green-700 dark:text-green-300">{s.name}</span>
                              <p className="text-xs text-green-600 dark:text-green-400">{s.worldName}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-green-500" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                <Link href="/characters" className="block">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">My Characters</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
                <Link href="/characters/new" className="block">
                  <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
                    <div className="flex items-center gap-3">
                      <Plus className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Create New Character</span>
                    </div>
                  </div>
                </Link>
                <Link href="/worlds" className="block">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">My Worlds</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
                <Link href="/join" className="block">
                  <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
                    <div className="flex items-center gap-3">
                      <Plus className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Join a World</span>
                    </div>
                  </div>
                </Link>
                <Link href="/dice" className="block">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <Dice6 className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">Dice Roller</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* DM Section */}
          {user.isDm && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Crown className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle>Dungeon Master</CardTitle>
                    <CardDescription>Build worlds and run campaigns</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/dm/worlds" className="block">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">My Worlds</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
                <Link href="/dm/worlds/new" className="block">
                  <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 transition-colors">
                    <div className="flex items-center gap-3">
                      <Plus className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Create New World</span>
                    </div>
                  </div>
                </Link>
                <Link href="/dm/enemies" className="block">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <Sword className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">Enemy Templates</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
                <Link href="/dm/npcs" className="block">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">NPCs</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
                <Link href="/dm/items" className="block">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">Item Library</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
                <Link href="/dm/spells" className="block">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">Spell Library</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions for users with both roles */}
        {user.isPlayer && user.isDm && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/dice">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Dice6 className="w-5 h-5" />
                  Roll Dice
                </Button>
              </Link>
              <Link href="/characters/new">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Plus className="w-5 h-5" />
                  New Character
                </Button>
              </Link>
              <Link href="/dm/worlds/new">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Globe className="w-5 h-5" />
                  New World
                </Button>
              </Link>
              <Link href="/dm/enemies/new">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Sword className="w-5 h-5" />
                  New Enemy
                </Button>
              </Link>
              <Link href="/dm/npcs/new">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Users className="w-5 h-5" />
                  New NPC
                </Button>
              </Link>
              <Link href="/dm/items/new">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Package className="w-5 h-5" />
                  New Item
                </Button>
              </Link>
              <Link href="/dm/spells/new">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <BookOpen className="w-5 h-5" />
                  New Spell
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

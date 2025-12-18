'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Globe, Plus, Users, Copy, Check, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface World {
  id: string;
  name: string;
  description: string | null;
  roomKey: string;
  isActive: boolean;
  createdAt: string;
  members: {
    id: string;
    user: { id: string; name: string };
    character: { id: string; name: string; class: string; level: number } | null;
  }[];
}

export default function WorldsPage() {
  const router = useRouter();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchWorlds();
  }, []);

  async function fetchWorlds() {
    try {
      const res = await fetch('/api/worlds');
      const data = await res.json();
      if (res.ok) {
        setWorlds(data.worlds);
      }
    } catch (error) {
      console.error('Error fetching worlds:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function copyRoomKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Worlds</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your campaign worlds</p>
            </div>
          </div>
          <Link href="/dm/worlds/new">
            <Button>
              <Plus className="w-5 h-5 mr-2" />
              New World
            </Button>
          </Link>
        </div>

        {/* Worlds Grid */}
        {worlds.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No worlds yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first world to start building your campaign.
              </p>
              <Link href="/dm/worlds/new">
                <Button>
                  <Plus className="w-5 h-5 mr-2" />
                  Create World
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {worlds.map((world) => (
              <Card key={world.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{world.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {world.description || 'No description'}
                      </CardDescription>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      world.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {world.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Room Key */}
                  <div className="flex items-center gap-2 mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Room Key:</span>
                    <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {world.roomKey}
                    </code>
                    <button
                      onClick={() => copyRoomKey(world.roomKey)}
                      className="ml-auto p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      {copiedKey === world.roomKey ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>

                  {/* Members */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <Users className="w-4 h-4" />
                    <span>{world.members.length} player{world.members.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/dm/worlds/${world.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

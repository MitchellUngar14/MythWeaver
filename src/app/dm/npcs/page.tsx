'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Plus, ArrowLeft, Edit, Trash2, Shield, Heart, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface NPC {
  id: string;
  name: string;
  description: string | null;
  challengeRating: string | null;
  location: string | null;
  locationResource: { id: string; name: string } | null;
  stats: {
    hp: number;
    ac: number;
    str: number;
    dex: number;
    attacks?: { name: string; damage: string }[];
  };
  abilities: { name: string; description: string }[];
  defaultHideHp: boolean;
  createdAt: string;
}

export default function NPCsPage() {
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchNPCs();
  }, []);

  async function fetchNPCs() {
    try {
      const res = await fetch('/api/npcs');
      const data = await res.json();
      if (res.ok) {
        setNpcs(data.npcs);
      }
    } catch (error) {
      console.error('Error fetching NPCs:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteNPC(id: string) {
    try {
      const res = await fetch(`/api/npcs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNpcs(npcs.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Error deleting NPC:', error);
    }
    setDeleteId(null);
  }

  function getLocationDisplay(npc: NPC) {
    if (npc.locationResource) {
      return npc.locationResource.name;
    }
    if (npc.location) {
      return npc.location;
    }
    return null;
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">NPCs</h1>
              <p className="text-gray-600 dark:text-gray-400">Non-player characters for your world</p>
            </div>
          </div>
          <Link href="/dm/npcs/new">
            <Button>
              <Plus className="w-5 h-5 mr-2" />
              New NPC
            </Button>
          </Link>
        </div>

        {/* NPCs List */}
        {npcs.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No NPCs yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create NPCs to populate your world with interesting characters.
              </p>
              <Link href="/dm/npcs/new">
                <Button>
                  <Plus className="w-5 h-5 mr-2" />
                  Create NPC
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {npcs.map((npc) => (
              <Card key={npc.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {npc.name}
                      </h3>
                      {npc.challengeRating && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          CR {npc.challengeRating}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/dm/npcs/${npc.id}`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(npc.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Location Badge */}
                  {getLocationDisplay(npc) && (
                    <div className="flex items-center gap-1 mb-3">
                      <MapPin className="w-3 h-3 text-amber-600" />
                      <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded">
                        {getLocationDisplay(npc)}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {npc.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {npc.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="font-medium">{npc.stats.hp}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{npc.stats.ac}</span>
                    </div>
                    {npc.defaultHideHp && (
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        HP Hidden
                      </span>
                    )}
                  </div>

                  {/* Attacks */}
                  {npc.stats.attacks && npc.stats.attacks.length > 0 && (
                    <div className="space-y-1">
                      {npc.stats.attacks.slice(0, 2).map((attack, i) => (
                        <p key={i} className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">{attack.name}:</span> {attack.damage}
                        </p>
                      ))}
                      {npc.stats.attacks.length > 2 && (
                        <p className="text-sm text-gray-500">
                          +{npc.stats.attacks.length - 2} more attacks
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Delete NPC?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDeleteId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => deleteNPC(deleteId)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

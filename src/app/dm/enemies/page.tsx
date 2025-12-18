'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sword, Plus, ArrowLeft, Edit, Trash2, Shield, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Enemy {
  id: string;
  name: string;
  description: string | null;
  challengeRating: string | null;
  stats: {
    hp: number;
    ac: number;
    str: number;
    dex: number;
    attacks?: { name: string; damage: string }[];
  };
  abilities: { name: string; description: string }[];
  createdAt: string;
}

export default function EnemiesPage() {
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchEnemies();
  }, []);

  async function fetchEnemies() {
    try {
      const res = await fetch('/api/enemies');
      const data = await res.json();
      if (res.ok) {
        setEnemies(data.enemies);
      }
    } catch (error) {
      console.error('Error fetching enemies:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteEnemy(id: string) {
    try {
      const res = await fetch(`/api/enemies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEnemies(enemies.filter(e => e.id !== id));
      }
    } catch (error) {
      console.error('Error deleting enemy:', error);
    }
    setDeleteId(null);
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Enemy Templates</h1>
              <p className="text-gray-600 dark:text-gray-400">Reusable enemy stat blocks</p>
            </div>
          </div>
          <Link href="/dm/enemies/new">
            <Button>
              <Plus className="w-5 h-5 mr-2" />
              New Enemy
            </Button>
          </Link>
        </div>

        {/* Enemies List */}
        {enemies.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Sword className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No enemies yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create enemy templates to use in your encounters.
              </p>
              <Link href="/dm/enemies/new">
                <Button>
                  <Plus className="w-5 h-5 mr-2" />
                  Create Enemy
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enemies.map((enemy) => (
              <Card key={enemy.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {enemy.name}
                      </h3>
                      {enemy.challengeRating && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          CR {enemy.challengeRating}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/dm/enemies/${enemy.id}`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(enemy.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  {enemy.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {enemy.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="font-medium">{enemy.stats.hp}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{enemy.stats.ac}</span>
                    </div>
                  </div>

                  {/* Attacks */}
                  {enemy.stats.attacks && enemy.stats.attacks.length > 0 && (
                    <div className="space-y-1">
                      {enemy.stats.attacks.slice(0, 2).map((attack, i) => (
                        <p key={i} className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">{attack.name}:</span> {attack.damage}
                        </p>
                      ))}
                      {enemy.stats.attacks.length > 2 && (
                        <p className="text-sm text-gray-500">
                          +{enemy.stats.attacks.length - 2} more attacks
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
                  Delete Enemy Template?
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
                    onClick={() => deleteEnemy(deleteId)}
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

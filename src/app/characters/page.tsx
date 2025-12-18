'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Plus, Globe, ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { calculateModifier, formatModifier } from '@/lib/utils';

interface Character {
  id: string;
  name: string;
  class: string | null;
  race: string | null;
  level: number;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
    hp: number;
    maxHp: number;
    ac: number;
  };
  world: {
    id: string;
    name: string;
  } | null;
  updatedAt: string;
}

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchCharacters();
  }, []);

  async function fetchCharacters() {
    try {
      const res = await fetch('/api/characters');
      const data = await res.json();
      if (res.ok) {
        setCharacters(data.characters);
      }
    } catch (error) {
      console.error('Error fetching characters:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteCharacter(id: string) {
    try {
      const res = await fetch(`/api/characters/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCharacters(characters.filter(c => c.id !== id));
      }
    } catch (error) {
      console.error('Error deleting character:', error);
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Characters</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your adventurers</p>
            </div>
          </div>
          <Link href="/characters/new">
            <Button>
              <Plus className="w-5 h-5 mr-2" />
              New Character
            </Button>
          </Link>
        </div>

        {/* Characters List */}
        {characters.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No characters yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first character to begin your adventure.
              </p>
              <Link href="/characters/new">
                <Button>
                  <Plus className="w-5 h-5 mr-2" />
                  Create Character
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map((character) => (
              <Card key={character.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {character.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Level {character.level} {character.race} {character.class}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/characters/${character.id}`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(character.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <StatBox label="HP" value={`${character.stats.hp}/${character.stats.maxHp}`} />
                    <StatBox label="AC" value={character.stats.ac} />
                    <StatBox label="STR" value={formatModifier(calculateModifier(character.stats.str))} />
                    <StatBox label="DEX" value={formatModifier(calculateModifier(character.stats.dex))} />
                    <StatBox label="CON" value={formatModifier(calculateModifier(character.stats.con))} />
                    <StatBox label="WIS" value={formatModifier(calculateModifier(character.stats.wis))} />
                  </div>

                  {/* World */}
                  {character.world && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-100 dark:bg-gray-700/50 rounded">
                      <Globe className="w-4 h-4" />
                      <span>{character.world.name}</span>
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
                  Delete Character?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  This action cannot be undone. The character will be permanently removed.
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
                    onClick={() => deleteCharacter(deleteId)}
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

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-2 bg-gray-100 dark:bg-gray-700/50 rounded">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

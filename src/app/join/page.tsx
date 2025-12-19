'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Globe, Users, Check, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface Character {
  id: string;
  name: string;
  class: string | null;
  race: string | null;
  level: number;
  worldId: string | null;
}

interface ActiveSession {
  id: string;
  name: string;
}

export default function JoinWorldPage() {
  const router = useRouter();
  const [roomKey, setRoomKey] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ worldName: string; activeSession?: ActiveSession } | null>(null);

  useEffect(() => {
    fetchCharacters();
  }, []);

  async function fetchCharacters() {
    try {
      const res = await fetch('/api/characters');
      const data = await res.json();
      if (res.ok) {
        // Only show characters not already in a world
        setCharacters(data.characters.filter((c: Character) => !c.worldId));
      }
    } catch (error) {
      console.error('Error fetching characters:', error);
    } finally {
      setIsLoadingCharacters(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/worlds/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomKey: roomKey.toUpperCase(),
          characterId: selectedCharacter,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to join world');
        return;
      }

      setSuccess({
        worldName: data.world.name,
        activeSession: data.activeSession,
      });
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to {success.worldName}!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You&apos;ve successfully joined the world.
            </p>

            {success.activeSession && (
              <Link href={`/session/${success.activeSession.id}`} className="block mb-4">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Play className="w-4 h-4 mr-2" />
                  Join Active Session: {success.activeSession.name}
                </Button>
              </Link>
            )}

            <Link href="/dashboard">
              <Button variant={success.activeSession ? "outline" : "default"} className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-md">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Join a World</h1>
            <p className="text-gray-600 dark:text-gray-400">Enter a room key to join</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                <Globe className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <CardTitle>Room Key</CardTitle>
                <CardDescription>
                  Get the 6-character room key from your Dungeon Master
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
                  {error}
                </div>
              )}

              <Input
                id="roomKey"
                label="Room Key"
                placeholder="ABC123"
                value={roomKey}
                onChange={(e) => setRoomKey(e.target.value.toUpperCase())}
                required
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest uppercase"
              />

              {/* Character Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select a Character (optional)
                </label>
                {isLoadingCharacters ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  </div>
                ) : characters.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No available characters
                    </p>
                    <Link href="/characters/new" className="text-sm text-indigo-600 hover:text-indigo-500">
                      Create one first
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCharacter(null)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                        selectedCharacter === null
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Join without a character
                      </span>
                    </button>
                    {characters.map((character) => (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() => setSelectedCharacter(character.id)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                          selectedCharacter === character.id
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900 dark:text-white">
                          {character.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Level {character.level} {character.race} {character.class}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
                disabled={roomKey.length !== 6}
              >
                Join World
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

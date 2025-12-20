'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Globe, Users, Copy, Check, Settings,
  Trash2, RefreshCw, User, Shield, Heart, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AIAssistant } from '@/components/dm/AIAssistant';

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
    character: {
      id: string;
      name: string;
      class: string;
      race: string;
      level: number;
      stats: { hp: number; maxHp: number; ac: number };
    } | null;
  }[];
}

export default function WorldDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [world, setWorld] = useState<World | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);

  useEffect(() => {
    fetchWorld();
  }, [id]);

  async function fetchWorld() {
    try {
      const res = await fetch(`/api/worlds/${id}`);
      const data = await res.json();
      if (res.ok) {
        setWorld(data.world);
        setEditName(data.world.name);
        setEditDescription(data.world.description || '');
      }
    } catch (error) {
      console.error('Error fetching world:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/worlds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription }),
      });
      if (res.ok) {
        const data = await res.json();
        setWorld({ ...world!, name: data.world.name, description: data.world.description });
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating world:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/worlds/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/dm/worlds');
      }
    } catch (error) {
      console.error('Error deleting world:', error);
    }
  }

  async function copyRoomKey() {
    if (world) {
      await navigator.clipboard.writeText(world.roomKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  }

  async function handleStartSession() {
    if (!world) return;
    setIsStartingSession(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Session ${new Date().toLocaleDateString()}`,
          worldId: world.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/session/${data.session.id}`);
      }
    } catch (error) {
      console.error('Error starting session:', error);
    } finally {
      setIsStartingSession(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="text-center p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">World not found</p>
          <Link href="/dm/worlds">
            <Button>Back to Worlds</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dm/worlds">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-2xl font-bold"
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{world.name}</h1>
            )}
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={handleSave} isLoading={isSaving}>Save</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    placeholder="Describe your world..."
                  />
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">
                    {world.description || 'No description set'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Party Members */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Party Members</CardTitle>
                    <CardDescription>{world.members.length} player(s) joined</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {world.members.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No players have joined yet. Share your room key!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {world.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                          <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {member.user.name}
                          </p>
                          {member.character ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Playing: {member.character.name} (Lvl {member.character.level} {member.character.race} {member.character.class})
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500">No character selected</p>
                          )}
                        </div>
                        {member.character && (
                          <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Heart className="w-4 h-4 text-red-500" />
                              <span>{member.character.stats.hp}/{member.character.stats.maxHp}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Shield className="w-4 h-4 text-blue-500" />
                              <span>{member.character.stats.ac}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Room Key */}
            <Card>
              <CardHeader>
                <CardTitle>Room Key</CardTitle>
                <CardDescription>Share this with your players</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <code className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-widest">
                    {world.roomKey}
                  </code>
                  <button
                    onClick={copyRoomKey}
                    className="ml-auto p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded"
                  >
                    {copiedKey ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-indigo-600" />
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleStartSession}
                  isLoading={isStartingSession}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Start Session
                </Button>
                <Link href={`/dm/worlds/${id}/locations`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <MapPin className="w-4 h-4 mr-2" />
                    Locations
                  </Button>
                </Link>
                <Link href="/dm/enemies" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="w-4 h-4 mr-2" />
                    Enemy Templates
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Assistant */}
      <AIAssistant worldId={world.id} />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Delete World?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This will permanently delete the world and remove all members. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={handleDelete}
                >
                  Delete World
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

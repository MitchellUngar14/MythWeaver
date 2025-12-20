'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpellForm, type SpellFormData } from '@/components/spells/SpellForm';
import { AIAssistant } from '@/components/dm/AIAssistant';
import type { World } from '@/lib/schema';

const SPELL_QUICK_PROMPTS = [
  { label: 'Damage Spell', prompt: 'Suggest a unique damage spell with balanced dice and interesting mechanics. Include the damage, range, save type, and any special effects.' },
  { label: 'Utility Spell', prompt: 'Create a creative utility spell that solves problems in interesting ways without being overpowered.' },
  { label: 'Healing Spell', prompt: 'Design a healing or support spell with balanced healing amounts and interesting secondary effects.' },
  { label: 'Balance Check', prompt: 'Review this spell for balance. Is the damage/effect appropriate for its level? Are there any exploits?' },
];

export default function CreateSpellPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [selectedWorld, setSelectedWorld] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchWorlds() {
      try {
        const res = await fetch('/api/worlds');
        const data = await res.json();
        if (res.ok && data.worlds) {
          setWorlds(data.worlds);
          if (data.worlds.length > 0) {
            setSelectedWorld(data.worlds[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching worlds:', err);
      }
    }
    if (session?.user?.isDm) {
      fetchWorlds();
    }
  }, [session]);

  async function handleSubmit(data: SpellFormData) {
    if (!selectedWorld) {
      setError('Please select a world');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/spells', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          worldId: selectedWorld,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to create spell');
      }

      router.push('/dm/spells');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create spell');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === 'loading' || !session?.user?.isDm) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dm/spells">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Spells
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Spell</h1>
            <p className="text-gray-600 dark:text-gray-400">Add a new custom spell to your world</p>
          </div>
        </div>

        {/* World Selector */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            World *
          </label>
          <select
            value={selectedWorld}
            onChange={(e) => setSelectedWorld(e.target.value)}
            className="w-full max-w-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          >
            {worlds.length === 0 ? (
              <option value="">No worlds available</option>
            ) : (
              worlds.map(world => (
                <option key={world.id} value={world.id}>{world.name}</option>
              ))
            )}
          </select>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <SpellForm
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dm/spells')}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* AI Assistant */}
      <AIAssistant
        context="I'm creating a D&D 5e spell. Help me with spell mechanics, damage dice, saving throws, range, duration, and balancing the spell for its level."
        quickPrompts={SPELL_QUICK_PROMPTS}
        title="Spell Creator AI"
        placeholder="Ask about spell mechanics, balance..."
        emptyStateText="Need help creating a spell? Ask me!"
      />
    </div>
  );
}

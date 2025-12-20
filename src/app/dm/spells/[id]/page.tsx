'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpellForm, type SpellFormData } from '@/components/spells/SpellForm';
import { AIAssistant } from '@/components/dm/AIAssistant';
import type { Spell, SpellComponents } from '@/lib/schema';

const SPELL_QUICK_PROMPTS = [
  { label: 'Improve Spell', prompt: 'Suggest improvements to make this spell more interesting or balanced.' },
  { label: 'Balance Check', prompt: 'Is this spell balanced for its level? Are there any potential exploits or issues?' },
  { label: 'Add Higher Levels', prompt: 'Suggest scaling effects for when this spell is cast at higher levels.' },
  { label: 'Similar Spells', prompt: 'What official D&D spells are similar to this one? How does it compare?' },
];

export default function EditSpellPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [spell, setSpell] = useState<Spell | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchSpell() {
      try {
        const res = await fetch(`/api/spells/${id}`);
        if (res.ok) {
          const data = await res.json();
          setSpell(data.spell);
        } else {
          setError('Spell not found');
        }
      } catch (err) {
        console.error('Error fetching spell:', err);
        setError('Failed to load spell');
      } finally {
        setIsLoading(false);
      }
    }
    if (session?.user?.isDm && id) {
      fetchSpell();
    }
  }, [session, id]);

  async function handleSubmit(data: SpellFormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/spells/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to update spell');
      }

      router.push('/dm/spells');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update spell');
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!spell) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Spell not found</p>
            <Link href="/dm/spells">
              <Button variant="outline" className="mt-4">
                Back to Spells
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (spell.isCore) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Core spells cannot be edited</p>
            <Link href="/dm/spells">
              <Button variant="outline" className="mt-4">
                Back to Spells
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const initialData: Partial<SpellFormData> = {
    name: spell.name,
    level: spell.level,
    school: spell.school,
    castingTime: spell.castingTime,
    range: spell.range,
    components: spell.components as SpellComponents,
    duration: spell.duration,
    concentration: spell.concentration || false,
    ritual: spell.ritual || false,
    description: spell.description,
    higherLevels: spell.higherLevels || undefined,
    classes: (spell.classes as string[]) || [],
  };

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Spell</h1>
            <p className="text-gray-600 dark:text-gray-400">Update {spell.name}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <SpellForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dm/spells')}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* AI Assistant */}
      <AIAssistant
        context={`I'm editing a D&D 5e spell called "${spell.name}". It's a ${spell.level === 0 ? 'cantrip' : `level ${spell.level} spell`} from the ${spell.school} school. Description: ${spell.description}`}
        quickPrompts={SPELL_QUICK_PROMPTS}
        title="Spell Editor AI"
        placeholder="Ask about spell balance, improvements..."
        emptyStateText="Need help with this spell? Ask me!"
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Plus, Search, ChevronLeft, Trash2, Edit, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getSpellSchoolIcon,
  getSpellSchoolColor,
  getSpellSchoolBgColor,
  SPELL_LEVEL_LABELS,
  SPELL_SCHOOLS,
} from '@/lib/spell-data';
import type { Spell, World } from '@/lib/schema';

export default function SpellsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [spells, setSpells] = useState<Spell[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [selectedWorld, setSelectedWorld] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [schoolFilter, setSchoolFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCoreSpells, setShowCoreSpells] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch worlds
  useEffect(() => {
    async function fetchWorlds() {
      try {
        const res = await fetch('/api/worlds');
        const data = await res.json();
        if (res.ok) {
          setWorlds(data.worlds || []);
          if (data.worlds?.length > 0 && !selectedWorld) {
            setSelectedWorld(data.worlds[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching worlds:', error);
      }
    }
    if (session?.user?.isDm) {
      fetchWorlds();
    }
  }, [session]);

  // Fetch spells when world changes
  useEffect(() => {
    async function fetchSpells() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (showCoreSpells) {
          params.set('coreOnly', 'true');
        } else if (selectedWorld) {
          params.set('worldId', selectedWorld);
        }

        const res = await fetch(`/api/spells?${params}`);
        const data = await res.json();
        if (res.ok) {
          setSpells(data.spells || []);
        }
      } catch (error) {
        console.error('Error fetching spells:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSpells();
  }, [selectedWorld, showCoreSpells]);

  async function handleDelete(spellId: string) {
    if (!confirm('Are you sure you want to delete this spell?')) return;

    try {
      const res = await fetch(`/api/spells/${spellId}`, { method: 'DELETE' });
      if (res.ok) {
        setSpells(spells.filter(s => s.id !== spellId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete spell');
      }
    } catch (error) {
      console.error('Error deleting spell:', error);
    }
  }

  // Filter spells
  const filteredSpells = spells.filter(spell => {
    if (levelFilter !== '' && spell.level !== parseInt(levelFilter)) return false;
    if (schoolFilter && spell.school !== schoolFilter) return false;
    if (searchQuery && !spell.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Separate core and custom spells
  const coreSpells = filteredSpells.filter(s => s.isCore);
  const customSpells = filteredSpells.filter(s => !s.isCore);

  if (status === 'loading' || !session?.user?.isDm) {
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
                <ChevronLeft className="w-4 h-4 mr-1" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Spell Library</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage spells for your worlds</p>
            </div>
          </div>
          <Link href="/dm/spells/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Spell
            </Button>
          </Link>
        </div>

        {/* World Selector & Core Toggle */}
        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select World
            </label>
            <select
              value={selectedWorld}
              onChange={(e) => {
                setSelectedWorld(e.target.value);
                setShowCoreSpells(false);
              }}
              disabled={showCoreSpells}
              className="w-full max-w-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
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

          <Button
            variant={showCoreSpells ? 'primary' : 'outline'}
            onClick={() => setShowCoreSpells(!showCoreSpells)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {showCoreSpells ? 'Showing Core Spells' : 'View Core Spells'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search spells..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Levels</option>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
              <option key={level} value={level}>{SPELL_LEVEL_LABELS[level]}</option>
            ))}
          </select>
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Schools</option>
            {SPELL_SCHOOLS.map(school => (
              <option key={school} value={school}>
                {school.charAt(0).toUpperCase() + school.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Spells Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredSpells.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {spells.length === 0
                ? showCoreSpells
                  ? 'Core spells have not been seeded yet.'
                  : 'No custom spells yet. Create your first spell!'
                : 'No spells match your filters.'}
            </p>
            {showCoreSpells && spells.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Run the seed endpoint to add core D&D spells.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Custom Spells */}
            {customSpells.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Custom Spells ({customSpells.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customSpells.map(spell => (
                    <SpellCard
                      key={spell.id}
                      spell={spell}
                      onEdit={() => router.push(`/dm/spells/${spell.id}`)}
                      onDelete={() => handleDelete(spell.id)}
                      canEdit={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Core Spells */}
            {coreSpells.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Core Spells ({coreSpells.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coreSpells.map(spell => (
                    <SpellCard
                      key={spell.id}
                      spell={spell}
                      canEdit={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface SpellCardProps {
  spell: Spell;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

function SpellCard({ spell, onEdit, onDelete, canEdit }: SpellCardProps) {
  const SchoolIcon = getSpellSchoolIcon(spell.school);
  const schoolColor = getSpellSchoolColor(spell.school);
  const schoolBgColor = getSpellSchoolBgColor(spell.school);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${schoolBgColor}`}>
            <SchoolIcon className={`w-4 h-4 ${schoolColor}`} />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {spell.name}
          </h3>
        </div>
        {canEdit && (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
          {SPELL_LEVEL_LABELS[spell.level]}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded ${schoolBgColor} ${schoolColor}`}>
          {spell.school}
        </span>
        {spell.concentration && (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600">
            Concentration
          </span>
        )}
        {spell.ritual && (
          <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600">
            Ritual
          </span>
        )}
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
        <div><strong>Casting Time:</strong> {spell.castingTime}</div>
        <div><strong>Range:</strong> {spell.range}</div>
        <div><strong>Duration:</strong> {spell.duration}</div>
      </div>

      {spell.description && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500 line-clamp-2">
          {spell.description}
        </p>
      )}

      {spell.isCore && (
        <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Core Spell
        </div>
      )}
    </div>
  );
}

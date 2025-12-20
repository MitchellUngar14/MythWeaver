'use client';

import { useState, useEffect } from 'react';
import { X, Search, Loader2, Plus, ChevronDown, ChevronUp, Clock, Target, Hourglass, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Spell, SpellComponents } from '@/lib/schema';
import {
  getSpellSchoolIcon,
  getSpellSchoolColor,
  getSpellSchoolBgColor,
  SPELL_LEVEL_LABELS,
  SPELL_SCHOOLS,
  formatSpellComponents,
} from '@/lib/spell-data';

interface AddSpellModalProps {
  worldId: string | null;
  existingSpellIds: string[];
  onAdd: (spellId: string) => void;
  onClose: () => void;
}

export function AddSpellModal({
  worldId,
  existingSpellIds,
  onAdd,
  onClose,
}: AddSpellModalProps) {
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterSchool, setFilterSchool] = useState<string>('');
  const [spells, setSpells] = useState<Spell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingSpellId, setAddingSpellId] = useState<string | null>(null);
  const [expandedSpellId, setExpandedSpellId] = useState<string | null>(null);

  useEffect(() => {
    fetchSpells();
  }, [worldId]);

  async function fetchSpells() {
    try {
      const params = new URLSearchParams();
      if (worldId) params.set('worldId', worldId);

      const res = await fetch(`/api/spells?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSpells(data.spells || []);
      }
    } catch (error) {
      console.error('Error fetching spells:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdd(spellId: string) {
    setAddingSpellId(spellId);
    try {
      await onAdd(spellId);
    } finally {
      setAddingSpellId(null);
    }
  }

  // Filter spells
  const filteredSpells = spells
    .filter(spell => !existingSpellIds.includes(spell.id))
    .filter(spell => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (!spell.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      if (filterLevel !== '') {
        if (spell.level !== parseInt(filterLevel)) {
          return false;
        }
      }
      if (filterSchool) {
        if (spell.school !== filterSchool) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by level, then by name
      if (a.level !== b.level) return a.level - b.level;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Add Spell
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search spells..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Levels</option>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                <option key={level} value={level}>
                  {SPELL_LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
            <select
              value={filterSchool}
              onChange={(e) => setFilterSchool(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Schools</option>
              {SPELL_SCHOOLS.map(school => (
                <option key={school} value={school}>
                  {school.charAt(0).toUpperCase() + school.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Spell list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : filteredSpells.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {spells.length === 0 ? (
                <>
                  <p>No spells available.</p>
                  <p className="text-sm mt-1">Core spells need to be seeded first.</p>
                </>
              ) : search || filterLevel || filterSchool ? (
                <p>No spells match your filters.</p>
              ) : (
                <p>All available spells have been added.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSpells.map(spell => {
                const SchoolIcon = getSpellSchoolIcon(spell.school);
                const schoolColor = getSpellSchoolColor(spell.school);
                const schoolBgColor = getSpellSchoolBgColor(spell.school);
                const isAdding = addingSpellId === spell.id;
                const isExpanded = expandedSpellId === spell.id;
                const components = spell.components as SpellComponents | null;

                return (
                  <div
                    key={spell.id}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden"
                  >
                    {/* Header - clickable to expand */}
                    <div
                      className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => setExpandedSpellId(isExpanded ? null : spell.id)}
                    >
                      {/* School icon */}
                      <div className={`p-1.5 rounded ${schoolBgColor}`}>
                        <SchoolIcon className={`w-4 h-4 ${schoolColor}`} />
                      </div>

                      {/* Spell info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white truncate">
                            {spell.name}
                          </span>
                          {spell.concentration && (
                            <span className="text-[10px] px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                              C
                            </span>
                          )}
                          {spell.ritual && (
                            <span className="text-[10px] px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                              R
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {SPELL_LEVEL_LABELS[spell.level]} {spell.school}
                        </div>
                      </div>

                      {/* Expand/collapse indicator */}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}

                      {/* Add button */}
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdd(spell.id);
                        }}
                        isLoading={isAdding}
                        disabled={isAdding}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-gray-200 dark:border-gray-600 space-y-3">
                        {/* Spell details grid */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{spell.castingTime}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <Target className="w-3.5 h-3.5" />
                            <span>{spell.range}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <Hourglass className="w-3.5 h-3.5" />
                            <span>{spell.duration}</span>
                          </div>
                          {components && (
                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{formatSpellComponents(components)}</span>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {spell.description}
                        </div>

                        {/* At Higher Levels */}
                        {spell.higherLevels && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">At Higher Levels: </span>
                            <span className="text-gray-700 dark:text-gray-300">{spell.higherLevels}</span>
                          </div>
                        )}

                        {/* Classes */}
                        {spell.classes && (spell.classes as string[]).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(spell.classes as string[]).map(cls => (
                              <span
                                key={cls}
                                className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded"
                              >
                                {cls}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredSpells.length} spell{filteredSpells.length !== 1 ? 's' : ''} available
          </span>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

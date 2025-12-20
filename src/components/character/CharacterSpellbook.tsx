'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Loader2, Filter, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpellSlotTracker } from './SpellSlotTracker';
import { SpellCard } from './SpellCard';
import { AddSpellModal } from './AddSpellModal';
import type { Spell, CharacterSpell, SpellSlots, SpellcastingInfo } from '@/lib/schema';
import { DEFAULT_SPELL_SLOTS, SPELL_LEVEL_LABELS } from '@/lib/spell-data';

interface CharacterSpellWithSpell extends CharacterSpell {
  spell: Spell;
}

interface CharacterSpellbookProps {
  characterId: string;
  worldId: string | null;
  spellcasting: SpellcastingInfo | null;
  canEdit?: boolean;
  onSpellSlotsChange?: (spellSlots: SpellSlots) => void;
}

export function CharacterSpellbook({
  characterId,
  worldId,
  spellcasting,
  canEdit = false,
  onSpellSlotsChange,
}: CharacterSpellbookProps) {
  const [spells, setSpells] = useState<CharacterSpellWithSpell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterLevel, setFilterLevel] = useState<number | null>(null);
  const [showPreparedOnly, setShowPreparedOnly] = useState(false);

  const spellSlots = spellcasting?.spellSlots || DEFAULT_SPELL_SLOTS;

  useEffect(() => {
    fetchSpells();
  }, [characterId]);

  async function fetchSpells() {
    try {
      const res = await fetch(`/api/characters/${characterId}/spells`);
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

  async function handleUseSlot(level: number) {
    try {
      const res = await fetch(`/api/characters/${characterId}/spell-slots`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, action: 'use' }),
      });
      if (res.ok) {
        const data = await res.json();
        onSpellSlotsChange?.(data.spellSlots);
      }
    } catch (error) {
      console.error('Error using spell slot:', error);
    }
  }

  async function handleRestoreSlot(level: number) {
    try {
      const res = await fetch(`/api/characters/${characterId}/spell-slots`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, action: 'restore' }),
      });
      if (res.ok) {
        const data = await res.json();
        onSpellSlotsChange?.(data.spellSlots);
      }
    } catch (error) {
      console.error('Error restoring spell slot:', error);
    }
  }

  async function handleRestoreAll() {
    try {
      const res = await fetch(`/api/characters/${characterId}/spell-slots`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restoreAll' }),
      });
      if (res.ok) {
        const data = await res.json();
        onSpellSlotsChange?.(data.spellSlots);
      }
    } catch (error) {
      console.error('Error restoring all slots:', error);
    }
  }

  async function handleTogglePrepared(characterSpellId: string, currentPrepared: boolean) {
    try {
      const spell = spells.find(s => s.id === characterSpellId);
      if (!spell) return;

      const res = await fetch(`/api/characters/${characterId}/spells`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spellId: spell.spellId,
          isPrepared: !currentPrepared,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSpells(prev => prev.map(s =>
          s.id === characterSpellId ? { ...s, ...data.characterSpell } : s
        ));
      }
    } catch (error) {
      console.error('Error toggling prepared:', error);
    }
  }

  async function handleRemoveSpell(spellId: string) {
    try {
      const res = await fetch(`/api/characters/${characterId}/spells?spellId=${spellId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSpells(prev => prev.filter(s => s.spellId !== spellId));
      }
    } catch (error) {
      console.error('Error removing spell:', error);
    }
  }

  async function handleAddSpell(spellId: string) {
    try {
      const res = await fetch(`/api/characters/${characterId}/spells`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spellId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSpells(prev => [...prev, data.characterSpell]);
      }
    } catch (error) {
      console.error('Error adding spell:', error);
    }
  }

  // Group spells by level
  const spellsByLevel = spells.reduce((acc, charSpell) => {
    const level = charSpell.spell.level;
    if (!acc[level]) acc[level] = [];
    acc[level].push(charSpell);
    return acc;
  }, {} as Record<number, CharacterSpellWithSpell[]>);

  // Filter spells
  let filteredSpellsByLevel = spellsByLevel;
  if (filterLevel !== null) {
    filteredSpellsByLevel = { [filterLevel]: spellsByLevel[filterLevel] || [] };
  }
  if (showPreparedOnly) {
    filteredSpellsByLevel = Object.fromEntries(
      Object.entries(filteredSpellsByLevel).map(([level, spells]) => [
        level,
        spells.filter(s => s.isPrepared || s.isAlwaysPrepared),
      ]).filter(([, spells]) => spells.length > 0)
    );
  }

  // Get unique spell levels for filter
  const availableLevels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b);

  if (!spellcasting) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400">
          This character does not have spellcasting abilities.
        </p>
        {canEdit && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Set a spellcasting ability in the character stats to enable spellcasting.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Spell Slots */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Spell Slots
        </h3>
        <SpellSlotTracker
          spellSlots={spellSlots}
          editable={canEdit}
          onUseSlot={handleUseSlot}
          onRestoreSlot={handleRestoreSlot}
          onRestoreAll={handleRestoreAll}
        />
      </div>

      {/* Spells List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Spells ({spells.length})
          </h3>
          <div className="flex items-center gap-2">
            {/* Filter by level */}
            {availableLevels.length > 1 && (
              <select
                value={filterLevel ?? ''}
                onChange={(e) => setFilterLevel(e.target.value ? parseInt(e.target.value) : null)}
                className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              >
                <option value="">All Levels</option>
                {availableLevels.map(level => (
                  <option key={level} value={level}>
                    {SPELL_LEVEL_LABELS[level]}
                  </option>
                ))}
              </select>
            )}
            {/* Prepared only toggle */}
            <Button
              variant={showPreparedOnly ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowPreparedOnly(!showPreparedOnly)}
              className="text-xs"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Prepared
            </Button>
            {canEdit && (
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : spells.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <BookOpen className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No spells known</p>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Spell
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(filteredSpellsByLevel)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([level, levelSpells]) => (
                <div key={level}>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    {SPELL_LEVEL_LABELS[parseInt(level)]}s ({levelSpells.length})
                  </h4>
                  <div className="space-y-2">
                    {levelSpells
                      .sort((a, b) => a.spell.name.localeCompare(b.spell.name))
                      .map(charSpell => (
                        <SpellCard
                          key={charSpell.id}
                          spell={charSpell.spell}
                          characterSpell={charSpell}
                          editable={canEdit}
                          showPrepareToggle={parseInt(level) > 0} // Only leveled spells need preparation
                          onTogglePrepared={() => handleTogglePrepared(charSpell.id, charSpell.isPrepared || false)}
                          onRemove={() => handleRemoveSpell(charSpell.spellId)}
                        />
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Add Spell Modal */}
      {showAddModal && (
        <AddSpellModal
          worldId={worldId}
          existingSpellIds={spells.map(s => s.spellId)}
          onAdd={handleAddSpell}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

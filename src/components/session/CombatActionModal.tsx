'use client';

import { useState, useEffect } from 'react';
import { X, Sword, Zap, Shield, Footprints, Hand, ChevronDown, ChevronUp, Check, Circle, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CombatantState } from '@/stores/sessionStore';
import type { Spell, SpellSlots, SpellSlot, SpellComponents } from '@/lib/schema';
import {
  ACTIONS_BY_CATEGORY,
  CATEGORY_INFO,
  isActionAvailable,
  type ActionCategory,
  type CombatAction,
  type ActionEconomy,
  type TakenAction,
  DEFAULT_ACTION_ECONOMY,
} from '@/lib/combat-actions';
import {
  getSpellSchoolIcon,
  getSpellSchoolColor,
  getSpellSchoolBgColor,
  SPELL_LEVEL_LABELS,
  formatSpellComponents,
} from '@/lib/spell-data';

interface CharacterSpell {
  id: string;
  spellId: string;
  isPrepared: boolean;
  isAlwaysPrepared: boolean;
  spell: Spell;
}

interface CombatActionModalProps {
  combatant: CombatantState;
  sessionId: string;
  characterId?: string | null;
  spellSlots?: SpellSlots | null;
  onClose: () => void;
  onActionTaken: (action: {
    actionId: string;
    actionName: string;
    category: ActionCategory;
    details?: string;
    spellId?: string;
    spellLevel?: number;
    slotLevel?: number;
  }) => Promise<void>;
}

// Category icons
const CATEGORY_ICONS: Record<ActionCategory, React.ReactNode> = {
  action: <Sword className="w-4 h-4" />,
  bonus_action: <Zap className="w-4 h-4" />,
  reaction: <Shield className="w-4 h-4" />,
  movement: <Footprints className="w-4 h-4" />,
  free: <Hand className="w-4 h-4" />,
};

function ActionEconomyIndicator({ economy }: { economy: ActionEconomy }) {
  const indicators = [
    { key: 'action', label: 'Action', used: economy.usedAction, color: 'bg-indigo-500' },
    { key: 'bonus', label: 'Bonus', used: economy.usedBonusAction, color: 'bg-amber-500' },
    { key: 'reaction', label: 'Reaction', used: economy.usedReaction, color: 'bg-purple-500' },
    { key: 'movement', label: 'Move', used: economy.usedMovement, color: 'bg-green-500' },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {indicators.map((ind) => (
        <div
          key={ind.key}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
            ind.used
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              : `${ind.color} text-white`
          }`}
        >
          {ind.used ? (
            <Check className="w-3 h-3" />
          ) : (
            <Circle className="w-3 h-3" />
          )}
          {ind.label}
        </div>
      ))}
    </div>
  );
}

function ActionCategorySection({
  category,
  actions,
  economy,
  onSelect,
  isLoading,
}: {
  category: ActionCategory;
  actions: CombatAction[];
  economy: ActionEconomy;
  onSelect: (action: CombatAction) => void;
  isLoading: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(category === 'action');
  const categoryInfo = CATEGORY_INFO[category];
  const isAvailable = isActionAvailable(category, economy);

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      isAvailable
        ? 'border-gray-200 dark:border-gray-700'
        : 'border-gray-100 dark:border-gray-800 opacity-60'
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-3 ${categoryInfo.bgColor} hover:opacity-90 transition-opacity`}
        disabled={isLoading}
      >
        <div className="flex items-center gap-2">
          <span className={categoryInfo.color}>{CATEGORY_ICONS[category]}</span>
          <span className={`font-medium ${categoryInfo.color}`}>{categoryInfo.name}</span>
          {!isAvailable && category !== 'free' && (
            <span className="text-xs px-2 py-0.5 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
              Used
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className={`w-4 h-4 ${categoryInfo.color}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${categoryInfo.color}`} />
        )}
      </button>

      {isExpanded && (
        <div className="p-2 space-y-1 max-h-60 overflow-y-auto bg-white dark:bg-gray-800">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onSelect(action)}
              disabled={!isAvailable && category !== 'free' || isLoading}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                isAvailable || category === 'free'
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                  : 'cursor-not-allowed opacity-50'
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                {action.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {action.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SpellsSection({
  spellsByLevel,
  economy,
  hasAvailableSlot,
  onSelect,
  isLoading,
}: {
  spellsByLevel: Record<number, CharacterSpell[]>;
  economy: ActionEconomy;
  hasAvailableSlot: (level: number) => boolean;
  onSelect: (spell: CharacterSpell) => void;
  isLoading: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const canUseAction = !economy.usedAction;

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      canUseAction
        ? 'border-purple-200 dark:border-purple-800'
        : 'border-gray-100 dark:border-gray-800 opacity-60'
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 hover:opacity-90 transition-opacity"
        disabled={isLoading}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="font-medium text-purple-600 dark:text-purple-400">Spells</span>
          {!canUseAction && (
            <span className="text-xs px-2 py-0.5 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
              Action Used
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-2 space-y-3 max-h-60 overflow-y-auto bg-white dark:bg-gray-800">
          {Object.entries(spellsByLevel)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([level, spells]) => (
              <div key={level}>
                <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1 px-1">
                  {SPELL_LEVEL_LABELS[parseInt(level)]}
                </div>
                <div className="space-y-1">
                  {spells.map((charSpell) => {
                    const spell = charSpell.spell;
                    const spellLevel = spell.level;
                    const canCast = spellLevel === 0 || hasAvailableSlot(spellLevel);
                    const SchoolIcon = getSpellSchoolIcon(spell.school);
                    const schoolColor = getSpellSchoolColor(spell.school);

                    return (
                      <button
                        key={charSpell.id}
                        onClick={() => onSelect(charSpell)}
                        disabled={!canUseAction || !canCast || isLoading}
                        className={`w-full text-left p-2 rounded-lg transition-colors ${
                          canUseAction && canCast
                            ? 'hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer'
                            : 'cursor-not-allowed opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <SchoolIcon className={`w-4 h-4 ${schoolColor}`} />
                          <span className="font-medium text-gray-900 dark:text-white text-sm flex-1">
                            {spell.name}
                          </span>
                          {spell.concentration && (
                            <span className="text-[10px] px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded">
                              C
                            </span>
                          )}
                          {!canCast && spellLevel > 0 && (
                            <span className="text-[10px] text-red-500">No slots</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 pl-6">
                          {spell.castingTime} • {spell.range}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function CombatActionModal({
  combatant,
  sessionId,
  characterId,
  spellSlots,
  onClose,
  onActionTaken,
}: CombatActionModalProps) {
  const [selectedAction, setSelectedAction] = useState<CombatAction | null>(null);
  const [selectedSpell, setSelectedSpell] = useState<CharacterSpell | null>(null);
  const [selectedSlotLevel, setSelectedSlotLevel] = useState<number | null>(null);
  const [details, setDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characterSpells, setCharacterSpells] = useState<CharacterSpell[]>([]);
  const [isLoadingSpells, setIsLoadingSpells] = useState(false);

  const economy = combatant.actionEconomy || { ...DEFAULT_ACTION_ECONOMY };

  // Fetch character spells
  useEffect(() => {
    if (!characterId) return;

    async function fetchSpells() {
      setIsLoadingSpells(true);
      try {
        const res = await fetch(`/api/characters/${characterId}/spells`);
        if (res.ok) {
          const data = await res.json();
          setCharacterSpells(data.spells || []);
        }
      } catch (err) {
        console.error('Failed to fetch spells:', err);
      } finally {
        setIsLoadingSpells(false);
      }
    }
    fetchSpells();
  }, [characterId]);

  async function handleConfirmAction() {
    if (!selectedAction && !selectedSpell) return;

    setIsLoading(true);
    setError(null);

    try {
      if (selectedSpell) {
        // Casting a spell
        const spellLevel = selectedSpell.spell.level;
        const isCantrip = spellLevel === 0;

        await onActionTaken({
          actionId: `cast_spell_${selectedSpell.spell.id}`,
          actionName: `Cast ${selectedSpell.spell.name}`,
          category: selectedSpell.spell.castingTime?.toLowerCase().includes('bonus') ? 'bonus_action' : 'action',
          details: details.trim() || undefined,
          spellId: selectedSpell.spell.id,
          spellLevel,
          slotLevel: isCantrip ? undefined : selectedSlotLevel || spellLevel,
        });
      } else if (selectedAction) {
        await onActionTaken({
          actionId: selectedAction.id,
          actionName: selectedAction.name,
          category: selectedAction.category,
          details: details.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to take action');
    } finally {
      setIsLoading(false);
    }
  }

  function handleActionSelect(action: CombatAction) {
    setSelectedAction(action);
    setSelectedSpell(null);
    setSelectedSlotLevel(null);
    setDetails('');
    setError(null);
  }

  function handleSpellSelect(charSpell: CharacterSpell) {
    setSelectedSpell(charSpell);
    setSelectedAction(null);
    setSelectedSlotLevel(charSpell.spell.level === 0 ? null : charSpell.spell.level);
    setDetails('');
    setError(null);
  }

  function handleBack() {
    setSelectedAction(null);
    setSelectedSpell(null);
    setSelectedSlotLevel(null);
    setError(null);
  }

  // Get available slot levels for a spell
  function getAvailableSlotLevels(minLevel: number): number[] {
    if (!spellSlots || minLevel === 0) return [];

    const levels: number[] = [];

    // Iterate through all 9 spell slot levels
    for (let level = 1; level <= 9; level++) {
      const slotKey = `level${level}` as keyof SpellSlots;
      const slot = spellSlots[slotKey];
      if (slot && level >= minLevel && slot.max > 0 && slot.used < slot.max) {
        levels.push(level);
      }
    }

    return levels;
  }

  // Check if character has available spell slots for a given spell level
  function hasAvailableSlot(minLevel: number): boolean {
    return minLevel === 0 || getAvailableSlotLevels(minLevel).length > 0;
  }

  // Group spells by level
  const spellsByLevel = characterSpells.reduce((acc, cs) => {
    const level = cs.spell.level;
    if (!acc[level]) acc[level] = [];
    acc[level].push(cs);
    return acc;
  }, {} as Record<number, CharacterSpell[]>);

  const hasSpells = characterSpells.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl z-50 flex flex-col max-h-[90vh] md:max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Take Action
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {combatant.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Action Economy */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
            Available This Turn
          </div>
          <ActionEconomyIndicator economy={economy} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {selectedAction || selectedSpell ? (
            // Confirmation view
            <div className="space-y-4">
              {selectedSpell ? (
                // Spell confirmation
                <>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="font-bold text-gray-900 dark:text-white">
                        {selectedSpell.spell.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                        {SPELL_LEVEL_LABELS[selectedSpell.spell.level]}
                      </span>
                      {selectedSpell.spell.concentration && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                          C
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex gap-3">
                      <span>{selectedSpell.spell.castingTime}</span>
                      <span>{selectedSpell.spell.range}</span>
                      <span>{selectedSpell.spell.duration}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                      {selectedSpell.spell.description}
                    </p>
                  </div>

                  {/* Spell slot selector (for non-cantrips) */}
                  {selectedSpell.spell.level > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Cast at Level
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {getAvailableSlotLevels(selectedSpell.spell.level).map(level => (
                          <button
                            key={level}
                            onClick={() => setSelectedSlotLevel(level)}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                              selectedSlotLevel === level
                                ? 'bg-purple-600 border-purple-600 text-white'
                                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400'
                            }`}
                          >
                            {level}{getOrdinalSuffix(level)} Level
                          </button>
                        ))}
                      </div>
                      {getAvailableSlotLevels(selectedSpell.spell.level).length === 0 && (
                        <p className="text-sm text-red-500 mt-1">No spell slots available!</p>
                      )}
                      {selectedSpell.spell.higherLevels && selectedSlotLevel && selectedSlotLevel > selectedSpell.spell.level && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                          {selectedSpell.spell.higherLevels}
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : selectedAction && (
                // Standard action confirmation
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={CATEGORY_INFO[selectedAction.category].color}>
                      {CATEGORY_ICONS[selectedAction.category]}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {selectedAction.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_INFO[selectedAction.category].bgColor} ${CATEGORY_INFO[selectedAction.category].color}`}>
                      {CATEGORY_INFO[selectedAction.category].name.replace('s', '')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedAction.description}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Details (optional)
                </label>
                <Input
                  placeholder={selectedSpell ? "e.g., Targeting the goblin group" : "e.g., Attacked Goblin 1"}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Add context about your action for the combat log
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmAction}
                  isLoading={isLoading}
                  disabled={!!(selectedSpell && selectedSpell.spell.level > 0 && !selectedSlotLevel)}
                  className="flex-1"
                >
                  {selectedSpell ? 'Cast Spell' : 'Confirm Action'}
                </Button>
              </div>
            </div>
          ) : (
            // Action selection view
            <>
              {/* Spells Section */}
              {hasSpells && (
                <SpellsSection
                  spellsByLevel={spellsByLevel}
                  economy={economy}
                  hasAvailableSlot={hasAvailableSlot}
                  onSelect={handleSpellSelect}
                  isLoading={isLoading || isLoadingSpells}
                />
              )}

              {Object.entries(ACTIONS_BY_CATEGORY).map(([category, actions]) => (
                <ActionCategorySection
                  key={category}
                  category={category as ActionCategory}
                  actions={actions}
                  economy={economy}
                  onSelect={handleActionSelect}
                  isLoading={isLoading}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer - only show if no action/spell selected */}
        {!selectedAction && !selectedSpell && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

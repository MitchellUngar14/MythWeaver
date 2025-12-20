'use client';

import { useState } from 'react';
import { Swords, Plus, SkipForward, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { CombatantCard } from './CombatantCard';
import { AddCombatantModal } from './AddCombatantModal';
import type { CombatantState } from '@/stores/sessionStore';

interface CombatTrackerProps {
  combatants: CombatantState[];
  currentTurn: string | null;
  round: number;
  combatActive: boolean;
  isDm: boolean;
  userId: string;
  sessionId: string;
  worldId: string;
  currentLocation: string | null;
  currentLocationResourceId: string | null;
  onUpdateCombatant: (id: string, changes: Partial<CombatantState>) => Promise<void>;
  onRemoveCombatant: (id: string) => Promise<void>;
  onAdvanceTurn: () => void;
  onEndCombat: () => Promise<void>;
  onAddCombatants: (combatants: Array<{ type: 'character' | 'enemy'; characterId?: string; templateId?: string; initiative: number; customName?: string }>) => Promise<void>;
}

export function CombatTracker({
  combatants,
  currentTurn,
  round,
  combatActive,
  isDm,
  worldId,
  currentLocation,
  currentLocationResourceId,
  onUpdateCombatant,
  onRemoveCombatant,
  onAdvanceTurn,
  onEndCombat,
  onAddCombatants,
}: CombatTrackerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  async function handleEndCombat() {
    setIsEnding(true);
    await onEndCombat();
    setIsEnding(false);
  }

  // Sort combatants by initiative (position)
  const sortedCombatants = [...combatants].sort((a, b) => b.position - a.position);

  // Get current combatant name for collapsed preview
  const currentCombatant = sortedCombatants.find(c => c.id === currentTurn);
  const collapsedContent = combatActive && currentCombatant
    ? `Round ${round} - ${currentCombatant.name}'s turn`
    : combatActive
    ? `Round ${round}`
    : 'No combat';

  return (
    <>
      <CollapsibleCard
        title="Combat"
        icon={<Swords className="w-5 h-5" />}
        badge={combatActive ? `Round ${round}` : undefined}
        collapsedContent={collapsedContent}
        defaultCollapsed={!combatActive}
      >
        {!combatActive && combatants.length === 0 ? (
          <div className="text-center py-6">
            <Swords className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No active combat
            </p>
            {isDm && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Start Combat
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* DM Controls */}
            {isDm && combatActive && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAdvanceTurn}
                >
                  <SkipForward className="w-4 h-4 mr-1" />
                  Next Turn
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEndCombat}
                  isLoading={isEnding}
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <StopCircle className="w-4 h-4 mr-1" />
                  End Combat
                </Button>
              </div>
            )}

            {/* Combatant List */}
            <div className="space-y-2">
              {sortedCombatants.map((combatant) => (
                <CombatantCard
                  key={combatant.id}
                  combatant={combatant}
                  isCurrentTurn={combatant.id === currentTurn}
                  isDm={isDm}
                  isOwner={combatant.characterId !== undefined && combatant.type === 'character'}
                  onUpdate={(changes) => onUpdateCombatant(combatant.id, changes)}
                  onRemove={() => onRemoveCombatant(combatant.id)}
                  hideEnemyHp={!isDm}
                />
              ))}
            </div>
          </div>
        )}
      </CollapsibleCard>

      {/* Add Combatant Modal */}
      {showAddModal && (
        <AddCombatantModal
          worldId={worldId}
          isDm={isDm}
          currentLocation={currentLocation}
          currentLocationResourceId={currentLocationResourceId}
          onAdd={async (combatantsList) => {
            await onAddCombatants(combatantsList);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );
}

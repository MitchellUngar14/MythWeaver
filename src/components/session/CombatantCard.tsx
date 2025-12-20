'use client';

import { useState } from 'react';
import { Heart, Shield, Trash2, Skull, Eye, EyeOff, Users, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CombatantState } from '@/stores/sessionStore';

interface CombatantCardProps {
  combatant: CombatantState;
  isCurrentTurn: boolean;
  isDm: boolean;
  isOwner: boolean;
  onUpdate: (changes: Partial<CombatantState>) => void;
  onRemove: () => void;
  hideEnemyHp?: boolean; // Hide exact HP values for enemies (players only see health bar)
}

export function CombatantCard({
  combatant,
  isCurrentTurn,
  isDm,
  isOwner,
  onUpdate,
  onRemove,
  hideEnemyHp = false,
}: CombatantCardProps) {
  const [showHpInput, setShowHpInput] = useState(false);
  const [hpInputValue, setHpInputValue] = useState(combatant.currentHp.toString());
  const canEdit = isDm || isOwner;
  const isDead = combatant.currentHp <= 0;
  const hpPercentage = Math.max(0, Math.min(100, (combatant.currentHp / combatant.maxHp) * 100));

  // Hide HP numbers for enemies when player is viewing (not DM, not owner)
  // Unless DM has toggled showHpToPlayers for this combatant
  const shouldHideHpNumbers = hideEnemyHp && combatant.type === 'enemy' && !isDm && !combatant.showHpToPlayers;

  function handleHpChange(delta: number) {
    const newHp = Math.max(0, Math.min(combatant.maxHp, combatant.currentHp + delta));
    onUpdate({ currentHp: newHp });
  }

  function handleSetHp() {
    const newHp = Math.max(0, Math.min(combatant.maxHp, parseInt(hpInputValue) || 0));
    onUpdate({ currentHp: newHp });
    setShowHpInput(false);
  }

  function getHpColor() {
    if (hpPercentage <= 25) return 'bg-red-500';
    if (hpPercentage <= 50) return 'bg-orange-500';
    return 'bg-green-500';
  }

  return (
    <div
      className={`
        p-3 rounded-lg border-2 transition-all
        ${isCurrentTurn
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        }
        ${isDead ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isCurrentTurn && (
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          )}
          <span className="font-medium text-gray-900 dark:text-white">
            {combatant.name}
          </span>
          {isDead && <Skull className="w-4 h-4 text-red-500" />}
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            combatant.type === 'character'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : combatant.isCompanion
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {combatant.type === 'character' ? 'Player' : combatant.isCompanion ? 'Companion' : 'Enemy'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-mono">Init: {combatant.position}</span>
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-blue-500" />
            <span>{combatant.ac}</span>
          </div>
        </div>
      </div>

      {/* HP Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 text-sm">
            <Heart className="w-4 h-4 text-red-500" />
            {shouldHideHpNumbers ? (
              // Players see health status text instead of numbers for enemies
              <span className="font-medium text-gray-600 dark:text-gray-400">
                {hpPercentage <= 0 ? 'Dead' :
                 hpPercentage <= 25 ? 'Critical' :
                 hpPercentage <= 50 ? 'Bloodied' :
                 hpPercentage <= 75 ? 'Injured' : 'Healthy'}
              </span>
            ) : showHpInput && canEdit ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={combatant.maxHp}
                  value={hpInputValue}
                  onChange={(e) => setHpInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetHp()}
                  onBlur={handleSetHp}
                  className="w-16 h-6 text-sm text-center"
                  autoFocus
                />
                <span className="text-gray-500">/ {combatant.maxHp}</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (canEdit) {
                    setHpInputValue(combatant.currentHp.toString());
                    setShowHpInput(true);
                  }
                }}
                className={`font-medium ${canEdit ? 'hover:underline cursor-pointer' : ''}`}
              >
                {combatant.currentHp} / {combatant.maxHp}
              </button>
            )}
          </div>
          {canEdit && !showHpInput && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                onClick={() => handleHpChange(-5)}
                title="Damage 5"
              >
                -5
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                onClick={() => handleHpChange(-1)}
                title="Damage 1"
              >
                -1
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-1.5 text-xs text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
                onClick={() => handleHpChange(1)}
                title="Heal 1"
              >
                +1
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-1.5 text-xs text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
                onClick={() => handleHpChange(5)}
                title="Heal 5"
              >
                +5
              </Button>
            </div>
          )}
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getHpColor()}`}
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
      </div>

      {/* Status Effects */}
      {combatant.statusEffects && combatant.statusEffects.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {combatant.statusEffects.map((effect, index) => (
            <span
              key={index}
              className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded"
              title={effect.description || effect.name}
            >
              {effect.name}
              {effect.duration && ` (${effect.duration})`}
            </span>
          ))}
        </div>
      )}

      {/* DM Controls */}
      {isDm && (
        <div className="flex justify-end gap-1">
          {combatant.type === 'enemy' && (
            <>
              <span title={combatant.isCompanion ? "Mark as enemy" : "Mark as companion"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={combatant.isCompanion
                    ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                    : "text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"}
                  onClick={() => onUpdate({ isCompanion: !combatant.isCompanion })}
                >
                  {combatant.isCompanion ? <Users className="w-4 h-4" /> : <Swords className="w-4 h-4" />}
                </Button>
              </span>
              <span title={combatant.showHpToPlayers ? "Hide HP from players" : "Reveal HP to players"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={combatant.showHpToPlayers
                    ? "text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                    : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}
                  onClick={() => onUpdate({ showHpToPlayers: !combatant.showHpToPlayers })}
                >
                  {combatant.showHpToPlayers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
              </span>
            </>
          )}
          <span title="Remove from combat">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={onRemove}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </span>
        </div>
      )}
    </div>
  );
}

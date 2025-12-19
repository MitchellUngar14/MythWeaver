'use client';

import { Heart, Shield, Zap, User } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import type { Character } from '@/lib/schema';

interface PlayerCharacterPanelProps {
  character: Character;
  onUpdateHp: (hp: number) => void;
}

export function PlayerCharacterPanel({ character, onUpdateHp }: PlayerCharacterPanelProps) {
  const { stats } = character;
  const hpPercentage = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));

  function getHpColor() {
    if (hpPercentage <= 25) return 'bg-red-500';
    if (hpPercentage <= 50) return 'bg-orange-500';
    return 'bg-green-500';
  }

  function calculateModifier(score: number) {
    return Math.floor((score - 10) / 2);
  }

  function formatModifier(mod: number) {
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  // Collapsed preview shows HP
  const collapsedContent = `HP: ${stats.hp}/${stats.maxHp} | AC: ${stats.ac}`;

  return (
    <CollapsibleCard
      title={character.name}
      icon={<User className="w-5 h-5" />}
      collapsedContent={collapsedContent}
    >
      <p className="text-sm text-gray-500 mb-4">
        Level {character.level} {character.race} {character.class}
      </p>

      {/* HP */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="font-medium">
              {stats.hp} / {stats.maxHp}
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => onUpdateHp(Math.max(0, stats.hp - 1))}
            >
              -1
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => onUpdateHp(Math.min(stats.maxHp, stats.hp + 1))}
            >
              +1
            </Button>
          </div>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getHpColor()}`}
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <Shield className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-xs text-gray-500">AC</p>
            <p className="font-bold">{stats.ac}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <Zap className="w-5 h-5 text-yellow-500" />
          <div>
            <p className="text-xs text-gray-500">Speed</p>
            <p className="font-bold">{stats.speed} ft</p>
          </div>
        </div>
      </div>

      {/* Ability Scores */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Ability Scores</p>
        <div className="grid grid-cols-6 gap-1 text-center">
          {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((ability) => (
            <div
              key={ability}
              className="p-1 bg-gray-50 dark:bg-gray-700/50 rounded"
            >
              <p className="text-xs text-gray-500 uppercase">{ability}</p>
              <p className="font-bold text-sm">{stats[ability]}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {formatModifier(calculateModifier(stats[ability]))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </CollapsibleCard>
  );
}

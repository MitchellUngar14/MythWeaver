'use client';

import { useState } from 'react';
import { Dices, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import type { SessionRoll } from '@/stores/sessionStore';

interface SessionDiceRollerProps {
  recentRolls: SessionRoll[];
  currentUserId: string;
  onRoll: (dice: string, context?: string) => Promise<void>;
}

const DICE_TYPES = [
  { sides: 4, color: 'bg-purple-500' },
  { sides: 6, color: 'bg-blue-500' },
  { sides: 8, color: 'bg-green-500' },
  { sides: 10, color: 'bg-yellow-500' },
  { sides: 12, color: 'bg-orange-500' },
  { sides: 20, color: 'bg-red-500' },
  { sides: 100, color: 'bg-pink-500' },
];

export function SessionDiceRoller({ recentRolls, onRoll }: SessionDiceRollerProps) {
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

  async function handleRoll(sides: number) {
    setIsRolling(true);
    try {
      const dice = `${count}d${sides}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`;
      await onRoll(dice);
    } finally {
      setIsRolling(false);
    }
  }

  // Get latest roll for collapsed preview
  const latestRoll = recentRolls[0];
  const collapsedContent = latestRoll
    ? `Last: ${latestRoll.dice} = ${latestRoll.total}`
    : undefined;

  return (
    <CollapsibleCard
      title="Dice Roller"
      icon={<Dices className="w-5 h-5" />}
      collapsedContent={collapsedContent}
    >
      {/* Controls */}
      <div className="mb-4 space-y-3">
        {/* Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Count</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCount(Math.max(1, count - 1))}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-8 text-center font-mono">{count}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCount(Math.min(10, count + 1))}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Modifier */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Modifier</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setModifier(modifier - 1)}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-8 text-center font-mono">
              {modifier >= 0 ? `+${modifier}` : modifier}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setModifier(modifier + 1)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Dice buttons */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {DICE_TYPES.map(({ sides, color }) => (
          <button
            key={sides}
            onClick={() => handleRoll(sides)}
            disabled={isRolling}
            className={`
              ${color} text-white font-bold py-2 px-3 rounded-lg
              hover:opacity-90 active:scale-95 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              text-sm
            `}
          >
            d{sides}
          </button>
        ))}
      </div>

      {/* Latest Roll - Prominent Display */}
      {latestRoll && (
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium opacity-90">
              {latestRoll.userName}
            </span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-lg opacity-90">
              {latestRoll.dice}
            </span>
            <span className="text-2xl opacity-75">=</span>
            <span className="font-bold text-4xl">
              {latestRoll.total}
            </span>
          </div>
          <div className="text-center mt-1">
            <span className="text-xs opacity-75">
              [{latestRoll.rolls.join(', ')}]
            </span>
          </div>
        </div>
      )}
    </CollapsibleCard>
  );
}

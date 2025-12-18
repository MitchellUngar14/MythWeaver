'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, RotateCcw, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { rollDice } from '@/lib/utils';

const DICE_TYPES = [
  { sides: 4, label: 'd4', color: 'bg-red-500' },
  { sides: 6, label: 'd6', color: 'bg-orange-500' },
  { sides: 8, label: 'd8', color: 'bg-yellow-500' },
  { sides: 10, label: 'd10', color: 'bg-green-500' },
  { sides: 12, label: 'd12', color: 'bg-blue-500' },
  { sides: 20, label: 'd20', color: 'bg-purple-500' },
  { sides: 100, label: 'd100', color: 'bg-pink-500' },
];

interface RollResult {
  id: string;
  dice: string;
  rolls: number[];
  modifier: number;
  total: number;
  timestamp: Date;
}

export default function DiceRollerPage() {
  const [results, setResults] = useState<RollResult[]>([]);
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

  async function handleRoll(sides: number) {
    setIsRolling(true);

    // Simulate rolling animation
    await new Promise(resolve => setTimeout(resolve, 300));

    const rolls = rollDice(count, sides);
    const total = rolls.reduce((a, b) => a + b, 0) + modifier;

    const result: RollResult = {
      id: crypto.randomUUID(),
      dice: `${count}d${sides}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`,
      rolls,
      modifier,
      total,
      timestamp: new Date(),
    };

    setResults([result, ...results.slice(0, 19)]);
    setIsRolling(false);
  }

  function clearResults() {
    setResults([]);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dice Roller</h1>
              <p className="text-gray-600 dark:text-gray-400">Roll any combination of dice</p>
            </div>
          </div>
          {results.length > 0 && (
            <Button variant="ghost" onClick={clearResults}>
              <RotateCcw className="w-5 h-5 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              {/* Dice Count */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCount(Math.max(1, count - 1))}
                  disabled={count <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-12 text-center text-2xl font-bold">{count}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCount(Math.min(20, count + 1))}
                  disabled={count >= 20}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Modifier */}
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Modifier:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModifier(modifier - 1)}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-12 text-center text-xl font-bold">
                  {modifier >= 0 ? `+${modifier}` : modifier}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModifier(modifier + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Dice Buttons */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
              {DICE_TYPES.map(({ sides, label, color }) => (
                <button
                  key={sides}
                  onClick={() => handleRoll(sides)}
                  disabled={isRolling}
                  className={`
                    ${color} text-white font-bold py-4 px-2 rounded-lg
                    hover:opacity-90 active:scale-95 transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${isRolling ? 'animate-pulse' : ''}
                  `}
                >
                  <span className="text-lg">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Roll History</CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div
                    key={result.id}
                    className={`
                      p-4 rounded-lg border
                      ${index === 0
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-lg text-gray-900 dark:text-white">
                        {result.dice}
                      </span>
                      <span className={`text-3xl font-bold ${
                        index === 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'
                      }`}>
                        {result.total}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.rolls.map((roll, i) => (
                        <span
                          key={i}
                          className={`
                            px-2 py-1 rounded text-sm font-medium
                            ${roll === 1 ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                              roll === Math.max(...result.rolls) ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                              'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }
                          `}
                        >
                          {roll}
                        </span>
                      ))}
                      {result.modifier !== 0 && (
                        <span className="px-2 py-1 rounded text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {result.modifier > 0 ? `+${result.modifier}` : result.modifier}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {results.length === 0 && (
          <div className="text-center py-12">
            <Dice6 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Select the number of dice and click a die to roll!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

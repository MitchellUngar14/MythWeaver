'use client';

import { Circle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SpellSlots, SpellSlot } from '@/lib/schema';
import { SPELL_LEVEL_LABELS } from '@/lib/spell-data';

interface SpellSlotTrackerProps {
  spellSlots: SpellSlots;
  editable?: boolean;
  onUseSlot?: (level: number) => void;
  onRestoreSlot?: (level: number) => void;
  onRestoreAll?: () => void;
}

export function SpellSlotTracker({
  spellSlots,
  editable = false,
  onUseSlot,
  onRestoreSlot,
  onRestoreAll,
}: SpellSlotTrackerProps) {
  // Get all slot levels with at least 1 max slot
  const activeSlots = (Object.entries(spellSlots) as [keyof SpellSlots, SpellSlot][])
    .map(([key, slot], index) => ({
      level: index + 1,
      key,
      ...slot,
    }))
    .filter(slot => slot.max > 0);

  if (activeSlots.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm italic">
        No spell slots available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with restore all button */}
      {editable && onRestoreAll && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onRestoreAll}
            className="text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Long Rest
          </Button>
        </div>
      )}

      {/* Slot rows */}
      <div className="space-y-2">
        {activeSlots.map((slot) => (
          <div
            key={slot.key}
            className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            {/* Level label */}
            <div className="w-16 text-sm font-medium text-gray-700 dark:text-gray-300">
              {slot.level === 0 ? 'Cantrip' : `${slot.level}${getOrdinalSuffix(slot.level)}`}
            </div>

            {/* Slot circles */}
            <div className="flex-1 flex items-center gap-1.5 flex-wrap">
              {Array.from({ length: slot.max }).map((_, index) => {
                const isUsed = index < slot.used;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (!editable) return;
                      if (isUsed) {
                        onRestoreSlot?.(slot.level);
                      } else {
                        onUseSlot?.(slot.level);
                      }
                    }}
                    disabled={!editable}
                    className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center
                      transition-all duration-200
                      ${isUsed
                        ? 'bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500'
                        : 'bg-indigo-500 border-indigo-600 shadow-sm'
                      }
                      ${editable
                        ? 'cursor-pointer hover:scale-110'
                        : 'cursor-default'
                      }
                    `}
                    title={isUsed ? 'Restore slot' : 'Use slot'}
                  >
                    {!isUsed && (
                      <Circle className="w-3 h-3 text-white fill-current" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Counter */}
            <div className="text-sm text-gray-500 dark:text-gray-400 font-mono w-12 text-right">
              {slot.max - slot.used}/{slot.max}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

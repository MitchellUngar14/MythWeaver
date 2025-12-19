'use client';

import { History } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import type { SessionRoll } from '@/stores/sessionStore';

interface RollHistoryProps {
  rolls: SessionRoll[];
  currentUserId: string;
}

export function RollHistory({ rolls, currentUserId }: RollHistoryProps) {
  function formatTime(date: Date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Get latest roll summary for collapsed state
  const latestRoll = rolls[0];
  const collapsedSummary = latestRoll
    ? `${latestRoll.dice} = ${latestRoll.total}`
    : undefined;

  return (
    <CollapsibleCard
      title="Roll History"
      icon={<History className="w-5 h-5" />}
      badge={rolls.length}
      defaultCollapsed={true}
      collapsedContent={collapsedSummary}
    >
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {rolls.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-4">No rolls yet</p>
        ) : (
          rolls.slice(0, 20).map((roll) => {
            const isOwn = roll.oduserId === currentUserId;
            return (
              <div
                key={roll.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  isOwn
                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                    : 'bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[100px]">
                    {roll.userName}
                  </span>
                  <span className="font-mono text-xs text-gray-500">
                    {roll.dice}
                  </span>
                  <span className="text-xs text-gray-400">
                    [{roll.rolls.join(', ')}]
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">
                    {roll.total}
                  </span>
                  <span className="text-xs text-gray-400 w-12 text-right">
                    {formatTime(roll.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </CollapsibleCard>
  );
}

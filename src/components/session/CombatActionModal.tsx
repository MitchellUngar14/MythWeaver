'use client';

import { useState } from 'react';
import { X, Sword, Zap, Shield, Footprints, Hand, ChevronDown, ChevronUp, Check, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CombatantState } from '@/stores/sessionStore';
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

interface CombatActionModalProps {
  combatant: CombatantState;
  sessionId: string;
  onClose: () => void;
  onActionTaken: (action: {
    actionId: string;
    actionName: string;
    category: ActionCategory;
    details?: string;
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

export function CombatActionModal({
  combatant,
  sessionId,
  onClose,
  onActionTaken,
}: CombatActionModalProps) {
  const [selectedAction, setSelectedAction] = useState<CombatAction | null>(null);
  const [details, setDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const economy = combatant.actionEconomy || { ...DEFAULT_ACTION_ECONOMY };

  async function handleConfirmAction() {
    if (!selectedAction) return;

    setIsLoading(true);
    setError(null);

    try {
      await onActionTaken({
        actionId: selectedAction.id,
        actionName: selectedAction.name,
        category: selectedAction.category,
        details: details.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to take action');
    } finally {
      setIsLoading(false);
    }
  }

  function handleActionSelect(action: CombatAction) {
    setSelectedAction(action);
    setDetails('');
    setError(null);
  }

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

          {selectedAction ? (
            // Confirmation view
            <div className="space-y-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Details (optional)
                </label>
                <Input
                  placeholder="e.g., Attacked Goblin 1, Cast Fireball on enemies"
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
                  onClick={() => setSelectedAction(null)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmAction}
                  isLoading={isLoading}
                  className="flex-1"
                >
                  Confirm Action
                </Button>
              </div>
            </div>
          ) : (
            // Action selection view
            <>
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

        {/* Footer - only show if no action selected */}
        {!selectedAction && (
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

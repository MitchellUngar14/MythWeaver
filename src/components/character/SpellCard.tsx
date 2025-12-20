'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Target, Hourglass, BookOpen, X, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Spell, SpellComponents, CharacterSpell } from '@/lib/schema';
import {
  getSpellSchoolIcon,
  getSpellSchoolColor,
  getSpellSchoolBgColor,
  SPELL_LEVEL_LABELS,
  formatSpellComponents,
} from '@/lib/spell-data';

interface SpellCardProps {
  spell: Spell;
  characterSpell?: CharacterSpell; // If from character's spellbook
  editable?: boolean;
  showPrepareToggle?: boolean;
  onTogglePrepared?: () => void;
  onRemove?: () => void;
  compact?: boolean;
}

export function SpellCard({
  spell,
  characterSpell,
  editable = false,
  showPrepareToggle = false,
  onTogglePrepared,
  onRemove,
  compact = false,
}: SpellCardProps) {
  const [expanded, setExpanded] = useState(false);

  const SchoolIcon = getSpellSchoolIcon(spell.school);
  const schoolColor = getSpellSchoolColor(spell.school);
  const schoolBgColor = getSpellSchoolBgColor(spell.school);
  const components = spell.components as SpellComponents | null;

  const isPrepared = characterSpell?.isPrepared || characterSpell?.isAlwaysPrepared;
  const isAlwaysPrepared = characterSpell?.isAlwaysPrepared;

  return (
    <div
      className={`
        border rounded-lg overflow-hidden transition-all
        ${isPrepared
          ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        }
      `}
    >
      {/* Header */}
      <div
        className={`
          flex items-center gap-2 px-3 py-2 cursor-pointer
          hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
        `}
        onClick={() => setExpanded(!expanded)}
      >
        {/* School icon */}
        <div className={`p-1.5 rounded ${schoolBgColor}`}>
          <SchoolIcon className={`w-4 h-4 ${schoolColor}`} />
        </div>

        {/* Spell name and level */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white truncate">
              {spell.name}
            </span>
            {spell.concentration && (
              <span className="text-[10px] px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                C
              </span>
            )}
            {spell.ritual && (
              <span className="text-[10px] px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                R
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {SPELL_LEVEL_LABELS[spell.level]} {spell.school}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {showPrepareToggle && editable && !isAlwaysPrepared && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePrepared?.();
              }}
              className={`h-7 px-2 ${isPrepared ? 'text-indigo-600' : 'text-gray-400'}`}
              title={isPrepared ? 'Unprepare spell' : 'Prepare spell'}
            >
              {isPrepared ? (
                <Star className="w-4 h-4 fill-current" />
              ) : (
                <Star className="w-4 h-4" />
              )}
            </Button>
          )}
          {isAlwaysPrepared && (
            <span className="text-xs text-indigo-600 dark:text-indigo-400 px-2">
              Always
            </span>
          )}
          {editable && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="h-7 px-2 text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700 space-y-3">
          {/* Spell details */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{spell.castingTime}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <Target className="w-3.5 h-3.5" />
              <span>{spell.range}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <Hourglass className="w-3.5 h-3.5" />
              <span>{spell.duration}</span>
            </div>
            {components && (
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{formatSpellComponents(components)}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {spell.description}
          </div>

          {/* At Higher Levels */}
          {spell.higherLevels && (
            <div className="text-sm">
              <span className="font-medium text-gray-900 dark:text-white">At Higher Levels: </span>
              <span className="text-gray-700 dark:text-gray-300">{spell.higherLevels}</span>
            </div>
          )}

          {/* Classes */}
          {spell.classes && (spell.classes as string[]).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(spell.classes as string[]).map(cls => (
                <span
                  key={cls}
                  className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                >
                  {cls}
                </span>
              ))}
            </div>
          )}

          {/* Source note */}
          {characterSpell?.source && (
            <div className="text-xs text-gray-500 dark:text-gray-400 italic">
              Source: {characterSpell.source}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

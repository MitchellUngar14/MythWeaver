'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, Star, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CharacterProficiencies as CharacterProficienciesType, CharacterStats, ProficiencyLevel } from '@/lib/schema';
import {
  SKILLS,
  ABILITIES,
  WEAPON_CATEGORIES,
  WEAPONS,
  ARMOR_TYPES,
  TOOL_CATEGORIES,
  ALL_TOOLS,
  LANGUAGES,
  ALL_LANGUAGES,
  DEFAULT_CHARACTER_PROFICIENCIES,
  getAbilityModifier,
  getSkillBonus,
  getSavingThrowBonus,
  formatBonus,
  type SkillKey,
  type AbilityKey,
} from '@/lib/proficiency-data';

interface CharacterProficienciesProps {
  proficiencies: CharacterProficienciesType | null;
  stats: CharacterStats;
  editable?: boolean;
  onChange?: (proficiencies: CharacterProficienciesType) => void;
}

export function CharacterProficiencies({
  proficiencies,
  stats,
  editable = false,
  onChange,
}: CharacterProficienciesProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    skills: true,
    savingThrows: true,
    weapons: false,
    armor: false,
    tools: false,
    languages: false,
  });
  const [showAddModal, setShowAddModal] = useState<string | null>(null);

  const profs = proficiencies || DEFAULT_CHARACTER_PROFICIENCIES;

  function toggleSection(section: string) {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }

  function handleSkillChange(skill: SkillKey) {
    if (!editable || !onChange) return;
    const currentLevel = profs.skills[skill];
    // Cycle: 0 -> 1 -> 2 -> 0
    const newLevel = ((currentLevel + 1) % 3) as ProficiencyLevel;
    onChange({
      ...profs,
      skills: { ...profs.skills, [skill]: newLevel },
    });
  }

  function handleSavingThrowChange(ability: AbilityKey) {
    if (!editable || !onChange) return;
    onChange({
      ...profs,
      savingThrows: { ...profs.savingThrows, [ability]: !profs.savingThrows[ability] },
    });
  }

  function handleAddItem(category: 'weapons' | 'armor' | 'tools' | 'languages', item: string) {
    if (!editable || !onChange) return;
    if (!profs[category].includes(item)) {
      onChange({
        ...profs,
        [category]: [...profs[category], item],
      });
    }
    setShowAddModal(null);
  }

  function handleRemoveItem(category: 'weapons' | 'armor' | 'tools' | 'languages', item: string) {
    if (!editable || !onChange) return;
    onChange({
      ...profs,
      [category]: profs[category].filter(i => i !== item),
    });
  }

  // Group skills by ability
  const skillsByAbility = Object.entries(SKILLS).reduce((acc, [key, skill]) => {
    if (!acc[skill.ability]) acc[skill.ability] = [];
    acc[skill.ability].push(key as SkillKey);
    return acc;
  }, {} as Record<AbilityKey, SkillKey[]>);

  return (
    <div className="space-y-4">
      {/* Skills Section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('skills')}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="font-medium text-gray-900 dark:text-white">Skills</span>
          {expandedSections.skills ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {expandedSections.skills && (
          <div className="p-4 space-y-4">
            {(Object.entries(skillsByAbility) as [AbilityKey, SkillKey[]][]).map(([ability, skills]) => (
              <div key={ability}>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  {ABILITIES[ability]} ({formatBonus(getAbilityModifier(stats[ability]))})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {skills.map(skillKey => {
                    const skill = SKILLS[skillKey];
                    const level = profs.skills[skillKey];
                    const bonus = getSkillBonus(stats[ability], stats.proficiencyBonus, level);

                    return (
                      <button
                        key={skillKey}
                        onClick={() => handleSkillChange(skillKey)}
                        disabled={!editable}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                          editable ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded border flex items-center justify-center ${
                          level === 2
                            ? 'bg-amber-500 border-amber-600 text-white'
                            : level === 1
                            ? 'bg-indigo-500 border-indigo-600 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {level === 2 ? (
                            <Star className="w-3 h-3" />
                          ) : level === 1 ? (
                            <Check className="w-3 h-3" />
                          ) : null}
                        </span>
                        <span className="flex-1 text-left text-gray-700 dark:text-gray-300">
                          {skill.name}
                        </span>
                        <span className={`font-mono text-sm ${
                          level > 0 ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-500'
                        }`}>
                          {formatBonus(bonus)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saving Throws Section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('savingThrows')}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="font-medium text-gray-900 dark:text-white">Saving Throws</span>
          {expandedSections.savingThrows ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {expandedSections.savingThrows && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.entries(ABILITIES) as [AbilityKey, string][]).map(([key, name]) => {
              const isProficient = profs.savingThrows[key];
              const bonus = getSavingThrowBonus(stats[key], stats.proficiencyBonus, isProficient);

              return (
                <button
                  key={key}
                  onClick={() => handleSavingThrowChange(key)}
                  disabled={!editable}
                  className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
                    isProficient
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  } ${editable ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer' : 'cursor-default'}`}
                >
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isProficient
                      ? 'bg-indigo-500 border-indigo-600 text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isProficient && <Check className="w-3 h-3" />}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
                  <span className={`ml-auto font-mono text-sm ${
                    isProficient ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-500'
                  }`}>
                    {formatBonus(bonus)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Weapons Section */}
      <ProficiencyListSection
        title="Weapon Proficiencies"
        items={profs.weapons}
        expanded={expandedSections.weapons}
        onToggle={() => toggleSection('weapons')}
        editable={editable}
        onAdd={() => setShowAddModal('weapons')}
        onRemove={(item) => handleRemoveItem('weapons', item)}
      />

      {/* Armor Section */}
      <ProficiencyListSection
        title="Armor Proficiencies"
        items={profs.armor}
        expanded={expandedSections.armor}
        onToggle={() => toggleSection('armor')}
        editable={editable}
        onAdd={() => setShowAddModal('armor')}
        onRemove={(item) => handleRemoveItem('armor', item)}
      />

      {/* Tools Section */}
      <ProficiencyListSection
        title="Tool Proficiencies"
        items={profs.tools}
        expanded={expandedSections.tools}
        onToggle={() => toggleSection('tools')}
        editable={editable}
        onAdd={() => setShowAddModal('tools')}
        onRemove={(item) => handleRemoveItem('tools', item)}
      />

      {/* Languages Section */}
      <ProficiencyListSection
        title="Languages"
        items={profs.languages}
        expanded={expandedSections.languages}
        onToggle={() => toggleSection('languages')}
        editable={editable}
        onAdd={() => setShowAddModal('languages')}
        onRemove={(item) => handleRemoveItem('languages', item)}
      />

      {/* Add Modal */}
      {showAddModal && (
        <AddProficiencyModal
          category={showAddModal as 'weapons' | 'armor' | 'tools' | 'languages'}
          existingItems={profs[showAddModal as keyof CharacterProficienciesType] as string[]}
          onAdd={(item) => handleAddItem(showAddModal as 'weapons' | 'armor' | 'tools' | 'languages', item)}
          onClose={() => setShowAddModal(null)}
        />
      )}
    </div>
  );
}

// Sub-component for list-based proficiencies (weapons, armor, tools, languages)
function ProficiencyListSection({
  title,
  items,
  expanded,
  onToggle,
  editable,
  onAdd,
  onRemove,
}: {
  title: string;
  items: string[];
  expanded: boolean;
  onToggle: () => void;
  editable: boolean;
  onAdd: () => void;
  onRemove: (item: string) => void;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
          <span className="text-sm text-gray-500">({items.length})</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="p-4">
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">None</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-3">
              {items.map(item => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-sm"
                >
                  {item}
                  {editable && (
                    <button
                      onClick={() => onRemove(item)}
                      className="ml-1 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          {editable && (
            <Button variant="outline" size="sm" onClick={onAdd}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Modal for adding proficiencies
function AddProficiencyModal({
  category,
  existingItems,
  onAdd,
  onClose,
}: {
  category: 'weapons' | 'armor' | 'tools' | 'languages';
  existingItems: string[];
  onAdd: (item: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [customValue, setCustomValue] = useState('');

  // Get available options based on category
  function getOptions(): string[] {
    switch (category) {
      case 'weapons':
        return [...WEAPON_CATEGORIES, ...WEAPONS];
      case 'armor':
        return [...ARMOR_TYPES];
      case 'tools':
        return ALL_TOOLS;
      case 'languages':
        return ALL_LANGUAGES;
      default:
        return [];
    }
  }

  const options = getOptions();
  const filteredOptions = options
    .filter(opt => !existingItems.includes(opt))
    .filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Add {category === 'languages' ? 'Language' : category.slice(0, -1).charAt(0).toUpperCase() + category.slice(0, -1).slice(1)} Proficiency
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {filteredOptions.map(option => (
              <button
                key={option}
                onClick={() => onAdd(option)}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                {option}
              </button>
            ))}
            {filteredOptions.length === 0 && search && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                No matching options found
              </p>
            )}
          </div>
        </div>

        {/* Custom entry */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <label className="text-sm text-gray-600 dark:text-gray-400 block mb-2">
            Or add custom:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Custom proficiency..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <Button
              onClick={() => {
                if (customValue.trim()) {
                  onAdd(customValue.trim());
                  setCustomValue('');
                }
              }}
              disabled={!customValue.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

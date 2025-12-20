// D&D 5e Spell Constants and Data

import {
  Shield, // Abjuration
  Sparkles, // Conjuration
  Eye, // Divination
  Wand2, // Enchantment
  Flame, // Evocation
  Ghost, // Illusion
  Skull, // Necromancy
  Shapes, // Transmutation
  type LucideIcon,
} from 'lucide-react';
import type { SpellSlots, SpellSlot } from './schema';

// Spell schools
export const SPELL_SCHOOLS = [
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
] as const;

export type SpellSchool = typeof SPELL_SCHOOLS[number];

// Spell school display names, icons, and colors
export const SPELL_SCHOOL_DATA: Record<SpellSchool, {
  name: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  description: string;
}> = {
  abjuration: {
    name: 'Abjuration',
    icon: Shield,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    description: 'Protective spells that create barriers, negate effects, or banish creatures',
  },
  conjuration: {
    name: 'Conjuration',
    icon: Sparkles,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    description: 'Spells that bring creatures or materials from elsewhere',
  },
  divination: {
    name: 'Divination',
    icon: Eye,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    description: 'Spells that reveal information, secrets, or glimpses of the future',
  },
  enchantment: {
    name: 'Enchantment',
    icon: Wand2,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    description: 'Spells that affect minds, influencing or controlling behavior',
  },
  evocation: {
    name: 'Evocation',
    icon: Flame,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    description: 'Spells that manipulate energy to produce effects like fire or lightning',
  },
  illusion: {
    name: 'Illusion',
    icon: Ghost,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    description: 'Spells that deceive the senses or create false images',
  },
  necromancy: {
    name: 'Necromancy',
    icon: Skull,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    description: 'Spells that manipulate life force, death, and undeath',
  },
  transmutation: {
    name: 'Transmutation',
    icon: Shapes,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'Spells that change the properties of creatures, objects, or the environment',
  },
};

// Spellcasting classes
export const SPELLCASTING_CLASSES = [
  'Bard',
  'Cleric',
  'Druid',
  'Paladin',
  'Ranger',
  'Sorcerer',
  'Warlock',
  'Wizard',
  'Artificer',
] as const;

// Spellcasting ability by class
export const CLASS_SPELLCASTING_ABILITY: Record<string, 'int' | 'wis' | 'cha'> = {
  Bard: 'cha',
  Cleric: 'wis',
  Druid: 'wis',
  Paladin: 'cha',
  Ranger: 'wis',
  Sorcerer: 'cha',
  Warlock: 'cha',
  Wizard: 'int',
  Artificer: 'int',
};

// Spell level labels
export const SPELL_LEVEL_LABELS: Record<number, string> = {
  0: 'Cantrip',
  1: '1st Level',
  2: '2nd Level',
  3: '3rd Level',
  4: '4th Level',
  5: '5th Level',
  6: '6th Level',
  7: '7th Level',
  8: '8th Level',
  9: '9th Level',
};

// Common casting times
export const CASTING_TIMES = [
  '1 action',
  '1 bonus action',
  '1 reaction',
  '1 minute',
  '10 minutes',
  '1 hour',
  '8 hours',
  '12 hours',
  '24 hours',
] as const;

// Common ranges
export const SPELL_RANGES = [
  'Self',
  'Touch',
  '5 feet',
  '10 feet',
  '30 feet',
  '60 feet',
  '90 feet',
  '120 feet',
  '150 feet',
  '300 feet',
  '500 feet',
  '1 mile',
  'Sight',
  'Unlimited',
] as const;

// Common durations
export const SPELL_DURATIONS = [
  'Instantaneous',
  '1 round',
  '1 minute',
  '10 minutes',
  '1 hour',
  '8 hours',
  '24 hours',
  '1 day',
  '7 days',
  '10 days',
  '30 days',
  'Until dispelled',
  'Special',
] as const;

// Default spell slots for an empty character
export const DEFAULT_SPELL_SLOT: SpellSlot = { used: 0, max: 0 };

export const DEFAULT_SPELL_SLOTS: SpellSlots = {
  level1: { ...DEFAULT_SPELL_SLOT },
  level2: { ...DEFAULT_SPELL_SLOT },
  level3: { ...DEFAULT_SPELL_SLOT },
  level4: { ...DEFAULT_SPELL_SLOT },
  level5: { ...DEFAULT_SPELL_SLOT },
  level6: { ...DEFAULT_SPELL_SLOT },
  level7: { ...DEFAULT_SPELL_SLOT },
  level8: { ...DEFAULT_SPELL_SLOT },
  level9: { ...DEFAULT_SPELL_SLOT },
};

// Spell slots by class and level
// Format: spellSlotsByClass[className][characterLevel] = [slots per level 1-9]
export const SPELL_SLOTS_BY_CLASS: Record<string, Record<number, number[]>> = {
  // Full casters (Bard, Cleric, Druid, Sorcerer, Wizard)
  Wizard: {
    1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
    8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
    9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
    10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
    11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
    18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  },
  // Half casters (Paladin, Ranger) start at level 2
  Paladin: {
    1: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    4: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    5: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    6: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    7: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    8: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    9: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    10: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    11: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    12: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    13: [4, 3, 3, 1, 0, 0, 0, 0, 0],
    14: [4, 3, 3, 1, 0, 0, 0, 0, 0],
    15: [4, 3, 3, 2, 0, 0, 0, 0, 0],
    16: [4, 3, 3, 2, 0, 0, 0, 0, 0],
    17: [4, 3, 3, 3, 1, 0, 0, 0, 0],
    18: [4, 3, 3, 3, 1, 0, 0, 0, 0],
    19: [4, 3, 3, 3, 2, 0, 0, 0, 0],
    20: [4, 3, 3, 3, 2, 0, 0, 0, 0],
  },
};

// Copy same slots for similar classes
SPELL_SLOTS_BY_CLASS.Bard = SPELL_SLOTS_BY_CLASS.Wizard;
SPELL_SLOTS_BY_CLASS.Cleric = SPELL_SLOTS_BY_CLASS.Wizard;
SPELL_SLOTS_BY_CLASS.Druid = SPELL_SLOTS_BY_CLASS.Wizard;
SPELL_SLOTS_BY_CLASS.Sorcerer = SPELL_SLOTS_BY_CLASS.Wizard;
SPELL_SLOTS_BY_CLASS.Ranger = SPELL_SLOTS_BY_CLASS.Paladin;

// Helper function to get spell slots for a class and level
export function getSpellSlotsForClassLevel(className: string, level: number): SpellSlots {
  const slots = SPELL_SLOTS_BY_CLASS[className]?.[level];
  if (!slots) {
    return { ...DEFAULT_SPELL_SLOTS };
  }
  return {
    level1: { used: 0, max: slots[0] },
    level2: { used: 0, max: slots[1] },
    level3: { used: 0, max: slots[2] },
    level4: { used: 0, max: slots[3] },
    level5: { used: 0, max: slots[4] },
    level6: { used: 0, max: slots[5] },
    level7: { used: 0, max: slots[6] },
    level8: { used: 0, max: slots[7] },
    level9: { used: 0, max: slots[8] },
  };
}

// Helper to get school icon component
export function getSpellSchoolIcon(school: string): LucideIcon {
  return SPELL_SCHOOL_DATA[school as SpellSchool]?.icon || Wand2;
}

// Helper to get school color
export function getSpellSchoolColor(school: string): string {
  return SPELL_SCHOOL_DATA[school as SpellSchool]?.color || 'text-gray-500';
}

// Helper to get school background color
export function getSpellSchoolBgColor(school: string): string {
  return SPELL_SCHOOL_DATA[school as SpellSchool]?.bgColor || 'bg-gray-100';
}

// Format spell components as string
export function formatSpellComponents(components: { verbal?: boolean; somatic?: boolean; material?: boolean; materialDescription?: string }): string {
  const parts: string[] = [];
  if (components.verbal) parts.push('V');
  if (components.somatic) parts.push('S');
  if (components.material) {
    parts.push('M' + (components.materialDescription ? ` (${components.materialDescription})` : ''));
  }
  return parts.join(', ');
}

// Get spell level ordinal
export function getSpellLevelOrdinal(level: number): string {
  if (level === 0) return 'cantrip';
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = level % 100;
  return level + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

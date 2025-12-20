// D&D 5e Proficiency Constants and Data

import type { SkillProficiencies, SavingThrowProficiencies, CharacterProficiencies, ProficiencyLevel } from './schema';

// Skill definitions with their associated ability scores
export const SKILLS = {
  acrobatics: { name: 'Acrobatics', ability: 'dex' as const },
  animalHandling: { name: 'Animal Handling', ability: 'wis' as const },
  arcana: { name: 'Arcana', ability: 'int' as const },
  athletics: { name: 'Athletics', ability: 'str' as const },
  deception: { name: 'Deception', ability: 'cha' as const },
  history: { name: 'History', ability: 'int' as const },
  insight: { name: 'Insight', ability: 'wis' as const },
  intimidation: { name: 'Intimidation', ability: 'cha' as const },
  investigation: { name: 'Investigation', ability: 'int' as const },
  medicine: { name: 'Medicine', ability: 'wis' as const },
  nature: { name: 'Nature', ability: 'int' as const },
  perception: { name: 'Perception', ability: 'wis' as const },
  performance: { name: 'Performance', ability: 'cha' as const },
  persuasion: { name: 'Persuasion', ability: 'cha' as const },
  religion: { name: 'Religion', ability: 'int' as const },
  sleightOfHand: { name: 'Sleight of Hand', ability: 'dex' as const },
  stealth: { name: 'Stealth', ability: 'dex' as const },
  survival: { name: 'Survival', ability: 'wis' as const },
} as const;

export type SkillKey = keyof typeof SKILLS;
export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

// Ability score names
export const ABILITIES = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
} as const;

// Weapon proficiency categories
export const WEAPON_CATEGORIES = [
  'Simple weapons',
  'Martial weapons',
] as const;

// Individual weapons for specific proficiencies
export const WEAPONS = [
  // Simple melee
  'Club', 'Dagger', 'Greatclub', 'Handaxe', 'Javelin', 'Light hammer',
  'Mace', 'Quarterstaff', 'Sickle', 'Spear',
  // Simple ranged
  'Light crossbow', 'Dart', 'Shortbow', 'Sling',
  // Martial melee
  'Battleaxe', 'Flail', 'Glaive', 'Greataxe', 'Greatsword', 'Halberd',
  'Lance', 'Longsword', 'Maul', 'Morningstar', 'Pike', 'Rapier',
  'Scimitar', 'Shortsword', 'Trident', 'War pick', 'Warhammer', 'Whip',
  // Martial ranged
  'Blowgun', 'Hand crossbow', 'Heavy crossbow', 'Longbow', 'Net',
] as const;

// Armor proficiency categories
export const ARMOR_TYPES = [
  'Light armor',
  'Medium armor',
  'Heavy armor',
  'Shields',
] as const;

// Tool categories and items
export const TOOL_CATEGORIES = {
  'Artisan\'s tools': [
    'Alchemist\'s supplies',
    'Brewer\'s supplies',
    'Calligrapher\'s supplies',
    'Carpenter\'s tools',
    'Cartographer\'s tools',
    'Cobbler\'s tools',
    'Cook\'s utensils',
    'Glassblower\'s tools',
    'Jeweler\'s tools',
    'Leatherworker\'s tools',
    'Mason\'s tools',
    'Painter\'s supplies',
    'Potter\'s tools',
    'Smith\'s tools',
    'Tinker\'s tools',
    'Weaver\'s tools',
    'Woodcarver\'s tools',
  ],
  'Gaming sets': [
    'Dice set',
    'Dragonchess set',
    'Playing card set',
    'Three-Dragon Ante set',
  ],
  'Musical instruments': [
    'Bagpipes',
    'Drum',
    'Dulcimer',
    'Flute',
    'Lute',
    'Lyre',
    'Horn',
    'Pan flute',
    'Shawm',
    'Viol',
  ],
  'Other tools': [
    'Disguise kit',
    'Forgery kit',
    'Herbalism kit',
    'Navigator\'s tools',
    'Poisoner\'s kit',
    'Thieves\' tools',
    'Vehicles (land)',
    'Vehicles (water)',
  ],
} as const;

// Flatten all tools into a single list
export const ALL_TOOLS = Object.values(TOOL_CATEGORIES).flat();

// Languages
export const LANGUAGES = {
  standard: [
    'Common',
    'Dwarvish',
    'Elvish',
    'Giant',
    'Gnomish',
    'Goblin',
    'Halfling',
    'Orc',
  ],
  exotic: [
    'Abyssal',
    'Celestial',
    'Draconic',
    'Deep Speech',
    'Infernal',
    'Primordial',
    'Sylvan',
    'Undercommon',
  ],
  rare: [
    'Druidic',
    'Thieves\' Cant',
  ],
} as const;

// All languages flattened
export const ALL_LANGUAGES = [
  ...LANGUAGES.standard,
  ...LANGUAGES.exotic,
  ...LANGUAGES.rare,
];

// Proficiency level labels
export const PROFICIENCY_LEVEL_LABELS = {
  0: 'Not Proficient',
  1: 'Proficient',
  2: 'Expertise',
} as const;

// Default empty proficiencies
export const DEFAULT_SKILL_PROFICIENCIES: SkillProficiencies = {
  acrobatics: 0,
  animalHandling: 0,
  arcana: 0,
  athletics: 0,
  deception: 0,
  history: 0,
  insight: 0,
  intimidation: 0,
  investigation: 0,
  medicine: 0,
  nature: 0,
  perception: 0,
  performance: 0,
  persuasion: 0,
  religion: 0,
  sleightOfHand: 0,
  stealth: 0,
  survival: 0,
};

export const DEFAULT_SAVING_THROW_PROFICIENCIES: SavingThrowProficiencies = {
  str: false,
  dex: false,
  con: false,
  int: false,
  wis: false,
  cha: false,
};

export const DEFAULT_CHARACTER_PROFICIENCIES: CharacterProficiencies = {
  skills: { ...DEFAULT_SKILL_PROFICIENCIES },
  savingThrows: { ...DEFAULT_SAVING_THROW_PROFICIENCIES },
  weapons: [],
  armor: [],
  tools: [],
  languages: ['Common'],
};

// Helper to calculate ability modifier
export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// Helper to calculate skill bonus
export function getSkillBonus(
  abilityScore: number,
  proficiencyBonus: number,
  proficiencyLevel: ProficiencyLevel
): number {
  const modifier = getAbilityModifier(abilityScore);
  switch (proficiencyLevel) {
    case 0: return modifier;
    case 1: return modifier + proficiencyBonus;
    case 2: return modifier + (proficiencyBonus * 2); // Expertise
    default: return modifier;
  }
}

// Helper to calculate saving throw bonus
export function getSavingThrowBonus(
  abilityScore: number,
  proficiencyBonus: number,
  isProficient: boolean
): number {
  const modifier = getAbilityModifier(abilityScore);
  return isProficient ? modifier + proficiencyBonus : modifier;
}

// Format bonus as +X or -X
export function formatBonus(bonus: number): string {
  return bonus >= 0 ? `+${bonus}` : `${bonus}`;
}

// Group skills by ability
export function getSkillsByAbility(): Record<AbilityKey, SkillKey[]> {
  const grouped: Record<AbilityKey, SkillKey[]> = {
    str: [],
    dex: [],
    con: [],
    int: [],
    wis: [],
    cha: [],
  };

  for (const [key, skill] of Object.entries(SKILLS)) {
    grouped[skill.ability].push(key as SkillKey);
  }

  return grouped;
}

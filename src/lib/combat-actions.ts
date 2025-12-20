// D&D 5e Combat Action Definitions

export type ActionCategory = 'action' | 'bonus_action' | 'reaction' | 'movement' | 'free';

export interface CombatAction {
  id: string;
  name: string;
  category: ActionCategory;
  description: string;
}

export interface TakenAction {
  actionId: string;
  actionName: string;
  category: ActionCategory;
  timestamp: string;
  details?: string;
}

export interface ActionEconomy {
  usedAction: boolean;
  usedBonusAction: boolean;
  usedReaction: boolean;
  usedMovement: boolean;
  actionsTaken: TakenAction[];
}

export const DEFAULT_ACTION_ECONOMY: ActionEconomy = {
  usedAction: false,
  usedBonusAction: false,
  usedReaction: false,
  usedMovement: false,
  actionsTaken: [],
};

// All D&D 5e Combat Actions organized by category
export const COMBAT_ACTIONS: CombatAction[] = [
  // Standard Actions (consume your action)
  {
    id: 'attack',
    name: 'Attack',
    category: 'action',
    description: 'Make a melee or ranged attack against a target. You can make multiple attacks if you have Extra Attack.',
  },
  {
    id: 'cast-spell',
    name: 'Cast a Spell',
    category: 'action',
    description: 'Cast a spell with a casting time of 1 action. Some spells require concentration.',
  },
  {
    id: 'dash',
    name: 'Dash',
    category: 'action',
    description: 'Gain extra movement equal to your speed for the current turn, effectively doubling how far you can move.',
  },
  {
    id: 'disengage',
    name: 'Disengage',
    category: 'action',
    description: 'Your movement does not provoke opportunity attacks for the rest of the turn.',
  },
  {
    id: 'dodge',
    name: 'Dodge',
    category: 'action',
    description: 'Until your next turn, attack rolls against you have disadvantage (if you can see the attacker), and you have advantage on DEX saving throws.',
  },
  {
    id: 'help',
    name: 'Help',
    category: 'action',
    description: 'Give an ally advantage on their next ability check for a task, or advantage on their next attack roll against a creature within 5 feet of you.',
  },
  {
    id: 'hide',
    name: 'Hide',
    category: 'action',
    description: 'Make a Dexterity (Stealth) check to attempt to hide. You must be heavily obscured or behind cover.',
  },
  {
    id: 'ready',
    name: 'Ready',
    category: 'action',
    description: 'Prepare an action to trigger when a specific condition occurs. Uses your reaction to execute when triggered.',
  },
  {
    id: 'search',
    name: 'Search',
    category: 'action',
    description: 'Make a Wisdom (Perception) or Intelligence (Investigation) check to find something hidden.',
  },
  {
    id: 'use-object',
    name: 'Use an Object',
    category: 'action',
    description: 'Interact with an object that requires your action, such as drinking a potion or activating a magic item.',
  },
  {
    id: 'grapple',
    name: 'Grapple',
    category: 'action',
    description: 'Attempt to grab a creature (replaces one attack). Make a Strength (Athletics) check contested by their Athletics or Acrobatics. On success, target is grappled.',
  },
  {
    id: 'shove',
    name: 'Shove',
    category: 'action',
    description: 'Attempt to push a creature 5 feet or knock them prone (replaces one attack). Contested Strength (Athletics) check.',
  },
  {
    id: 'improvise',
    name: 'Improvise',
    category: 'action',
    description: 'Attempt an action not covered by other options. Describe what you want to do and the DM will determine the outcome.',
  },

  // Bonus Actions
  {
    id: 'bonus-attack',
    name: 'Bonus Attack',
    category: 'bonus_action',
    description: 'Make an off-hand attack with a light weapon, or use Two-Weapon Fighting. Damage does not add ability modifier unless negative.',
  },
  {
    id: 'bonus-spell',
    name: 'Bonus Action Spell',
    category: 'bonus_action',
    description: 'Cast a spell with a casting time of 1 bonus action (e.g., Healing Word, Misty Step, Spiritual Weapon).',
  },
  {
    id: 'other-bonus',
    name: 'Other Bonus Action',
    category: 'bonus_action',
    description: 'Use a class feature, racial ability, or magic item that requires a bonus action (e.g., Cunning Action, Second Wind).',
  },

  // Reactions
  {
    id: 'opportunity-attack',
    name: 'Opportunity Attack',
    category: 'reaction',
    description: 'Make a melee attack against a creature that moves out of your reach. Uses your reaction.',
  },
  {
    id: 'reaction-spell',
    name: 'Reaction Spell',
    category: 'reaction',
    description: 'Cast a reaction spell like Shield, Counterspell, Absorb Elements, or Feather Fall.',
  },
  {
    id: 'other-reaction',
    name: 'Other Reaction',
    category: 'reaction',
    description: 'Use a reaction granted by a class feature, feat, or item (e.g., Uncanny Dodge, Sentinel, Parry).',
  },

  // Movement
  {
    id: 'move',
    name: 'Move',
    category: 'movement',
    description: 'Move up to your speed. Movement can be split before and after actions. Difficult terrain costs double.',
  },

  // Free Actions (no limit)
  {
    id: 'free-interact',
    name: 'Object Interaction',
    category: 'free',
    description: 'Interact with one object for free during your turn: draw or sheathe a weapon, open a door, pick up an item, etc.',
  },
  {
    id: 'communicate',
    name: 'Communicate',
    category: 'free',
    description: 'Speak briefly (a few sentences), use gestures, or give a short command to allies.',
  },
  {
    id: 'drop',
    name: 'Drop Item',
    category: 'free',
    description: 'Drop something you are holding. Does not require an action or object interaction.',
  },
];

// Group actions by category for UI display
export const ACTIONS_BY_CATEGORY = {
  action: COMBAT_ACTIONS.filter(a => a.category === 'action'),
  bonus_action: COMBAT_ACTIONS.filter(a => a.category === 'bonus_action'),
  reaction: COMBAT_ACTIONS.filter(a => a.category === 'reaction'),
  movement: COMBAT_ACTIONS.filter(a => a.category === 'movement'),
  free: COMBAT_ACTIONS.filter(a => a.category === 'free'),
};

// Category display names and colors
export const CATEGORY_INFO: Record<ActionCategory, { name: string; color: string; bgColor: string }> = {
  action: { name: 'Actions', color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  bonus_action: { name: 'Bonus Actions', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  reaction: { name: 'Reactions', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  movement: { name: 'Movement', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  free: { name: 'Free Actions', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
};

// Check if an action category is available based on economy
export function isActionAvailable(category: ActionCategory, economy: ActionEconomy): boolean {
  switch (category) {
    case 'action':
      return !economy.usedAction;
    case 'bonus_action':
      return !economy.usedBonusAction;
    case 'reaction':
      return !economy.usedReaction;
    case 'movement':
      return !economy.usedMovement;
    case 'free':
      return true; // Free actions are always available
    default:
      return false;
  }
}

// Update economy after taking an action
export function consumeAction(category: ActionCategory, economy: ActionEconomy): ActionEconomy {
  const updated = { ...economy };
  switch (category) {
    case 'action':
      updated.usedAction = true;
      break;
    case 'bonus_action':
      updated.usedBonusAction = true;
      break;
    case 'reaction':
      updated.usedReaction = true;
      break;
    case 'movement':
      updated.usedMovement = true;
      break;
    // Free actions don't consume anything
  }
  return updated;
}

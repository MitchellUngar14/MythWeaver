import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  isPlayer: z.boolean().default(false),
  isDm: z.boolean().default(false),
}).refine(data => data.isPlayer || data.isDm, {
  message: 'You must select at least one role (Player or DM)',
});

// Character schemas
export const characterStatsSchema = z.object({
  str: z.number().min(1).max(30),
  dex: z.number().min(1).max(30),
  con: z.number().min(1).max(30),
  int: z.number().min(1).max(30),
  wis: z.number().min(1).max(30),
  cha: z.number().min(1).max(30),
  hp: z.number().min(0),
  maxHp: z.number().min(1),
  ac: z.number().min(0),
  speed: z.number().min(0),
  proficiencyBonus: z.number().min(2).max(6),
  hitDice: z.string(),
});

export const createCharacterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  class: z.string().max(50).optional(),
  race: z.string().max(50).optional(),
  level: z.number().min(1).max(20).default(1),
  stats: characterStatsSchema,
  backstory: z.string().optional(),
  notes: z.string().optional(),
});

export const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  quantity: z.number().min(1),
  weight: z.number().optional(),
  description: z.string().optional(),
  equipped: z.boolean().optional(),
});

// World schemas
export const createWorldSchema = z.object({
  name: z.string().min(1, 'World name is required').max(100),
  description: z.string().optional(),
});

export const worldResourceSchema = z.object({
  type: z.enum(['npc', 'location', 'lore', 'item', 'faction']),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  isPlayerVisible: z.boolean().default(false),
});

// Enemy schemas
export const enemyStatsSchema = z.object({
  hp: z.number().min(1),
  ac: z.number().min(0),
  str: z.number().min(1).max(30),
  dex: z.number().min(1).max(30),
  con: z.number().min(1).max(30),
  int: z.number().min(1).max(30),
  wis: z.number().min(1).max(30),
  cha: z.number().min(1).max(30),
  speed: z.number().min(0),
  attacks: z.array(z.object({
    name: z.string(),
    bonus: z.number(),
    damage: z.string(),
    type: z.string(),
  })).optional(),
});

export const createEnemyTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  stats: enemyStatsSchema,
  abilities: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    type: z.enum(['action', 'bonus_action', 'reaction', 'passive', 'spell']),
    uses: z.number().optional(),
    maxUses: z.number().optional(),
    recharge: z.string().optional(),
  })).default([]),
  description: z.string().optional(),
  challengeRating: z.string().optional(),
  worldId: z.string().uuid().optional(),
  // Location fields
  location: z.string().max(200).optional(),
  locationResourceId: z.string().uuid().optional(),
});

// NPC schema - extends enemy template with NPC-specific fields
export const createNpcSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  stats: enemyStatsSchema,
  abilities: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    type: z.enum(['action', 'bonus_action', 'reaction', 'passive', 'spell']),
    uses: z.number().optional(),
    maxUses: z.number().optional(),
    recharge: z.string().optional(),
  })).default([]),
  description: z.string().optional(),
  challengeRating: z.string().optional(),
  worldId: z.string().uuid().optional(),
  // Location fields
  location: z.string().max(200).optional(),
  locationResourceId: z.string().uuid().optional(),
  // NPC-specific fields
  isNpc: z.literal(true).default(true),
  defaultHideHp: z.boolean().default(true), // NPCs default to hidden HP
});

// Item schemas
export const itemPropertiesSchema = z.object({
  // Weapon properties
  damage: z.string().optional(),
  damageType: z.string().optional(),
  attackBonus: z.number().optional(),
  range: z.object({
    normal: z.number(),
    long: z.number().optional(),
  }).optional(),
  isRanged: z.boolean().optional(),
  weaponProperties: z.array(z.string()).optional(),
  versatileDamage: z.string().optional(),
  // Armor properties
  acBonus: z.number().optional(),
  armorType: z.enum(['light', 'medium', 'heavy', 'shield']).optional(),
  maxDexBonus: z.number().optional(),
  stealthDisadvantage: z.boolean().optional(),
  strengthRequirement: z.number().optional(),
  // Consumable properties
  charges: z.number().optional(),
  maxCharges: z.number().optional(),
  effect: z.string().optional(),
  // Custom properties
  custom: z.record(z.string(), z.unknown()).optional(),
});

export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  type: z.enum(['weapon', 'armor', 'shield', 'consumable', 'wondrous', 'misc']),
  rarity: z.enum(['common', 'uncommon', 'rare', 'very_rare', 'legendary']).optional(),
  weight: z.number().min(0).optional(),
  value: z.number().min(0).optional(),
  properties: itemPropertiesSchema.optional(),
  requiresAttunement: z.boolean().default(false),
  worldId: z.string().uuid(),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  type: z.enum(['weapon', 'armor', 'shield', 'consumable', 'wondrous', 'misc']).optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'very_rare', 'legendary']).nullable().optional(),
  weight: z.number().min(0).nullable().optional(),
  value: z.number().min(0).nullable().optional(),
  properties: itemPropertiesSchema.optional(),
  requiresAttunement: z.boolean().optional(),
});

export const addCharacterItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().min(1).default(1),
  equipped: z.boolean().default(false),
  attuned: z.boolean().default(false),
  notes: z.string().optional(),
});

export const updateCharacterItemSchema = z.object({
  quantity: z.number().min(0).optional(), // 0 = remove
  equipped: z.boolean().optional(),
  attuned: z.boolean().optional(),
  notes: z.string().optional(),
});

export const addEnemyItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().min(1).default(1),
  equipped: z.boolean().default(false),
});

export const updateEnemyItemSchema = z.object({
  quantity: z.number().min(0).optional(), // 0 = remove
  equipped: z.boolean().optional(),
});

export const itemTransferSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().min(1),
  fromType: z.enum(['world', 'character', 'enemy']),
  fromId: z.string().uuid().optional(), // Required for character/enemy
  toType: z.enum(['character', 'enemy']),
  toId: z.string().uuid(),
});

// Dice schemas
export const diceRollSchema = z.object({
  dice: z.string().regex(/^\d+d\d+([+-]\d+)?$/, 'Invalid dice format (e.g., 2d6+3)'),
  context: z.string().max(100).optional(),
});

// Session schemas
export const createSessionSchema = z.object({
  name: z.string().min(1, 'Session name is required').max(100),
  worldId: z.string().uuid(),
});

export const updateSessionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateSessionLocationSchema = z.object({
  currentLocation: z.string().max(200).nullable(),
  currentLocationResourceId: z.string().uuid().nullable().optional(),
});

export const statusEffectSchema = z.object({
  name: z.string().min(1),
  duration: z.number().optional(),
  description: z.string().optional(),
});

export const addCombatantSchema = z.object({
  type: z.enum(['character', 'enemy']),
  characterId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  initiative: z.number().min(1).max(30),
  customName: z.string().max(100).optional(),
}).refine(
  (data) => (data.type === 'character' && data.characterId) || (data.type === 'enemy' && data.templateId),
  { message: 'Character ID or Template ID required based on type' }
);

export const updateCombatantSchema = z.object({
  currentHp: z.number().min(0).optional(),
  statusEffects: z.array(statusEffectSchema).optional(),
  isActive: z.boolean().optional(),
  position: z.number().optional(),
  showHpToPlayers: z.boolean().optional(),
});

export const sessionRollSchema = z.object({
  dice: z.string().regex(/^\d+d\d+([+-]\d+)?$/, 'Invalid dice format'),
  context: z.string().max(100).optional(),
});

export const chatMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type CreateWorldInput = z.infer<typeof createWorldSchema>;
export type CreateEnemyTemplateInput = z.infer<typeof createEnemyTemplateSchema>;
export type CreateNpcInput = z.infer<typeof createNpcSchema>;
export type DiceRollInput = z.infer<typeof diceRollSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type UpdateSessionLocationInput = z.infer<typeof updateSessionLocationSchema>;
export type AddCombatantInput = z.infer<typeof addCombatantSchema>;
export type UpdateCombatantInput = z.infer<typeof updateCombatantSchema>;
export type SessionRollInput = z.infer<typeof sessionRollSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type AddCharacterItemInput = z.infer<typeof addCharacterItemSchema>;
export type UpdateCharacterItemInput = z.infer<typeof updateCharacterItemSchema>;
export type AddEnemyItemInput = z.infer<typeof addEnemyItemSchema>;
export type UpdateEnemyItemInput = z.infer<typeof updateEnemyItemSchema>;
export type ItemTransferInput = z.infer<typeof itemTransferSchema>;

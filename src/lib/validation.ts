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

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type CreateWorldInput = z.infer<typeof createWorldSchema>;
export type CreateEnemyTemplateInput = z.infer<typeof createEnemyTemplateSchema>;
export type DiceRollInput = z.infer<typeof diceRollSchema>;

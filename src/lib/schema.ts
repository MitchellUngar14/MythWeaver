import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table with profile roles
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  isPlayer: boolean('is_player').default(false),
  isDm: boolean('is_dm').default(false),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_users_email').on(table.email),
]);

// Worlds (DM-owned campaign containers)
export const worlds = pgTable('worlds', {
  id: uuid('id').primaryKey().defaultRandom(),
  dmId: uuid('dm_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  roomKey: varchar('room_key', { length: 6 }).unique().notNull(),
  settings: jsonb('settings').default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_worlds_dm').on(table.dmId),
  index('idx_worlds_room_key').on(table.roomKey),
]);

// World membership (players joined to worlds)
export const worldMembers = pgTable('world_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
  joinedAt: timestamp('joined_at').defaultNow(),
}, (table) => [
  unique('world_members_unique').on(table.worldId, table.userId),
  index('idx_world_members_world').on(table.worldId),
  index('idx_world_members_user').on(table.userId),
]);

// Characters (player-owned)
export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull(),
  class: varchar('class', { length: 50 }),
  race: varchar('race', { length: 50 }),
  level: integer('level').default(1),
  stats: jsonb('stats').notNull().$type<CharacterStats>(),
  inventory: jsonb('inventory').default([]).$type<InventoryItem[]>(),
  abilities: jsonb('abilities').default([]).$type<Ability[]>(),
  backstory: text('backstory'),
  notes: text('notes'),
  version: integer('version').default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_characters_user').on(table.userId),
  index('idx_characters_world').on(table.worldId),
]);

// Game sessions (individual play sessions within a world)
export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  sessionNumber: integer('session_number').default(1),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
}, (table) => [
  index('idx_sessions_world').on(table.worldId),
]);

// World resources (NPCs, locations, lore - DM created)
export const worldResources = pgTable('world_resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'npc', 'location', 'lore', 'item', 'faction'
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  data: jsonb('data').default({}),
  isPlayerVisible: boolean('is_player_visible').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_world_resources_world').on(table.worldId),
  index('idx_world_resources_type').on(table.worldId, table.type),
]);

// Enemy templates (DM-created, reusable across worlds)
export const enemyTemplates = pgTable('enemy_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  dmId: uuid('dm_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull(),
  stats: jsonb('stats').notNull().$type<EnemyStats>(),
  abilities: jsonb('abilities').default([]).$type<Ability[]>(),
  description: text('description'),
  challengeRating: varchar('challenge_rating', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_enemy_templates_dm').on(table.dmId),
]);

// Combat instances (active enemies in session)
export const combatInstances = pgTable('combat_instances', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => gameSessions.id, { onDelete: 'cascade' }).notNull(),
  templateId: uuid('template_id').references(() => enemyTemplates.id),
  name: varchar('name', { length: 100 }).notNull(),
  currentHp: integer('current_hp'),
  maxHp: integer('max_hp'),
  statusEffects: jsonb('status_effects').default([]).$type<StatusEffect[]>(),
  position: integer('position'), // initiative order
  isActive: boolean('is_active').default(true),
}, (table) => [
  index('idx_combat_session').on(table.sessionId),
]);

// Dice roll history
export const diceRolls = pgTable('dice_rolls', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => gameSessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  rollType: varchar('roll_type', { length: 20 }),
  dice: varchar('dice', { length: 50 }), // e.g., "2d6+3"
  results: jsonb('results').$type<number[]>(),
  total: integer('total'),
  context: varchar('context', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_rolls_session').on(table.sessionId),
]);

// Action log for audit trail
export const actionLog = pgTable('action_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => gameSessions.id),
  actorId: uuid('actor_id').references(() => users.id),
  actionType: varchar('action_type', { length: 50 }),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_action_log_session').on(table.sessionId),
]);

// Character history for versioning
export const characterHistory = pgTable('character_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').references(() => characters.id),
  version: integer('version'),
  snapshot: jsonb('snapshot'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  characters: many(characters),
  worlds: many(worlds),
  worldMemberships: many(worldMembers),
  enemyTemplates: many(enemyTemplates),
}));

export const worldsRelations = relations(worlds, ({ one, many }) => ({
  dm: one(users, { fields: [worlds.dmId], references: [users.id] }),
  members: many(worldMembers),
  characters: many(characters),
  sessions: many(gameSessions),
  resources: many(worldResources),
}));

export const worldMembersRelations = relations(worldMembers, ({ one }) => ({
  world: one(worlds, { fields: [worldMembers.worldId], references: [worlds.id] }),
  user: one(users, { fields: [worldMembers.userId], references: [users.id] }),
  character: one(characters, { fields: [worldMembers.characterId], references: [characters.id] }),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  user: one(users, { fields: [characters.userId], references: [users.id] }),
  world: one(worlds, { fields: [characters.worldId], references: [worlds.id] }),
  history: many(characterHistory),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
  world: one(worlds, { fields: [gameSessions.worldId], references: [worlds.id] }),
  combatInstances: many(combatInstances),
  diceRolls: many(diceRolls),
  actionLogs: many(actionLog),
}));

// TypeScript types for JSONB columns
export interface CharacterStats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  hp: number;
  maxHp: number;
  ac: number;
  speed: number;
  proficiencyBonus: number;
  hitDice: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  weight?: number;
  description?: string;
  equipped?: boolean;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  type: 'action' | 'bonus_action' | 'reaction' | 'passive' | 'spell';
  uses?: number;
  maxUses?: number;
  recharge?: string;
}

export interface EnemyStats {
  hp: number;
  ac: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  speed: number;
  attacks?: {
    name: string;
    bonus: number;
    damage: string;
    type: string;
  }[];
}

export interface StatusEffect {
  name: string;
  duration?: number;
  description?: string;
}

// Type exports for use in the app
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type World = typeof worlds.$inferSelect;
export type NewWorld = typeof worlds.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type GameSession = typeof gameSessions.$inferSelect;
export type EnemyTemplate = typeof enemyTemplates.$inferSelect;
export type WorldResource = typeof worldResources.$inferSelect;

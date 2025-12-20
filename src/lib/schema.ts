import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { ActionEconomy } from './combat-actions';

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
  proficiencies: jsonb('proficiencies').$type<CharacterProficiencies>(),
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
  combatRound: integer('combat_round').default(0),
  currentTurnId: uuid('current_turn_id'),
  // Current session location
  currentLocation: varchar('current_location', { length: 200 }),
  currentLocationResourceId: uuid('current_location_resource_id').references(() => worldResources.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
}, (table) => [
  index('idx_sessions_world').on(table.worldId),
]);

// World resources (NPCs, locations, lore - DM created)
export const worldResources = pgTable('world_resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'cascade' }).notNull(),
  parentId: uuid('parent_id'), // Self-reference for hierarchical locations (e.g., "Tavern" under "Bludhaven")
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
  index('idx_world_resources_parent').on(table.parentId),
]);

// Enemy templates (DM-created, reusable across worlds) - also used for NPCs
export const enemyTemplates = pgTable('enemy_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  dmId: uuid('dm_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull(),
  stats: jsonb('stats').notNull().$type<EnemyStats>(),
  abilities: jsonb('abilities').default([]).$type<Ability[]>(),
  description: text('description'),
  challengeRating: varchar('challenge_rating', { length: 10 }),
  // NPC-specific fields
  isNpc: boolean('is_npc').default(false),
  defaultHideHp: boolean('default_hide_hp').default(false),
  // Location fields (for both enemies and NPCs)
  location: varchar('location', { length: 200 }),
  locationResourceId: uuid('location_resource_id').references(() => worldResources.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_enemy_templates_dm').on(table.dmId),
  index('idx_enemy_templates_npc').on(table.isNpc),
]);

// Combat instances (active enemies in session)
export const combatInstances = pgTable('combat_instances', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => gameSessions.id, { onDelete: 'cascade' }).notNull(),
  templateId: uuid('template_id').references(() => enemyTemplates.id),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull(),
  currentHp: integer('current_hp'),
  maxHp: integer('max_hp'),
  statusEffects: jsonb('status_effects').default([]).$type<StatusEffect[]>(),
  position: integer('position'), // initiative order
  isActive: boolean('is_active').default(true),
  showHpToPlayers: boolean('show_hp_to_players').default(false),
  isCompanion: boolean('is_companion').default(false), // NPC fighting with the party
  actionEconomy: jsonb('action_economy').$type<ActionEconomy>(), // Tracks action/bonus/reaction/movement used this turn
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

// Session participants (tracks who's connected to a session)
export const sessionParticipants = pgTable('session_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => gameSessions.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
  joinedAt: timestamp('joined_at').defaultNow(),
  leftAt: timestamp('left_at'),
  isOnline: boolean('is_online').default(true),
}, (table) => [
  unique('session_participant_unique').on(table.sessionId, table.userId),
  index('idx_session_participants_session').on(table.sessionId),
]);

// Chat messages for session
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => gameSessions.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_chat_messages_session').on(table.sessionId),
]);

// Items (DM-created item templates for a world)
export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'cascade' }).notNull(),
  dmId: uuid('dm_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // weapon, armor, shield, consumable, wondrous, misc
  rarity: varchar('rarity', { length: 20 }), // common, uncommon, rare, very_rare, legendary
  weight: integer('weight'), // in tenths of pounds (e.g., 30 = 3.0 lbs)
  value: integer('value'), // in copper pieces for precision
  properties: jsonb('properties').default({}).$type<ItemProperties>(),
  requiresAttunement: boolean('requires_attunement').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_items_world').on(table.worldId),
  index('idx_items_dm').on(table.dmId),
  index('idx_items_type').on(table.type),
]);

// Character items (junction table for character inventory)
export const characterItems = pgTable('character_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'cascade' }).notNull(),
  itemId: uuid('item_id').references(() => items.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  equipped: boolean('equipped').default(false),
  attuned: boolean('attuned').default(false),
  notes: text('notes'),
  acquiredAt: timestamp('acquired_at').defaultNow(),
}, (table) => [
  index('idx_character_items_character').on(table.characterId),
  index('idx_character_items_item').on(table.itemId),
]);

// Enemy/NPC items (junction table for enemy template inventory)
export const enemyItems = pgTable('enemy_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').references(() => enemyTemplates.id, { onDelete: 'cascade' }).notNull(),
  itemId: uuid('item_id').references(() => items.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  equipped: boolean('equipped').default(false),
}, (table) => [
  index('idx_enemy_items_template').on(table.templateId),
  index('idx_enemy_items_item').on(table.itemId),
]);

// Spells (DM-created or core D&D spells)
export const spells = pgTable('spells', {
  id: uuid('id').primaryKey().defaultRandom(),
  worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'cascade' }), // null = core spell
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull(),
  level: integer('level').notNull(), // 0 = cantrip, 1-9 = spell levels
  school: varchar('school', { length: 20 }).notNull(), // abjuration, conjuration, etc.
  castingTime: varchar('casting_time', { length: 100 }).notNull(),
  range: varchar('range', { length: 100 }).notNull(),
  components: jsonb('components').$type<SpellComponents>(),
  duration: varchar('duration', { length: 100 }).notNull(),
  concentration: boolean('concentration').default(false),
  ritual: boolean('ritual').default(false),
  description: text('description').notNull(),
  higherLevels: text('higher_levels'), // at higher levels description
  classes: jsonb('classes').$type<string[]>().default([]), // which classes can use this spell
  isCore: boolean('is_core').default(false), // true for built-in D&D spells
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_spells_world').on(table.worldId),
  index('idx_spells_level').on(table.level),
  index('idx_spells_school').on(table.school),
  index('idx_spells_core').on(table.isCore),
]);

// Character spells (junction table for character spell lists)
export const characterSpells = pgTable('character_spells', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'cascade' }).notNull(),
  spellId: uuid('spell_id').references(() => spells.id, { onDelete: 'cascade' }).notNull(),
  isPrepared: boolean('is_prepared').default(false),
  isAlwaysPrepared: boolean('is_always_prepared').default(false), // from race/class features
  source: varchar('source', { length: 50 }), // 'class', 'race', 'feat', 'item'
  notes: text('notes'),
  addedAt: timestamp('added_at').defaultNow(),
}, (table) => [
  index('idx_character_spells_character').on(table.characterId),
  index('idx_character_spells_spell').on(table.spellId),
]);

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
  items: many(characterItems),
  spells: many(characterSpells),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
  world: one(worlds, { fields: [gameSessions.worldId], references: [worlds.id] }),
  currentLocationResource: one(worldResources, { fields: [gameSessions.currentLocationResourceId], references: [worldResources.id] }),
  combatInstances: many(combatInstances),
  diceRolls: many(diceRolls),
  actionLogs: many(actionLog),
  participants: many(sessionParticipants),
  chatMessages: many(chatMessages),
}));

export const sessionParticipantsRelations = relations(sessionParticipants, ({ one }) => ({
  session: one(gameSessions, { fields: [sessionParticipants.sessionId], references: [gameSessions.id] }),
  user: one(users, { fields: [sessionParticipants.userId], references: [users.id] }),
  character: one(characters, { fields: [sessionParticipants.characterId], references: [characters.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(gameSessions, { fields: [chatMessages.sessionId], references: [gameSessions.id] }),
  user: one(users, { fields: [chatMessages.userId], references: [users.id] }),
}));

export const combatInstancesRelations = relations(combatInstances, ({ one }) => ({
  session: one(gameSessions, { fields: [combatInstances.sessionId], references: [gameSessions.id] }),
  template: one(enemyTemplates, { fields: [combatInstances.templateId], references: [enemyTemplates.id] }),
  character: one(characters, { fields: [combatInstances.characterId], references: [characters.id] }),
}));

export const diceRollsRelations = relations(diceRolls, ({ one }) => ({
  session: one(gameSessions, { fields: [diceRolls.sessionId], references: [gameSessions.id] }),
  user: one(users, { fields: [diceRolls.userId], references: [users.id] }),
}));

export const actionLogRelations = relations(actionLog, ({ one }) => ({
  session: one(gameSessions, { fields: [actionLog.sessionId], references: [gameSessions.id] }),
  actor: one(users, { fields: [actionLog.actorId], references: [users.id] }),
}));

export const enemyTemplatesRelations = relations(enemyTemplates, ({ one, many }) => ({
  dm: one(users, { fields: [enemyTemplates.dmId], references: [users.id] }),
  world: one(worlds, { fields: [enemyTemplates.worldId], references: [worlds.id] }),
  locationResource: one(worldResources, { fields: [enemyTemplates.locationResourceId], references: [worldResources.id] }),
  combatInstances: many(combatInstances),
  items: many(enemyItems),
}));

export const worldResourcesRelations = relations(worldResources, ({ one, many }) => ({
  world: one(worlds, { fields: [worldResources.worldId], references: [worlds.id] }),
  parent: one(worldResources, { fields: [worldResources.parentId], references: [worldResources.id], relationName: 'parentChild' }),
  children: many(worldResources, { relationName: 'parentChild' }),
}));

export const characterHistoryRelations = relations(characterHistory, ({ one }) => ({
  character: one(characters, { fields: [characterHistory.characterId], references: [characters.id] }),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  world: one(worlds, { fields: [items.worldId], references: [worlds.id] }),
  dm: one(users, { fields: [items.dmId], references: [users.id] }),
  characterItems: many(characterItems),
  enemyItems: many(enemyItems),
}));

export const characterItemsRelations = relations(characterItems, ({ one }) => ({
  character: one(characters, { fields: [characterItems.characterId], references: [characters.id] }),
  item: one(items, { fields: [characterItems.itemId], references: [items.id] }),
}));

export const enemyItemsRelations = relations(enemyItems, ({ one }) => ({
  template: one(enemyTemplates, { fields: [enemyItems.templateId], references: [enemyTemplates.id] }),
  item: one(items, { fields: [enemyItems.itemId], references: [items.id] }),
}));

export const spellsRelations = relations(spells, ({ one, many }) => ({
  world: one(worlds, { fields: [spells.worldId], references: [worlds.id] }),
  createdByUser: one(users, { fields: [spells.createdBy], references: [users.id] }),
  characterSpells: many(characterSpells),
}));

export const characterSpellsRelations = relations(characterSpells, ({ one }) => ({
  character: one(characters, { fields: [characterSpells.characterId], references: [characters.id] }),
  spell: one(spells, { fields: [characterSpells.spellId], references: [spells.id] }),
}));

// TypeScript types for JSONB columns

// Proficiency types
export type ProficiencyLevel = 0 | 1 | 2; // 0=none, 1=proficient, 2=expertise

export interface SkillProficiencies {
  acrobatics: ProficiencyLevel;
  animalHandling: ProficiencyLevel;
  arcana: ProficiencyLevel;
  athletics: ProficiencyLevel;
  deception: ProficiencyLevel;
  history: ProficiencyLevel;
  insight: ProficiencyLevel;
  intimidation: ProficiencyLevel;
  investigation: ProficiencyLevel;
  medicine: ProficiencyLevel;
  nature: ProficiencyLevel;
  perception: ProficiencyLevel;
  performance: ProficiencyLevel;
  persuasion: ProficiencyLevel;
  religion: ProficiencyLevel;
  sleightOfHand: ProficiencyLevel;
  stealth: ProficiencyLevel;
  survival: ProficiencyLevel;
}

export interface SavingThrowProficiencies {
  str: boolean;
  dex: boolean;
  con: boolean;
  int: boolean;
  wis: boolean;
  cha: boolean;
}

export interface CharacterProficiencies {
  skills: SkillProficiencies;
  savingThrows: SavingThrowProficiencies;
  weapons: string[]; // ['simple', 'martial', 'longsword', etc.]
  armor: string[]; // ['light', 'medium', 'heavy', 'shields']
  tools: string[]; // ["thieves' tools", "smith's tools", etc.]
  languages: string[]; // ['Common', 'Elvish', 'Dwarvish', etc.]
}

// Spell slot types
export interface SpellSlot {
  used: number;
  max: number;
}

export interface SpellSlots {
  level1: SpellSlot;
  level2: SpellSlot;
  level3: SpellSlot;
  level4: SpellSlot;
  level5: SpellSlot;
  level6: SpellSlot;
  level7: SpellSlot;
  level8: SpellSlot;
  level9: SpellSlot;
}

export interface SpellcastingInfo {
  ability: 'int' | 'wis' | 'cha' | null;
  spellSlots: SpellSlots;
}

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
  spellcasting?: SpellcastingInfo;
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

export interface SpellComponents {
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  materialDescription?: string; // e.g., "a pinch of salt"
  materialCost?: number; // in copper, if consumed/valuable
  materialConsumed?: boolean;
}

export interface ItemProperties {
  // Weapon properties
  damage?: string; // e.g., "1d8", "2d6"
  damageType?: string; // slashing, piercing, bludgeoning, fire, etc.
  attackBonus?: number; // +1, +2, +3 magical bonus
  range?: { normal: number; long?: number }; // for ranged weapons
  isRanged?: boolean;
  weaponProperties?: string[]; // finesse, versatile, two-handed, light, heavy, reach, thrown, loading, ammunition
  versatileDamage?: string; // damage when used two-handed

  // Armor properties
  acBonus?: number; // base AC or bonus
  armorType?: 'light' | 'medium' | 'heavy' | 'shield';
  maxDexBonus?: number; // max dex modifier for medium armor
  stealthDisadvantage?: boolean;
  strengthRequirement?: number;

  // Consumable properties
  charges?: number;
  maxCharges?: number;
  effect?: string; // description of what it does

  // Custom properties
  custom?: Record<string, unknown>;
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
export type SessionParticipant = typeof sessionParticipants.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type CombatInstance = typeof combatInstances.$inferSelect;
export type DiceRoll = typeof diceRolls.$inferSelect;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type CharacterItem = typeof characterItems.$inferSelect;
export type EnemyItem = typeof enemyItems.$inferSelect;
export type Spell = typeof spells.$inferSelect;
export type NewSpell = typeof spells.$inferInsert;
export type CharacterSpell = typeof characterSpells.$inferSelect;
export type NewCharacterSpell = typeof characterSpells.$inferInsert;

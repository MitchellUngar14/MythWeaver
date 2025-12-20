import { create } from 'zustand';
import type { StatusEffect } from '@/lib/schema';
import type { ActionEconomy, TakenAction } from '@/lib/combat-actions';
import { DEFAULT_ACTION_ECONOMY, consumeAction } from '@/lib/combat-actions';

export interface Participant {
  id: string;
  oduserId: string;
  userName: string;
  odcharacterId: string | null;
  characterName: string | null;
  isOnline: boolean;
}

export interface CombatantState {
  id: string;
  name: string;
  type: 'character' | 'enemy';
  currentHp: number;
  maxHp: number;
  ac: number;
  statusEffects: StatusEffect[];
  position: number; // initiative order
  isActive: boolean;
  characterId?: string;
  templateId?: string;
  showHpToPlayers?: boolean; // DM toggle to reveal HP numbers to players
  isCompanion?: boolean; // NPC/enemy fighting with the party
  actionEconomy?: ActionEconomy; // Tracks action/bonus/reaction/movement used this turn
}

export interface SessionRoll {
  id: string;
  oduserId: string;
  userName: string;
  dice: string;
  rolls: number[];
  total: number;
  context?: string;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  oduserId: string;
  userName: string;
  content: string;
  timestamp: Date;
}

interface SessionState {
  // Session info
  sessionId: string | null;
  sessionName: string;
  worldId: string | null;
  worldName: string;
  isActive: boolean;
  isDm: boolean;

  // Current location
  currentLocation: string | null;
  currentLocationResourceId: string | null;

  // Participants
  participants: Participant[];

  // Combat state
  combatActive: boolean;
  combatants: CombatantState[];
  currentTurn: string | null;
  round: number;

  // Chat & Rolls
  chatMessages: ChatMessage[];
  recentRolls: SessionRoll[];

  // Actions
  setSession: (session: Partial<SessionState>) => void;

  // Participant actions
  addParticipant: (participant: Participant) => void;
  removeParticipant: (odparticipantId: string) => void;
  updateParticipantOnline: (oduserId: string, isOnline: boolean) => void;

  // Combat actions
  startCombat: (combatants: CombatantState[]) => void;
  endCombat: () => void;
  addCombatant: (combatant: CombatantState) => void;
  removeCombatant: (odcombatantId: string) => void;
  updateCombatant: (odcombatantId: string, changes: Partial<CombatantState>) => void;
  setInitiativeOrder: (order: { id: string; position: number }[]) => void;
  advanceTurn: (currentTurn: string, round: number) => void;
  useCombatAction: (combatantId: string, action: TakenAction) => void;
  resetActionEconomy: (combatantId: string) => void;

  // Chat/Roll actions
  addChatMessage: (message: ChatMessage) => void;
  addRoll: (roll: SessionRoll) => void;

  // Location actions
  setLocation: (location: string | null, resourceId: string | null) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  sessionId: null,
  sessionName: '',
  worldId: null,
  worldName: '',
  isActive: false,
  isDm: false,
  currentLocation: null,
  currentLocationResourceId: null,
  participants: [],
  combatActive: false,
  combatants: [],
  currentTurn: null,
  round: 0,
  chatMessages: [],
  recentRolls: [],
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  setSession: (session) => set((state) => ({ ...state, ...session })),

  addParticipant: (participant) => set((state) => ({
    participants: [...state.participants.filter(p => p.id !== participant.id), participant],
  })),

  removeParticipant: (participantId) => set((state) => ({
    participants: state.participants.filter((p) => p.id !== participantId),
  })),

  updateParticipantOnline: (userId, isOnline) => set((state) => ({
    participants: state.participants.map((p) =>
      p.oduserId === userId ? { ...p, isOnline } : p
    ),
  })),

  startCombat: (combatants) => {
    const sorted = combatants.sort((a, b) => b.position - a.position);
    const firstCombatantId = sorted[0]?.id || null;
    return set({
      combatActive: true,
      combatants: sorted.map(c => ({
        ...c,
        // Initialize action economy, reset for first combatant
        actionEconomy: c.id === firstCombatantId
          ? { ...DEFAULT_ACTION_ECONOMY }
          : c.actionEconomy,
      })),
      currentTurn: firstCombatantId,
      round: 1,
    });
  },

  endCombat: () => set({
    combatActive: false,
    combatants: [],
    currentTurn: null,
    round: 0,
  }),

  addCombatant: (combatant) => set((state) => {
    // Deduplicate by ID to prevent double-adding from API response + Pusher broadcast
    if (state.combatants.some(c => c.id === combatant.id)) {
      return state;
    }
    return {
      combatants: [...state.combatants, combatant].sort((a, b) => b.position - a.position),
      combatActive: true, // Ensure combat is active when adding combatants
    };
  }),

  removeCombatant: (combatantId) => set((state) => ({
    combatants: state.combatants.filter((c) => c.id !== combatantId),
  })),

  updateCombatant: (combatantId, changes) => set((state) => ({
    combatants: state.combatants.map((c) =>
      c.id === combatantId ? { ...c, ...changes } : c
    ),
  })),

  setInitiativeOrder: (order) => set((state) => ({
    combatants: state.combatants.map((c) => {
      const newOrder = order.find((o) => o.id === c.id);
      return newOrder ? { ...c, position: newOrder.position } : c;
    }).sort((a, b) => b.position - a.position),
  })),

  advanceTurn: (currentTurn, round) => set((state) => ({
    currentTurn,
    round,
    // Reset action economy for the new current turn combatant
    combatants: state.combatants.map(c =>
      c.id === currentTurn
        ? { ...c, actionEconomy: { ...DEFAULT_ACTION_ECONOMY } }
        : c
    ),
  })),

  useCombatAction: (combatantId, action) => set((state) => ({
    combatants: state.combatants.map(c => {
      if (c.id !== combatantId) return c;
      const currentEconomy = c.actionEconomy || { ...DEFAULT_ACTION_ECONOMY };
      const updatedEconomy = consumeAction(action.category, currentEconomy);
      return {
        ...c,
        actionEconomy: {
          ...updatedEconomy,
          actionsTaken: [...currentEconomy.actionsTaken, action],
        },
      };
    }),
  })),

  resetActionEconomy: (combatantId) => set((state) => ({
    combatants: state.combatants.map(c =>
      c.id === combatantId
        ? { ...c, actionEconomy: { ...DEFAULT_ACTION_ECONOMY } }
        : c
    ),
  })),

  addChatMessage: (message) => set((state) => {
    // Deduplicate by ID to prevent double-adding from optimistic + Pusher updates
    if (state.chatMessages.some(m => m.id === message.id)) {
      return state;
    }
    return {
      chatMessages: [...state.chatMessages, message].slice(-100), // Keep last 100
    };
  }),

  addRoll: (roll) => set((state) => {
    // Deduplicate by ID to prevent double-adding from optimistic + Pusher updates
    if (state.recentRolls.some(r => r.id === roll.id)) {
      return state;
    }
    return {
      recentRolls: [roll, ...state.recentRolls].slice(0, 50), // Keep last 50
    };
  }),

  setLocation: (location, resourceId) => set({
    currentLocation: location,
    currentLocationResourceId: resourceId,
  }),

  reset: () => set(initialState),
}));

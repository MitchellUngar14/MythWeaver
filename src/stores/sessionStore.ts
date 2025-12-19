import { create } from 'zustand';
import type { StatusEffect } from '@/lib/schema';

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

  // Chat/Roll actions
  addChatMessage: (message: ChatMessage) => void;
  addRoll: (roll: SessionRoll) => void;

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

  startCombat: (combatants) => set({
    combatActive: true,
    combatants: combatants.sort((a, b) => b.position - a.position),
    currentTurn: combatants.sort((a, b) => b.position - a.position)[0]?.id || null,
    round: 1,
  }),

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

  advanceTurn: (currentTurn, round) => set({ currentTurn, round }),

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

  reset: () => set(initialState),
}));

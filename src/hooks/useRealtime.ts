'use client';

import { useEffect, useCallback, useState } from 'react';
import { getPusherClient, SessionEvents } from '@/lib/pusher-client';
import { useSessionStore, type CombatantState, type ChatMessage, type SessionRoll, type Participant } from '@/stores/sessionStore';
import type { Channel } from 'pusher-js';
import type { ActionCategory, ActionEconomy } from '@/lib/combat-actions';

export function useRealtime(sessionId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const store = useSessionStore();

  useEffect(() => {
    if (!sessionId) {
      setIsConnected(false);
      return;
    }

    const pusher = getPusherClient();
    if (!pusher) {
      console.warn('Pusher client not available');
      return;
    }

    const channelName = `private-session-${sessionId}`;
    const channel: Channel = pusher.subscribe(channelName);

    // Connection state
    channel.bind('pusher:subscription_succeeded', () => {
      setIsConnected(true);
    });

    channel.bind('pusher:subscription_error', (error: Error) => {
      console.error('Pusher subscription error:', error);
      setIsConnected(false);
    });

    // Participant events
    channel.bind(SessionEvents.PARTICIPANT_JOINED, (data: {
      odparticipantId: string;
      oduserId: string;
      userName: string;
      characterName: string | null;
    }) => {
      store.addParticipant({
        id: data.odparticipantId,
        oduserId: data.oduserId,
        userName: data.userName,
        odcharacterId: null,
        characterName: data.characterName,
        isOnline: true,
      });
    });

    channel.bind(SessionEvents.PARTICIPANT_LEFT, (data: { odparticipantId: string; oduserId: string }) => {
      store.updateParticipantOnline(data.oduserId, false);
    });

    // Combat events
    channel.bind(SessionEvents.COMBAT_STARTED, (data: { combatants: CombatantState[] }) => {
      store.startCombat(data.combatants);
    });

    channel.bind(SessionEvents.COMBAT_ENDED, () => {
      store.endCombat();
    });

    channel.bind(SessionEvents.COMBATANT_ADDED, (data: { combatant: CombatantState & { ac?: number } }) => {
      store.addCombatant({
        ...data.combatant,
        ac: data.combatant.ac || 10,
      });
    });

    channel.bind(SessionEvents.COMBATANT_REMOVED, (data: { odcombatantId: string }) => {
      store.removeCombatant(data.odcombatantId);
    });

    channel.bind(SessionEvents.COMBATANT_UPDATED, (data: {
      odcombatantId: string;
      changes: Partial<CombatantState>;
    }) => {
      store.updateCombatant(data.odcombatantId, data.changes);
    });

    channel.bind(SessionEvents.TURN_ADVANCED, (data: { currentTurn: string; round: number }) => {
      store.advanceTurn(data.currentTurn, data.round);
    });

    // Combat action events
    channel.bind(SessionEvents.ACTION_TAKEN, (data: {
      combatantId: string;
      combatantName: string;
      actionId: string;
      actionName: string;
      category: ActionCategory;
      details?: string;
      actionEconomy: ActionEconomy;
      timestamp: string;
    }) => {
      // Update the combatant's action economy
      store.updateCombatant(data.combatantId, {
        actionEconomy: data.actionEconomy,
      });
    });

    // Chat & Roll events
    channel.bind(SessionEvents.ROLL_MADE, (data: {
      id: string;
      oduserId: string;
      userName: string;
      dice: string;
      rolls: number[];
      total: number;
      context?: string;
      timestamp: string;
    }) => {
      store.addRoll({
        id: data.id,
        oduserId: data.oduserId,
        userName: data.userName,
        dice: data.dice,
        rolls: data.rolls,
        total: data.total,
        context: data.context,
        timestamp: new Date(data.timestamp),
      });
    });

    channel.bind(SessionEvents.CHAT_MESSAGE, (data: {
      id: string;
      oduserId: string;
      userName: string;
      content: string;
      timestamp: string;
    }) => {
      store.addChatMessage({
        id: data.id,
        oduserId: data.oduserId,
        userName: data.userName,
        content: data.content,
        timestamp: new Date(data.timestamp),
      });
    });

    // Session events
    channel.bind(SessionEvents.SESSION_ENDED, () => {
      store.setSession({ isActive: false });
    });

    // Location events
    channel.bind(SessionEvents.LOCATION_CHANGED, (data: {
      currentLocation: string | null;
      currentLocationResourceId: string | null;
    }) => {
      store.setLocation(data.currentLocation, data.currentLocationResourceId);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      setIsConnected(false);
    };
  }, [sessionId, store]);

  return {
    isConnected,
  };
}

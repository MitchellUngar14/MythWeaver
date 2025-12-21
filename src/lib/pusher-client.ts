'use client';

import PusherClient from 'pusher-js';

let pusherInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
    console.warn('Missing Pusher environment variables');
    return null;
  }

  if (!pusherInstance) {
    pusherInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      authEndpoint: '/api/pusher/auth',
    });
  }

  return pusherInstance;
}

export function disconnectPusher() {
  if (pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
  }
}

// Re-export event types for client use
export const SessionEvents = {
  PARTICIPANT_JOINED: 'participant:joined',
  PARTICIPANT_LEFT: 'participant:left',
  COMBATANT_ADDED: 'combatant:added',
  COMBATANT_UPDATED: 'combatant:updated',
  COMBATANT_REMOVED: 'combatant:removed',
  COMBAT_STARTED: 'combat:started',
  COMBAT_ENDED: 'combat:ended',
  TURN_ADVANCED: 'turn:advanced',
  ACTION_TAKEN: 'action:taken',
  ROLL_MADE: 'roll:made',
  CHAT_MESSAGE: 'chat:message',
  SESSION_ENDED: 'session:ended',
  LOCATION_CHANGED: 'location:changed',
  REST_COMPLETED: 'rest:completed',
} as const;

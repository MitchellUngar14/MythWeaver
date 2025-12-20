import Pusher from 'pusher';

if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY ||
    !process.env.PUSHER_SECRET || !process.env.PUSHER_CLUSTER) {
  console.warn('Missing Pusher environment variables - real-time features will be disabled');
}

export const pusherServer = process.env.PUSHER_APP_ID ? new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
}) : null;

// Helper to broadcast to session channel
export async function broadcastToSession(sessionId: string, event: string, data: unknown) {
  if (!pusherServer) {
    console.warn('Pusher not configured - skipping broadcast');
    return;
  }
  return pusherServer.trigger(`private-session-${sessionId}`, event, data);
}

// Session event types
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
} as const;

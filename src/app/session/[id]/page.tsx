'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSessionStore, type CombatantState } from '@/stores/sessionStore';
import { useRealtime } from '@/hooks/useRealtime';
import { SessionHeader } from '@/components/session/SessionHeader';
import { CombatTracker } from '@/components/session/CombatTracker';
import { SessionChat } from '@/components/session/SessionChat';
import { SessionDiceRoller } from '@/components/session/SessionDiceRoller';
import { RollHistory } from '@/components/session/RollHistory';
import { ParticipantsList } from '@/components/session/ParticipantsList';
import { PlayerCharacterPanel } from '@/components/session/PlayerCharacterPanel';
import { SessionDMAssistant } from '@/components/session/SessionDMAssistant';
import type { Character } from '@/lib/schema';

interface SessionData {
  session: {
    id: string;
    name: string;
    worldId: string;
    isActive: boolean;
  };
  worldName: string;
  isDm: boolean;
  userCharacter: Character | null;
  participants: Array<{
    id: string;
    userId: string;
    user: { id: string; name: string };
    character: Character | null;
    isOnline: boolean;
  }>;
  combatants: CombatantState[];
  chatMessages: Array<{
    id: string;
    oduserId: string;
    userName: string;
    content: string;
    timestamp: string;
  }>;
  recentRolls: Array<{
    id: string;
    userId: string;
    dice: string;
    results: number[];
    total: number;
    context: string | null;
    createdAt: string;
  }>;
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: authSession } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [userCharacter, setUserCharacter] = useState<Character | null>(null);
  const [dmId, setDmId] = useState<string>('');

  const store = useSessionStore();
  const { isConnected } = useRealtime(store.sessionId);

  // Fetch session data on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load session');
          return;
        }

        setSessionData(data);
        setUserCharacter(data.userCharacter);

        // Find DM ID from world data
        const worldRes = await fetch(`/api/worlds/${data.session.worldId}`);
        const worldData = await worldRes.json();
        if (worldRes.ok) {
          setDmId(worldData.world.dmId);
        }

        // Initialize store
        store.setSession({
          sessionId: data.session.id,
          sessionName: data.session.name,
          worldId: data.session.worldId,
          worldName: data.worldName,
          isActive: data.session.isActive,
          isDm: data.isDm,
        });

        // Set participants
        data.participants.forEach((p: SessionData['participants'][0]) => {
          store.addParticipant({
            id: p.id,
            oduserId: p.user.id,
            userName: p.user.name,
            odcharacterId: p.character?.id || null,
            characterName: p.character?.name || null,
            isOnline: p.isOnline,
          });
        });

        // Set combatants
        if (data.combatants.length > 0) {
          store.startCombat(data.combatants);
        }

        // Set chat messages
        data.chatMessages.forEach((msg: SessionData['chatMessages'][0]) => {
          store.addChatMessage({
            id: msg.id,
            oduserId: msg.oduserId,
            userName: msg.userName,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
          });
        });

        // Set recent rolls
        data.recentRolls.forEach((roll: SessionData['recentRolls'][0]) => {
          store.addRoll({
            id: roll.id,
            oduserId: roll.userId,
            userName: '',
            dice: roll.dice,
            rolls: roll.results,
            total: roll.total,
            context: roll.context || undefined,
            timestamp: new Date(roll.createdAt),
          });
        });

        // Auto-join the session
        await fetch(`/api/sessions/${id}/join`, { method: 'POST' });

      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Failed to load session');
      } finally {
        setIsLoading(false);
      }
    }

    if (authSession?.user) {
      fetchSession();
    }

    // Cleanup on unmount
    return () => {
      // Leave the session
      fetch(`/api/sessions/${id}/join`, { method: 'DELETE' }).catch(console.error);
      store.reset();
    };
  }, [id, authSession]);

  // API call handlers
  async function handleEndSession() {
    await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    });
    store.setSession({ isActive: false });
  }

  async function handleUpdateCombatant(combatantId: string, changes: Partial<CombatantState>) {
    await fetch(`/api/sessions/${id}/combat/${combatantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    store.updateCombatant(combatantId, changes);
  }

  async function handleRemoveCombatant(combatantId: string) {
    await fetch(`/api/sessions/${id}/combat/${combatantId}`, {
      method: 'DELETE',
    });
    store.removeCombatant(combatantId);
  }

  async function handleEndCombat() {
    await fetch(`/api/sessions/${id}/combat`, {
      method: 'DELETE',
    });
    store.endCombat();
  }

  async function handleAddCombatants(combatants: Array<{
    type: 'character' | 'enemy';
    characterId?: string;
    templateId?: string;
    initiative: number;
    customName?: string;
  }>) {
    // Add all combatants and update local state
    for (const data of combatants) {
      const res = await fetch(`/api/sessions/${id}/combat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok && result.combatant) {
        // Add locally since Pusher doesn't echo to sender
        store.addCombatant({
          id: result.combatant.id,
          name: result.combatant.name,
          type: result.combatant.type,
          currentHp: result.combatant.currentHp,
          maxHp: result.combatant.maxHp,
          ac: result.combatant.ac,
          statusEffects: result.combatant.statusEffects || [],
          position: result.combatant.position,
          isActive: result.combatant.isActive,
          characterId: result.combatant.characterId,
          templateId: result.combatant.templateId,
        });
      }
    }

    // Start combat if not already active
    if (!store.combatActive && store.combatants.length > 0) {
      store.setSession({ combatActive: true });
    }
  }

  async function handleAdvanceTurn() {
    const sortedCombatants = [...store.combatants].sort((a, b) => b.position - a.position);
    if (sortedCombatants.length === 0) return;
    const currentIndex = sortedCombatants.findIndex(c => c.id === store.currentTurn);
    const nextIndex = (currentIndex + 1) % sortedCombatants.length;
    const newRound = nextIndex === 0 ? store.round + 1 : store.round;
    const nextId = sortedCombatants[nextIndex]?.id;
    if (nextId) {
      // Update local state immediately for responsive UI
      store.advanceTurn(nextId, newRound);
      // Broadcast to other participants via API
      await fetch(`/api/sessions/${id}/combat/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTurn: nextId, round: newRound }),
      });
    }
  }

  async function handleSendMessage(content: string) {
    await fetch(`/api/sessions/${id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  }

  async function handleRoll(dice: string, context?: string) {
    await fetch(`/api/sessions/${id}/rolls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dice, context }),
    });
  }

  async function handleUpdateCharacterHp(hp: number) {
    if (!userCharacter) return;
    // Update local character state
    setUserCharacter({
      ...userCharacter,
      stats: { ...userCharacter.stats, hp },
    });
    // Update character via API
    fetch(`/api/characters/${userCharacter.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stats: { ...userCharacter.stats, hp } }),
    });

    // Also update combatant if character is in combat
    const combatant = store.combatants.find(c => c.characterId === userCharacter.id);
    if (combatant) {
      await handleUpdateCombatant(combatant.id, { currentHp: hp });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Session not found'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-indigo-600 hover:underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <SessionHeader
        sessionName={store.sessionName}
        worldName={store.worldName}
        worldId={store.worldId || ''}
        isActive={store.isActive}
        isDm={store.isDm}
        isConnected={isConnected}
        participantCount={store.participants.filter(p => p.isOnline).length}
        onEndSession={handleEndSession}
      />

      <div className="flex-1 container mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-12 gap-4 h-full">
          {/* Left Column - Combat & Participants */}
          <div className="lg:col-span-4 space-y-4">
            <CombatTracker
              combatants={store.combatants}
              currentTurn={store.currentTurn}
              round={store.round}
              combatActive={store.combatActive}
              isDm={store.isDm}
              userId={authSession?.user?.id || ''}
              sessionId={id}
              worldId={store.worldId || ''}
              onUpdateCombatant={handleUpdateCombatant}
              onRemoveCombatant={handleRemoveCombatant}
              onAdvanceTurn={handleAdvanceTurn}
              onEndCombat={handleEndCombat}
              onAddCombatants={handleAddCombatants}
            />
            <ParticipantsList
              participants={store.participants}
              currentUserId={authSession?.user?.id || ''}
              dmId={dmId}
            />
          </div>

          {/* Center Column - Character Panel (Players only) */}
          <div className="lg:col-span-4">
            {!store.isDm && userCharacter ? (
              <PlayerCharacterPanel
                character={userCharacter}
                onUpdateHp={handleUpdateCharacterHp}
              />
            ) : store.isDm ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
                <p className="text-gray-500">DM View</p>
                <p className="text-sm text-gray-400 mt-2">
                  Use the combat tracker to manage the encounter
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
                <p className="text-gray-500">No character selected</p>
                <p className="text-sm text-gray-400 mt-2">
                  Select a character in your world membership to see your stats here
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Chat, Dice & Roll History */}
          <div className="lg:col-span-4 space-y-4">
            <SessionChat
              messages={store.chatMessages}
              currentUserId={authSession?.user?.id || ''}
              onSendMessage={handleSendMessage}
            />
            <SessionDiceRoller
              recentRolls={store.recentRolls}
              currentUserId={authSession?.user?.id || ''}
              onRoll={handleRoll}
            />
            <RollHistory
              rolls={store.recentRolls}
              currentUserId={authSession?.user?.id || ''}
            />
          </div>
        </div>
      </div>

      {/* DM AI Assistant - Only visible to DM */}
      {store.isDm && sessionData && (
        <SessionDMAssistant
          worldId={store.worldId || ''}
          worldName={store.worldName}
          sessionId={id}
          sessionName={store.sessionName}
          participants={sessionData.participants.map(p => ({
            id: p.id,
            userName: p.user.name,
            character: p.character,
          }))}
          combatants={store.combatants}
          combatActive={store.combatActive}
          round={store.round}
        />
      )}
    </div>
  );
}

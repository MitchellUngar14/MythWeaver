'use client';

import { Users, Crown, User } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import type { Participant } from '@/stores/sessionStore';

interface ParticipantsListProps {
  participants: Participant[];
  currentUserId: string;
  dmId: string;
}

export function ParticipantsList({ participants, currentUserId, dmId }: ParticipantsListProps) {
  // Sort: DM first, then online users, then offline
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.oduserId === dmId) return -1;
    if (b.oduserId === dmId) return 1;
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return 0;
  });

  const onlineCount = participants.filter(p => p.isOnline).length;

  return (
    <CollapsibleCard
      title="Participants"
      icon={<Users className="w-5 h-5" />}
      badge={`${onlineCount} online`}
      defaultCollapsed={true}
    >
      <div className="space-y-2">
        {sortedParticipants.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-4">No participants yet</p>
        ) : (
          sortedParticipants.map((participant) => {
            const isDm = participant.oduserId === dmId;
            const isCurrentUser = participant.oduserId === currentUserId;

            return (
              <div
                key={participant.id}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  isCurrentUser
                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                    : 'bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                {/* Avatar / Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isDm
                    ? 'bg-yellow-100 dark:bg-yellow-900/30'
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}>
                  {isDm ? (
                    <Crown className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  ) : (
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {participant.userName}
                      {isCurrentUser && ' (you)'}
                    </span>
                    {isDm && (
                      <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                        DM
                      </span>
                    )}
                  </div>
                  {participant.characterName && (
                    <p className="text-xs text-gray-500 truncate">
                      Playing: {participant.characterName}
                    </p>
                  )}
                </div>

                {/* Online status */}
                <div className={`w-2 h-2 rounded-full ${
                  participant.isOnline
                    ? 'bg-green-500'
                    : 'bg-gray-400'
                }`} />
              </div>
            );
          })
        )}
      </div>
    </CollapsibleCard>
  );
}

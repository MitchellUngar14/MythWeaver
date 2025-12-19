'use client';

import { ArrowLeft, Users, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface SessionHeaderProps {
  sessionName: string;
  worldName: string;
  worldId: string;
  isActive: boolean;
  isDm: boolean;
  isConnected: boolean;
  participantCount: number;
  onEndSession: () => void;
}

export function SessionHeader({
  sessionName,
  worldName,
  worldId,
  isActive,
  isDm,
  isConnected,
  participantCount,
  onEndSession,
}: SessionHeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={isDm ? `/dm/worlds/${worldId}` : '/dashboard'}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {sessionName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {worldName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-2 text-sm">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Connecting...</span>
              </>
            )}
          </div>

          {/* Participant count */}
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span>{participantCount}</span>
          </div>

          {/* Session status and controls */}
          {isActive ? (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded">
              Active
            </span>
          ) : (
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
              Ended
            </span>
          )}

          {isDm && isActive && (
            <Button variant="outline" size="sm" onClick={onEndSession}>
              End Session
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

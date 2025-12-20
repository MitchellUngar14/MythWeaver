'use client';

import { useState, useEffect } from 'react';
import { MapPin, Users, Swords, Shield, Heart, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Creature {
  id: string;
  name: string;
  isNpc: boolean;
  description: string | null;
  challengeRating: string | null;
  stats: {
    hp: number;
    ac: number;
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
    speed: number;
  };
}

interface LocationCreaturesCardProps {
  worldId: string;
  currentLocation: string | null;
  currentLocationResourceId: string | null;
  onAddToCombat?: (creature: Creature, count: number) => void;
}

export function LocationCreaturesCard({
  worldId,
  currentLocation,
  currentLocationResourceId,
  onAddToCombat,
}: LocationCreaturesCardProps) {
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCreatures() {
      if (!worldId || (!currentLocation && !currentLocationResourceId)) {
        setCreatures([]);
        return;
      }

      setIsLoading(true);
      try {
        let url = `/api/enemies?worldId=${worldId}`;
        if (currentLocationResourceId) {
          url += `&locationResourceId=${currentLocationResourceId}`;
        } else if (currentLocation) {
          url += `&location=${encodeURIComponent(currentLocation)}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        if (res.ok && data.enemies) {
          setCreatures(data.enemies);
        } else {
          setCreatures([]);
        }
      } catch {
        setCreatures([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCreatures();
  }, [worldId, currentLocation, currentLocationResourceId]);

  const npcs = creatures.filter(c => c.isNpc);
  const enemies = creatures.filter(c => !c.isNpc);

  if (!currentLocation && !currentLocationResourceId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Location Creatures</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          Select a location to see creatures here
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-5 h-5 text-indigo-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">At This Location</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
          {creatures.length}
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        </div>
      ) : creatures.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No creatures at this location
        </p>
      ) : (
        <div className="space-y-3">
          {/* NPCs Section */}
          {npcs.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>NPCs ({npcs.length})</span>
              </div>
              <div className="space-y-2">
                {npcs.map(creature => (
                  <CreatureItem
                    key={creature.id}
                    creature={creature}
                    isExpanded={expandedId === creature.id}
                    onToggle={() => setExpandedId(expandedId === creature.id ? null : creature.id)}
                    onAddToCombat={onAddToCombat}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Enemies Section */}
          {enemies.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 mb-2">
                <Swords className="w-3.5 h-3.5" />
                <span>Enemies ({enemies.length})</span>
              </div>
              <div className="space-y-2">
                {enemies.map(creature => (
                  <CreatureItem
                    key={creature.id}
                    creature={creature}
                    isExpanded={expandedId === creature.id}
                    onToggle={() => setExpandedId(expandedId === creature.id ? null : creature.id)}
                    onAddToCombat={onAddToCombat}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreatureItem({
  creature,
  isExpanded,
  onToggle,
  onAddToCombat,
}: {
  creature: Creature;
  isExpanded: boolean;
  onToggle: () => void;
  onAddToCombat?: (creature: Creature, count: number) => void;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900 dark:text-white">
            {creature.name}
          </span>
          {creature.challengeRating && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
              CR {creature.challengeRating}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-500" />
              {creature.stats.hp}
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-blue-500" />
              {creature.stats.ac}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {creature.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {creature.description}
            </p>
          )}

          <div className="grid grid-cols-6 gap-1 text-xs">
            <StatBadge label="STR" value={creature.stats.str} />
            <StatBadge label="DEX" value={creature.stats.dex} />
            <StatBadge label="CON" value={creature.stats.con} />
            <StatBadge label="INT" value={creature.stats.int} />
            <StatBadge label="WIS" value={creature.stats.wis} />
            <StatBadge label="CHA" value={creature.stats.cha} />
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Speed: {creature.stats.speed} ft.
          </div>

          {onAddToCombat && (
            <div className="mt-2 space-y-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Add to Combat:</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(count => (
                  <Button
                    key={count}
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCombat(creature, count);
                    }}
                  >
                    {count === 1 ? (
                      <>
                        <Plus className="w-3 h-3 mr-1" />
                        1
                      </>
                    ) : (
                      `×${count}`
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  const modifier = Math.floor((value - 10) / 2);
  const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;

  return (
    <div className="text-center p-1 bg-gray-100 dark:bg-gray-600 rounded">
      <div className="text-gray-500 dark:text-gray-400 text-[10px]">{label}</div>
      <div className="font-medium text-gray-900 dark:text-white">{value}</div>
      <div className="text-gray-500 dark:text-gray-400 text-[10px]">{modifierStr}</div>
    </div>
  );
}

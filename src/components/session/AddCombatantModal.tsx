'use client';

import { useState, useEffect } from 'react';
import { X, User, Skull, Plus, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AddCombatantModalProps {
  worldId: string;
  isDm: boolean;
  currentLocation: string | null;
  currentLocationResourceId: string | null;
  onAdd: (combatants: Array<{
    type: 'character' | 'enemy';
    characterId?: string;
    templateId?: string;
    initiative: number;
    customName?: string;
  }>) => Promise<void>;
  onClose: () => void;
}

interface WorldMember {
  id: string;
  character: {
    id: string;
    name: string;
    class: string;
    level: number;
  } | null;
  user: {
    name: string;
  };
}

interface EnemyTemplate {
  id: string;
  name: string;
  challengeRating: string | null;
  isNpc: boolean;
  location: string | null;
  locationResourceId: string | null;
  stats: {
    hp: number;
    ac: number;
  };
}

interface SelectedCombatant {
  id: string;
  type: 'character' | 'enemy';
  name: string;
  initiative: number;
  customName?: string;
  characterId?: string;
  templateId?: string;
}

export function AddCombatantModal({
  worldId,
  isDm,
  currentLocation,
  currentLocationResourceId,
  onAdd,
  onClose,
}: AddCombatantModalProps) {
  const [characters, setCharacters] = useState<WorldMember[]>([]);
  const [enemies, setEnemies] = useState<EnemyTemplate[]>([]);
  const [npcs, setNpcs] = useState<EnemyTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selected, setSelected] = useState<SelectedCombatant[]>([]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch world members with characters
        const worldRes = await fetch(`/api/worlds/${worldId}`);
        const worldData = await worldRes.json();
        if (worldRes.ok) {
          setCharacters(worldData.world.members.filter((m: WorldMember) => m.character));
        }

        // Fetch enemy templates
        const enemiesRes = await fetch('/api/enemies');
        const enemiesData = await enemiesRes.json();
        if (enemiesRes.ok) {
          setEnemies(enemiesData.enemies || []);
        }

        // Fetch NPCs
        const npcsRes = await fetch('/api/npcs');
        const npcsData = await npcsRes.json();
        if (npcsRes.ok) {
          setNpcs(npcsData.npcs || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [worldId]);

  // Filter creatures by location
  function isAtCurrentLocation(creature: EnemyTemplate): boolean {
    if (!currentLocation && !currentLocationResourceId) return false;

    // Check by resource ID first
    if (currentLocationResourceId && creature.locationResourceId === currentLocationResourceId) {
      return true;
    }

    // Check by location name
    if (currentLocation && creature.location === currentLocation) {
      return true;
    }

    return false;
  }

  // Separate enemies and NPCs by location
  const enemiesAtLocation = enemies.filter(isAtCurrentLocation);
  const enemiesOther = enemies.filter(e => !isAtCurrentLocation(e));
  const npcsAtLocation = npcs.filter(isAtCurrentLocation);
  const npcsOther = npcs.filter(n => !isAtCurrentLocation(n));

  const hasCurrentLocation = currentLocation || currentLocationResourceId;

  function toggleCharacter(member: WorldMember) {
    const existing = selected.find(s => s.characterId === member.character!.id);
    if (existing) {
      setSelected(selected.filter(s => s.characterId !== member.character!.id));
    } else {
      setSelected([...selected, {
        id: crypto.randomUUID(),
        type: 'character',
        name: member.character!.name,
        initiative: Math.floor(Math.random() * 20) + 1,
        characterId: member.character!.id,
      }]);
    }
  }

  function addCreature(creature: EnemyTemplate) {
    const count = selected.filter(s => s.templateId === creature.id).length;
    setSelected([...selected, {
      id: crypto.randomUUID(),
      type: 'enemy',
      name: creature.name,
      initiative: Math.floor(Math.random() * 20) + 1,
      customName: `${creature.name} ${count + 1}`,
      templateId: creature.id,
    }]);
  }

  function removeSelected(id: string) {
    setSelected(selected.filter(s => s.id !== id));
  }

  function updateInitiative(id: string, initiative: number) {
    setSelected(selected.map(s =>
      s.id === id ? { ...s, initiative } : s
    ));
  }

  function updateCustomName(id: string, customName: string) {
    setSelected(selected.map(s =>
      s.id === id ? { ...s, customName } : s
    ));
  }

  async function handleAdd() {
    if (selected.length === 0) return;

    setIsAdding(true);
    try {
      const combatants = selected.map(s => ({
        type: s.type,
        characterId: s.characterId,
        templateId: s.templateId,
        initiative: s.initiative,
        customName: s.customName,
      }));
      await onAdd(combatants);
    } finally {
      setIsAdding(false);
    }
  }

  const selectedCharacterIds = new Set(selected.filter(s => s.type === 'character').map(s => s.characterId));

  function renderCreatureButton(creature: EnemyTemplate, isNpc: boolean) {
    const count = selected.filter(s => s.templateId === creature.id).length;
    const Icon = isNpc ? Users : Skull;
    const colorClass = isNpc ? 'text-purple-500' : 'text-red-500';
    const hoverClass = isNpc ? 'hover:border-purple-300 dark:hover:border-purple-700' : 'hover:border-red-300 dark:hover:border-red-700';
    const countBgClass = isNpc ? 'bg-purple-500' : 'bg-red-500';

    return (
      <button
        key={creature.id}
        onClick={() => addCreature(creature)}
        className={`text-left p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 ${hoverClass} transition-colors relative`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colorClass}`} />
          <span className="font-medium text-gray-900 dark:text-white text-sm">
            {creature.name}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          CR {creature.challengeRating || '?'} | HP {creature.stats.hp}
        </div>
        {count > 0 && (
          <span className={`absolute top-2 right-2 w-5 h-5 ${countBgClass} text-white text-xs rounded-full flex items-center justify-center`}>
            {count}
          </span>
        )}
        <Plus className="absolute bottom-2 right-2 w-4 h-4 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>Add to Combat</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* At Current Location Section */}
              {hasCurrentLocation && (enemiesAtLocation.length > 0 || npcsAtLocation.length > 0) && (
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-5 h-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                      At "{currentLocation}"
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {npcsAtLocation.map(npc => renderCreatureButton(npc, true))}
                    {enemiesAtLocation.map(enemy => renderCreatureButton(enemy, false))}
                  </div>
                </div>
              )}

              {/* Other Creatures Section */}
              {(enemiesOther.length > 0 || npcsOther.length > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Skull className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {hasCurrentLocation ? 'Other Creatures' : 'Enemies & NPCs'}
                    </h3>
                  </div>

                  {/* NPCs */}
                  {npcsOther.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">NPCs</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {npcsOther.map(npc => renderCreatureButton(npc, true))}
                      </div>
                    </div>
                  )}

                  {/* Enemies */}
                  {enemiesOther.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Skull className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enemies</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {enemiesOther.map(enemy => renderCreatureButton(enemy, false))}
                      </div>
                    </div>
                  )}

                  {enemies.length === 0 && npcs.length === 0 && (
                    <p className="text-gray-500 text-sm">No enemy templates or NPCs</p>
                  )}
                </div>
              )}

              {/* Characters Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Characters</h3>
                </div>
                {characters.length === 0 ? (
                  <p className="text-gray-500 text-sm">No characters in this world</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {characters.map((member) => {
                      const isSelected = selectedCharacterIds.has(member.character!.id);
                      return (
                        <button
                          key={member.character!.id}
                          onClick={() => toggleCharacter(member)}
                          className={`text-left p-3 rounded-lg border-2 transition-colors ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900 dark:text-white text-sm">
                            {member.character!.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Lvl {member.character!.level} {member.character!.class}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Combatants */}
              {selected.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Selected ({selected.length})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selected.map((combatant) => (
                      <div
                        key={combatant.id}
                        className={`flex items-center gap-3 p-2 rounded-lg ${
                          combatant.type === 'character'
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : 'bg-red-50 dark:bg-red-900/20'
                        }`}
                      >
                        {combatant.type === 'character' ? (
                          <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <Skull className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                          {combatant.type === 'enemy' ? (
                            <Input
                              value={combatant.customName || combatant.name}
                              onChange={(e) => updateCustomName(combatant.id, e.target.value)}
                              className="h-7 text-sm"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {combatant.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">Init:</span>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            value={combatant.initiative}
                            onChange={(e) => updateInitiative(combatant.id, Number(e.target.value))}
                            className="w-14 h-7 text-sm text-center"
                          />
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => removeSelected(combatant.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add button */}
              <Button
                className="w-full"
                onClick={handleAdd}
                disabled={selected.length === 0}
                isLoading={isAdding}
              >
                {selected.length === 0
                  ? 'Select combatants'
                  : `Add ${selected.length} to Combat`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

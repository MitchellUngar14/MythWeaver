'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Sword, Shield, Zap, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { calculateModifier, formatModifier } from '@/lib/utils';
import { AIAssistant } from '@/components/dm/AIAssistant';

const NPC_QUICK_PROMPTS = [
  { label: 'Personality', prompt: 'Suggest a memorable personality for this NPC with quirks, mannerisms, and motivations.' },
  { label: 'Backstory', prompt: 'Create a brief but interesting backstory for this NPC that could tie into a campaign.' },
  { label: 'Dialogue', prompt: 'Write some sample dialogue lines that capture this NPC\'s voice and personality.' },
  { label: 'Secret', prompt: 'Suggest a secret this NPC might be hiding that could become a plot hook.' },
];

const CR_OPTIONS = [
  '0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'
];

const ABILITY_TYPES = [
  { value: 'action', label: 'Action' },
  { value: 'bonus_action', label: 'Bonus Action' },
  { value: 'reaction', label: 'Reaction' },
  { value: 'passive', label: 'Passive' },
  { value: 'spell', label: 'Spell' },
];

const DAMAGE_TYPES = [
  'Bludgeoning', 'Piercing', 'Slashing', 'Fire', 'Cold', 'Lightning', 'Thunder',
  'Poison', 'Acid', 'Necrotic', 'Radiant', 'Force', 'Psychic'
];

interface Attack {
  id: string;
  name: string;
  bonus: number;
  damage: string;
  type: string;
}

type AbilityType = 'action' | 'bonus_action' | 'reaction' | 'passive' | 'spell';

interface Ability {
  id: string;
  name: string;
  description: string;
  type: AbilityType;
  uses?: number;
  maxUses?: number;
  recharge?: string;
}

interface World {
  id: string;
  name: string;
}

interface LocationResource {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
}

export default function NewNPCPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [worlds, setWorlds] = useState<World[]>([]);

  // Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [challengeRating, setChallengeRating] = useState('');
  const [worldId, setWorldId] = useState('');
  const [defaultHideHp, setDefaultHideHp] = useState(true);

  // Location
  const [locations, setLocations] = useState<LocationResource[]>([]);
  const [locationResourceId, setLocationResourceId] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [useCustomLocation, setUseCustomLocation] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    hp: 10,
    ac: 10,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    speed: 30,
  });

  // Attacks
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [newAttack, setNewAttack] = useState({ name: '', bonus: 0, damage: '', type: 'Slashing' });

  // Abilities
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [newAbility, setNewAbility] = useState<{
    name: string;
    description: string;
    type: AbilityType;
    hasLimitedUses: boolean;
    maxUses: number;
    recharge: string;
  }>({
    name: '',
    description: '',
    type: 'action',
    hasLimitedUses: false,
    maxUses: 1,
    recharge: '',
  });

  useEffect(() => {
    fetchWorlds();
  }, []);

  useEffect(() => {
    if (worldId) {
      fetchLocations(worldId);
    } else {
      setLocations([]);
      setLocationResourceId('');
    }
  }, [worldId]);

  async function fetchWorlds() {
    try {
      const res = await fetch('/api/worlds');
      const data = await res.json();
      if (res.ok) {
        setWorlds(data.worlds || []);
      }
    } catch (err) {
      console.error('Failed to fetch worlds:', err);
    }
  }

  async function fetchLocations(wId: string) {
    try {
      const res = await fetch(`/api/worlds/${wId}/resources?type=location`);
      const data = await res.json();
      if (res.ok) {
        setLocations(data.resources || []);
      }
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  }

  // Get full path for a location (e.g., "Bludhaven > Tavern")
  function getLocationPath(locationId: string): string {
    const parts: string[] = [];
    let current = locations.find(l => l.id === locationId);
    while (current) {
      parts.unshift(current.name);
      current = current.parentId ? locations.find(l => l.id === current!.parentId) : undefined;
    }
    return parts.join(' > ');
  }

  // Sort locations so parents come before children, with hierarchy shown
  function getSortedLocations(): LocationResource[] {
    // Build tree and flatten with depth info
    const result: Array<LocationResource & { depth: number }> = [];

    function addWithChildren(parentId: string | null, depth: number) {
      const children = locations
        .filter(l => l.parentId === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const child of children) {
        result.push({ ...child, depth });
        addWithChildren(child.id, depth + 1);
      }
    }

    addWithChildren(null, 0);
    return result;
  }

  function updateStat(stat: string, value: number) {
    setStats({ ...stats, [stat]: Math.max(0, value) });
  }

  function addAttack() {
    if (!newAttack.name || !newAttack.damage) return;

    setAttacks([
      ...attacks,
      {
        id: crypto.randomUUID(),
        name: newAttack.name,
        bonus: newAttack.bonus,
        damage: newAttack.damage,
        type: newAttack.type,
      },
    ]);
    setNewAttack({ name: '', bonus: 0, damage: '', type: 'Slashing' });
  }

  function removeAttack(id: string) {
    setAttacks(attacks.filter(a => a.id !== id));
  }

  function addAbility() {
    if (!newAbility.name || !newAbility.description) return;

    const ability: Ability = {
      id: crypto.randomUUID(),
      name: newAbility.name,
      description: newAbility.description,
      type: newAbility.type,
    };

    if (newAbility.hasLimitedUses) {
      ability.maxUses = newAbility.maxUses;
      ability.uses = newAbility.maxUses;
      if (newAbility.recharge) {
        ability.recharge = newAbility.recharge;
      }
    }

    setAbilities([...abilities, ability]);
    setNewAbility({
      name: '',
      description: '',
      type: 'action',
      hasLimitedUses: false,
      maxUses: 1,
      recharge: '',
    });
  }

  function removeAbility(id: string) {
    setAbilities(abilities.filter(a => a.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/npcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          challengeRating: challengeRating || undefined,
          worldId: worldId || undefined,
          location: useCustomLocation ? customLocation : undefined,
          locationResourceId: locationResourceId || undefined,
          defaultHideHp,
          stats: {
            ...stats,
            attacks: attacks.map(({ id, ...rest }) => rest),
          },
          abilities,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create NPC');
        return;
      }

      router.push('/dm/npcs');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dm/npcs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create NPC</h1>
            <p className="text-gray-600 dark:text-gray-400">Build a new non-player character</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>NPC identity and classification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                id="name"
                label="NPC Name"
                placeholder="e.g., Gundren Rockseeker, Sildar Hallwinter"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Challenge Rating
                  </label>
                  <select
                    value={challengeRating}
                    onChange={(e) => setChallengeRating(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  >
                    <option value="">Select CR...</option>
                    {CR_OPTIONS.map(cr => (
                      <option key={cr} value={cr}>CR {cr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    World (Optional)
                  </label>
                  <select
                    value={worldId}
                    onChange={(e) => setWorldId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  >
                    <option value="">Global (all worlds)</option>
                    {worlds.map(world => (
                      <option key={world.id} value={world.id}>{world.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location dropdown - only shown when a world is selected */}
              {worldId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location (Optional)
                  </label>
                  <select
                    value={useCustomLocation ? '__other__' : locationResourceId}
                    onChange={(e) => {
                      if (e.target.value === '__other__') {
                        setUseCustomLocation(true);
                        setLocationResourceId('');
                      } else {
                        setUseCustomLocation(false);
                        setLocationResourceId(e.target.value);
                        setCustomLocation('');
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  >
                    <option value="">No location</option>
                    {getSortedLocations().map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {getLocationPath(loc.id)}
                      </option>
                    ))}
                    <option value="__other__">Other (custom location)</option>
                  </select>
                  {useCustomLocation && (
                    <Input
                      id="customLocation"
                      placeholder="Enter custom location..."
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
              )}

              {/* Description - Prominent for NPCs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Describe the NPC's appearance, personality, mannerisms, role in the story..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include details for roleplay: voice, quirks, goals, secrets
                </p>
              </div>

              {/* NPC-specific: Hide HP by default */}
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <EyeOff className="w-5 h-5 text-amber-600" />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={defaultHideHp}
                    onChange={(e) => setDefaultHideHp(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Hide HP from players by default
                  </span>
                </label>
                <span className="text-xs text-gray-500 ml-auto">
                  Useful for disguised enemies
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Core Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Core Stats
              </CardTitle>
              <CardDescription>Hit points, armor, and speed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Input
                    id="hp"
                    type="number"
                    label="Hit Points"
                    min={1}
                    value={stats.hp}
                    onChange={(e) => updateStat('hp', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Input
                    id="ac"
                    type="number"
                    label="Armor Class"
                    min={0}
                    value={stats.ac}
                    onChange={(e) => updateStat('ac', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Input
                    id="speed"
                    type="number"
                    label="Speed (ft)"
                    min={0}
                    step={5}
                    value={stats.speed}
                    onChange={(e) => updateStat('speed', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ability Scores */}
          <Card>
            <CardHeader>
              <CardTitle>Ability Scores</CardTitle>
              <CardDescription>Physical and mental attributes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(stat => (
                  <div key={stat} className="text-center">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 uppercase mb-1">
                      {stat}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={stats[stat]}
                      onChange={(e) => updateStat(stat, parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-2 text-center text-lg font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    />
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                      {formatModifier(calculateModifier(stats[stat]))}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attacks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sword className="w-5 h-5" />
                Attacks
              </CardTitle>
              <CardDescription>Combat capabilities (if applicable)</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add Attack Form */}
              <div className="grid grid-cols-12 gap-2 mb-4">
                <div className="col-span-12 sm:col-span-3">
                  <Input
                    id="attackName"
                    placeholder="Attack name"
                    value={newAttack.name}
                    onChange={(e) => setNewAttack({ ...newAttack, name: e.target.value })}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    id="attackBonus"
                    type="number"
                    placeholder="+5"
                    value={newAttack.bonus}
                    onChange={(e) => setNewAttack({ ...newAttack, bonus: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <Input
                    id="attackDamage"
                    placeholder="2d6+3"
                    value={newAttack.damage}
                    onChange={(e) => setNewAttack({ ...newAttack, damage: e.target.value })}
                  />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <select
                    value={newAttack.type}
                    onChange={(e) => setNewAttack({ ...newAttack, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 h-[42px]"
                  >
                    {DAMAGE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-12 sm:col-span-1">
                  <Button type="button" onClick={addAttack} className="w-full h-[42px]">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Attack List */}
              {attacks.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No attacks added yet (optional for non-combat NPCs)
                </p>
              ) : (
                <div className="space-y-2">
                  {attacks.map(attack => (
                    <div
                      key={attack.id}
                      className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {attack.name}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          +{attack.bonus} to hit, {attack.damage} {attack.type.toLowerCase()}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttack(attack.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Abilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Abilities
              </CardTitle>
              <CardDescription>Special abilities, actions, and traits</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add Ability Form */}
              <div className="space-y-3 mb-4 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="abilityName"
                    label="Ability Name"
                    placeholder="e.g., Spellcasting, Cunning Action"
                    value={newAbility.name}
                    onChange={(e) => setNewAbility({ ...newAbility, name: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={newAbility.type}
                      onChange={(e) => setNewAbility({ ...newAbility, type: e.target.value as AbilityType })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    >
                      {ABILITY_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe what this ability does..."
                    value={newAbility.description}
                    onChange={(e) => setNewAbility({ ...newAbility, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newAbility.hasLimitedUses}
                      onChange={(e) => setNewAbility({ ...newAbility, hasLimitedUses: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Limited uses</span>
                  </label>

                  {newAbility.hasLimitedUses && (
                    <>
                      <div className="flex items-center gap-2">
                        <Input
                          id="maxUses"
                          type="number"
                          min={1}
                          value={newAbility.maxUses}
                          onChange={(e) => setNewAbility({ ...newAbility, maxUses: parseInt(e.target.value) || 1 })}
                          className="w-16"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">uses</span>
                      </div>
                      <Input
                        id="recharge"
                        placeholder="Recharge (e.g., 5-6)"
                        value={newAbility.recharge}
                        onChange={(e) => setNewAbility({ ...newAbility, recharge: e.target.value })}
                        className="w-40"
                      />
                    </>
                  )}
                </div>

                <Button type="button" variant="outline" onClick={addAbility} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Ability
                </Button>
              </div>

              {/* Ability List */}
              {abilities.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No abilities added yet
                </p>
              ) : (
                <div className="space-y-3">
                  {abilities.map(ability => (
                    <div
                      key={ability.id}
                      className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {ability.name}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded">
                              {ABILITY_TYPES.find(t => t.value === ability.type)?.label}
                            </span>
                            {ability.maxUses && (
                              <span className="text-xs text-gray-500">
                                ({ability.maxUses}/day{ability.recharge ? `, recharge ${ability.recharge}` : ''})
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {ability.description}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAbility(ability.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Link href="/dm/npcs" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="flex-1" isLoading={isLoading}>
              Create NPC
            </Button>
          </div>
        </form>
      </div>

      {/* AI Assistant */}
      <AIAssistant
        context="I'm creating a D&D 5e NPC (Non-Player Character). Help me with personality, backstory, dialogue, motivations, and secrets."
        quickPrompts={NPC_QUICK_PROMPTS}
        title="NPC Builder AI"
        placeholder="Ask about NPC personality, backstory, dialogue..."
        emptyStateText="Need help bringing your NPC to life? Ask me!"
      />
    </div>
  );
}

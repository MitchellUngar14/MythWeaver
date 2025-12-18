'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Dice6, Plus, Trash2, Package, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { calculateModifier, formatModifier, rollDice } from '@/lib/utils';
import { AIAssistant } from '@/components/dm/AIAssistant';

const CHARACTER_QUICK_PROMPTS = [
  { label: 'Backstory Ideas', prompt: 'Suggest a compelling backstory for my character based on their race and class.' },
  { label: 'Stat Advice', prompt: 'What ability scores should I prioritize for my class? Explain the best stat distribution.' },
  { label: 'Personality Traits', prompt: 'Suggest interesting personality traits, ideals, bonds, and flaws for my character.' },
  { label: 'Level Up Tips', prompt: 'What should I consider when leveling up my character? Any feat or ability recommendations?' },
];

const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];
const RACES = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling', 'Dragonborn'];

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  description?: string;
}

interface Character {
  id: string;
  name: string;
  class: string | null;
  race: string | null;
  level: number;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
    hp: number;
    maxHp: number;
    ac: number;
    speed: number;
    proficiencyBonus: number;
    hitDice: string;
  };
  inventory: InventoryItem[];
  backstory: string | null;
  notes: string | null;
  world: {
    id: string;
    name: string;
  } | null;
}

export default function EditCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [character, setCharacter] = useState<Character | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [characterClass, setCharacterClass] = useState('');
  const [race, setRace] = useState('');
  const [level, setLevel] = useState(1);
  const [stats, setStats] = useState({
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    hp: 10, maxHp: 10, ac: 10, speed: 30, proficiencyBonus: 2, hitDice: '1d8',
  });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [backstory, setBackstory] = useState('');
  const [notes, setNotes] = useState('');

  // New item form
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);

  useEffect(() => {
    fetchCharacter();
  }, [id]);

  async function fetchCharacter() {
    try {
      const res = await fetch(`/api/characters/${id}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load character');
        return;
      }

      const char = data.character;
      setCharacter(char);
      setCanEdit(data.canEdit);

      // Populate form
      setName(char.name);
      setCharacterClass(char.class || '');
      setRace(char.race || '');
      setLevel(char.level);
      setStats({
        str: char.stats?.str || 10,
        dex: char.stats?.dex || 10,
        con: char.stats?.con || 10,
        int: char.stats?.int || 10,
        wis: char.stats?.wis || 10,
        cha: char.stats?.cha || 10,
        hp: char.stats?.hp || 10,
        maxHp: char.stats?.maxHp || 10,
        ac: char.stats?.ac || 10,
        speed: char.stats?.speed || 30,
        proficiencyBonus: char.stats?.proficiencyBonus || 2,
        hitDice: char.stats?.hitDice || '1d8',
      });
      setInventory(char.inventory || []);
      setBackstory(char.backstory || '');
      setNotes(char.notes || '');
    } catch (err) {
      setError('Failed to load character');
    } finally {
      setIsLoading(false);
    }
  }

  function rollStat() {
    const rolls = rollDice(4, 6).sort((a, b) => b - a);
    return rolls.slice(0, 3).reduce((a, b) => a + b, 0);
  }

  function rollAllStats() {
    setStats({
      ...stats,
      str: rollStat(),
      dex: rollStat(),
      con: rollStat(),
      int: rollStat(),
      wis: rollStat(),
      cha: rollStat(),
    });
  }

  function updateStat(stat: string, value: number) {
    setStats({ ...stats, [stat]: Math.max(0, Math.min(30, value)) });
  }

  function addInventoryItem() {
    if (!newItemName.trim()) return;

    const newItem: InventoryItem = {
      id: crypto.randomUUID(),
      name: newItemName.trim(),
      quantity: newItemQuantity,
    };

    setInventory([...inventory, newItem]);
    setNewItemName('');
    setNewItemQuantity(1);
  }

  function removeInventoryItem(itemId: string) {
    setInventory(inventory.filter(item => item.id !== itemId));
  }

  function updateItemQuantity(itemId: string, quantity: number) {
    setInventory(inventory.map(item =>
      item.id === itemId ? { ...item, quantity: Math.max(0, quantity) } : item
    ));
  }

  async function handleSave() {
    setError('');
    setSuccessMessage('');
    setIsSaving(true);

    try {
      const res = await fetch(`/api/characters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          class: characterClass,
          race,
          level,
          stats,
          inventory,
          backstory,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save character');
        return;
      }

      setSuccessMessage('Character saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !character) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Link href="/characters">
              <Button>Back to Characters</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/characters">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {canEdit ? 'Edit Character' : 'View Character'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {character?.world ? (
                  <span className="flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    {character.world.name}
                  </span>
                ) : (
                  'Not in a world'
                )}
              </p>
            </div>
          </div>
          {canEdit && (
            <Button onClick={handleSave} isLoading={isSaving}>
              <Save className="w-5 h-5 mr-2" />
              Save
            </Button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950 rounded-lg">
            {successMessage}
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Character identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                id="name"
                label="Character Name"
                placeholder="Enter character name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Race
                  </label>
                  <select
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50"
                  >
                    <option value="">Select race...</option>
                    {RACES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Class
                  </label>
                  <select
                    value={characterClass}
                    onChange={(e) => setCharacterClass(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50"
                  >
                    <option value="">Select class...</option>
                    {CLASSES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="w-32">
                <Input
                  id="level"
                  type="number"
                  label="Level"
                  min={1}
                  max={20}
                  value={level}
                  onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
                  disabled={!canEdit}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ability Scores */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ability Scores</CardTitle>
                  <CardDescription>Core attributes</CardDescription>
                </div>
                {canEdit && (
                  <Button type="button" variant="outline" onClick={rollAllStats}>
                    <Dice6 className="w-4 h-4 mr-2" />
                    Roll Stats
                  </Button>
                )}
              </div>
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
                      disabled={!canEdit}
                      className="w-full px-2 py-2 text-center text-lg font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50"
                    />
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                      {formatModifier(calculateModifier(stats[stat]))}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Combat Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Combat Stats</CardTitle>
              <CardDescription>Hit points and defenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Input
                    id="maxHp"
                    type="number"
                    label="Max HP"
                    min={1}
                    value={stats.maxHp}
                    disabled={!canEdit}
                    onChange={(e) => setStats({
                      ...stats,
                      maxHp: parseInt(e.target.value) || 1,
                      hp: Math.min(stats.hp, parseInt(e.target.value) || 1),
                    })}
                  />
                </div>
                <div>
                  <Input
                    id="hp"
                    type="number"
                    label="Current HP"
                    min={0}
                    max={stats.maxHp}
                    value={stats.hp}
                    disabled={!canEdit}
                    onChange={(e) => updateStat('hp', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Input
                    id="ac"
                    type="number"
                    label="Armor Class"
                    min={0}
                    value={stats.ac}
                    disabled={!canEdit}
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
                    disabled={!canEdit}
                    onChange={(e) => updateStat('speed', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Inventory
              </CardTitle>
              <CardDescription>Items and equipment</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add Item Form */}
              {canEdit && (
                <div className="flex gap-2 mb-4">
                  <Input
                    id="newItem"
                    placeholder="Item name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    id="newItemQty"
                    type="number"
                    min={1}
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                  <Button type="button" onClick={addInventoryItem}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Item List */}
              {inventory.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No items in inventory
                </p>
              ) : (
                <div className="space-y-2">
                  {inventory.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {canEdit ? (
                          <>
                            <input
                              type="number"
                              min={0}
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 text-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInventoryItem(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400">
                            x{item.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Backstory */}
          <Card>
            <CardHeader>
              <CardTitle>Backstory</CardTitle>
              <CardDescription>Character background</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                placeholder="Write your character's backstory..."
                value={backstory}
                onChange={(e) => setBackstory(e.target.value)}
                disabled={!canEdit}
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50"
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Additional notes and reminders</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                placeholder="Session notes, reminders, etc..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!canEdit}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          {canEdit && (
            <div className="flex gap-4">
              <Link href="/characters" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button onClick={handleSave} className="flex-1" isLoading={isSaving}>
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant */}
      <AIAssistant
        context="I'm editing my D&D 5e character. Help me with backstory ideas, ability scores, personality traits, and character development."
        quickPrompts={CHARACTER_QUICK_PROMPTS}
        title="Character Builder AI"
        placeholder="Ask about your character..."
        emptyStateText="Need help with your character? Ask me!"
      />
    </div>
  );
}

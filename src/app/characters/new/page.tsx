'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Dice6 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { calculateModifier, formatModifier, rollDice } from '@/lib/utils';
import { AIAssistant } from '@/components/dm/AIAssistant';

const CHARACTER_QUICK_PROMPTS = [
  { label: 'Backstory Ideas', prompt: 'Suggest a compelling backstory for my character based on their race and class.' },
  { label: 'Stat Advice', prompt: 'What ability scores should I prioritize for my class? Explain the best stat distribution.' },
  { label: 'Personality Traits', prompt: 'Suggest interesting personality traits, ideals, bonds, and flaws for my character.' },
  { label: 'Name Ideas', prompt: 'Suggest some fitting character names based on my chosen race and class.' },
];

const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];
const RACES = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling', 'Dragonborn'];

const DEFAULT_STATS = {
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
  hp: 10, maxHp: 10, ac: 10, speed: 30, proficiencyBonus: 2, hitDice: '1d8',
};

export default function NewCharacterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [characterClass, setCharacterClass] = useState('');
  const [race, setRace] = useState('');
  const [level, setLevel] = useState(1);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [backstory, setBackstory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  function rollStat() {
    // 4d6 drop lowest
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
    setStats({ ...stats, [stat]: Math.max(1, Math.min(30, value)) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          class: characterClass,
          race,
          level,
          stats,
          backstory,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create character');
        return;
      }

      router.push(`/characters/${data.character.id}`);
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
          <Link href="/characters">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Character</h1>
            <p className="text-gray-600 dark:text-gray-400">Build your adventurer</p>
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
              <CardDescription>Who is your character?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                id="name"
                label="Character Name"
                placeholder="Enter character name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
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
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
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
                  <CardDescription>Your character&apos;s core attributes</CardDescription>
                </div>
                <Button type="button" variant="outline" onClick={rollAllStats}>
                  <Dice6 className="w-4 h-4 mr-2" />
                  Roll Stats
                </Button>
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

          {/* Combat Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Combat Stats</CardTitle>
              <CardDescription>Hit points, armor, and more</CardDescription>
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

          {/* Backstory */}
          <Card>
            <CardHeader>
              <CardTitle>Backstory</CardTitle>
              <CardDescription>Optional background for your character</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                placeholder="Write your character's backstory..."
                value={backstory}
                onChange={(e) => setBackstory(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Link href="/characters" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="flex-1" isLoading={isLoading}>
              Create Character
            </Button>
          </div>
        </form>
      </div>

      {/* AI Assistant */}
      <AIAssistant
        context="I'm creating a new D&D 5e character. Help me with backstory ideas, ability scores, personality traits, and character concepts."
        quickPrompts={CHARACTER_QUICK_PROMPTS}
        title="Character Builder AI"
        placeholder="Ask about your character..."
        emptyStateText="Need help building your character? Ask me!"
      />
    </div>
  );
}

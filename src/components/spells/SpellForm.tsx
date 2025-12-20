'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SPELL_SCHOOLS, SPELL_LEVEL_LABELS } from '@/lib/spell-data';
import type { SpellComponents } from '@/lib/schema';

const CLASSES = [
  'Artificer', 'Bard', 'Cleric', 'Druid', 'Paladin',
  'Ranger', 'Sorcerer', 'Warlock', 'Wizard'
];

export interface SpellFormData {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: SpellComponents;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
  higherLevels?: string;
  classes: string[];
}

interface SpellFormProps {
  initialData?: Partial<SpellFormData>;
  onSubmit: (data: SpellFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function SpellForm({ initialData, onSubmit, onCancel, isSubmitting }: SpellFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [level, setLevel] = useState(initialData?.level ?? 1);
  const [school, setSchool] = useState(initialData?.school || 'evocation');
  const [castingTime, setCastingTime] = useState(initialData?.castingTime || '1 action');
  const [range, setRange] = useState(initialData?.range || '');
  const [duration, setDuration] = useState(initialData?.duration || 'Instantaneous');
  const [concentration, setConcentration] = useState(initialData?.concentration || false);
  const [ritual, setRitual] = useState(initialData?.ritual || false);
  const [description, setDescription] = useState(initialData?.description || '');
  const [higherLevels, setHigherLevels] = useState(initialData?.higherLevels || '');
  const [selectedClasses, setSelectedClasses] = useState<string[]>(initialData?.classes || []);

  // Components
  const [hasVerbal, setHasVerbal] = useState(initialData?.components?.verbal ?? true);
  const [hasSomatic, setHasSomatic] = useState(initialData?.components?.somatic ?? true);
  const [hasMaterial, setHasMaterial] = useState(initialData?.components?.material ?? false);
  const [materialDescription, setMaterialDescription] = useState(initialData?.components?.materialDescription || '');
  const [materialCost, setMaterialCost] = useState<number | undefined>(initialData?.components?.materialCost);
  const [materialConsumed, setMaterialConsumed] = useState(initialData?.components?.materialConsumed || false);

  function handleClassToggle(cls: string) {
    setSelectedClasses(prev =>
      prev.includes(cls)
        ? prev.filter(c => c !== cls)
        : [...prev, cls]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const components: SpellComponents = {
      verbal: hasVerbal,
      somatic: hasSomatic,
      material: hasMaterial,
    };

    if (hasMaterial && materialDescription) {
      components.materialDescription = materialDescription;
      if (materialCost) {
        components.materialCost = materialCost;
      }
      if (materialConsumed) {
        components.materialConsumed = true;
      }
    }

    onSubmit({
      name,
      level,
      school,
      castingTime,
      range,
      components,
      duration,
      concentration,
      ritual,
      description,
      higherLevels: higherLevels || undefined,
      classes: selectedClasses,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h3 className="font-medium text-gray-900 dark:text-white">Basic Information</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Spell Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Arcane Surge"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Spell Level *
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => (
                <option key={lvl} value={lvl}>{SPELL_LEVEL_LABELS[lvl]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              School *
            </label>
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            >
              {SPELL_SCHOOLS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Casting Time *
            </label>
            <Input
              value={castingTime}
              onChange={(e) => setCastingTime(e.target.value)}
              placeholder="e.g., 1 action, 1 bonus action, 1 minute"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Range *
            </label>
            <Input
              value={range}
              onChange={(e) => setRange(e.target.value)}
              placeholder="e.g., 60 feet, Touch, Self"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Duration *
            </label>
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g., Instantaneous, 1 minute, Concentration, up to 1 hour"
              required
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={concentration}
              onChange={(e) => setConcentration(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Concentration</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ritual}
              onChange={(e) => setRitual(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Ritual</span>
          </label>
        </div>
      </div>

      {/* Components */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h3 className="font-medium text-gray-900 dark:text-white">Components</h3>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hasVerbal}
              onChange={(e) => setHasVerbal(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Verbal (V)</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hasSomatic}
              onChange={(e) => setHasSomatic(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Somatic (S)</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hasMaterial}
              onChange={(e) => setHasMaterial(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Material (M)</span>
          </label>
        </div>

        {hasMaterial && (
          <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Material Description
              </label>
              <Input
                value={materialDescription}
                onChange={(e) => setMaterialDescription(e.target.value)}
                placeholder="e.g., a pinch of sulfur and bat guano"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Material Cost (in copper pieces)
                </label>
                <Input
                  type="number"
                  value={materialCost || ''}
                  onChange={(e) => setMaterialCost(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g., 30000 (for 300 gp)"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank if no specific cost</p>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={materialConsumed}
                    onChange={(e) => setMaterialConsumed(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Material is consumed</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h3 className="font-medium text-gray-900 dark:text-white">Description</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Spell Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what the spell does, including damage, saves, effects, etc."
            rows={6}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-y"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            At Higher Levels
          </label>
          <textarea
            value={higherLevels}
            onChange={(e) => setHigherLevels(e.target.value)}
            placeholder="Describe how the spell improves when cast with a higher level slot (optional)"
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-y"
          />
        </div>
      </div>

      {/* Classes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h3 className="font-medium text-gray-900 dark:text-white">Classes</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select which classes can learn this spell
        </p>

        <div className="flex flex-wrap gap-2">
          {CLASSES.map(cls => (
            <button
              key={cls}
              type="button"
              onClick={() => handleClassToggle(cls)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                selectedClasses.includes(cls)
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {initialData ? 'Update Spell' : 'Create Spell'}
        </Button>
      </div>
    </form>
  );
}

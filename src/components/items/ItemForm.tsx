'use client';

import { useState } from 'react';
import { Sword, Shield, FlaskConical, Sparkles, Package, Target, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getItemTypeIcon, getDamageTypeIcon, getDamageTypeColor } from '@/lib/item-icons';
import type { ItemProperties } from '@/lib/schema';

const ITEM_TYPES = [
  { value: 'weapon', label: 'Weapon', icon: Sword },
  { value: 'armor', label: 'Armor', icon: ShieldCheck },
  { value: 'shield', label: 'Shield', icon: Shield },
  { value: 'consumable', label: 'Consumable', icon: FlaskConical },
  { value: 'wondrous', label: 'Wondrous Item', icon: Sparkles },
  { value: 'misc', label: 'Miscellaneous', icon: Package },
];

const RARITIES = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'very_rare', label: 'Very Rare' },
  { value: 'legendary', label: 'Legendary' },
];

const DAMAGE_TYPES = [
  'slashing', 'piercing', 'bludgeoning', 'fire', 'cold', 'lightning',
  'thunder', 'poison', 'acid', 'necrotic', 'radiant', 'force', 'psychic',
];

const WEAPON_PROPERTIES = [
  { value: 'finesse', label: 'Finesse' },
  { value: 'versatile', label: 'Versatile' },
  { value: 'two-handed', label: 'Two-Handed' },
  { value: 'light', label: 'Light' },
  { value: 'heavy', label: 'Heavy' },
  { value: 'reach', label: 'Reach' },
  { value: 'thrown', label: 'Thrown' },
  { value: 'loading', label: 'Loading' },
  { value: 'ammunition', label: 'Ammunition' },
];

const ARMOR_TYPES = [
  { value: 'light', label: 'Light Armor' },
  { value: 'medium', label: 'Medium Armor' },
  { value: 'heavy', label: 'Heavy Armor' },
  { value: 'shield', label: 'Shield' },
];

export interface ItemFormData {
  name: string;
  description: string;
  type: string;
  rarity: string;
  weight: number | null;
  value: number | null;
  requiresAttunement: boolean;
  properties: ItemProperties;
}

interface ItemFormProps {
  initialData?: Partial<ItemFormData>;
  onSubmit: (data: ItemFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ItemForm({ initialData, onSubmit, onCancel, isSubmitting }: ItemFormProps) {
  const [formData, setFormData] = useState<ItemFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    type: initialData?.type || 'weapon',
    rarity: initialData?.rarity || 'common',
    weight: initialData?.weight ?? null,
    value: initialData?.value ?? null,
    requiresAttunement: initialData?.requiresAttunement || false,
    properties: initialData?.properties || {},
  });

  function updateProperties(updates: Partial<ItemProperties>) {
    setFormData(prev => ({
      ...prev,
      properties: { ...prev.properties, ...updates },
    }));
  }

  function toggleWeaponProperty(property: string) {
    const currentProps = formData.properties.weaponProperties || [];
    const newProps = currentProps.includes(property)
      ? currentProps.filter(p => p !== property)
      : [...currentProps, property];
    updateProperties({ weaponProperties: newProps });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Longsword +1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {ITEM_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rarity
            </label>
            <select
              value={formData.rarity}
              onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {RARITIES.map(rarity => (
                <option key={rarity.value} value={rarity.value}>{rarity.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Weight (lbs)
              </label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={formData.weight ?? ''}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="0"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Value (gp)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.value ? Math.floor(formData.value / 100) : ''}
                onChange={(e) => setFormData({ ...formData, value: e.target.value ? parseInt(e.target.value) * 100 : null })}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="A detailed description of the item..."
          />
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requiresAttunement}
              onChange={(e) => setFormData({ ...formData, requiresAttunement: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Requires Attunement</span>
          </label>
        </div>
      </div>

      {/* Weapon Properties */}
      {formData.type === 'weapon' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            {formData.properties.isRanged ? (
              <Target className="w-5 h-5 text-blue-500" />
            ) : (
              <Sword className="w-5 h-5 text-red-500" />
            )}
            {formData.properties.isRanged ? 'Ranged Weapon Stats' : 'Melee Weapon Stats'}
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Damage Dice
              </label>
              <Input
                value={formData.properties.damage || ''}
                onChange={(e) => updateProperties({ damage: e.target.value })}
                placeholder="e.g., 1d8"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Damage Type
              </label>
              <div className="relative">
                {formData.properties.damageType && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {(() => {
                      const DmgIcon = getDamageTypeIcon(formData.properties.damageType);
                      return <DmgIcon className={`w-4 h-4 ${getDamageTypeColor(formData.properties.damageType)}`} />;
                    })()}
                  </div>
                )}
                <select
                  value={formData.properties.damageType || ''}
                  onChange={(e) => updateProperties({ damageType: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${formData.properties.damageType ? 'pl-9' : ''}`}
                >
                  <option value="">Select type</option>
                  {DAMAGE_TYPES.map(type => (
                    <option key={type} value={type} className="capitalize">{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Attack Bonus
              </label>
              <Input
                type="number"
                min="0"
                max="3"
                value={formData.properties.attackBonus ?? ''}
                onChange={(e) => updateProperties({ attackBonus: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="+0"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formData.properties.isRanged || false}
                onChange={(e) => updateProperties({ isRanged: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Ranged Weapon</span>
            </label>

            {formData.properties.isRanged && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Normal Range (ft)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.properties.range?.normal ?? ''}
                    onChange={(e) => updateProperties({
                      range: {
                        normal: parseInt(e.target.value) || 0,
                        long: formData.properties.range?.long,
                      }
                    })}
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Long Range (ft)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.properties.range?.long ?? ''}
                    onChange={(e) => updateProperties({
                      range: {
                        normal: formData.properties.range?.normal || 0,
                        long: parseInt(e.target.value) || undefined,
                      }
                    })}
                    placeholder="120"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Weapon Properties
            </label>
            <div className="flex flex-wrap gap-2">
              {WEAPON_PROPERTIES.map(prop => (
                <button
                  key={prop.value}
                  type="button"
                  onClick={() => toggleWeaponProperty(prop.value)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    formData.properties.weaponProperties?.includes(prop.value)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {prop.label}
                </button>
              ))}
            </div>
          </div>

          {formData.properties.weaponProperties?.includes('versatile') && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Versatile Damage (two-handed)
              </label>
              <Input
                value={formData.properties.versatileDamage || ''}
                onChange={(e) => updateProperties({ versatileDamage: e.target.value })}
                placeholder="e.g., 1d10"
              />
            </div>
          )}
        </div>
      )}

      {/* Armor/Shield Properties */}
      {(formData.type === 'armor' || formData.type === 'shield') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            {formData.type === 'shield' ? (
              <Shield className="w-5 h-5 text-blue-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-blue-500" />
            )}
            {formData.type === 'shield' ? 'Shield Stats' : 'Armor Stats'}
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {formData.type === 'shield' ? 'AC Bonus' : 'Base AC'}
              </label>
              <Input
                type="number"
                min="0"
                value={formData.properties.acBonus ?? ''}
                onChange={(e) => updateProperties({ acBonus: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder={formData.type === 'shield' ? '+2' : '14'}
              />
            </div>

            {formData.type === 'armor' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Armor Type
                  </label>
                  <select
                    value={formData.properties.armorType || ''}
                    onChange={(e) => updateProperties({ armorType: e.target.value as 'light' | 'medium' | 'heavy' | 'shield' })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select type</option>
                    {ARMOR_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {formData.properties.armorType === 'medium' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Dex Bonus
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      value={formData.properties.maxDexBonus ?? 2}
                      onChange={(e) => updateProperties({ maxDexBonus: parseInt(e.target.value) || 2 })}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.properties.stealthDisadvantage || false}
                onChange={(e) => updateProperties({ stealthDisadvantage: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Stealth Disadvantage</span>
            </label>

            {formData.properties.armorType === 'heavy' && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Strength Requirement:
                </label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={formData.properties.strengthRequirement ?? ''}
                  onChange={(e) => updateProperties({ strengthRequirement: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-20"
                  placeholder="13"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Consumable Properties */}
      {formData.type === 'consumable' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            Consumable Properties
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Charges
              </label>
              <Input
                type="number"
                min="1"
                value={formData.properties.charges ?? ''}
                onChange={(e) => updateProperties({
                  charges: e.target.value ? parseInt(e.target.value) : undefined,
                  maxCharges: e.target.value ? parseInt(e.target.value) : undefined,
                })}
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Charges
              </label>
              <Input
                type="number"
                min="1"
                value={formData.properties.maxCharges ?? ''}
                onChange={(e) => updateProperties({ maxCharges: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="1"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Effect
            </label>
            <textarea
              value={formData.properties.effect || ''}
              onChange={(e) => updateProperties({ effect: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="e.g., Restores 2d4+2 hit points"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !formData.name}>
          {isSubmitting ? 'Saving...' : 'Save Item'}
        </Button>
      </div>
    </form>
  );
}

'use client';

import { X, Sword, Shield, Sparkles, Scale, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getItemTypeIcon, getItemTypeColor, getDamageTypeIcon, getDamageTypeColor } from '@/lib/item-icons';
import type { Item, ItemProperties } from '@/lib/schema';

interface ItemDetailModalProps {
  item: Item;
  quantity?: number;
  equipped?: boolean;
  attuned?: boolean;
  onClose: () => void;
}

function getRarityColor(rarity: string | null) {
  switch (rarity) {
    case 'common': return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    case 'uncommon': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    case 'rare': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    case 'very_rare': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400';
    case 'legendary': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
    default: return 'text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
  }
}

function formatRarity(rarity: string | null) {
  if (!rarity) return 'Common';
  return rarity.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatItemType(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function ItemDetailModal({
  item,
  quantity = 1,
  equipped = false,
  attuned = false,
  onClose,
}: ItemDetailModalProps) {
  const props = (item.properties || {}) as ItemProperties;
  const TypeIcon = getItemTypeIcon(item.type, props.isRanged);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm`}>
                <TypeIcon className={`w-6 h-6 ${getItemTypeColor(item.type)}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {item.name}
                  {quantity > 1 && (
                    <span className="ml-2 text-sm font-normal text-gray-500">x{quantity}</span>
                  )}
                </h2>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRarityColor(item.rarity)}`}>
                    {formatRarity(item.rarity)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                    {formatItemType(item.type)}
                  </span>
                  {equipped && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      Equipped
                    </span>
                  )}
                  {attuned && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                      Attuned
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="-mt-1 -mr-1">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Description */}
          {item.description && (
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
                {item.description}
              </p>
            </div>
          )}

          {/* Weapon Stats */}
          {item.type === 'weapon' && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sword className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-800 dark:text-red-300">Weapon Stats</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {props.damage && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Damage: </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {props.damage}
                      {props.attackBonus ? ` (+${props.attackBonus})` : ''}
                    </span>
                  </div>
                )}
                {props.damageType && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400">Type: </span>
                    {(() => {
                      const DmgIcon = getDamageTypeIcon(props.damageType);
                      return <DmgIcon className={`w-4 h-4 ${getDamageTypeColor(props.damageType)}`} />;
                    })()}
                    <span className={`font-medium ${getDamageTypeColor(props.damageType)}`}>
                      {props.damageType.charAt(0).toUpperCase() + props.damageType.slice(1)}
                    </span>
                  </div>
                )}
                {props.versatileDamage && (
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Versatile: </span>
                    <span className="font-medium text-gray-900 dark:text-white">{props.versatileDamage}</span>
                  </div>
                )}
                {props.range && (
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Range: </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {props.range.normal} ft.
                      {props.range.long && ` / ${props.range.long} ft.`}
                    </span>
                  </div>
                )}
              </div>
              {props.weaponProperties && props.weaponProperties.length > 0 && (
                <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Properties: </span>
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {props.weaponProperties.join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Armor/Shield Stats */}
          {(item.type === 'armor' || item.type === 'shield') && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  {item.type === 'shield' ? 'Shield Stats' : 'Armor Stats'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {props.acBonus !== undefined && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">AC: </span>
                    <span className="font-medium text-gray-900 dark:text-white">+{props.acBonus}</span>
                  </div>
                )}
                {props.armorType && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Type: </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {props.armorType.charAt(0).toUpperCase() + props.armorType.slice(1)}
                    </span>
                  </div>
                )}
                {props.maxDexBonus !== undefined && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Max Dex: </span>
                    <span className="font-medium text-gray-900 dark:text-white">+{props.maxDexBonus}</span>
                  </div>
                )}
                {props.strengthRequirement && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Str Req: </span>
                    <span className="font-medium text-gray-900 dark:text-white">{props.strengthRequirement}</span>
                  </div>
                )}
                {props.stealthDisadvantage && (
                  <div className="col-span-2 text-orange-600 dark:text-orange-400 text-xs">
                    Disadvantage on Stealth checks
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Consumable Stats */}
          {item.type === 'consumable' && props.effect && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-800 dark:text-green-300">Effect</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{props.effect}</p>
              {props.charges !== undefined && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Charges: </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {props.charges}{props.maxCharges ? ` / ${props.maxCharges}` : ''}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Wondrous Item */}
          {item.type === 'wondrous' && props.effect && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-800 dark:text-purple-300">Magic Properties</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{props.effect}</p>
              {props.charges !== undefined && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Charges: </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {props.charges}{props.maxCharges ? ` / ${props.maxCharges}` : ''}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Attunement */}
          {item.requiresAttunement && (
            <div className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              Requires Attunement
            </div>
          )}

          {/* Weight & Value */}
          {(item.weight || item.value) && (
            <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              {item.weight !== null && item.weight !== undefined && (
                <div className="flex items-center gap-1">
                  <Scale className="w-4 h-4" />
                  <span>{item.weight} lb.</span>
                </div>
              )}
              {item.value !== null && item.value !== undefined && (
                <div className="flex items-center gap-1">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span>{item.value} gp</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

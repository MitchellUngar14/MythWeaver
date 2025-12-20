'use client';

import { useState, useEffect } from 'react';
import { Heart, Shield, Zap, User, Package, Loader2, BookOpen, Sparkles } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { getItemTypeIcon, getItemTypeColor, getDamageTypeIcon, getDamageTypeColor } from '@/lib/item-icons';
import { ItemDetailModal } from './ItemDetailModal';
import type { Character, Item, ItemProperties, SpellSlots, SpellSlot, Spell } from '@/lib/schema';
import { DEFAULT_SPELL_SLOTS } from '@/lib/spell-data';

interface InventoryItem {
  id: string;
  quantity: number;
  equipped: boolean;
  attuned: boolean;
  item: Item;
}

interface SelectedItemState {
  item: Item;
  quantity: number;
  equipped: boolean;
  attuned: boolean;
}

interface CharacterSpell {
  id: string;
  spellId: string;
  isPrepared: boolean;
  isAlwaysPrepared: boolean;
  spell: Spell;
}

interface PlayerCharacterPanelProps {
  character: Character;
  onUpdateHp: (hp: number) => void;
  onUseSpellSlot?: (level: number) => void;
  onRestoreSpellSlot?: (level: number) => void;
}

export function PlayerCharacterPanel({ character, onUpdateHp, onUseSpellSlot, onRestoreSpellSlot }: PlayerCharacterPanelProps) {
  const { stats } = character;
  const hpPercentage = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedItemState | null>(null);

  // Spellcasting
  const spellcasting = stats.spellcasting;
  const spellSlots = spellcasting?.spellSlots || DEFAULT_SPELL_SLOTS;

  // Fetch inventory on mount
  useEffect(() => {
    async function fetchInventory() {
      try {
        const res = await fetch(`/api/characters/${character.id}/items`);
        if (res.ok) {
          const data = await res.json();
          setInventory(data.items || []);
        }
      } catch (error) {
        console.error('Error fetching inventory:', error);
      } finally {
        setIsLoadingInventory(false);
      }
    }
    fetchInventory();
  }, [character.id]);

  function getHpColor() {
    if (hpPercentage <= 25) return 'bg-red-500';
    if (hpPercentage <= 50) return 'bg-orange-500';
    return 'bg-green-500';
  }

  function calculateModifier(score: number) {
    return Math.floor((score - 10) / 2);
  }

  function formatModifier(mod: number) {
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  // Collapsed preview shows HP
  const collapsedContent = `HP: ${stats.hp}/${stats.maxHp} | AC: ${stats.ac}`;

  return (
    <CollapsibleCard
      title={character.name}
      icon={<User className="w-5 h-5" />}
      collapsedContent={collapsedContent}
    >
      <p className="text-sm text-gray-500 mb-4">
        Level {character.level} {character.race} {character.class}
      </p>

      {/* HP */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="font-medium">
              {stats.hp} / {stats.maxHp}
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => onUpdateHp(Math.max(0, stats.hp - 1))}
            >
              -1
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => onUpdateHp(Math.min(stats.maxHp, stats.hp + 1))}
            >
              +1
            </Button>
          </div>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getHpColor()}`}
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <Shield className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-xs text-gray-500">AC</p>
            <p className="font-bold">{stats.ac}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <Zap className="w-5 h-5 text-yellow-500" />
          <div>
            <p className="text-xs text-gray-500">Speed</p>
            <p className="font-bold">{stats.speed} ft</p>
          </div>
        </div>
      </div>

      {/* Ability Scores */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Ability Scores</p>
        <div className="grid grid-cols-6 gap-1 text-center">
          {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((ability) => (
            <div
              key={ability}
              className="p-1 bg-gray-50 dark:bg-gray-700/50 rounded"
            >
              <p className="text-xs text-gray-500 uppercase">{ability}</p>
              <p className="font-bold text-sm">{stats[ability]}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {formatModifier(calculateModifier(stats[ability]))}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Spell Slots */}
      {spellcasting && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Spell Slots</p>
          </div>
          <CompactSpellSlots
            spellSlots={spellSlots}
            onUseSlot={onUseSpellSlot}
            onRestoreSlot={onRestoreSpellSlot}
          />
        </div>
      )}

      {/* Inventory */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-indigo-500" />
          <p className="text-sm font-medium text-gray-900 dark:text-white">Inventory</p>
          {!isLoadingInventory && (
            <span className="text-xs text-gray-500">({inventory.length})</span>
          )}
        </div>

        {isLoadingInventory ? (
          <div className="flex justify-center py-3">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : inventory.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">No items</p>
        ) : (
          <div className="space-y-1.5">
            {/* Equipped items first */}
            {inventory.filter(i => i.equipped).length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                  EQUIPPED
                </div>
                {inventory.filter(i => i.equipped).map((invItem) => (
                  <PlayerInventoryItem
                    key={invItem.id}
                    invItem={invItem}
                    onClick={() => setSelectedItem({
                      item: invItem.item,
                      quantity: invItem.quantity,
                      equipped: invItem.equipped,
                      attuned: invItem.attuned,
                    })}
                  />
                ))}
              </div>
            )}

            {/* Non-equipped items */}
            {inventory.filter(i => !i.equipped).length > 0 && (
              <div>
                {inventory.filter(i => i.equipped).length > 0 && (
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    BACKPACK
                  </div>
                )}
                {inventory.filter(i => !i.equipped).map((invItem) => (
                  <PlayerInventoryItem
                    key={invItem.id}
                    invItem={invItem}
                    onClick={() => setSelectedItem({
                      item: invItem.item,
                      quantity: invItem.quantity,
                      equipped: invItem.equipped,
                      attuned: invItem.attuned,
                    })}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem.item}
          quantity={selectedItem.quantity}
          equipped={selectedItem.equipped}
          attuned={selectedItem.attuned}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </CollapsibleCard>
  );
}

function PlayerInventoryItem({ invItem, onClick }: { invItem: InventoryItem; onClick: () => void }) {
  const item = invItem.item;
  const props = (item.properties || {}) as ItemProperties;
  const TypeIcon = getItemTypeIcon(item.type, props.isRanged);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm transition-colors cursor-pointer mb-1 ${
        invItem.equipped
          ? 'bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
          : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <TypeIcon className={`w-4 h-4 flex-shrink-0 ${getItemTypeColor(item.type)}`} />
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {item.name}
          </span>
          {invItem.quantity > 1 && (
            <span className="text-xs text-gray-500">x{invItem.quantity}</span>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
          {item.type === 'weapon' && props.damage && (
            <span className="flex items-center gap-1">
              {props.damageType && (() => {
                const DmgIcon = getDamageTypeIcon(props.damageType);
                return <DmgIcon className={`w-3 h-3 ${getDamageTypeColor(props.damageType)}`} />;
              })()}
              {props.damage}
            </span>
          )}
          {(item.type === 'armor' || item.type === 'shield') && props.acBonus && (
            <span>+{props.acBonus} AC</span>
          )}
          {invItem.attuned && (
            <span className="text-purple-600 dark:text-purple-400">Attuned</span>
          )}
        </div>
      </div>
    </button>
  );
}

// Compact spell slot display for the player panel
function CompactSpellSlots({
  spellSlots,
  onUseSlot,
  onRestoreSlot,
}: {
  spellSlots: SpellSlots;
  onUseSlot?: (level: number) => void;
  onRestoreSlot?: (level: number) => void;
}) {
  const activeSlots = (Object.entries(spellSlots) as [keyof SpellSlots, SpellSlot][])
    .map(([key, slot], index) => ({
      level: index + 1,
      key,
      ...slot,
    }))
    .filter(slot => slot.max > 0);

  if (activeSlots.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-2">No spell slots</p>
    );
  }

  return (
    <div className="space-y-1.5">
      {activeSlots.map((slot) => (
        <div
          key={slot.key}
          className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded"
        >
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-8">
            {slot.level}{getOrdinalSuffix(slot.level)}
          </span>
          <div className="flex-1 flex items-center gap-1">
            {Array.from({ length: slot.max }).map((_, index) => {
              const isUsed = index < slot.used;
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (isUsed) {
                      onRestoreSlot?.(slot.level);
                    } else {
                      onUseSlot?.(slot.level);
                    }
                  }}
                  className={`
                    w-4 h-4 rounded-full border transition-all
                    ${isUsed
                      ? 'bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500'
                      : 'bg-purple-500 border-purple-600'
                    }
                    hover:scale-110 cursor-pointer
                  `}
                  title={isUsed ? 'Restore slot' : 'Use slot'}
                />
              );
            })}
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {slot.max - slot.used}/{slot.max}
          </span>
        </div>
      ))}
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

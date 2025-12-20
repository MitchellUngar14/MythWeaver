'use client';

import { useState, useEffect } from 'react';
import {
  Package, X, Sword, Shield, FlaskConical, Sparkles,
  User, Users, Skull, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getItemTypeIcon, getDamageTypeIcon, getDamageTypeColor, getItemTypeColor } from '@/lib/item-icons';
import type { Item, ItemProperties } from '@/lib/schema';

interface Character {
  id: string;
  name: string;
  items: Array<{
    id: string;
    quantity: number;
    item: Item;
  }>;
}

interface Combatant {
  id: string;
  name: string;
  isNpc: boolean;
  items: Array<{
    id: string;
    quantity: number;
    item: Item;
  }>;
}

interface ItemTransferModalProps {
  sessionId: string;
  onClose: () => void;
  onTransferComplete?: () => void;
}

type SourceType = 'world' | 'character' | 'combatant';

function getRarityColor(rarity: string | null) {
  switch (rarity) {
    case 'common': return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    case 'uncommon': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    case 'rare': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    case 'very_rare': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
    case 'legendary': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
    default: return 'text-gray-500 bg-gray-100 dark:bg-gray-700';
  }
}

export function ItemTransferModal({ sessionId, onClose, onTransferComplete }: ItemTransferModalProps) {
  const [step, setStep] = useState<'source' | 'item' | 'target'>('source');
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data
  const [worldItems, setWorldItems] = useState<Item[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [combatants, setCombatants] = useState<Combatant[]>([]);

  // Selection
  const [sourceType, setSourceType] = useState<SourceType>('world');
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [maxQuantity, setMaxQuantity] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [targetCharacterId, setTargetCharacterId] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTransferData();
  }, [sessionId]);

  async function fetchTransferData() {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/transfer`);
      const data = await res.json();
      if (res.ok) {
        setWorldItems(data.worldItems || []);
        setCharacters(data.characters || []);
        setCombatants(data.combatants || []);
      }
    } catch (err) {
      console.error('Error fetching transfer data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function getAvailableItems(): Array<{ item: Item; quantity: number }> {
    if (sourceType === 'world') {
      return worldItems.map(item => ({ item, quantity: 999 })); // Unlimited from world
    } else if (sourceType === 'character' && sourceId) {
      const character = characters.find(c => c.id === sourceId);
      return character?.items.map(i => ({ item: i.item, quantity: i.quantity })) || [];
    } else if (sourceType === 'combatant' && sourceId) {
      const combatant = combatants.find(c => c.id === sourceId);
      return combatant?.items.map(i => ({ item: i.item, quantity: i.quantity })) || [];
    }
    return [];
  }

  function selectItem(item: Item, qty: number) {
    setSelectedItem(item);
    setMaxQuantity(qty);
    setQuantity(1);
    setStep('target');
  }

  async function handleTransfer() {
    if (!selectedItem || !targetCharacterId) return;
    setIsTransferring(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          sourceId,
          targetCharacterId,
          itemId: selectedItem.id,
          quantity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Transfer failed');
      }

      setSuccess(data.message);
      setTimeout(() => {
        onTransferComplete?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  }

  function resetSelection() {
    setSelectedItem(null);
    setQuantity(1);
    setTargetCharacterId(null);
    setStep('source');
  }

  const filteredItems = getAvailableItems().filter(({ item }) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const eligibleTargets = characters.filter(c => {
    // Don't show source character as target
    if (sourceType === 'character' && c.id === sourceId) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Give Item
            </h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 flex items-center gap-2 text-sm">
          <span className={step === 'source' ? 'text-indigo-600 font-medium' : 'text-gray-500'}>
            1. Source
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className={step === 'item' ? 'text-indigo-600 font-medium' : 'text-gray-500'}>
            2. Item
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className={step === 'target' ? 'text-indigo-600 font-medium' : 'text-gray-500'}>
            3. Target
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}

          {/* Step 1: Select Source */}
          {step === 'source' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Where is the item coming from?
              </p>

              <div className="space-y-2">
                {/* World Inventory */}
                <button
                  onClick={() => {
                    setSourceType('world');
                    setSourceId(null);
                    setStep('item');
                  }}
                  className="w-full p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Package className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">World Inventory</h4>
                      <p className="text-sm text-gray-500">Give any item from your world&apos;s library</p>
                    </div>
                  </div>
                </button>

                {/* Characters */}
                {characters.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-2">From Character</p>
                    {characters.map(char => (
                      <button
                        key={char.id}
                        onClick={() => {
                          setSourceType('character');
                          setSourceId(char.id);
                          setStep('item');
                        }}
                        disabled={char.items.length === 0}
                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors text-left mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-blue-500" />
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">{char.name}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {char.items.length} items
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Combatants */}
                {combatants.filter(c => c.items.length > 0).length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-2">From Enemy/NPC</p>
                    {combatants.filter(c => c.items.length > 0).map(combatant => (
                      <button
                        key={combatant.id}
                        onClick={() => {
                          setSourceType('combatant');
                          setSourceId(combatant.id);
                          setStep('item');
                        }}
                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors text-left mb-2"
                      >
                        <div className="flex items-center gap-3">
                          {combatant.isNpc ? (
                            <Users className="w-5 h-5 text-green-500" />
                          ) : (
                            <Skull className="w-5 h-5 text-red-500" />
                          )}
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">{combatant.name}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {combatant.items.length} items
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Select Item */}
          {step === 'item' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select an item to give
                </p>
                <Button variant="ghost" size="sm" onClick={() => setStep('source')}>
                  Back
                </Button>
              </div>

              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No items available</p>
                ) : (
                  filteredItems.map(({ item, quantity: qty }) => {
                    const props = (item.properties || {}) as ItemProperties;
                    const TypeIcon = getItemTypeIcon(item.type, props.isRanged);

                    return (
                      <button
                        key={item.id}
                        onClick={() => selectItem(item, qty)}
                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors text-left"
                      >
                        <div className="flex items-start gap-2">
                          <TypeIcon className={`w-5 h-5 mt-0.5 ${getItemTypeColor(item.type)}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${getRarityColor(item.rarity)}`}>
                                {item.rarity || 'Common'}
                              </span>
                              {sourceType !== 'world' && (
                                <span className="text-xs text-gray-500">x{qty}</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              {item.type === 'weapon' && props.damage && (
                                <>
                                  {props.damageType && (() => {
                                    const DmgIcon = getDamageTypeIcon(props.damageType);
                                    return <DmgIcon className={`w-3 h-3 ${getDamageTypeColor(props.damageType)}`} />;
                                  })()}
                                  <span>
                                    {props.damage}
                                    {props.damageType && (
                                      <span className={`ml-1 ${getDamageTypeColor(props.damageType)}`}>
                                        {props.damageType}
                                      </span>
                                    )}
                                  </span>
                                </>
                              )}
                              {(item.type === 'armor' || item.type === 'shield') && props.acBonus && (
                                <span>AC +{props.acBonus}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Step 3: Select Target */}
          {step === 'target' && selectedItem && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Who receives the item?
                </p>
                <Button variant="ghost" size="sm" onClick={() => setStep('item')}>
                  Back
                </Button>
              </div>

              {/* Selected Item Summary */}
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-2">
                  {(() => {
                    const props = (selectedItem.properties || {}) as ItemProperties;
                    const TypeIcon = getItemTypeIcon(selectedItem.type, props.isRanged);
                    return <TypeIcon className={`w-5 h-5 ${getItemTypeColor(selectedItem.type)}`} />;
                  })()}
                  <span className="font-medium text-indigo-900 dark:text-indigo-100">
                    {selectedItem.name}
                  </span>
                </div>
                {sourceType !== 'world' && (
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Quantity:</label>
                    <Input
                      type="number"
                      min={1}
                      max={maxQuantity}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-20"
                    />
                    <span className="text-xs text-gray-500">(max {maxQuantity})</span>
                  </div>
                )}
              </div>

              {/* Target Selection */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {eligibleTargets.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No characters available</p>
                ) : (
                  eligibleTargets.map(char => (
                    <button
                      key={char.id}
                      onClick={() => setTargetCharacterId(char.id)}
                      className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                        targetCharacterId === char.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-blue-500" />
                        <span className="font-medium text-gray-900 dark:text-white">{char.name}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <Button variant="outline" onClick={step === 'source' ? onClose : resetSelection}>
            {step === 'source' ? 'Cancel' : 'Start Over'}
          </Button>
          {step === 'target' && (
            <Button
              onClick={handleTransfer}
              disabled={!targetCharacterId || isTransferring}
              isLoading={isTransferring}
            >
              Give Item
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

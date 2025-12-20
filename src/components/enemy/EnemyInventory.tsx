'use client';

import { useState, useEffect } from 'react';
import {
  Package, Plus, Trash2, Sword, Shield, FlaskConical,
  Sparkles, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { getItemTypeIcon, getDamageTypeIcon, getDamageTypeColor, getItemTypeColor } from '@/lib/item-icons';
import type { Item, EnemyItem, ItemProperties } from '@/lib/schema';

interface EnemyInventoryProps {
  templateId: string;
  worldId: string | null;
}

interface InventoryItemWithItem extends EnemyItem {
  item: Item;
}

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

function formatRarity(rarity: string | null) {
  if (!rarity) return 'Common';
  return rarity.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function EnemyInventory({ templateId, worldId }: EnemyInventoryProps) {
  const [inventory, setInventory] = useState<InventoryItemWithItem[]>([]);
  const [worldItems, setWorldItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [templateId]);

  useEffect(() => {
    if (showAddModal && worldId) {
      fetchWorldItems();
    }
  }, [showAddModal, worldId]);

  async function fetchInventory() {
    try {
      const res = await fetch(`/api/enemies/${templateId}/items`);
      const data = await res.json();
      if (res.ok) {
        setInventory(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchWorldItems() {
    if (!worldId) return;
    try {
      const res = await fetch(`/api/items?worldId=${worldId}`);
      const data = await res.json();
      if (res.ok) {
        setWorldItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching world items:', error);
    }
  }

  async function handleAddItem() {
    if (!selectedItemId) return;
    setIsAdding(true);

    try {
      const res = await fetch(`/api/enemies/${templateId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItemId,
          quantity: addQuantity,
        }),
      });

      if (res.ok) {
        await fetchInventory();
        setShowAddModal(false);
        setSelectedItemId(null);
        setAddQuantity(1);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemoveItem(enemyItemId: string) {
    if (!confirm('Remove this item from inventory?')) return;

    try {
      const res = await fetch(`/api/enemies/${templateId}/items?enemyItemId=${enemyItemId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setInventory(inventory.filter(i => i.id !== enemyItemId));
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  }

  async function handleUpdateQuantity(enemyItemId: string, quantity: number) {
    if (quantity <= 0) {
      handleRemoveItem(enemyItemId);
      return;
    }

    try {
      const res = await fetch(`/api/enemies/${templateId}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enemyItemId, quantity }),
      });

      if (res.ok) {
        setInventory(inventory.map(i =>
          i.id === enemyItemId ? { ...i, quantity } : i
        ));
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  }

  async function handleToggleEquipped(enemyItemId: string, currentlyEquipped: boolean) {
    try {
      const res = await fetch(`/api/enemies/${templateId}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enemyItemId, equipped: !currentlyEquipped }),
      });

      if (res.ok) {
        setInventory(inventory.map(i =>
          i.id === enemyItemId ? { ...i, equipped: !currentlyEquipped } : i
        ));
      }
    } catch (error) {
      console.error('Error toggling equipped:', error);
    }
  }

  const filteredWorldItems = worldItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (!worldId) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <div>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>Assign a world to manage inventory</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            Select a world to add items to this enemy&apos;s inventory.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <div>
                <CardTitle>Inventory</CardTitle>
                <CardDescription>Lootable items</CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {inventory.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No items in inventory
            </p>
          ) : (
            <div className="space-y-3">
              {inventory.map((invItem) => {
                const item = invItem.item;
                const props = (item.properties || {}) as ItemProperties;
                const TypeIcon = getItemTypeIcon(item.type, props.isRanged);

                return (
                  <div
                    key={invItem.id}
                    className={`p-3 rounded-lg border ${
                      invItem.equipped
                        ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <TypeIcon className={`w-5 h-5 mt-0.5 ${getItemTypeColor(item.type)}`} />
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {item.name}
                            {invItem.quantity > 1 && (
                              <span className="ml-1 text-gray-500">x{invItem.quantity}</span>
                            )}
                          </h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getRarityColor(item.rarity)}`}>
                              {formatRarity(item.rarity)}
                            </span>
                            {invItem.equipped && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
                                Equipped
                              </span>
                            )}
                          </div>

                          {/* Item Stats */}
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                            {item.type === 'weapon' && props.damage && (
                              <div className="flex items-center gap-1">
                                {props.damageType && (() => {
                                  const DmgIcon = getDamageTypeIcon(props.damageType);
                                  return <DmgIcon className={`w-3 h-3 ${getDamageTypeColor(props.damageType)}`} />;
                                })()}
                                <span>
                                  {props.damage}
                                  {props.attackBonus ? ` (+${props.attackBonus})` : ''}
                                  {props.damageType && (
                                    <span className={`ml-1 ${getDamageTypeColor(props.damageType)}`}>
                                      {props.damageType}
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                            {(item.type === 'armor' || item.type === 'shield') && props.acBonus && (
                              <div>AC: +{props.acBonus}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {(item.type === 'weapon' || item.type === 'armor' || item.type === 'shield') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleEquipped(invItem.id, invItem.equipped ?? false)}
                            title={invItem.equipped ? 'Unequip' : 'Equip'}
                            className={invItem.equipped ? 'text-indigo-600' : 'text-gray-400'}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <input
                          type="number"
                          min={0}
                          value={invItem.quantity}
                          onChange={(e) => handleUpdateQuantity(invItem.id, parseInt(e.target.value) || 0)}
                          className="w-14 px-2 py-1 text-center text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(invItem.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Item</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4">
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4"
              />

              <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                {filteredWorldItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    {worldItems.length === 0 ? 'No items in this world yet' : 'No items match your search'}
                  </p>
                ) : (
                  filteredWorldItems.map((item) => {
                    const props = (item.properties || {}) as ItemProperties;
                    const TypeIcon = getItemTypeIcon(item.type, props.isRanged);
                    const isSelected = selectedItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <TypeIcon className={`w-4 h-4 mt-0.5 ${getItemTypeColor(item.type)}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {item.name}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${getRarityColor(item.rarity)}`}>
                                {formatRarity(item.rarity)}
                              </span>
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
                              {item.type === 'consumable' && props.effect && (
                                <span className="truncate">{props.effect}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {selectedItemId && (
                <div className="flex items-center gap-4 mb-4">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Quantity:</label>
                  <Input
                    type="number"
                    min={1}
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddItem}
                disabled={!selectedItemId || isAdding}
                isLoading={isAdding}
              >
                Add to Inventory
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

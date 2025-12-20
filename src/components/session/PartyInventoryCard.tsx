'use client';

import { useState, useEffect } from 'react';
import { Users, Package, ChevronDown, ChevronUp, Loader2, Backpack, Swords } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { getItemTypeIcon, getItemTypeColor, getDamageTypeIcon, getDamageTypeColor } from '@/lib/item-icons';
import { ItemDetailModal } from './ItemDetailModal';
import type { Item, ItemProperties } from '@/lib/schema';
import type { CombatantState } from '@/stores/sessionStore';

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

interface CharacterWithInventory {
  id: string;
  name: string;
  class: string | null;
  level: number;
  inventory: InventoryItem[];
  isLoading: boolean;
  isLoaded: boolean;
  isInCombat: boolean; // Track if character is in combat
  isOnline: boolean; // Track if player is online in session
}

interface PartyInventoryCardProps {
  participants: Array<{
    id: string;
    oduserId: string;
    userName: string;
    odcharacterId: string | null;
    characterName: string | null;
    isOnline: boolean;
  }>;
  sessionId: string;
  combatants?: CombatantState[]; // Optional combatants to include characters from combat
}

export function PartyInventoryCard({ participants, sessionId, combatants = [] }: PartyInventoryCardProps) {
  const [characters, setCharacters] = useState<CharacterWithInventory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedItemState | null>(null);

  // Get characters with their basic info - from both participants AND combat
  useEffect(() => {
    async function fetchCharacters() {
      // Build a map of character IDs to avoid duplicates
      const characterMap = new Map<string, {
        characterId: string;
        characterName: string | null;
        isOnline: boolean;
        isInCombat: boolean;
      }>();

      // Add characters from participants
      for (const p of participants) {
        if (p.odcharacterId) {
          characterMap.set(p.odcharacterId, {
            characterId: p.odcharacterId,
            characterName: p.characterName,
            isOnline: p.isOnline,
            isInCombat: false,
          });
        }
      }

      // Add characters from combat (may update existing or add new)
      for (const c of combatants) {
        if (c.characterId && c.type === 'character') {
          const existing = characterMap.get(c.characterId);
          if (existing) {
            // Update existing to mark as in combat
            existing.isInCombat = true;
          } else {
            // Add new character from combat (player not in session)
            characterMap.set(c.characterId, {
              characterId: c.characterId,
              characterName: c.name,
              isOnline: false,
              isInCombat: true,
            });
          }
        }
      }

      if (characterMap.size === 0) {
        setIsInitialLoading(false);
        return;
      }

      // Fetch basic character info for each
      const charData: CharacterWithInventory[] = [];

      for (const [characterId, info] of characterMap) {
        try {
          const res = await fetch(`/api/characters/${characterId}`);
          if (res.ok) {
            const data = await res.json();
            charData.push({
              id: characterId,
              name: info.characterName || data.character.name || 'Unknown',
              class: data.character.class,
              level: data.character.level || 1,
              inventory: [],
              isLoading: false,
              isLoaded: false,
              isInCombat: info.isInCombat,
              isOnline: info.isOnline,
            });
          }
        } catch (error) {
          console.error('Error fetching character:', error);
        }
      }

      // Sort: in combat first, then by name
      charData.sort((a, b) => {
        if (a.isInCombat !== b.isInCombat) return a.isInCombat ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setCharacters(charData);
      setIsInitialLoading(false);
    }

    fetchCharacters();
  }, [participants, combatants]);

  // Fetch inventory when a character is expanded
  async function fetchInventory(characterId: string) {
    const char = characters.find(c => c.id === characterId);
    if (!char || char.isLoaded) return;

    setCharacters(prev => prev.map(c =>
      c.id === characterId ? { ...c, isLoading: true } : c
    ));

    try {
      const res = await fetch(`/api/characters/${characterId}/items`);
      if (res.ok) {
        const data = await res.json();
        setCharacters(prev => prev.map(c =>
          c.id === characterId
            ? { ...c, inventory: data.items || [], isLoading: false, isLoaded: true }
            : c
        ));
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setCharacters(prev => prev.map(c =>
        c.id === characterId ? { ...c, isLoading: false, isLoaded: true } : c
      ));
    }
  }

  function handleToggle(characterId: string) {
    if (expandedId === characterId) {
      setExpandedId(null);
    } else {
      setExpandedId(characterId);
      fetchInventory(characterId);
    }
  }

  const playersWithCharacters = characters.length;

  return (
    <CollapsibleCard
      title="Party Inventory"
      icon={<Backpack className="w-5 h-5" />}
      badge={`${playersWithCharacters} characters`}
      defaultCollapsed={true}
    >
      {isInitialLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : characters.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-4">
          No characters in session
        </p>
      ) : (
        <div className="space-y-2">
          {characters.map((char) => (
            <div
              key={char.id}
              className={`rounded-lg overflow-hidden ${
                char.isInCombat
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                  : 'bg-gray-50 dark:bg-gray-700/50'
              }`}
            >
              <button
                onClick={() => handleToggle(char.id)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {char.isInCombat ? (
                    <Swords className="w-4 h-4 text-indigo-500" />
                  ) : (
                    <Package className="w-4 h-4 text-gray-400" />
                  )}
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        {char.name}
                      </span>
                      {/* Online/Offline indicator */}
                      <span
                        className={`w-2 h-2 rounded-full ${
                          char.isOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        title={char.isOnline ? 'Online' : 'Offline'}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {char.class && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Lvl {char.level} {char.class}
                        </span>
                      )}
                      {char.isInCombat && (
                        <span className="text-[10px] px-1 py-0.5 bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 rounded">
                          In Combat
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {char.isLoaded && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {char.inventory.length} items
                    </span>
                  )}
                  {expandedId === char.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedId === char.id && (
                <div className="px-3 pb-3">
                  {char.isLoading ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  ) : char.inventory.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">No items</p>
                  ) : (
                    <div className="space-y-1">
                      {/* Equipped items first */}
                      {char.inventory.filter(i => i.equipped).length > 0 && (
                        <div className="mb-2">
                          <div className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                            EQUIPPED
                          </div>
                          {char.inventory.filter(i => i.equipped).map((invItem) => (
                            <InventoryItemRow
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
                      {char.inventory.filter(i => !i.equipped).length > 0 && (
                        <div>
                          {char.inventory.filter(i => i.equipped).length > 0 && (
                            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                              INVENTORY
                            </div>
                          )}
                          {char.inventory.filter(i => !i.equipped).map((invItem) => (
                            <InventoryItemRow
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
              )}
            </div>
          ))}
        </div>
      )}

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

function InventoryItemRow({ invItem, onClick }: { invItem: InventoryItem; onClick?: () => void }) {
  const item = invItem.item;
  const props = (item.properties || {}) as ItemProperties;
  const TypeIcon = getItemTypeIcon(item.type, props.isRanged);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 p-1.5 rounded text-xs transition-colors cursor-pointer ${
        invItem.equipped
          ? 'bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
          : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500'
      }`}
    >
      <TypeIcon className={`w-3 h-3 flex-shrink-0 ${getItemTypeColor(item.type)}`} />
      <span className="flex-1 text-left text-gray-900 dark:text-white truncate">
        {item.name}
        {invItem.quantity > 1 && (
          <span className="ml-1 text-gray-500">x{invItem.quantity}</span>
        )}
      </span>
      {invItem.attuned && (
        <span className="text-[10px] px-1 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded flex-shrink-0">
          Attuned
        </span>
      )}
      {item.type === 'weapon' && props.damage && (
        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 flex-shrink-0">
          {props.damageType && (() => {
            const DmgIcon = getDamageTypeIcon(props.damageType);
            return <DmgIcon className={`w-3 h-3 ${getDamageTypeColor(props.damageType)}`} />;
          })()}
          {props.damage}
        </span>
      )}
      {(item.type === 'armor' || item.type === 'shield') && props.acBonus && (
        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">
          +{props.acBonus} AC
        </span>
      )}
    </button>
  );
}

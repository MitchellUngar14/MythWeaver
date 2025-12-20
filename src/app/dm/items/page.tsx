'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Plus, Sword, Shield, FlaskConical, Sparkles, Package, Target, ShieldCheck,
  Search, ChevronLeft, Trash2, Edit, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getItemTypeIcon, getDamageTypeIcon, getDamageTypeColor, getItemTypeColor } from '@/lib/item-icons';
import type { Item, World, ItemProperties } from '@/lib/schema';

const ITEM_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'weapon', label: 'Weapons', icon: Sword },
  { value: 'armor', label: 'Armor', icon: ShieldCheck },
  { value: 'shield', label: 'Shields', icon: Shield },
  { value: 'consumable', label: 'Consumables', icon: FlaskConical },
  { value: 'wondrous', label: 'Wondrous', icon: Sparkles },
  { value: 'misc', label: 'Miscellaneous', icon: Package },
];

const RARITIES = [
  { value: 'all', label: 'All Rarities' },
  { value: 'common', label: 'Common', color: 'text-gray-600' },
  { value: 'uncommon', label: 'Uncommon', color: 'text-green-600' },
  { value: 'rare', label: 'Rare', color: 'text-blue-600' },
  { value: 'very_rare', label: 'Very Rare', color: 'text-purple-600' },
  { value: 'legendary', label: 'Legendary', color: 'text-orange-600' },
];

function getTypeIconWithRanged(type: string, isRanged?: boolean) {
  return getItemTypeIcon(type, isRanged);
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

export default function ItemsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [items, setItems] = useState<(Item & { world: World })[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [selectedWorld, setSelectedWorld] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch worlds
  useEffect(() => {
    async function fetchWorlds() {
      try {
        const res = await fetch('/api/worlds');
        const data = await res.json();
        if (res.ok) {
          setWorlds(data.worlds || []);
          if (data.worlds?.length > 0 && !selectedWorld) {
            setSelectedWorld(data.worlds[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching worlds:', error);
      }
    }
    if (session?.user?.isDm) {
      fetchWorlds();
    }
  }, [session]);

  // Fetch items when world changes
  useEffect(() => {
    async function fetchItems() {
      if (!selectedWorld) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/items?worldId=${selectedWorld}`);
        const data = await res.json();
        if (res.ok) {
          setItems(data.items || []);
        }
      } catch (error) {
        console.error('Error fetching items:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchItems();
  }, [selectedWorld]);

  async function handleDelete(itemId: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(items.filter(i => i.id !== itemId));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  }

  // Filter items
  const filteredItems = items.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (rarityFilter !== 'all' && item.rarity !== rarityFilter) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (status === 'loading' || !session?.user?.isDm) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Item Library</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage items for your worlds</p>
            </div>
          </div>
          <Link href="/dm/items/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Item
            </Button>
          </Link>
        </div>

        {/* World Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select World
          </label>
          <select
            value={selectedWorld}
            onChange={(e) => setSelectedWorld(e.target.value)}
            className="w-full max-w-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {worlds.length === 0 ? (
              <option value="">No worlds available</option>
            ) : (
              worlds.map(world => (
                <option key={world.id} value={world.id}>{world.name}</option>
              ))
            )}
          </select>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {ITEM_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {RARITIES.map(rarity => (
              <option key={rarity.value} value={rarity.value}>{rarity.label}</option>
            ))}
          </select>
        </div>

        {/* Items Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {items.length === 0 ? 'No items yet. Create your first item!' : 'No items match your filters.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const props = (item.properties || {}) as ItemProperties;
              const TypeIcon = getTypeIconWithRanged(item.type, props.isRanged);

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TypeIcon className={`w-5 h-5 ${getItemTypeColor(item.type)}`} />
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {item.name}
                      </h3>
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/dm/items/${item.id}`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded capitalize bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      {item.type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getRarityColor(item.rarity)}`}>
                      {formatRarity(item.rarity)}
                    </span>
                    {item.requiresAttunement && (
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                        Attunement
                      </span>
                    )}
                  </div>

                  {/* Item Stats Summary */}
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {item.type === 'weapon' && props.damage && (
                      <div className="flex items-center gap-2">
                        {props.damageType ? (
                          (() => {
                            const DmgIcon = getDamageTypeIcon(props.damageType);
                            return <DmgIcon className={`w-3 h-3 ${getDamageTypeColor(props.damageType)}`} />;
                          })()
                        ) : (
                          <Sword className="w-3 h-3" />
                        )}
                        <span>
                          {props.damage}
                          {props.attackBonus ? ` (+${props.attackBonus})` : ''}
                          {props.damageType && (
                            <span className={`ml-1 ${getDamageTypeColor(props.damageType)}`}>
                              {props.damageType}
                            </span>
                          )}
                        </span>
                        {props.isRanged && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-1 rounded">
                            Ranged
                          </span>
                        )}
                      </div>
                    )}
                    {(item.type === 'armor' || item.type === 'shield') && props.acBonus && (
                      <div className="flex items-center gap-2">
                        {item.type === 'armor' ? (
                          <ShieldCheck className="w-3 h-3 text-blue-500" />
                        ) : (
                          <Shield className="w-3 h-3 text-blue-400" />
                        )}
                        <span>AC +{props.acBonus}</span>
                      </div>
                    )}
                    {item.type === 'consumable' && props.effect && (
                      <div className="flex items-center gap-2">
                        <Heart className="w-3 h-3" />
                        <span className="truncate">{props.effect}</span>
                      </div>
                    )}
                  </div>

                  {item.description && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-500 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {item.value && (
                    <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      {item.value >= 100 ? `${Math.floor(item.value / 100)} gp` : `${item.value} cp`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

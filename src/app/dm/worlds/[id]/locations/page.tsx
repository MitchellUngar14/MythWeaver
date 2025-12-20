'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, MapPin, ChevronRight, ChevronDown, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface Location {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  isPlayerVisible: boolean;
  children?: Location[];
}

interface World {
  id: string;
  name: string;
}

export default function LocationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: worldId } = use(params);
  const router = useRouter();
  const [world, setWorld] = useState<World | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParentId, setFormParentId] = useState<string>('');
  const [formIsPlayerVisible, setFormIsPlayerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expanded state for tree view
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, [worldId]);

  async function fetchData() {
    setIsLoading(true);
    try {
      // Fetch world info
      const worldRes = await fetch(`/api/worlds/${worldId}`);
      const worldData = await worldRes.json();
      if (!worldRes.ok) {
        setError('World not found');
        return;
      }
      setWorld(worldData.world);

      // Fetch locations
      const locRes = await fetch(`/api/worlds/${worldId}/resources?type=location`);
      const locData = await locRes.json();
      if (locRes.ok) {
        setLocations(locData.resources || []);
        // Expand all by default
        const allIds = new Set<string>((locData.resources || []).map((l: Location) => l.id));
        setExpanded(allIds);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  // Build hierarchical tree from flat list
  function buildTree(items: Location[]): Location[] {
    const map = new Map<string, Location>();
    const roots: Location[] = [];

    // First pass: create map
    items.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });

    // Second pass: build tree
    items.forEach(item => {
      const node = map.get(item.id)!;
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort by name
    const sortByName = (a: Location, b: Location) => a.name.localeCompare(b.name);
    roots.sort(sortByName);
    map.forEach(node => node.children?.sort(sortByName));

    return roots;
  }

  function toggleExpand(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpanded(next);
  }

  function startCreate(parentId?: string) {
    setEditingId(null);
    setFormName('');
    setFormDescription('');
    setFormParentId(parentId || '');
    setFormIsPlayerVisible(false);
    setShowForm(true);
  }

  function startEdit(location: Location) {
    setEditingId(location.id);
    setFormName(location.name);
    setFormDescription(location.description || '');
    setFormParentId(location.parentId || '');
    setFormIsPlayerVisible(location.isPlayerVisible);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setFormName('');
    setFormDescription('');
    setFormParentId('');
    setFormIsPlayerVisible(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      if (editingId) {
        // Update existing
        const res = await fetch(`/api/worlds/${worldId}/resources/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || null,
            parentId: formParentId || null,
            isPlayerVisible: formIsPlayerVisible,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to update location');
          return;
        }
      } else {
        // Create new
        const res = await fetch(`/api/worlds/${worldId}/resources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'location',
            name: formName.trim(),
            description: formDescription.trim() || null,
            parentId: formParentId || null,
            isPlayerVisible: formIsPlayerVisible,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to create location');
          return;
        }
      }

      cancelForm();
      fetchData();
    } catch {
      setError('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(location: Location) {
    if (!confirm(`Delete "${location.name}"? Any sub-locations will become top-level locations.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/worlds/${worldId}/resources/${location.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete location');
        return;
      }

      fetchData();
    } catch {
      setError('Failed to delete location');
    }
  }

  // Get flat list of locations for parent dropdown (excluding current and its children)
  function getParentOptions(excludeId?: string): Location[] {
    if (!excludeId) return locations;

    // Get all descendant IDs to exclude
    const excludeIds = new Set<string>([excludeId]);
    function collectDescendants(parentId: string) {
      locations.forEach(loc => {
        if (loc.parentId === parentId && !excludeIds.has(loc.id)) {
          excludeIds.add(loc.id);
          collectDescendants(loc.id);
        }
      });
    }
    collectDescendants(excludeId);

    return locations.filter(loc => !excludeIds.has(loc.id));
  }

  // Get full path for a location
  function getPath(locationId: string): string {
    const parts: string[] = [];
    let current = locations.find(l => l.id === locationId);
    while (current) {
      parts.unshift(current.name);
      current = current.parentId ? locations.find(l => l.id === current!.parentId) : undefined;
    }
    return parts.join(' > ');
  }

  function renderLocationNode(location: Location, depth: number = 0) {
    const hasChildren = location.children && location.children.length > 0;
    const isExpanded = expanded.has(location.id);

    return (
      <div key={location.id}>
        <div
          className={`flex items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 ${
            depth > 0 ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700' : ''
          }`}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(location.id)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {location.name}
              </span>
              <span title={location.isPlayerVisible ? "Visible to players" : "Hidden from players"}>
                {location.isPlayerVisible ? (
                  <Eye className="w-3 h-3 text-green-500" />
                ) : (
                  <EyeOff className="w-3 h-3 text-gray-400" />
                )}
              </span>
            </div>
            {location.description && (
              <p className="text-sm text-gray-500 truncate">{location.description}</p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startCreate(location.id)}
              title="Add sub-location"
              className="h-8 w-8 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEdit(location)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(location)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {location.children!.map(child => renderLocationNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!world) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'World not found'}</p>
          <Link href="/dm/worlds" className="text-indigo-600 hover:underline">
            Back to Worlds
          </Link>
        </div>
      </div>
    );
  }

  const tree = buildTree(locations);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/dm/worlds/${worldId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Locations</h1>
            <p className="text-gray-600 dark:text-gray-400">{world.name}</p>
          </div>
          <Button onClick={() => startCreate()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        </div>

        {error && (
          <div className="p-3 mb-6 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
            {error}
          </div>
        )}

        {/* Create/Edit Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Location' : 'New Location'}</CardTitle>
              <CardDescription>
                {editingId ? 'Update this location' : 'Create a new location in your world'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  id="name"
                  label="Name"
                  placeholder="e.g., Bludhaven, The Rusty Dragon Inn"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  autoFocus
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Parent Location (optional)
                  </label>
                  <select
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  >
                    <option value="">None (top-level location)</option>
                    {getParentOptions(editingId || undefined).map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {getPath(loc.id)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    placeholder="A brief description of this location..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPlayerVisible}
                    onChange={(e) => setFormIsPlayerVisible(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Visible to players
                  </span>
                </label>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={cancelForm} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" isLoading={isSubmitting}>
                    {editingId ? 'Save Changes' : 'Create Location'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Locations Tree */}
        <Card>
          <CardContent className="p-4">
            {tree.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No locations yet</p>
                <Button onClick={() => startCreate()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Location
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {tree.map(location => renderLocationNode(location))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

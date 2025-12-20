'use client';

import { useState, useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationResource {
  id: string;
  name: string;
  description: string | null;
}

interface SessionLocationSelectorProps {
  worldId: string;
  sessionId: string;
  currentLocation: string | null;
  currentLocationResourceId: string | null;
  isDm: boolean;
  onLocationChange: (location: string | null, resourceId: string | null) => void;
}

export function SessionLocationSelector({
  worldId,
  sessionId,
  currentLocation,
  currentLocationResourceId,
  isDm,
  onLocationChange,
}: SessionLocationSelectorProps) {
  const [locations, setLocations] = useState<LocationResource[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [customLocation, setCustomLocation] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (worldId) {
      fetchLocations();
    }
  }, [worldId]);

  async function fetchLocations() {
    try {
      const res = await fetch(`/api/worlds/${worldId}/resources?type=location`);
      const data = await res.json();
      if (res.ok) {
        setLocations(data.resources || []);
      }
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  }

  async function updateLocation(location: string | null, resourceId: string | null) {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentLocation: location,
          currentLocationResourceId: resourceId,
        }),
      });

      if (res.ok) {
        onLocationChange(location, resourceId);
      }
    } catch (err) {
      console.error('Failed to update location:', err);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
      setShowCustomInput(false);
    }
  }

  function handleSelectLocation(locationId: string) {
    if (locationId === '__custom__') {
      setShowCustomInput(true);
      return;
    }

    if (locationId === '__clear__') {
      updateLocation(null, null);
      return;
    }

    const loc = locations.find(l => l.id === locationId);
    if (loc) {
      updateLocation(loc.name, loc.id);
    }
  }

  function handleCustomLocationSubmit() {
    if (customLocation.trim()) {
      updateLocation(customLocation.trim(), null);
      setCustomLocation('');
    }
  }

  // Get display name for current location
  function getDisplayLocation(): string {
    if (currentLocationResourceId) {
      const loc = locations.find(l => l.id === currentLocationResourceId);
      if (loc) return loc.name;
    }
    if (currentLocation) return currentLocation;
    return 'No location set';
  }

  const displayLocation = getDisplayLocation();
  const hasLocation = currentLocation || currentLocationResourceId;

  // Read-only view for players
  if (!isDm) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
        <MapPin className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {hasLocation ? displayLocation : 'No location set'}
        </span>
      </div>
    );
  }

  // DM view with dropdown
  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`flex items-center gap-2 ${hasLocation ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : ''}`}
      >
        <MapPin className={`w-4 h-4 ${hasLocation ? 'text-amber-600' : 'text-gray-400'}`} />
        <span className={hasLocation ? 'text-amber-800 dark:text-amber-200' : ''}>
          {isUpdating ? 'Updating...' : displayLocation}
        </span>
        <ChevronDown className="w-4 h-4 ml-1" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setShowCustomInput(false);
            }}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            {showCustomInput ? (
              <div className="p-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Location
                </label>
                <input
                  type="text"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  placeholder="Enter location name..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 mb-2"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCustomLocationSubmit();
                    if (e.key === 'Escape') setShowCustomInput(false);
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCustomInput(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCustomLocationSubmit}
                    className="flex-1"
                    disabled={!customLocation.trim()}
                  >
                    Set
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-1 max-h-64 overflow-y-auto">
                {/* Clear option */}
                {hasLocation && (
                  <button
                    onClick={() => handleSelectLocation('__clear__')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Clear location
                  </button>
                )}

                {/* Separator */}
                {hasLocation && locations.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                )}

                {/* World locations */}
                {locations.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 text-xs font-medium text-gray-500 uppercase">
                      World Locations
                    </div>
                    {locations.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => handleSelectLocation(loc.id)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          currentLocationResourceId === loc.id
                            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {loc.name}
                        </div>
                        {loc.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {loc.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </>
                )}

                {/* Custom option */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  onClick={() => handleSelectLocation('__custom__')}
                  className="w-full px-4 py-2 text-left text-sm text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  + Custom location...
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

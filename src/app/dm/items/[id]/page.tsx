'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ItemForm, type ItemFormData } from '@/components/items/ItemForm';
import { AIAssistant } from '@/components/dm/AIAssistant';
import type { Item, ItemProperties } from '@/lib/schema';

const ITEM_QUICK_PROMPTS = [
  { label: 'Improve Stats', prompt: 'Suggest how I could improve or balance this item\'s stats to make it more interesting.' },
  { label: 'Add Properties', prompt: 'What additional weapon properties or special abilities could make this item unique?' },
  { label: 'Describe Effect', prompt: 'Help me write a compelling description for this item\'s magical effect.' },
  { label: 'Balance Check', prompt: 'Is this item balanced for its rarity level? What adjustments would you recommend?' },
];

export default function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchItem() {
      try {
        const res = await fetch(`/api/items/${id}`);
        const data = await res.json();
        if (res.ok && data.item) {
          setItem(data.item);
        } else {
          setError('Item not found');
        }
      } catch (err) {
        console.error('Error fetching item:', err);
        setError('Failed to load item');
      } finally {
        setIsLoading(false);
      }
    }
    if (session?.user?.isDm) {
      fetchItem();
    }
  }, [id, session]);

  async function handleSubmit(data: ItemFormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          weight: data.weight ? Math.round(data.weight * 10) : null, // Convert to tenths
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to update item');
      }

      router.push('/dm/items');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session?.user?.isDm || !item) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Item not found'}</p>
          <Link href="/dm/items">
            <Button>Back to Items</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Convert item data to form format
  const initialData: Partial<ItemFormData> = {
    name: item.name,
    description: item.description || '',
    type: item.type,
    rarity: item.rarity || '',
    weight: item.weight ? item.weight / 10 : null, // Convert from tenths
    value: item.value,
    requiresAttunement: item.requiresAttunement || false,
    properties: (item.properties as ItemProperties) || {},
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dm/items">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Items
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Item</h1>
            <p className="text-gray-600 dark:text-gray-400">{item.name}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <ItemForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dm/items')}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* AI Assistant */}
      <AIAssistant
        context={`I'm editing a D&D 5e item called "${item.name}" (${item.type}, ${item.rarity || 'common'}). Help me with stats, properties, and balance.`}
        quickPrompts={ITEM_QUICK_PROMPTS}
        title="Item Editor AI"
        placeholder="Ask about this item..."
        emptyStateText="Need help with this item? Ask me!"
      />
    </div>
  );
}

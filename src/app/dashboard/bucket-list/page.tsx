'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import {
  addBucketItem,
  deleteBucketItem,
  getBucketItems,
  setBucketItemCompleted,
  setBucketItemFavorite,
} from '@/actions/bucket-list';

type BucketItem = {
  id: string;
  createdBy: string;
  text: string;
  isCompleted: boolean;
  completedBy: string;
  completedAt: string;
  isFavorite: boolean;
  createdAt: string;
};

export default function BucketListPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<BucketItem[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadItems = async (uid: string) => {
    const result = await getBucketItems(uid);
    if (!result.success) {
      setError(result.error || 'Could not load bucket list.');
      return;
    }

    setItems((result.items || []) as BucketItem[]);
    setError('');
  };

  useEffect(() => {
    async function init() {
      const auth = await getCurrentProfile();
      if (!auth.success || !auth.userId || !auth.profile) {
        router.push('/');
        return;
      }

      if (!auth.profile.partner_id) {
        router.push('/pair');
        return;
      }

      setUserId(auth.userId);
      await loadItems(auth.userId);
      setLoading(false);
    }

    init();
  }, [router]);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim() || !userId) return;

    setSaving(true);
    const result = await addBucketItem(userId, text);
    setSaving(false);

    if (!result.success) {
      setError(result.error || 'Could not add item.');
      return;
    }

    setText('');
    await loadItems(userId);
  };

  const toggleCompleted = async (item: BucketItem) => {
    if (!userId) return;
    const result = await setBucketItemCompleted(userId, item.id, !item.isCompleted);
    if (!result.success) {
      setError(result.error || 'Could not update item.');
      return;
    }
    await loadItems(userId);
  };

  const toggleFavorite = async (item: BucketItem) => {
    if (!userId) return;
    const result = await setBucketItemFavorite(userId, item.id, !item.isFavorite);
    if (!result.success) {
      setError(result.error || 'Could not update favorite.');
      return;
    }
    await loadItems(userId);
  };

  const removeItem = async (item: BucketItem) => {
    if (!userId) return;
    const result = await deleteBucketItem(userId, item.id);
    if (!result.success) {
      setError(result.error || 'Could not delete item.');
      return;
    }
    await loadItems(userId);
  };

  if (loading) {
    return <main className="p-6 pt-10 text-center text-purple-300/70">Loading bucket list...</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6 pb-24">
      <header className="space-y-2 pt-6 text-center">
        <h1 className="text-3xl font-serif text-white">Bucket List</h1>
        <p className="text-sm text-purple-300/60">Build your shared dreams together.</p>
      </header>

      <form onSubmit={handleAdd} className="space-y-3 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Add a new shared goal"
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={saving || !text.trim()}
          className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
        >
          {saving ? 'Adding...' : 'Add Item'}
        </button>
      </form>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4 text-sm text-purple-300/70">
            No items yet.
          </div>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm ${item.isCompleted ? 'text-purple-300/50 line-through' : 'text-purple-100'}`}>{item.text}</p>
                <button
                  type="button"
                  onClick={() => toggleFavorite(item)}
                  className={`rounded px-2 py-1 text-xs ${item.isFavorite ? 'bg-amber-500/20 text-amber-300' : 'bg-[#0d0a14] text-purple-300/70'}`}
                >
                  {item.isFavorite ? '★' : '☆'}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleCompleted(item)}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  {item.isCompleted ? 'Mark Pending' : 'Mark Complete'}
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item)}
                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

// src/app/dashboard/dates/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateDateIdea, saveDateIdea, getSavedDateIdeas, toggleDateFavorite, toggleDateCompleted, deleteDateIdea } from '@/actions/dates';
import { getCurrentProfile } from '@/actions/auth';
import { Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type DateCategory = 'cozy' | 'adventurous' | 'romantic' | 'food' | 'random';
type DateBudget = 'free' | 'low' | 'medium' | 'high';

type GeneratedDateIdea = {
  title: string;
  summary: string;
  plan: string[];
  category: DateCategory;
  budget: DateBudget;
  source: 'quick' | 'ai';
};

type SavedDateIdea = GeneratedDateIdea & {
  id: string;
  userId: string;
  isFavorite: boolean;
  isCompleted: boolean;
  completedAt: string;
  createdAt: string;
};

const CATEGORIES: Array<{ id: DateCategory; label: string }> = [
  { id: 'cozy', label: 'Cozy' },
  { id: 'adventurous', label: 'Adventurous' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'food', label: 'Food' },
  { id: 'random', label: 'Random' },
];

const BUDGETS: Array<{ id: DateBudget; label: string }> = [
  { id: 'free', label: 'Free' },
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

export default function DateGeneratorPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<DateCategory>('random');
  const [budget, setBudget] = useState<DateBudget>('medium');
  const [source, setSource] = useState<'quick' | 'ai'>('ai');
  const [idea, setIdea] = useState<GeneratedDateIdea | null>(null);
  const [savedIdeas, setSavedIdeas] = useState<SavedDateIdea[]>([]);
  const [error, setError] = useState('');

  const loadSavedIdeas = async (uid: string) => {
    const result = await getSavedDateIdeas(uid);
    if (!result.success || !('ideas' in result)) {
      setError('Could not load saved dates.');
      return;
    }
    setSavedIdeas((result.ideas || []) as SavedDateIdea[]);
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
      await loadSavedIdeas(auth.userId);
    }

    init();
  }, [router]);

  const handleGenerate = async () => {
    setLoading(true);
    setIdea(null);
    setError('');
    const result = await generateDateIdea({ category, budget, source });
    if (result.success && 'idea' in result) {
      setIdea(result.idea as GeneratedDateIdea);
    } else {
      setError('Could not generate date idea.');
    }
    setLoading(false);
  };

  const handleSaveIdea = async () => {
    if (!idea || !userId) return;
    setSaving(true);
    const result = await saveDateIdea(userId, idea);
    setSaving(false);

    if (!result.success) {
      setError(result.error || 'Could not save date idea.');
      return;
    }

    await loadSavedIdeas(userId);
  };

  const handleToggleFavorite = async (item: SavedDateIdea) => {
    if (!userId) return;
    await toggleDateFavorite(userId, item.id, !item.isFavorite);
    await loadSavedIdeas(userId);
  };

  const handleToggleCompleted = async (item: SavedDateIdea) => {
    if (!userId) return;
    await toggleDateCompleted(userId, item.id, !item.isCompleted);
    await loadSavedIdeas(userId);
  };

  const handleDelete = async (item: SavedDateIdea) => {
    if (!userId) return;
    await deleteDateIdea(userId, item.id);
    await loadSavedIdeas(userId);
  };

  return (
    <main className="p-6 max-w-lg mx-auto pb-24 space-y-8">
      <header className="text-center space-y-2 pt-8">
        <Sparkles className="mx-auto text-purple-400" />
        <h1 className="text-3xl font-serif text-white">Date Engine</h1>
        <p className="text-purple-300/60 text-sm">Generate and save date ideas with favorites/completed tracking.</p>
      </header>

      <section className="space-y-3 rounded-2xl border border-purple-900/30 bg-[#1a1525] p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSource('quick')}
            className={`rounded-lg border px-3 py-2 text-xs ${source === 'quick' ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-purple-900/40 bg-[#0d0a14] text-purple-300/70'}`}
          >
            Quick Date
          </button>
          <button
            type="button"
            onClick={() => setSource('ai')}
            className={`rounded-lg border px-3 py-2 text-xs ${source === 'ai' ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-purple-900/40 bg-[#0d0a14] text-purple-300/70'}`}
          >
            AI Date
          </button>
        </div>

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as DateCategory)}
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white"
        >
          {CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>

        <select
          value={budget}
          onChange={(event) => setBudget(event.target.value as DateBudget)}
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white"
        >
          {BUDGETS.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Date'}
        </button>
      </section>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="min-h-[300px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="text-purple-500 animate-spin" size={40} />
              <p className="text-purple-300/50 text-xs animate-pulse">Planning your date...</p>
            </motion.div>
          ) : idea ? (
            <motion.div 
              key="idea"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#1a1525] border border-purple-500/20 rounded-3xl p-6 shadow-2xl w-full text-purple-100 text-sm leading-relaxed space-y-3"
            >
              <h2 className="text-lg font-semibold text-white">{idea.title}</h2>
              <p className="text-purple-200/80">{idea.summary}</p>
              {idea.plan.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {idea.plan.map((step, idx) => <li key={idx}>{step}</li>)}
                </ul>
              ) : null}
              <button
                type="button"
                onClick={handleSaveIdea}
                disabled={saving}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save for later'}
              </button>
            </motion.div>
          ) : (
            <p className="text-purple-300/20 text-center italic text-sm px-10">
              Pick mode, category, and budget to generate your next date.
            </p>
          )}
        </AnimatePresence>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-widest text-purple-300/70">Saved Dates</h2>
        {savedIdeas.length === 0 ? (
          <div className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4 text-sm text-purple-300/70">No saved dates yet.</div>
        ) : (
          savedIdeas.map((item) => (
            <article key={item.id} className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-white font-semibold">{item.title}</h3>
                  <p className="text-xs text-purple-300/60">{item.category} • {item.budget} • {item.source}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.isFavorite ? <span className="text-xs text-amber-300">★ Favorite</span> : null}
                  {item.isCompleted ? <span className="text-xs text-emerald-300">✓ Completed</span> : null}
                </div>
              </div>

              <p className="text-sm text-purple-100">{item.summary}</p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(item)}
                  className="rounded-lg bg-[#0d0a14] px-2 py-2 text-xs text-purple-200 border border-purple-900/40"
                >
                  {item.isFavorite ? 'Unfavorite' : 'Favorite'}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCompleted(item)}
                  className="rounded-lg bg-emerald-600 px-2 py-2 text-xs text-white"
                >
                  {item.isCompleted ? 'Mark pending' : 'Complete'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="rounded-lg bg-red-600 px-2 py-2 text-xs text-white"
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
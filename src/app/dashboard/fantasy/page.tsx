'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import { getFantasyQueue, swipeFantasy } from '@/actions/fantasy';

type FantasyCard = {
  id: string;
  text: string;
  isMatched: boolean;
  createdAt: string;
};

export default function FantasyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [queue, setQueue] = useState<FantasyCard[]>([]);
  const [matched, setMatched] = useState<FantasyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastMatch, setLastMatch] = useState(false);

  const currentCard = useMemo(() => queue[0] || null, [queue]);

  const loadQueue = async (uid: string) => {
    const result = await getFantasyQueue(uid);
    if (!result.success || !('queue' in result) || !('matched' in result)) {
      setError('Could not load fantasies.');
      return;
    }

    setQueue((result.queue || []) as FantasyCard[]);
    setMatched((result.matched || []) as FantasyCard[]);
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
      await loadQueue(auth.userId);
      setLoading(false);
    }

    init();
  }, [router]);

  const handleSwipe = async (choice: 'left' | 'right') => {
    if (!currentCard || !userId || busy) return;

    setBusy(true);
    const result = await swipeFantasy(userId, currentCard.id, choice);
    setBusy(false);

    if (!result.success) {
      setError(result.error || 'Could not save swipe.');
      return;
    }

    setLastMatch(Boolean(result.matched));
    await loadQueue(userId);
  };

  if (loading) {
    return <main className="p-6 pt-10 text-center text-purple-300/70">Loading fantasies...</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6 pb-24">
      <header className="space-y-2 pt-6 text-center">
        <h1 className="text-3xl font-serif text-white">Fantasy Matcher</h1>
        <p className="text-sm text-purple-300/60">Swipe left to pass, right to keep. Match happens when both swipe right.</p>
      </header>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {lastMatch ? <p className="text-sm text-emerald-300">✨ Match! Added to your shared fantasy list.</p> : null}

      <section className="rounded-3xl border border-purple-800/40 bg-gradient-to-b from-[#251b3b] to-[#1a1525] p-6 min-h-72 flex items-center justify-center text-center">
        {currentCard ? (
          <p className="text-lg leading-relaxed text-purple-100">{currentCard.text}</p>
        ) : (
          <p className="text-sm text-purple-300/70">No cards left right now. New fantasies will auto-generate shortly.</p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!currentCard || busy}
          onClick={() => handleSwipe('left')}
          className="rounded-xl bg-[#1a1525] border border-purple-800/40 px-4 py-3 text-sm font-semibold text-purple-200 hover:border-purple-500 disabled:opacity-50"
        >
          Pass
        </button>
        <button
          type="button"
          disabled={!currentCard || busy}
          onClick={() => handleSwipe('right')}
          className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-pink-500 disabled:opacity-50"
        >
          Keep
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-widest text-purple-300/70">Matched Fantasies</h2>
        {matched.length === 0 ? (
          <div className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4 text-sm text-purple-300/70">No matches yet.</div>
        ) : (
          matched.map((item) => (
            <article key={item.id} className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4">
              <p className="text-sm text-purple-100">{item.text}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

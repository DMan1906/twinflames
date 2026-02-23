'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { appwriteClient } from '@/lib/appwrite/client';
import { getCurrentProfile } from '@/actions/auth';
import { getThumbKissFeed, sendThumbKiss } from '@/actions/thumb-kiss';

type KissItem = {
  id: string;
  senderId: string;
  message: string;
  emoji: string;
  createdAt: string;
};

const EMOJIS = ['👍', '❤️', '💋', '🤗', '🌙', '✨'];

export default function ThumbKissPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [kisses, setKisses] = useState<KissItem[]>([]);
  const [message, setMessage] = useState('');
  const [emoji, setEmoji] = useState('👍');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadFeed = async (uid: string) => {
    const result = await getThumbKissFeed(uid);
    if (!result.success) {
      setError(result.error || 'Could not load thumb kisses.');
      return;
    }

    setKisses((result.kisses || []) as KissItem[]);
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
      await loadFeed(auth.userId);
      setLoading(false);

      const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
      const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_THUMBKISS_COLLECTION_ID!;
      if (!COL_ID) return;

      const unsubscribe = appwriteClient.subscribe(
        `databases.${DB_ID}.collections.${COL_ID}.documents`,
        async () => {
          await loadFeed(auth.userId!);
        },
      );

      return () => unsubscribe();
    }

    init();
  }, [router]);

  const handleSend = async () => {
    if (!userId || sending) return;
    setSending(true);
    const result = await sendThumbKiss(userId, message, emoji);
    setSending(false);

    if (!result.success) {
      setError(result.error || 'Could not send thumb kiss.');
      return;
    }

    setMessage('');
    await loadFeed(userId);
  };

  const latest = useMemo(() => kisses[0] || null, [kisses]);

  if (loading) {
    return <main className="p-6 pt-10 text-center text-purple-300/70">Loading thumb kisses...</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6 pb-24">
      <header className="space-y-2 pt-6 text-center">
        <h1 className="text-3xl font-serif text-white">Thumb Kiss</h1>
        <p className="text-sm text-purple-300/60">Send tiny touches and keep a sweet trail.</p>
      </header>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
        <p className="text-xs uppercase tracking-widest text-purple-300/70">Send a kiss</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EMOJIS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setEmoji(item)}
              className={`rounded-lg px-3 py-2 text-lg ${emoji === item ? 'bg-pink-600 text-white' : 'bg-[#0d0a14] text-purple-200/80'}`}
            >
              {item}
            </button>
          ))}
        </div>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Add a tiny note (optional)"
          className="mt-3 min-h-20 w-full resize-none rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="mt-3 w-full rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-pink-500 disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send Thumb Kiss'}
        </button>
      </section>

      {latest ? (
        <section className="rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4 text-sm">
          <p className="text-purple-200/70">Latest kiss</p>
          <p className="mt-2 text-2xl">{latest.emoji}</p>
          {latest.message ? <p className="mt-2 text-purple-100">{latest.message}</p> : null}
          <p className="mt-2 text-xs text-purple-300/60">{new Date(latest.createdAt).toLocaleString()}</p>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-widest text-purple-300/70">Recent kisses</h2>
        {kisses.length === 0 ? (
          <div className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4 text-sm text-purple-300/70">
            No kisses yet.
          </div>
        ) : (
          kisses.map((kiss) => (
            <article key={kiss.id} className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-2xl">{kiss.emoji}</p>
                  {kiss.message ? <p className="mt-2 text-sm text-purple-100">{kiss.message}</p> : null}
                </div>
                <span className="text-[10px] uppercase tracking-widest text-purple-300/50">
                  {kiss.senderId === userId ? 'You' : 'Partner'}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-purple-300/60">{new Date(kiss.createdAt).toLocaleString()}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { appwriteClient } from '@/lib/appwrite/client';
import { getCurrentProfile } from '@/actions/auth';
import { getThumbKissState, sendThumbKiss, updateThumbPosition } from '@/actions/thumb-kiss';

type ThumbState = {
  id: string;
  date: string;
  me: {
    position: { x: number; y: number; updatedAt: string } | null;
    sent: number;
    received: number;
  };
  partner: {
    id: string;
    position: { x: number; y: number; updatedAt: string } | null;
    sent: number;
    received: number;
  };
  lastKissBy: string;
  lastKissAt: string;
};

export default function ThumbKissPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [state, setState] = useState<ThumbState | null>(null);
  const [touching, setTouching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadState = async (uid: string) => {
    const result = await getThumbKissState(uid);
    if (!result.success || !result.state) {
      setError(result.error || 'Could not load thumb-kiss state.');
      return;
    }

    setState(result.state as ThumbState);
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
      await loadState(auth.userId);
      setLoading(false);

      const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
      const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_THUMBKISS_COLLECTION_ID!;
      if (!COL_ID) return;

      const unsubscribe = appwriteClient.subscribe(
        `databases.${DB_ID}.collections.${COL_ID}.documents`,
        async () => {
          await loadState(auth.userId!);
        },
      );

      return () => unsubscribe();
    }

    init();
  }, [router]);

  const overlapPercent = useMemo(() => {
    if (!state?.me.position || !state?.partner.position) return 0;

    const dx = state.me.position.x - state.partner.position.x;
    const dy = state.me.position.y - state.partner.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = Math.sqrt(2);
    const closeness = Math.max(0, 1 - distance / maxDistance);
    return Math.round(closeness * 100);
  }, [state]);

  const updatePositionFromEvent = async (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!userId) return;

    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0]?.clientY : event.clientY;

    if (typeof clientX !== 'number' || typeof clientY !== 'number') return;

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    await updateThumbPosition(userId, x, y);

    if (navigator.vibrate && overlapPercent >= 85) {
      navigator.vibrate(60);
    }
  };

  const handleSendKiss = async () => {
    if (!userId || !state?.me.position) return;

    const result = await sendThumbKiss(userId, state.me.position.x, state.me.position.y);
    if (!result.success) {
      setError(result.error || 'Could not send thumb kiss.');
      return;
    }

    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    await loadState(userId);
  };

  if (loading) {
    return <main className="p-6 pt-10 text-center text-purple-300/70">Loading thumb kiss...</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6 pb-24">
      <header className="space-y-2 pt-6 text-center">
        <h1 className="text-3xl font-serif text-white">Thumb Kiss</h1>
        <p className="text-sm text-purple-300/60">Place your finger and try to overlap together.</p>
      </header>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4 text-center">
        <p className="text-xs uppercase tracking-widest text-purple-300/70">Overlay</p>
        <p className="text-4xl font-bold text-white">{overlapPercent}%</p>
      </section>

      <div
        className="relative aspect-square w-full rounded-3xl border border-purple-800/40 bg-[#120e1a]"
        onMouseDown={async (event) => {
          setTouching(true);
          await updatePositionFromEvent(event);
        }}
        onMouseMove={async (event) => {
          if (!touching) return;
          await updatePositionFromEvent(event);
        }}
        onMouseUp={() => setTouching(false)}
        onMouseLeave={() => setTouching(false)}
        onTouchStart={async (event) => {
          setTouching(true);
          await updatePositionFromEvent(event);
        }}
        onTouchMove={async (event) => {
          if (!touching) return;
          await updatePositionFromEvent(event);
        }}
        onTouchEnd={() => setTouching(false)}
      >
        {state?.me.position ? (
          <Dot x={state.me.position.x} y={state.me.position.y} color="bg-purple-500" label="You" />
        ) : null}
        {state?.partner.position ? (
          <Dot x={state.partner.position.x} y={state.partner.position.y} color="bg-pink-500" label="Partner" />
        ) : null}
      </div>

      <section className="grid grid-cols-2 gap-3 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4 text-sm">
        <Stat label="Sent today" value={String(state?.me.sent || 0)} />
        <Stat label="Received today" value={String(state?.me.received || 0)} />
      </section>

      <button
        type="button"
        disabled={!state?.me.position}
        onClick={handleSendKiss}
        className="w-full rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-pink-500 disabled:opacity-50"
      >
        Send Thumb Kiss
      </button>

      {state?.lastKissAt ? (
        <p className="text-center text-xs text-purple-300/60">
          Last kiss {state.lastKissBy === userId ? 'by you' : 'by partner'} at {new Date(state.lastKissAt).toLocaleTimeString()}
        </p>
      ) : null}
    </main>
  );
}

function Dot({ x, y, color, label }: { x: number; y: number; color: string; label: string }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      <div className={`h-6 w-6 rounded-full ${color} shadow-[0_0_14px_rgba(255,255,255,0.25)]`} />
      <span className="mt-1 block text-[10px] text-white/80">{label}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-purple-900/40 bg-[#0d0a14] p-3 text-center">
      <p className="text-[11px] uppercase tracking-widest text-purple-300/60">{label}</p>
      <p className="mt-1 text-lg text-purple-100">{value}</p>
    </div>
  );
}

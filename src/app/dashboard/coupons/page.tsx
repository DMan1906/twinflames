'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCoupon, getCoupons, redeemCoupon } from '@/actions/coupons';
import { getCurrentProfile } from '@/actions/auth';

type Coupon = {
  id: string;
  createdBy: string;
  title: string;
  description: string;
  redeemed: boolean;
  redeemedAt: string;
  createdAt: string;
};

const PRESETS = ['Breakfast in bed', 'Movie night pass', 'No chores day', 'Massage voucher'];

export default function CouponsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [given, setGiven] = useState<Coupon[]>([]);
  const [receivedRedeemed, setReceivedRedeemed] = useState<Coupon[]>([]);
  const [receivedUnredeemed, setReceivedUnredeemed] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadCoupons = async (uid: string) => {
    const result = await getCoupons(uid);
    if (!result.success) {
      setError(result.error || 'Could not load coupons.');
      return;
    }

    setGiven((result.given || []) as Coupon[]);
    setReceivedRedeemed((result.received?.redeemed || []) as Coupon[]);
    setReceivedUnredeemed((result.received?.unredeemed || []) as Coupon[]);
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
      await loadCoupons(auth.userId);
      setLoading(false);
    }

    init();
  }, [router]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !userId) return;

    setSaving(true);
    const result = await createCoupon(userId, title, description);
    setSaving(false);

    if (!result.success) {
      setError(result.error || 'Could not create coupon.');
      return;
    }

    setTitle('');
    setDescription('');
    await loadCoupons(userId);
  };

  const handleRedeem = async (couponId: string) => {
    if (!userId) return;
    const result = await redeemCoupon(userId, couponId);
    if (!result.success) {
      setError(result.error || 'Could not redeem coupon.');
      return;
    }

    await loadCoupons(userId);
  };

  if (loading) {
    return <main className="p-6 pt-10 text-center text-purple-300/70">Loading coupons...</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6 pb-24">
      <header className="space-y-2 pt-6 text-center">
        <h1 className="text-3xl font-serif text-white">Love Coupons</h1>
        <p className="text-sm text-purple-300/60">Create presets or custom coupons and redeem what you receive.</p>
      </header>

      <section className="grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setTitle(preset)}
            className="rounded-lg border border-purple-900/40 bg-[#1a1525] px-3 py-2 text-xs text-purple-200 hover:border-purple-600"
          >
            {preset}
          </button>
        ))}
      </section>

      <form onSubmit={handleCreate} className="space-y-3 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Coupon title"
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional details"
          className="min-h-20 w-full resize-none rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Coupon'}
        </button>
      </form>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-widest text-purple-300/70">Received - Unredeemed</h2>
        {receivedUnredeemed.length === 0 ? (
          <EmptyCard text="No unredeemed coupons." />
        ) : (
          receivedUnredeemed.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} actionLabel="Redeem" onAction={() => handleRedeem(coupon.id)} />
          ))
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-widest text-purple-300/70">Received - Redeemed</h2>
        {receivedRedeemed.length === 0 ? (
          <EmptyCard text="No redeemed coupons yet." />
        ) : (
          receivedRedeemed.map((coupon) => <CouponCard key={coupon.id} coupon={coupon} />)
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-widest text-purple-300/70">Given by You</h2>
        {given.length === 0 ? (
          <EmptyCard text="You have not created coupons yet." />
        ) : (
          given.map((coupon) => <CouponCard key={coupon.id} coupon={coupon} />)
        )}
      </section>
    </main>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <div className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4 text-sm text-purple-300/70">{text}</div>;
}

function CouponCard({
  coupon,
  actionLabel,
  onAction,
}: {
  coupon: Coupon;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <article className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4">
      <p className="text-sm font-semibold text-white">{coupon.title}</p>
      {coupon.description ? <p className="mt-1 text-sm text-purple-200/80">{coupon.description}</p> : null}
      <p className="mt-2 text-[11px] text-purple-300/50">{new Date(coupon.createdAt).toLocaleString()}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
        >
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}

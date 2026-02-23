'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import { getDailyTrinityStatus, type DailyTrinityStatus } from '@/actions/daily-progress';
import MoodCheckin from '@/components/MoodCheckin';
import DualCameraCapture from '@/components/DualCameraCapture';
import Link from 'next/link';
import { Flame, CheckCircle2, Circle } from 'lucide-react';

export default function TrinityPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<DailyTrinityStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStatus = async (uid: string) => {
    const progress = await getDailyTrinityStatus(uid);
    if (progress.success) {
      setStatus(progress);
    }
  };

  useEffect(() => {
    async function boot() {
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
      await refreshStatus(auth.userId);
      setLoading(false);
    }

    boot();
  }, [router]);

  if (loading) {
    return <main className="p-6 pt-10 text-center text-purple-300/70">Loading Daily Trinity...</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6 pb-24">
      <header className="space-y-3 pt-6 text-center">
        <Flame className="mx-auto text-orange-400" size={30} />
        <h1 className="text-3xl font-serif text-white">Daily Trinity</h1>
        <p className="text-sm text-purple-300/60">Both partners complete all 3 to grow your streak.</p>
      </header>

      <section className="rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
        <p className="mb-3 text-xs uppercase tracking-widest text-purple-300/70">Today</p>
        <div className="grid grid-cols-1 gap-3 text-sm">
          <ProgressRow label="Daily question" you={!!status?.you?.question} partner={!!status?.partner?.question} />
          <ProgressRow label="Mood check-in" you={!!status?.you?.mood} partner={!!status?.partner?.mood} />
          <ProgressRow label="Pic of the day" you={!!status?.you?.photo} partner={!!status?.partner?.photo} />
        </div>

        <div
          className={`mt-4 rounded-xl border p-3 text-sm ${
            status?.bothComplete
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
              : 'border-purple-900/40 bg-[#0d0a14] text-purple-200'
          }`}
        >
          {status?.bothComplete
            ? '✅ Trinity complete for both partners. Streak updated.'
            : 'Complete all three together to lock today\'s streak.'}
        </div>
      </section>

      <section className="rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg text-white">1) Daily Question</h2>
          {status?.you?.question ? <CheckCircle2 className="text-emerald-400" size={18} /> : <Circle size={18} className="text-purple-400" />}
        </div>
        <p className="mb-3 text-xs text-purple-300/60">Answer today&apos;s reflection question.</p>
        <Link
          href="/dashboard/today"
          className="block rounded-xl bg-purple-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-purple-500"
        >
          Open Daily Question
        </Link>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-white">2) Mood Check-in</h2>
          {status?.you?.mood ? <CheckCircle2 className="text-emerald-400" size={18} /> : <Circle size={18} className="text-purple-400" />}
        </div>
        {userId ? <MoodCheckin userId={userId} onComplete={() => refreshStatus(userId)} /> : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-white">3) Pic of the Day</h2>
          {status?.you?.photo ? <CheckCircle2 className="text-emerald-400" size={18} /> : <Circle size={18} className="text-purple-400" />}
        </div>
        {userId ? <DualCameraCapture userId={userId} onComplete={() => refreshStatus(userId)} /> : null}
      </section>
    </main>
  );
}

function ProgressRow({ label, you, partner }: { label: string; you: boolean; partner: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border border-purple-900/30 bg-[#0d0a14] px-3 py-2">
      <span className="text-purple-100">{label}</span>
      <span className={`text-xs ${you ? 'text-emerald-300' : 'text-purple-300/60'}`}>{you ? 'You ✓' : 'You ○'}</span>
      <span className={`text-xs ${partner ? 'text-emerald-300' : 'text-purple-300/60'}`}>{partner ? 'Partner ✓' : 'Partner ○'}</span>
    </div>
  );
}
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentProfile, unlinkPartner } from '@/actions/auth';
import {
  addMilestone,
  deleteMilestone,
  getProfileDashboard,
  logoutCurrentUser,
  updateProfileImage,
} from '@/actions/profile';

type MilestoneType = 'date' | 'countdown';

type DashboardProfile = {
  userId: string;
  partnerId: string;
  pairCode: string;
  currentStreak: number;
  bestStreak: number;
  questionsAnswered: number;
  accountCreatedAt: string;
  profileImageUrl: string;
  milestones: Array<{ id: string; title: string; date: string; type: MilestoneType }>;
};

function dayDiffFromNow(dateValue: string) {
  const today = new Date();
  const date = new Date(dateValue);
  const ms = date.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<MilestoneType>('date');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = async (uid: string) => {
    const data = await getProfileDashboard(uid);
    if (!data.success || !data.profile) {
      setError(data.error || 'Failed to load profile.');
      return;
    }

    setProfile(data.profile as DashboardProfile);
    setImageUrl(String(data.profile.profileImageUrl || ''));
    setError('');
  };

  useEffect(() => {
    async function init() {
      const auth = await getCurrentProfile();
      if (!auth.success || !auth.userId) {
        router.push('/');
        return;
      }

      setUserId(auth.userId);
      await refresh(auth.userId);
      setLoading(false);
    }

    init();
  }, [router]);

  const dates = useMemo(
    () => (profile?.milestones || []).filter((item) => item.type === 'date'),
    [profile],
  );

  const countdowns = useMemo(
    () => (profile?.milestones || []).filter((item) => item.type === 'countdown'),
    [profile],
  );

  const handleSaveImage = async () => {
    if (!userId || !imageUrl.trim()) return;
    setBusy(true);
    const result = await updateProfileImage(userId, imageUrl);
    setBusy(false);

    if (!result.success) {
      setError(result.error || 'Could not update picture.');
      return;
    }

    await refresh(userId);
  };

  const handleAddMilestone = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || !title.trim() || !date) return;

    setBusy(true);
    const result = await addMilestone(userId, title, date, type);
    setBusy(false);

    if (!result.success) {
      setError(result.error || 'Could not add milestone.');
      return;
    }

    setTitle('');
    setDate('');
    await refresh(userId);
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!userId) return;
    const result = await deleteMilestone(userId, milestoneId);
    if (!result.success) {
      setError(result.error || 'Could not delete milestone.');
      return;
    }

    await refresh(userId);
  };

  const handleLogout = async () => {
    await logoutCurrentUser();
    router.push('/');
  };

  const handleBreakup = async () => {
    if (!userId) return;
    const result = await unlinkPartner(userId);
    if (!result.success) {
      setError(result.error || 'Could not disconnect partner.');
      return;
    }

    router.push('/pair');
  };

  if (loading) {
    return <main className="p-6 pt-10 text-center text-purple-300/70">Loading profile...</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6 pb-24">
      <header className="space-y-2 pt-6 text-center">
        <h1 className="text-3xl font-serif text-white">Profile</h1>
        <p className="text-sm text-purple-300/60">Manage your account, milestones, and relationship settings.</p>
      </header>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="grid grid-cols-2 gap-3 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4 text-sm">
        <Stat label="Current streak" value={`${profile?.currentStreak ?? 0}`} />
        <Stat label="Best streak" value={`${profile?.bestStreak ?? 0}`} />
        <Stat label="Questions answered" value={`${profile?.questionsAnswered ?? 0}`} />
        <Stat
          label="Member since"
          value={profile?.accountCreatedAt ? new Date(profile.accountCreatedAt).toLocaleDateString() : '-'}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
        <p className="text-sm font-semibold text-white">Profile picture URL</p>
        <input
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="https://..."
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={busy || !imageUrl.trim()}
          onClick={handleSaveImage}
          className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
        >
          Save Picture
        </button>
      </section>

      <form onSubmit={handleAddMilestone} className="space-y-3 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
        <p className="text-sm font-semibold text-white">Add date or countdown</p>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
        />
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('date')}
            className={`rounded-lg border px-3 py-2 text-xs ${
              type === 'date' ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-purple-900/40 bg-[#0d0a14] text-purple-300/70'
            }`}
          >
            Date
          </button>
          <button
            type="button"
            onClick={() => setType('countdown')}
            className={`rounded-lg border px-3 py-2 text-xs ${
              type === 'countdown' ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-purple-900/40 bg-[#0d0a14] text-purple-300/70'
            }`}
          >
            Countdown
          </button>
        </div>
        <button
          type="submit"
          disabled={busy || !title.trim() || !date}
          className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <MilestoneList title="Dates" items={dates} onDelete={handleDeleteMilestone} mode="date" />
      <MilestoneList title="Countdowns" items={countdowns} onDelete={handleDeleteMilestone} mode="countdown" />

      <section className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl bg-[#1a1525] px-4 py-3 text-sm font-semibold text-purple-200 border border-purple-800/40 hover:border-purple-500"
        >
          Logout
        </button>
        <button
          type="button"
          onClick={handleBreakup}
          className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"
        >
          Breakup
        </button>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-purple-900/40 bg-[#0d0a14] p-3">
      <p className="text-[11px] uppercase tracking-widest text-purple-300/60">{label}</p>
      <p className="mt-1 text-sm text-purple-100">{value}</p>
    </div>
  );
}

function MilestoneList({
  title,
  items,
  onDelete,
  mode,
}: {
  title: string;
  items: Array<{ id: string; title: string; date: string; type: MilestoneType }>;
  onDelete: (id: string) => void;
  mode: MilestoneType;
}) {
  return (
    <section className="space-y-2 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {items.length === 0 ? (
        <div className="rounded-lg border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-purple-300/70">No {title.toLowerCase()} yet.</div>
      ) : (
        items.map((item) => {
          const diff = dayDiffFromNow(item.date);
          const subtitle = mode === 'date'
            ? `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} ${diff <= 0 ? 'since' : 'until'} ${item.date}`
            : `${diff} day${Math.abs(diff) === 1 ? '' : 's'} remaining`;

          return (
            <article key={item.id} className="rounded-lg border border-purple-900/40 bg-[#0d0a14] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-purple-100">{item.title}</p>
                  <p className="text-[11px] text-purple-300/60">{item.date} • {subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import { appwriteClient } from '@/lib/appwrite/client';
import { getTriviaState, setTriviaReady, submitTriviaAnswer } from '@/actions/trivia';

type TriviaMode = 'general' | 'relationship';

type TriviaState = {
  id: string;
  mode: TriviaMode;
  status: string;
  readyUserIds: string[];
  starterUserId: string;
  currentIndex: number;
  questions: Array<{ question: string; choices: string[]; correctAnswer?: string }>;
  answers: Record<string, Record<string, string>>;
};

export default function TriviaPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [mode, setMode] = useState<TriviaMode>('relationship');
  const [state, setState] = useState<TriviaState | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadState = async (uid: string) => {
    const result = await getTriviaState(uid);
    if (!result.success) {
      setError(result.error || 'Failed to load trivia state.');
      return;
    }

    setPartnerId(result.partnerId || '');
    setState((result.state || null) as TriviaState | null);
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
    }

    init();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const TRIVIA_ID = process.env.NEXT_PUBLIC_APPWRITE_TRIVIA_SESSIONS_COLLECTION_ID!;
    if (!TRIVIA_ID) return;

    const unsubscribe = appwriteClient.subscribe(
      `databases.${DB_ID}.collections.${TRIVIA_ID}.documents`,
      async () => {
        await loadState(userId);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  const currentQuestion = useMemo(() => {
    if (!state || state.status !== 'active' || state.questions.length === 0) return null;
    return state.questions[state.currentIndex] || null;
  }, [state]);

  const currentRoundAnswers = useMemo(() => {
    if (!state) return {} as Record<string, string>;
    return state.answers[String(state.currentIndex)] || {};
  }, [state]);

  const starterThisRound = useMemo(() => {
    if (!state || !partnerId) return '';
    return state.currentIndex % 2 === 0
      ? state.starterUserId
      : state.starterUserId === userId
        ? partnerId
        : userId;
  }, [state, userId, partnerId]);

  const handleReady = async () => {
    if (!userId) return;
    setBusy(true);
    const result = await setTriviaReady(userId, mode);
    setBusy(false);

    if (!result.success) {
      setError(result.error || 'Failed to mark ready.');
      return;
    }

    await loadState(userId);
  };

  const handleSubmitAnswer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || !state?.id || !answer.trim()) return;

    setBusy(true);
    const result = await submitTriviaAnswer(userId, state.id, answer);
    setBusy(false);

    if (!result.success) {
      setError(result.error || 'Could not submit answer.');
      return;
    }

    setAnswer('');
    await loadState(userId);
  };

  if (loading) {
    return <main className="p-6 pt-10 text-center text-purple-300/70">Loading trivia...</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6 pb-24">
      <header className="space-y-2 pt-6 text-center">
        <h1 className="text-3xl font-serif text-white">Trivia</h1>
        <p className="text-sm text-purple-300/60">Ready up together, then answer in turn each round.</p>
      </header>

      <section className="grid grid-cols-2 gap-2">
        <ModeButton label="Getting to know us" active={mode === 'relationship'} onClick={() => setMode('relationship')} />
        <ModeButton label="General knowledge" active={mode === 'general'} onClick={() => setMode('general')} />
      </section>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {!state || (state.status !== 'completed' && state.questions.length === 0) ? (
        <section className="space-y-3 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
          <p className="text-sm text-purple-200">Waiting room</p>
          <p className="text-xs text-purple-300/60">
            Ready players: {state?.readyUserIds?.length || 0}/2
          </p>
          <button
            type="button"
            onClick={handleReady}
            disabled={busy}
            className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {busy ? 'Updating...' : 'I am ready'}
          </button>
        </section>
      ) : null}

      {state?.status === 'active' && currentQuestion ? (
        <section className="space-y-4 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
          <p className="text-xs uppercase tracking-widest text-purple-300/60">
            Round {state.currentIndex + 1} / {state.questions.length}
          </p>
          <p className="text-sm text-purple-200">Starter this round: {starterThisRound === userId ? 'You' : 'Partner'}</p>
          <h2 className="text-lg text-white">{currentQuestion.question}</h2>

          <div className="space-y-2">
            {currentQuestion.choices.map((choice) => (
              <div key={choice} className="rounded-lg border border-purple-900/40 bg-[#0d0a14] px-3 py-2 text-sm text-purple-200">
                {choice}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmitAnswer} className="space-y-2">
            <input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Type your selected answer"
              className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !answer.trim()}
              className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
            >
              {busy ? 'Submitting...' : 'Submit Answer'}
            </button>
          </form>

          <div className="rounded-lg border border-purple-900/40 bg-[#0d0a14] p-3 text-xs text-purple-300/70">
            This round answers: you {currentRoundAnswers[userId] ? '✓' : '○'} • partner {currentRoundAnswers[partnerId] ? '✓' : '○'}
          </div>
        </section>
      ) : null}

      {state?.status === 'completed' ? (
        <section className="space-y-3 rounded-2xl border border-emerald-600/40 bg-emerald-500/10 p-4">
          <h2 className="text-lg text-emerald-300">Trivia complete</h2>
          <button
            type="button"
            onClick={handleReady}
            disabled={busy}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? 'Preparing...' : 'Start New Trivia'}
          </button>
        </section>
      ) : null}
    </main>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs ${
        active
          ? 'border-purple-500 bg-purple-500/20 text-purple-100'
          : 'border-purple-900/40 bg-[#1a1525] text-purple-300/70'
      }`}
    >
      {label}
    </button>
  );
}

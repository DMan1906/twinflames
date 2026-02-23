'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import { getNotes, sendNote } from '@/actions/notes';

type Note = {
  id: string;
  userId: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
};

export default function NotesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  const loadNotes = async (uid: string, pid: string) => {
    const result = await getNotes(uid, pid);
    if (result.success) {
      setNotes(result.notes || []);
      setError('');
    } else {
      setError(result.error || 'Failed to load notes.');
    }
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
      setPartnerId(String(auth.profile.partner_id));
      await loadNotes(auth.userId, String(auth.profile.partner_id));
      setLoading(false);
    }

    init();
  }, [router]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim() || !userId || !partnerId) return;

    setSending(true);
    const result = await sendNote(userId, message);
    setSending(false);

    if (!result.success) {
      setError(result.error || 'Could not send note.');
      return;
    }

    setMessage('');
    await loadNotes(userId, partnerId);
  };

  if (loading) {
    return <main className="p-6 pt-10 text-center text-purple-300/70">Loading notes...</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6 pb-24">
      <header className="space-y-2 pt-6 text-center">
        <h1 className="text-3xl font-serif text-white">Love Notes</h1>
        <p className="text-sm text-purple-300/60">Leave messages for each other and revisit them anytime.</p>
      </header>

      <form onSubmit={handleSend} className="space-y-3 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write something sweet..."
          className="min-h-24 w-full resize-none rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send Note'}
        </button>
      </form>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex items-center gap-2 rounded-full border border-purple-900/40 bg-[#14101d] p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('received')}
            className={`flex-1 rounded-full px-3 py-2 font-semibold transition ${activeTab === 'received' ? 'bg-purple-600 text-white' : 'text-purple-200/70 hover:text-white'}`}
          >
            Received
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={`flex-1 rounded-full px-3 py-2 font-semibold transition ${activeTab === 'sent' ? 'bg-purple-600 text-white' : 'text-purple-200/70 hover:text-white'}`}
          >
            Sent
          </button>
        </div>

        {notes.filter((note) => (activeTab === 'sent' ? note.userId === userId : note.userId !== userId)).length === 0 ? (
          <div className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4 text-sm text-purple-300/70">
            {activeTab === 'sent' ? 'No sent notes yet.' : 'No received notes yet.'}
          </div>
        ) : (
          notes
            .filter((note) => (activeTab === 'sent' ? note.userId === userId : note.userId !== userId))
            .map((note) => (
            <article key={note.id} className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4" style={{ borderLeftColor: note.color, borderLeftWidth: '4px' }}>
              <p className="mb-1 text-xs font-semibold text-purple-100">{note.title}</p>
              {note.pinned && <p className="mb-2 text-[10px] text-yellow-400">📌 Pinned</p>}
              <p className="text-sm leading-relaxed text-purple-100">{note.content}</p>
              <p className="mt-3 text-[11px] text-purple-300/50">{new Date(note.createdAt).toLocaleString()}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

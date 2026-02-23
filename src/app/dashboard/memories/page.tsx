'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import { createMemoryImageUploadUrl, deleteMemory, getMemories, saveMemory } from '@/actions/memories';

type MemoryItem = {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string;
  imageUrl: string;
  createdAt: string;
};

export default function MemoriesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadMemories = async (uid: string) => {
    const result = await getMemories(uid);
    if (!result.success) {
      setError(result.error || 'Could not load memories.');
      return;
    }

    setMemories((result.memories || []) as MemoryItem[]);
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
      await loadMemories(auth.userId);
      setLoading(false);
    }

    init();
  }, [router]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || !title.trim() || !date || !description.trim()) return;

    setSaving(true);
    setError('');

    let imageObjectKey = '';
    if (imageFile) {
      const upload = await createMemoryImageUploadUrl(userId, imageFile.type);
      if (!upload.success || !upload.uploadUrl || !upload.objectKey || !upload.mimeType) {
        setSaving(false);
        setError(upload.error || 'Could not prepare memory image upload.');
        return;
      }

      const uploaded = await fetch(upload.uploadUrl, {
        method: 'PUT',
        body: imageFile,
        headers: { 'Content-Type': upload.mimeType },
      });

      if (!uploaded.ok) {
        setSaving(false);
        setError('Could not upload memory image.');
        return;
      }

      imageObjectKey = upload.objectKey;
    }

    const saved = await saveMemory(userId, title, date, description, imageObjectKey);
    setSaving(false);

    if (!saved.success) {
      setError(saved.error || 'Could not save memory.');
      return;
    }

    setTitle('');
    setDate('');
    setDescription('');
    setImageFile(null);
    await loadMemories(userId);
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    const result = await deleteMemory(userId, id);
    if (!result.success) {
      setError(result.error || 'Could not delete memory.');
      return;
    }

    await loadMemories(userId);
  };

  if (loading) {
    return <main className="p-6 pt-10 text-center text-purple-300/70">Loading memories...</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6 pb-24">
      <header className="space-y-2 pt-6 text-center">
        <h1 className="text-3xl font-serif text-white">Memories</h1>
        <p className="text-sm text-purple-300/60">Save milestones with date, story, and photo.</p>
      </header>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <form onSubmit={handleSave} className="space-y-3 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Memory title"
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
        />

        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
        />

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe this memory..."
          className="min-h-24 w-full resize-none rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(event) => setImageFile(event.target.files?.[0] || null)}
          className="w-full rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-xs text-purple-200"
        />

        <button
          type="submit"
          disabled={saving || !title.trim() || !date || !description.trim()}
          className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Memory'}
        </button>
      </form>

      <section className="space-y-3">
        {memories.length === 0 ? (
          <div className="rounded-xl border border-purple-900/40 bg-[#1a1525] p-4 text-sm text-purple-300/70">No memories yet.</div>
        ) : (
          memories.map((memory) => (
            <article key={memory.id} className="space-y-3 rounded-2xl border border-purple-900/40 bg-[#1a1525] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base text-white">{memory.title}</h3>
                  <p className="text-xs text-purple-300/60">{memory.date}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(memory.id)}
                  className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500"
                >
                  Delete
                </button>
              </div>

              {memory.imageUrl ? (
                <img
                  src={memory.imageUrl}
                  alt={memory.title}
                  className="max-h-80 w-full rounded-xl object-cover"
                />
              ) : null}

              <p className="text-sm leading-relaxed text-purple-100">{memory.description}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

// src/app/dashboard/vault/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import { createAdminClient } from '@/lib/appwrite';
import { Query } from 'node-appwrite';
import { decryptData } from '@/lib/crypto';
import { BookOpen, Calendar, Heart } from 'lucide-react';

export default async function VaultPage() {
  const { success, profile, userId } = await getCurrentProfile();
  if (!success || !profile) redirect('/');

  const { databases } = await createAdminClient();
  const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const JOUR_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID!;

  // Fetch only revealed documents for this couple's chatId
  const chatId = [userId, profile.partner_id].sort().join('_');
  const docs = await databases.listDocuments(DB_ID, JOUR_COL_ID, [
    Query.equal('chat_id', chatId),
    Query.equal('is_revealed', true),
    Query.orderDesc('$createdAt'),
  ]);

  // Grouping by question to show both answers together
  const groupedMemories = docs.documents.reduce((acc: any, doc) => {
    if (!acc[doc.prompt]) acc[doc.prompt] = { prompt: doc.prompt, date: doc.$createdAt, answers: [] };
    acc[doc.prompt].answers.push({
      userId: doc.user_id,
      text: decryptData(doc.content),
    });
    return acc;
  }, {});

  const memories = Object.values(groupedMemories);

  return (
    <main className="p-6 pb-24 min-h-screen bg-[#0d0a14]">
      <header className="pt-8 mb-10 text-center">
        <div className="inline-block p-3 bg-amber-500/10 rounded-full mb-3">
          <BookOpen className="text-amber-400" size={28} />
        </div>
        <h1 className="text-3xl font-serif text-white">The Vault</h1>
        <p className="text-purple-300/50 text-sm">Your shared history, unlocked.</p>
      </header>

      <div className="space-y-10 relative">
        {/* The Timeline Line */}
        <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-purple-500/50 to-transparent" />

        {memories.length === 0 ? (
          <div className="text-center py-20 opacity-30 italic">No memories unlocked yet.</div>
        ) : (
          memories.map((m: any, idx) => (
            <div key={idx} className="relative pl-10 animate-in fade-in slide-in-from-left-4 duration-500">
              {/* Timeline Dot */}
              <div className="absolute left-[13px] top-2 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                  <Calendar size={12} />
                  {new Date(m.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>

                <div className="bg-[#1a1525] border border-purple-900/30 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-purple-100 font-serif text-lg mb-6 leading-tight">
                    "{m.prompt}"
                  </h3>

                  <div className="space-y-6">
                    {m.answers.map((ans: any, i: number) => (
                      <div key={i} className="flex gap-3">
                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${ans.userId === userId ? 'bg-purple-500' : 'bg-pink-500'}`} />
                        <div>
                          <p className="text-[10px] text-white/30 uppercase mb-1">
                            {ans.userId === userId ? 'You' : 'Tania'}
                          </p>
                          <p className="text-sm text-purple-200/80 italic leading-relaxed">
                            "{ans.text}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
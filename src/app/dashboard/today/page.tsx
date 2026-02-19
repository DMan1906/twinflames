// src/app/dashboard/today/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateDailyQuestion } from '@/actions/ai';
import { submitDailyAnswer, getRevealedAnswers } from '@/actions/today'; // We'll add getRevealedAnswers
import { getCurrentProfile } from '@/actions/auth';
import { client } from '@/lib/appwrite/client'; // Your client-side Appwrite instance
import { MessageCircle, CheckCircle, Lock, Sparkles, Unlock, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TodayPage() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [userId, setUserId] = useState('');
  const [partnerName, setPartnerName] = useState('Partner');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [revealedData, setRevealedData] = useState<{ mine: string, theirs: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const JOUR_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID!;

  useEffect(() => {
    async function load() {
      const auth = await getCurrentProfile();
      if (!auth.success || !auth.userId) return router.push('/');
      setUserId(auth.userId);
      // Set partner name placeholder or fetch from profile
      setPartnerName("Tania"); 

      const ai = await generateDailyQuestion();
      if (ai.success) setQuestion(ai.plaintext!);
      setLoading(false);
    }
    load();
  }, [router]);

  // Real-time listener for the "Reveal"
  useEffect(() => {
    if (!isDone || revealedData) return;

    // Subscribe to Journal collection updates for this user
    const unsubscribe = client.subscribe(
      `databases.${DB_ID}.collections.${JOUR_COL_ID}.documents`,
      async (response) => {
        // If a document in this collection is updated (meaning is_revealed became true)
        if (response.events.some(e => e.includes('.update'))) {
          const doc = response.payload as any;
          if (doc.is_revealed && doc.prompt === question) {
            const result = await getRevealedAnswers(userId, question);
            if (result.success) {
              setRevealedData({ mine: result.mine!, theirs: result.theirs! });
            }
          }
        }
      }
    );

    return () => unsubscribe();
  }, [isDone, revealedData, userId, question, DB_ID, JOUR_COL_ID]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    
    setIsSubmitting(true);
    const result = await submitDailyAnswer(userId, question, answer);
    if (result.success) {
      setIsDone(true);
      // If the partner had already answered, the reveal might happen instantly
      if (result.revealed) {
         const reveal = await getRevealedAnswers(userId, question);
         if (reveal.success) setRevealedData({ mine: reveal.mine!, theirs: reveal.theirs! });
      }
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d0a14]">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
          <Sparkles className="text-purple-500" size={32} />
        </motion.div>
      </div>
    );
  }

  return (
    <main className="p-6 pt-12 max-w-lg mx-auto space-y-8 bg-[#0d0a14] min-h-screen">
      <AnimatePresence mode="wait">
        {/* STATE 1: WRITING */}
        {!isDone && (
          <motion.div key="writing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}>
            <header className="flex items-center gap-3 border-b border-purple-900/50 pb-4 mb-8">
              <MessageCircle className="text-purple-400" />
              <h1 className="text-2xl font-serif text-white">Daily Question</h1>
            </header>
            <section className="bg-[#1a1525] border border-purple-800/30 rounded-3xl p-6 shadow-2xl">
              <p className="text-lg text-purple-100 italic leading-relaxed mb-8">"{question}"</p>
              <form onSubmit={handleSubmit} className="space-y-6">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Write from the heart..."
                  className="w-full p-4 bg-[#0d0a14] text-white rounded-2xl border border-purple-800/50 focus:border-purple-500 focus:outline-none min-h-[180px] resize-none"
                />
                <button disabled={isSubmitting || !answer} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50">
                  {isSubmitting ? 'Encrypting...' : 'Lock Answer'}
                </button>
              </form>
            </section>
          </motion.div>
        )}

        {/* STATE 2: WAITING */}
        {isDone && !revealedData && (
          <motion.div key="waiting" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="pt-20 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.3)] relative">
              <Lock size={40} className="text-purple-400" />
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute top-0 right-0 w-4 h-4 bg-pink-500 rounded-full border-2 border-[#0d0a14]" />
            </div>
            <h2 className="text-3xl font-serif text-white">Answer Secured</h2>
            <p className="text-purple-300/70 px-8">Your reflection is in the vault. The moment {partnerName} answers, both will be revealed.</p>
          </motion.div>
        )}

        {/* STATE 3: REVEALED */}
        {revealedData && (
          <motion.div key="revealed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <header className="text-center space-y-2">
              <Unlock className="text-emerald-400 mx-auto" size={32} />
              <h2 className="text-3xl font-serif text-white">The Reveal</h2>
            </header>
            
            <div className="space-y-4">
              <div className="p-6 bg-purple-900/10 border border-purple-500/20 rounded-3xl">
                <p className="text-[10px] uppercase tracking-widest font-bold text-purple-400 mb-2">Your Thoughts</p>
                <p className="text-purple-100 italic">"{revealedData.mine}"</p>
              </div>
              
              <div className="p-6 bg-pink-900/10 border border-pink-500/20 rounded-3xl">
                <p className="text-[10px] uppercase tracking-widest font-bold text-pink-400 mb-2">{partnerName}'s Thoughts</p>
                <p className="text-pink-100 italic">"{revealedData.theirs}"</p>
              </div>
            </div>

            <button onClick={() => router.push('/dashboard')} className="w-full py-4 text-purple-400 text-sm font-medium">
              Return to Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
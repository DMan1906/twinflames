// src/app/dashboard/dates/page.tsx
'use client';

import { useState } from 'react';
import { generateDateIdea } from '@/actions/dates';
import { Sparkles, Coffee, Moon, Utensils, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VIBES = [
  { id: 'cozy', label: 'Cozy & Homey', icon: <Coffee size={20} />, color: 'bg-orange-500/20 text-orange-400' },
  { id: 'adventurous', label: 'Adventurous', icon: <MapPin size={20} />, color: 'bg-blue-500/20 text-blue-400' },
  { id: 'spicy', label: 'Spicy & Romantic', icon: <Moon size={20} />, color: 'bg-pink-500/20 text-pink-400' },
  { id: 'cheap', label: 'Budget Friendly', icon: <Utensils size={20} />, color: 'bg-emerald-500/20 text-emerald-400' },
];

export default function DateGeneratorPage() {
  const [loading, setLoading] = useState(false);
  const [idea, setIdea] = useState<string | null>(null);

  const handleGenerate = async (vibe: string) => {
    setLoading(true);
    setIdea(null);
    const result = await generateDateIdea(vibe);
    if (result.success) setIdea(result.idea!);
    setLoading(false);
  };

  return (
    <main className="p-6 max-w-lg mx-auto pb-24 space-y-8">
      <header className="text-center space-y-2 pt-8">
        <Sparkles className="mx-auto text-purple-400" />
        <h1 className="text-3xl font-serif text-white">Date Engine</h1>
        <p className="text-purple-300/60 text-sm">Let AI spark your next memory.</p>
      </header>

      {/* Vibe Selection */}
      <div className="grid grid-cols-2 gap-3">
        {VIBES.map((v) => (
          <button
            key={v.id}
            onClick={() => handleGenerate(v.id)}
            disabled={loading}
            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border border-purple-900/30 hover:border-purple-500/50 transition-all ${v.color}`}
          >
            {v.icon}
            <span className="text-xs font-bold uppercase tracking-tighter">{v.label}</span>
          </button>
        ))}
      </div>

      {/* Output Area */}
      <div className="min-h-[300px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="text-purple-500 animate-spin" size={40} />
              <p className="text-purple-300/50 text-xs animate-pulse">Planning the perfect evening...</p>
            </motion.div>
          ) : idea ? (
            <motion.div 
              key="idea"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#1a1525] border border-purple-500/20 rounded-3xl p-6 shadow-2xl w-full whitespace-pre-wrap text-purple-100 text-sm leading-relaxed"
            >
              {idea}
            </motion.div>
          ) : (
            <p className="text-purple-300/20 text-center italic text-sm px-10">
              Pick a vibe to generate a unique date itinerary.
            </p>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
// src/components/ViewOnceMessage.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { markMessageAsViewed } from '@/actions/chat';

type ViewOnceProps = {
  messageId: string;
  content: string; 
  isMe: boolean; 
  initialViewCount: number; // Added to check DB state on load
};

export default function ViewOnceMessage({ messageId, content, isMe, initialViewCount }: ViewOnceProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  // If the DB says it's already viewed, start it in the hidden state
  const [isHidden, setIsHidden] = useState(initialViewCount > 0);

  useEffect(() => {
    if (!isRevealed || timeLeft <= 0 || isHidden) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleHide();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRevealed, timeLeft, isHidden]);

  const handleHide = async () => {
    setIsHidden(true);
    // Only the receiver updates the DB to ensure they actually saw it
    if (!isMe) {
      await markMessageAsViewed(messageId);
    }
  };

  if (isHidden) {
    return (
      <div className="flex items-center gap-2 text-purple-500/50 italic text-sm p-3">
        <EyeOff size={16} />
        <span>Message viewed</span>
      </div>
    );
  }

  if (!isRevealed) {
    return (
      <button 
        onClick={() => setIsRevealed(true)}
        className={`flex items-center gap-2 p-3 rounded-2xl border border-purple-500 border-dashed ${isMe ? 'bg-purple-900/20' : 'bg-[#1a1525]'}`}
      >
        <Eye size={18} className="text-purple-400" />
        <span className="text-purple-300 font-medium">Tap to view</span>
      </button>
    );
  }

  return (
    <div className={`relative overflow-hidden p-3 rounded-2xl ${isMe ? 'bg-purple-600 text-white' : 'bg-[#1a1525] border border-purple-900/50 text-purple-100'}`}>
      <p>{content}</p>
      
      <motion.div 
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 10, ease: 'linear' }}
        className="absolute bottom-0 left-0 h-1 bg-red-500/80"
      />
      <span className="absolute top-1 right-2 text-[10px] opacity-50">{timeLeft}s</span>
    </div>
  );
}
// src/components/InstallHint.tsx
'use client';

import { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';

export default function InstallHint() {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    // Check if already in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Only show if on iOS and NOT installed
    if (isIOS && !isStandalone) {
      // Check if user has dismissed it this session
      const dismissed = sessionStorage.getItem('pwa_hint_dismissed');
      if (!dismissed) {
        setShowHint(true);
      }
    }
  }, []);

  if (!showHint) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="bg-purple-600 text-white p-4 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.5)] border border-purple-400/30 relative">
        <button 
          onClick={() => {
            setShowHint(false);
            sessionStorage.setItem('pwa_hint_dismissed', 'true');
          }}
          className="absolute top-2 right-2 p-1 text-purple-200 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4 pr-6">
          <div className="bg-white/20 p-2 rounded-lg shrink-0">
            <Share size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1">Install TwinFlames</p>
            <p className="text-xs text-purple-100 leading-tight">
              Tap the <span className="font-bold underline">Share</span> button below and select 
              <span className="flex items-center gap-1 inline-flex font-bold ml-1">
                "Add to Home Screen" <PlusSquare size={14} />
              </span> 
              for the best experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
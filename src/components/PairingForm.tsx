// src/components/PairingForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { linkPartner } from '@/actions/auth';
import { motion } from 'framer-motion';

export default function PairingForm({ myCode, myUserId }: { myCode: string, myUserId: string }) {
  const [partnerCode, setPartnerCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await linkPartner(myUserId, partnerCode);
      
      if (!result.success) {
        setError(result.error || 'Failed to pair. Check the code and try again.');
        return;
      }

      // Success! Redirect to the main dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-[#1a1525] rounded-2xl shadow-2xl border border-purple-900/30 text-center">
      <div>
        <h2 className="text-3xl font-serif text-white mb-2">Connect</h2>
        <p className="text-purple-300 text-sm">Share this code with your partner:</p>
        
        {/* User's own code displayed prominently */}
        <div className="mt-4 p-4 bg-[#0d0a14] border border-purple-500/50 rounded-lg">
          <span className="text-4xl font-mono text-purple-400 tracking-widest">{myCode}</span>
        </div>
      </div>

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-purple-900/50"></div>
        <span className="flex-shrink-0 mx-4 text-purple-500 text-sm">OR</span>
        <div className="flex-grow border-t border-purple-900/50"></div>
      </div>

      {/* Form to enter partner's code */}
      <form onSubmit={handlePair} className="space-y-4">
        <div className="space-y-1 text-left">
          <label className="text-sm text-purple-200">Enter Partner's Code</label>
          <input
            type="text"
            placeholder="TF-XXXXXX"
            value={partnerCode}
            onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
            maxLength={9}
            required
            className="w-full p-3 bg-[#0d0a14] text-white text-center font-mono tracking-widest rounded-lg border border-purple-800/50 focus:border-purple-500 focus:outline-none transition-colors uppercase"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading || partnerCode.length < 9}
          className="w-full py-3 mt-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Linking...' : 'Link Accounts'}
        </motion.button>
      </form>
    </div>
  );
}
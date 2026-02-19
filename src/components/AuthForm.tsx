// src/components/AuthForm.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { login, signUp } from '@/actions/auth';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await signUp(email, password, name);
      }

      if (!result.success) {
        setError(result.error || 'Authentication failed');
        return;
      }

      // If successful, push them to the pairing screen
      router.push('/pair');
      
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-[#1a1525] rounded-2xl shadow-2xl border border-purple-900/30">
      <h2 className="text-3xl font-serif text-white text-center">
        {isLogin ? 'Welcome Back' : 'Create Account'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimatePresence mode="popLayout">
          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1"
            >
              <label className="text-sm text-purple-200">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                className="w-full p-3 bg-[#0d0a14] text-white rounded-lg border border-purple-800/50 focus:border-purple-500 focus:outline-none transition-colors"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-1">
          <label className="text-sm text-purple-200">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 bg-[#0d0a14] text-white rounded-lg border border-purple-800/50 focus:border-purple-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-purple-200">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 bg-[#0d0a14] text-white rounded-lg border border-purple-800/50 focus:border-purple-500 focus:outline-none transition-colors"
          />
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 mt-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      <p className="text-center text-purple-300 text-sm">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-purple-400 hover:text-purple-300 font-semibold underline"
        >
          {isLogin ? 'Sign up' : 'Log in'}
        </button>
      </p>
    </div>
  );
}
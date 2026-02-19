// src/components/BottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Brain, Heart, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/dashboard/today', icon: MessageCircle, label: 'Today' },
    { href: '/dashboard/trivia', icon: Brain, label: 'Trivia' },
    { href: '/dashboard/notes', icon: Heart, label: 'Notes' },
    { href: '/dashboard/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-[#0d0a14]/90 backdrop-blur-md border-t border-purple-900/50 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-16 gap-1">
              <Icon 
                size={24} 
                className={`transition-colors duration-300 ${isActive ? 'text-purple-400' : 'text-gray-500 hover:text-purple-300'}`} 
              />
              <span className={`text-[10px] ${isActive ? 'text-purple-400' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import { getProfileDashboard } from '@/actions/profile';
import { 
  Flame, 
  Brain, 
  Heart, 
  Calendar, 
  MessageCircle, 
  Dices, 
  Palette, 
  BookOpen,
  Ticket,
  ListChecks,
  FlameKindling
} from 'lucide-react';
import Link from 'next/link';
import InstallHint from '@/components/InstallHint';

export default async function DashboardPage() {
  const { success, profile } = await getCurrentProfile();

  // Protect the route: if not logged in or not paired, kick them out
  if (!success || !profile) redirect('/');
  if (!profile.partner_id) redirect('/pair');

  const dashboard = await getProfileDashboard(profile.user_id || profile.$id || '');
  const hasDashboard = dashboard.success && dashboard.profile;
  const streakCount = hasDashboard ? dashboard.profile.currentStreak : 0;
  const bestStreak = hasDashboard ? dashboard.profile.bestStreak : streakCount;

  // Placeholders for names - eventually these can come from a 'Partners' collection fetch
  const userName = "Daniel"; 
  const partnerName = "Tania";

  return (
    <main className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      
      {/* PWA Install Hint for iOS users */}
      <InstallHint />

      {/* Header section */}
      <header className="text-center pt-8">
        <h1 className="text-3xl font-serif mb-2 text-white">Good Evening, {userName}</h1>
        <p className="text-sm text-purple-300/70">You & {partnerName} are on a journey together</p>
      </header>

      {/* Streak Card */}
      <section className="bg-gradient-to-br from-[#1a1525] to-[#120e1a] border border-purple-800/30 rounded-2xl p-6 flex justify-between items-center shadow-xl">
        <div>
          <p className="text-xs text-purple-300/70 mb-1 uppercase tracking-wider">Current Streak</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-white">{streakCount}</span>
            <span className="text-purple-300/70">days</span>
          </div>
          <p className="text-xs text-purple-300/50 mt-2">↗ Best: {bestStreak} days</p>
        </div>
        <div className="h-16 w-16 bg-purple-900/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.2)]">
          <Flame className="text-purple-400" size={32} />
        </div>
      </section>

      {/* Today's Question Prompt */}
      <section className="bg-gradient-to-b from-[#251b3b] to-[#1a1525] border border-purple-700/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle size={18} className="text-purple-300" />
          <h2 className="font-serif text-lg text-white">Today&apos;s Question</h2>
        </div>
        <p className="text-purple-200/80 text-sm mb-6 leading-relaxed italic">
          &quot;What&apos;s something you&apos;ve never told me that you&apos;ve been wanting to share?&quot;
        </p>
        <Link 
          href="/dashboard/today"
          className="block w-full text-center py-3 bg-purple-600 hover:bg-purple-500 transition-colors text-white font-medium rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)]"
        >
          Answer Now →
        </Link>
      </section>

      {/* Explore Together Menu */}
      <section className="space-y-3 pb-24">
        <h3 className="text-sm text-purple-300/70 mb-4 font-serif">Explore Together</h3>
        
        {/* NEW FEATURES WIRED UP */}
        <MenuCard 
          href="/dashboard/chat" 
          icon={<MessageCircle />} 
          title="Private Chat" 
          desc="Encrypted whispers just for us" 
          color="text-purple-400" 
        />
        <MenuCard 
          href="/dashboard/dice" 
          icon={<Dices />} 
          title="Spicy Dice" 
          desc="Let fate decide your evening" 
          color="text-pink-400" 
        />
        <MenuCard 
          href="/dashboard/canvas" 
          icon={<Palette />} 
          title="Shared Canvas" 
          desc="Draw together in real-time" 
          color="text-blue-400" 
        />
        <MenuCard 
            href="/dashboard/vault" 
            icon={<BookOpen />} 
            title="Memory Vault" 
            desc="Revisit your shared reflections" 
            color="text-amber-400" 
        />
        <MenuCard
          href="/dashboard/notes"
          icon={<Heart />}
          title="Love Notes"
          desc="Leave messages for each other"
          color="text-rose-400"
        />
        <MenuCard
          href="/dashboard/coupons"
          icon={<Ticket />}
          title="Love Coupons"
          desc="Create and redeem sweet coupons"
          color="text-emerald-400"
        />
        <MenuCard
          href="/dashboard/bucket-list"
          icon={<ListChecks />}
          title="Bucket List"
          desc="Build your dreams together"
          color="text-cyan-400"
        />
        <MenuCard
          href="/dashboard/fantasy"
          icon={<FlameKindling />}
          title="Fantasy Matcher"
          desc="Swipe and discover shared desires"
          color="text-fuchsia-400"
        />
        <MenuCard
          href="/dashboard/thumb-kiss"
          icon={<Heart />}
          title="Thumb Kiss"
          desc="Sync finger touches in real-time"
          color="text-pink-400"
        />
        <MenuCard
          href="/dashboard/memories"
          icon={<BookOpen />}
          title="Memories"
          desc="Save milestones with photos"
          color="text-amber-400"
        />
        <MenuCard
          href="/dashboard/social"
          icon={<MessageCircle />}
          title="Social Feed"
          desc="Track accounts and post links together"
          color="text-purple-400"
        />
        
        {/* PLACEHOLDERS FOR FUTURE FEATURES */}
        <MenuCard href="/dashboard/trivia" icon={<Brain />} title="Trivia Game" desc="Ready up and play in turns" color="text-fuchsia-400" />
        <MenuCard href="/dashboard/dates" icon={<Calendar />} title="Date Ideas" desc="Generate and save date plans" color="text-amber-400" />
      </section>
    </main>
  );
}

function MenuCard({ 
  icon, 
  title, 
  desc, 
  color, 
  href 
}: { 
  icon: React.ReactNode, 
  title: string, 
  desc: string, 
  color: string, 
  href: string 
}) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-4 p-4 bg-[#1a1525]/50 border border-purple-900/30 rounded-xl hover:bg-[#1a1525] transition-colors group"
    >
      <div className={`p-3 bg-black/20 rounded-lg ${color} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-purple-100">{title}</h4>
        <p className="text-xs text-purple-300/50">{desc}</p>
      </div>
      <div className="text-purple-800 group-hover:text-purple-500 transition-colors">→</div>
    </Link>
  );
}
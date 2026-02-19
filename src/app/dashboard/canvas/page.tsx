// src/app/dashboard/canvas/page.tsx
import SharedCanvas from '@/components/SharedCanvas';
import { getCurrentProfile } from '@/actions/auth';
import { redirect } from 'next/navigation';

export default async function CanvasPage() {
  const auth = await getCurrentProfile();

  // Redirect if not logged in or no partner linked
  if (!auth.success || !auth.profile) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-[#0d0a14] pt-8 pb-20">
      <header className="px-6 mb-8">
        <h1 className="text-3xl font-serif text-white">Artistic Connection</h1>
        <p className="text-purple-300/60 text-sm mt-1">
          Draw in real-time with your partner.
        </p>
      </header>

      <section className="px-4">
        {/* Pass the IDs from our auth action into the client component */}
        <SharedCanvas 
          userId={auth.userId!} 
          partnerId={auth.profile.partner_id} 
        />
      </section>
      
      <div className="mt-8 px-6">
        <div className="bg-[#1a1525] p-4 rounded-2xl border border-purple-900/30">
          <h3 className="text-purple-200 text-xs font-bold uppercase tracking-widest mb-2">Pro Tip</h3>
          <p className="text-xs text-purple-300/50 leading-relaxed">
            Your sketches are saved automatically. Use the trash icon to clear your local view, or simply draw over old memories.
          </p>
        </div>
      </div>
    </main>
  );
}
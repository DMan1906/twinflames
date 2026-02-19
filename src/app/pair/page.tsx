// src/app/pair/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import PairingForm from '@/components/PairingForm';

export default async function PairPage() {
  const { success, profile, userId } = await getCurrentProfile();

  // If not logged in, boot them to the root login screen
  if (!success || !profile || !userId) {
    redirect('/'); 
  }

  // If already paired, boot them to the dashboard
  if (profile.partner_id) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0d0a14] p-4">
      <PairingForm myCode={profile.pair_code} myUserId={userId} />
    </main>
  );
}
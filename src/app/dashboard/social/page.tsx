import { Suspense } from 'react';
import SocialPageClient from '@/components/SocialPageClient';

export default function SocialPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0d0a14] p-6">Loading...</main>}>
      <SocialPageClient />
    </Suspense>
  );
}

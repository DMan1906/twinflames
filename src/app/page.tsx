// src/app/page.tsx
import AuthForm from '@/components/AuthForm';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0d0a14] p-4">
      <AuthForm />
    </main>
  );
}
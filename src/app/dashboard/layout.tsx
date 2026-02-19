// src/app/dashboard/layout.tsx
import BottomNav from '@/components/BottomNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0d0a14] text-white pb-20">
      {/* The main content of the specific page goes here */}
      <div className="max-w-md mx-auto w-full">
        {children}
      </div>
      
      {/* Persistent navigation */}
      <BottomNav />
    </div>
  );
}
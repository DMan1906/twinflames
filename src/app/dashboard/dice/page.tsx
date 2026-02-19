// src/app/dashboard/dice/page.tsx
import SpicyDice from '@/components/SpicyDice';

export default function DicePage() {
  return (
    <main className="p-6 space-y-8">
      <header className="pt-8">
        <h1 className="text-3xl font-serif text-white">Spicy Dice</h1>
        <p className="text-purple-300/70 text-sm">Let fate decide your evening.</p>
      </header>

      <SpicyDice />

      <div className="bg-[#1a1525] p-6 rounded-2xl border border-purple-900/30">
        <h3 className="text-purple-200 font-medium mb-2">How to play</h3>
        <p className="text-sm text-purple-300/60 leading-relaxed">
          Tap each die individually to roll for an action, a body part, and a location. 
          Use these as prompts for your intimate time together.
        </p>
      </div>
    </main>
  );
}
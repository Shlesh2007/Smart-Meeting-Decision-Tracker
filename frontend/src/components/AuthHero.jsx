import React from 'react';

export function AuthHero() {
  return (
    <div className="hidden lg:block relative w-[50vw] h-screen overflow-hidden bg-[#050a17] border-r border-slate-800 select-none shrink-0">
      <img
        src="/auth-hero.png"
        alt="Smart Meeting Decision Tracker"
        className="absolute inset-0 w-full h-full object-cover object-left"
      />
    </div>
  );
}

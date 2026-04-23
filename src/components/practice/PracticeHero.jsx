import React from 'react';

export default function PracticeHero({ activeTab, categories }) {
  const label = activeTab === 'all' ? 'Amaliyot' : categories.find(c => c.id === activeTab)?.label;
  
  return (
    <div className="max-w-[1440px] mx-auto px-6">
      <div className="pt-16 pb-8 animate-in fade-in duration-1000">
        <h1 className="text-[64px] md:text-[80px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">
          {label}
        </h1>
      </div>
    </div>
  );
}

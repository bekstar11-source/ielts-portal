import React from 'react';

export default function PracticeHero({ activeTab, categories, totalCount, filteredCount }) {
  const label = activeTab === 'all' ? 'Amaliyot' : categories.find(c => c.id === activeTab)?.label;
  
  return (
    <div className="max-w-[1440px] mx-auto px-6">
      <div className="pt-6 md:pt-10 pb-4 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8">
        {/* Left: Main Label */}
        <h1 className="text-[42px] md:text-[80px] font-semibold text-[#1d1d1f] tracking-tight leading-none group cursor-default">
          <span className="inline-block px-3 py-1 md:px-4 md:py-2 -ml-3 md:-ml-4 rounded-none transition-all duration-500 bg-gradient-to-r from-[#1d1d1f] to-[#1d1d1f] bg-[length:0%_100%] bg-left bg-no-repeat group-hover:bg-[length:100%_100%] group-hover:text-white">
            {label}
          </span>
        </h1>

        {/* Right: Word Blur Content (Stacked) */}
        <div className="flex flex-col items-start md:items-end text-left md:text-right max-w-2xl">
          <h2 className="text-[20px] md:text-[42px] font-bold tracking-tight leading-tight flex flex-nowrap justify-start md:justify-end gap-x-2 md:gap-x-3 whitespace-nowrap">
            <span className="text-[#0071e3]">Where</span>
            <span className="text-[#0071e3] blur-[4px] md:blur-[7px] hover:blur-0 opacity-50 hover:opacity-100 transition-all duration-700 cursor-default select-none">curiosity</span>
            <span className="text-[#0071e3]">meets</span>
            <span className="text-[#0071e3] blur-[4px] md:blur-[7px] hover:blur-0 opacity-50 hover:opacity-100 transition-all duration-700 cursor-default select-none">excellence.</span>
          </h2>
          <p className="mt-2 md:mt-4 text-[#6e6e73] text-[13px] md:text-[17px] font-medium leading-none whitespace-nowrap">
            Dive into our handpicked IELTS passages and master your skills.
          </p>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { Search } from 'lucide-react';

export default function PracticeFilters({ 
  activeTab, 
  setActiveTab, 
  activeSubTab, 
  handleSubTabClick, 
  readingFilters, 
  categories, 
  searchQuery, 
  setSearchQuery,
  handleTabClick
}) {
  return (
    <div className="sticky top-[44px] z-40 w-full bg-white/40 backdrop-blur-xl mb-16 py-3">
      <div className="max-w-[1440px] mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="bg-[#f5f5f7] p-1.5 rounded-full flex items-center overflow-x-auto no-scrollbar">
          <LayoutGroup id="practice-filters">
            {activeTab === 'reading' ? (
              readingFilters.map((filter) => {
                const isActive = activeSubTab === filter.id;
                return (
                  <button 
                    key={filter.id}
                    onClick={() => handleSubTabClick(filter)}
                    className="relative px-6 py-2 rounded-full text-[14px] font-medium transition-colors duration-300 outline-none whitespace-nowrap"
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="active-sub-pill"
                        className="absolute inset-0 bg-[#1d1d1f] rounded-full"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 ${isActive ? 'text-white' : 'text-[#1d1d1f] hover:text-black/50'}`}>
                      {filter.label}
                    </span>
                  </button>
                );
              })
            ) : (
              categories.map((cat) => {
                const isActive = activeTab === cat.id;
                return (
                  <button 
                    key={cat.id}
                    onClick={() => handleTabClick(cat.id)}
                    className="relative px-6 py-2 rounded-full text-[14px] font-medium transition-colors duration-300 outline-none whitespace-nowrap"
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="active-pill"
                        className="absolute inset-0 bg-[#1d1d1f] rounded-full"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 ${isActive ? 'text-white' : 'text-[#1d1d1f] hover:text-black/50'}`}>
                      {cat.label}
                    </span>
                  </button>
                );
              })
            )}
          </LayoutGroup>
        </div>

        <div className="relative flex items-center bg-[#f5f5f7] rounded-full px-5 py-2.5 w-full md:w-56 transition-all focus-within:md:w-72 focus-within:bg-white focus-within:ring-1 focus-within:ring-[#0066cc]/20 shadow-sm shadow-black/5">
          <Search size={16} className="text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder="Testlarni qidirish..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-[14px] text-[#1d1d1f] placeholder-gray-400"
          />
        </div>
      </div>
    </div>
  );
}

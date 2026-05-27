import React from 'react';
import { Home, BookOpen, Headphones, Trophy, Settings } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'podcasts', label: 'Podcasts', icon: Headphones },
    { id: 'results', label: 'Results', icon: Trophy },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#09090b] border-t border-zinc-200 dark:border-zinc-800/80 z-[100] px-4 py-2 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-[safe-area-inset-bottom]">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
                isActive 
                  ? 'text-[#0066cc] dark:text-[#3894ff] font-bold' 
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Icon size={20} className={isActive ? 'scale-110 transition-transform' : 'transition-transform'} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

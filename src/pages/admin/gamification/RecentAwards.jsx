import React from 'react';
import { Star, Medal } from 'lucide-react';

const formatTimeAgo = (date) => {
    if (!date) return "N/A";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

export const RecentAwards = ({ awards, isDark }) => (
    <div className={`rounded-2xl sm:rounded-[24px] border p-4 sm:p-6 flex flex-col max-h-[460px] sm:max-h-[600px] min-w-0 transition-colors ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
        <h3 className="font-bold mb-4 sm:mb-6 flex items-center gap-2 text-sm uppercase tracking-wider opacity-70">
            <Star className="text-yellow-500" size={18} fill="currentColor" /> 
            Recent Awards
        </h3>

        <div className="flex-1 min-h-0 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar pr-2">
            {awards.length > 0 ? (
                awards.map((award, i) => (
                    <div key={i} className="flex gap-3 sm:gap-4 animate-in slide-in-from-right-2 duration-300">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                            <Medal size={24} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{award.title || 'Achievement Unlocked'}</p>
                            <p className="text-xs font-medium text-zinc-500">Awarded to <span className="text-blue-500 font-bold">{award.userName}</span></p>
                            <p className="text-[10px] font-black uppercase tracking-tighter opacity-30 mt-1">{formatTimeAgo(award.date)}</p>
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex-1 flex items-center justify-center text-center opacity-30 text-sm font-medium italic">
                    No recent awards found
                </div>
            )}
        </div>
        
        <button className="w-full mt-4 sm:mt-6 shrink-0 py-3 rounded-xl border border-dashed border-zinc-300 dark:border-white/10 font-bold text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:border-zinc-400 transition-all">
            View All History
        </button>
    </div>
);

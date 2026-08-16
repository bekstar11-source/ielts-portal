import React from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

// HOOKS
import { useAdminGamification } from '../../hooks/useAdminGamification';

// COMPONENTS
import { SeasonHeader } from './gamification/SeasonHeader';
import { LeaderboardTable } from './gamification/LeaderboardTable';
import { RecentAwards } from './gamification/RecentAwards';

export default function AdminGamification() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    const {
        loading,
        users,
        searchTerm,
        setSearchTerm,
        recentAwards,
        handleUpdatePoints,
        handleResetSeason,
        refresh
    } = useAdminGamification();

    // DYNAMIC SEASON TITLE
    const getWeekNumber = (d) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };
    const currentWeek = getWeekNumber(new Date());
    const currentYear = new Date().getFullYear();
    const seasonTitle = `Weekly Season #${currentWeek} (${currentYear})`;

    return (
        <div className={`min-h-full p-4 md:p-6 transition-colors duration-200 ${isDark ? 'bg-[#181715] text-white' : 'bg-[#F5F5F7] text-gray-900'}`}>

            {/* HEADER */}
            <div className="flex justify-between items-start gap-3 mb-6 md:mb-8">
                <div className="min-w-0">
                    <h1 className="text-lg md:text-2xl font-black tracking-tight flex items-center gap-2 md:gap-3">
                        <Trophy className="text-yellow-500 shrink-0" size={24} /> Gamification Control
                    </h1>
                    <p className={`text-xs md:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage leaderboard, user rewards and global ranking</p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={refresh}
                        className={`p-2.5 rounded-xl transition-all border shadow-sm ${isDark ? 'bg-[#1f1e1b] border-white/5 hover:bg-white/10 text-white' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* SEASON MANAGEMENT */}
                <SeasonHeader 
                    title={seasonTitle} 
                    onReset={handleResetSeason} 
                    isDark={isDark} 
                />

                {/* LEADERBOARD TABLE */}
                <LeaderboardTable 
                    users={users}
                    loading={loading}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    onUpdatePoints={handleUpdatePoints}
                    isDark={isDark}
                />

                {/* RECENT AWARDS FEED */}
                <RecentAwards 
                    awards={recentAwards} 
                    isDark={isDark} 
                />
            </div>
        </div>
    );
}

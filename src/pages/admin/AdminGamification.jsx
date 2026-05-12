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
        <div className={`min-h-screen p-6 transition-colors duration-200 ${isDark ? 'bg-[#121212] text-white' : 'bg-[#F5F5F7] text-gray-900'}`}>

            {/* HEADER */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <Trophy className="text-yellow-500" size={28} /> Gamification Control
                    </h1>
                    <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage leaderboard, user rewards and global ranking</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={refresh}
                        className={`p-2.5 rounded-xl transition-all border shadow-sm ${isDark ? 'bg-[#1E1E1E] border-white/5 hover:bg-white/10 text-white' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

import React from 'react';
import { useTheme } from '../../context/ThemeContext';

// HOOKS
import { useAdminAnalytics } from '../../hooks/useAdminAnalytics';

// COMPONENTS
import { KPISection } from './analytics/KPISection';
import { ChartsRowOne } from './analytics/ChartsRowOne';
import { ChartsRowTwo } from './analytics/ChartsRowTwo';

export default function AdminAnalytics() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    const {
        loading,
        stats,
        activityData,
        scoreDist,
        skillRadar,
        atRiskStudents
    } = useAdminAnalytics();

    if (loading) return (
        <div className={`h-full min-h-[60vh] flex items-center justify-center transition-colors ${isDark ? 'bg-[#181715]' : 'bg-gray-50'}`}>
            <div className={`animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full`}></div>
        </div>
    );

    return (
        <div className={`p-4 md:p-6 transition-colors duration-200 ${isDark ? 'bg-[#181715] text-white' : 'bg-[#F5F5F7] text-gray-900'}`}>

            {/* HEADER */}
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6 md:mb-8">
                <div className="min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold mb-1 tracking-tight">Advanced Analytics</h1>
                    <p className={`text-xs md:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Platform performance overview</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${isDark ? 'bg-green-500/10 text-green-500' : 'bg-green-100 text-green-700'}`}>
                        Live Data
                    </span>
                </div>
            </div>

            {/* KPI GRID */}
            <KPISection stats={stats} isDark={isDark} />

            {/* CHARTS ROW 1: ACTIVITY & RADAR */}
            <ChartsRowOne 
                activityData={activityData} 
                skillRadar={skillRadar} 
                isDark={isDark} 
            />

            {/* CHARTS ROW 2: DISTRIBUTION & AT-RISK */}
            <ChartsRowTwo 
                scoreDist={scoreDist} 
                atRiskStudents={atRiskStudents} 
                isDark={isDark} 
            />
        </div>
    );
}
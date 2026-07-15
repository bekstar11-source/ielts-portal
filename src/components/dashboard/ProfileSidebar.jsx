import React from 'react';
import { useTranslation } from '../../context/LanguageContext';

export default function ProfileSidebar({ 
    user, 
    userData, 
    stats, 
    statsLoading, 
    onLogoutClick, 
    onSeeAllClick 
}) {
    const { t } = useTranslation();

    // Construct a clean username from full name or email
    const myUsername = userData?.username || 
                       (userData?.fullName 
                        ? userData.fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) 
                        : user?.email?.split('@')[0] || 'student');
    
    const myFullName = userData?.fullName || user?.displayName || "IELTS Student";
    const myAvatar = userData?.photoURL || user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80";

    const getSubscriptionStatus = () => {
        const isPremium = userData?.accountType === 'pro' || userData?.accountType === 'standard' || userData?.isPro;
        if (!isPremium) return { label: 'Bepul tarif', expiry: null };

        const tierLabel = userData?.accountType === 'pro' ? 'PRO obuna' : 'Standard obuna';
        
        let expiryDate = null;
        if (userData?.subscriptionEnd) {
            try {
                const dateObj = userData.subscriptionEnd.seconds 
                    ? new Date(userData.subscriptionEnd.seconds * 1000) 
                    : new Date(userData.subscriptionEnd);
                
                if (!isNaN(dateObj.getTime())) {
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const year = dateObj.getFullYear();
                    expiryDate = `${day}.${month}.${year}`;
                }
            } catch (e) {
                console.error("Error parsing subscriptionEnd date:", e);
            }
        }
        
        return { label: tierLabel, expiry: expiryDate };
    };

    const sub = getSubscriptionStatus();

    // Calculate skill averages
    const listeningAvg = stats?.skillAverages?.listening ? parseFloat(stats.skillAverages.listening).toFixed(1) : '0.0';
    const readingAvg = stats?.skillAverages?.reading ? parseFloat(stats.skillAverages.reading).toFixed(1) : '0.0';
    const writingAvg = stats?.skillAverages?.writing ? parseFloat(stats.skillAverages.writing).toFixed(1) : '0.0';
    const speakingAvg = stats?.skillAverages?.speaking ? parseFloat(stats.skillAverages.speaking).toFixed(1) : '0.0';

    // Calculate Overall Band Score
    const roundToIELTSBand = (score) => {
        const num = parseFloat(score);
        if (!num || isNaN(num)) return 0;
        return Math.round(num * 2) / 2;
    };

    const r = roundToIELTSBand(stats?.skillAverages?.reading || 0);
    const l = roundToIELTSBand(stats?.skillAverages?.listening || 0);
    const w = roundToIELTSBand(stats?.skillAverages?.writing || 0);
    const s = roundToIELTSBand(stats?.skillAverages?.speaking || 0);

    const avg = (r + l + w + s) / 4;
    const overallBandComputed = Math.round(avg * 2) / 2;
    const calculatedOverallBand = overallBandComputed > 0 
        ? overallBandComputed.toFixed(1) 
        : parseFloat(userData?.currentBand || 0).toFixed(1);

    const targetBand = parseFloat(userData?.targetBand || 7.5).toFixed(1);

    const daysUntilExam = userData?.examDate
        ? Math.max(0, Math.ceil((new Date(userData.examDate) - new Date()) / 86400000))
        : null;

    return (
        <div className="w-full flex flex-col gap-4 text-[#1d1d1f] dark:text-[#f5f5f7] select-none font-sans pt-4">
            {/* Current user section */}
            <div className="flex items-center justify-between gap-4 py-1.5">
                <div className="flex items-center gap-3.5 min-w-0">
                    <img 
                        src={myAvatar} 
                        alt={myFullName} 
                        className="w-11 h-11 rounded-full object-cover border border-gray-150 dark:border-white/10 shadow-sm"
                        onError={(e) => {
                            e.target.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${myFullName}`;
                        }}
                    />
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-[14px] text-zinc-900 dark:text-zinc-100 truncate tracking-tight hover:underline cursor-pointer">
                            {myUsername}
                        </span>
                        <span className="text-[13px] text-zinc-400 dark:text-zinc-500 truncate leading-tight">
                            {myFullName}
                        </span>
                    </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end leading-tight">
                    <span className={`text-[12px] font-extrabold ${sub.expiry ? 'text-emerald-500 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {sub.label}
                    </span>
                    {sub.expiry && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium whitespace-nowrap">
                            {sub.expiry} gacha
                        </span>
                    )}
                </div>
            </div>

            {/* Overall Band Score Card */}
            {statsLoading ? (
                <div className="w-full bg-white dark:bg-zinc-900/40 text-zinc-800 dark:text-zinc-100 border border-zinc-200/85 dark:border-zinc-800/85 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl p-5 animate-pulse mt-3">
                    <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2 mb-4"></div>
                    <div className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded w-1/3 mb-6"></div>
                    <div className="space-y-3">
                        <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                        <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                        <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                    </div>
                </div>
            ) : (
                <div className="w-full bg-white dark:bg-zinc-900/40 text-zinc-800 dark:text-zinc-100 border border-zinc-200/85 dark:border-zinc-800/85 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl p-5 mt-3">
                    {/* Header: Title and Icon */}
                    <div className="flex items-center justify-between mb-5">
                        <span className="text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
                            OVERALL BAND SCORE
                        </span>
                        <div className="p-1 rounded bg-[#007aff]/5 dark:bg-[#007aff]/10 text-[#007aff] flex items-center justify-center shadow-sm">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10"></line>
                                <line x1="12" y1="20" x2="12" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                        </div>
                    </div>

                    {/* Large score display */}
                    <div className="flex items-baseline mb-5">
                        <span className="text-[52px] font-black text-zinc-950 dark:text-white tracking-tight leading-none">
                            {calculatedOverallBand}
                        </span>
                        <span className="text-[22px] font-black text-zinc-950 dark:text-white ml-2.5 leading-none">
                            / 9.0
                        </span>
                    </div>

                    {/* Skills Container */}
                    <div className="bg-zinc-50 dark:bg-[#18181b]/40 rounded-xl border border-zinc-150 dark:border-zinc-800/60 overflow-hidden mb-5">
                        {/* Listening */}
                        <div className="flex items-center justify-between px-3.5 py-3 border-b border-zinc-150 dark:border-zinc-800/60">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    {t('dashboard.listening')}
                                </span>
                            </div>
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                {listeningAvg}
                            </span>
                        </div>

                        {/* Reading */}
                        <div className="flex items-center justify-between px-3.5 py-3 border-b border-zinc-150 dark:border-zinc-800/60">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF]" />
                                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    {t('dashboard.reading')}
                                </span>
                            </div>
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                {readingAvg}
                            </span>
                        </div>

                        {/* Writing */}
                        <div className="flex items-center justify-between px-3.5 py-3 border-b border-zinc-150 dark:border-zinc-800/60">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9500]" />
                                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    {t('dashboard.writing')}
                                </span>
                            </div>
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                {writingAvg}
                            </span>
                        </div>

                        {/* Speaking */}
                        <div className="flex items-center justify-between px-3.5 py-3">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#AF52DE]" />
                                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    {t('dashboard.speaking')}
                                </span>
                            </div>
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                {speakingAvg}
                            </span>
                        </div>
                    </div>

                    {/* Footer rows inside card: Target Score & Until Exam */}
                    <div className="flex flex-col gap-3.5 pt-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-450 dark:text-zinc-500">
                                {t('dashboard.targetScore')}
                            </span>
                            <span className="text-base font-extrabold text-zinc-800 dark:text-zinc-200">
                                {targetBand}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-450 dark:text-zinc-500">
                                {t('dashboard.untilExam')}
                            </span>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50/70 dark:bg-[#1a1a2e]/60 border border-indigo-100/50 dark:border-[#2a2a4a]/40 text-[11px] font-bold text-indigo-600 dark:text-[#8a8aff] transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-[#5d5dff]" />
                                <span>{daysUntilExam !== null ? `${daysUntilExam} ${t('dashboard.daysUnit')}` : '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

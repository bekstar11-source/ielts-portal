import React from 'react';
import { useTranslation } from '../../context/LanguageContext';
import {
    hasActiveSubscription,
    getSubscriptionEnd,
    getTierLabel
} from '../../utils/subscription';

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
        // Muddati o'tgan obuna endi shu yerda ham "Bepul tarif" ko'rinadi.
        if (!hasActiveSubscription(userData)) return { label: 'Bepul tarif', expiry: null };

        const dateObj = getSubscriptionEnd(userData);
        let expiryDate = null;
        if (dateObj) {
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            expiryDate = `${day}.${month}.${dateObj.getFullYear()}`;
        }

        return { label: getTierLabel(userData), expiry: expiryDate };
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
        <div className="w-full rounded-2xl border border-warm-hairline dark:border-white/5 bg-warm-canvas dark:bg-warm-dark-elevated shadow-xl overflow-hidden font-sans select-none text-warm-ink dark:text-warm-on-dark">
            {/* Current user section (mirrors AdminSidebar logo/header bar) */}
            <div className="h-16 flex items-center justify-between gap-3 px-4 border-b border-warm-hairline dark:border-white/5 bg-inherit">
                <div className="flex items-center gap-3 min-w-0">
                    <img
                        src={myAvatar}
                        alt={myFullName}
                        className="w-9 h-9 rounded-lg object-cover border border-warm-hairline dark:border-white/10 flex-shrink-0"
                        onError={(e) => {
                            e.target.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${myFullName}`;
                        }}
                    />
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-[13px] tracking-tight truncate text-warm-ink dark:text-warm-on-dark hover:underline cursor-pointer">
                            {myUsername}
                        </span>
                        <span className="text-[11px] text-warm-muted-soft dark:text-warm-on-dark-soft truncate leading-tight">
                            {myFullName}
                        </span>
                    </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end leading-tight">
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${sub.expiry ? 'text-warm-primary dark:text-warm-primary' : 'text-warm-muted-soft dark:text-warm-on-dark-soft'}`}>
                        {sub.label}
                    </span>
                    {sub.expiry && (
                        <span className="text-[9px] text-warm-muted-soft dark:text-warm-on-dark-soft font-medium whitespace-nowrap">
                            {sub.expiry} gacha
                        </span>
                    )}
                </div>
            </div>

            {/* Overall Band Score */}
            {statsLoading ? (
                <div className="p-3.5 animate-pulse">
                    <div className="h-8 bg-warm-surface dark:bg-white/5 rounded w-2/3 mb-3"></div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="h-11 bg-warm-surface dark:bg-white/5 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="p-3.5">
                    {/* Ball + maqsad/imtihon — bitta qatorda (ilgari uch blok edi) */}
                    <div className="flex items-end justify-between gap-3 mb-3 px-1">
                        <div className="min-w-0">
                            <span className="block text-[9px] font-bold uppercase tracking-widest text-warm-muted-soft dark:text-warm-muted mb-1">
                                OVERALL BAND
                            </span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-[30px] font-black text-warm-ink dark:text-warm-on-dark tracking-tight leading-none">
                                    {calculatedOverallBand}
                                </span>
                                <span className="text-[13px] font-bold text-warm-muted-soft dark:text-warm-on-dark-soft leading-none">
                                    / 9.0
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] font-semibold text-warm-muted-soft dark:text-warm-on-dark-soft whitespace-nowrap">
                                {t('dashboard.targetScore')}
                                <b className="ml-1 text-warm-ink dark:text-warm-on-dark">{targetBand}</b>
                            </span>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-warm-primary/10 dark:bg-warm-primary/20 text-[10px] font-bold text-warm-primary whitespace-nowrap">
                                <span className="w-1 h-1 rounded-full bg-warm-primary" />
                                <span>{daysUntilExam !== null ? `${daysUntilExam} ${t('dashboard.daysUnit')}` : '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Bo'limlar — 2×2 katak (ilgari 4 ta baland qator edi) */}
                    <div className="grid grid-cols-2 gap-1.5">
                        {[
                            { key: 'listening', label: t('dashboard.listening'), value: listeningAvg, dot: 'bg-emerald-500' },
                            { key: 'reading', label: t('dashboard.reading'), value: readingAvg, dot: 'bg-blue-600' },
                            { key: 'writing', label: t('dashboard.writing'), value: writingAvg, dot: 'bg-amber-500' },
                            // "Speaking with AI" tor katakka sig'maydi — birinchi so'z yetarli.
                            { key: 'speaking', label: t('dashboard.speaking').split(' ')[0], value: speakingAvg, dot: 'bg-purple-500' },
                        ].map((skill) => (
                            <div
                                key={skill.key}
                                className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-warm-surface/60 dark:bg-white/[0.03] hover:bg-warm-surface dark:hover:bg-white/[0.06] transition-colors"
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${skill.dot}`} />
                                    <span className="text-[10px] font-semibold uppercase tracking-wide truncate text-warm-muted dark:text-warm-on-dark-soft">
                                        {skill.label}
                                    </span>
                                </div>
                                <span className="text-[13px] font-bold text-warm-ink dark:text-warm-on-dark">
                                    {skill.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

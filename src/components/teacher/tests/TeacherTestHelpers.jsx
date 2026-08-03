import React from 'react';
import { useTranslation } from '../../../context/LanguageContext';

// SVG ring progress chart
export const RingChart = ({ pct, isDark }) => {
    const r = 17;
    const circ = 2 * Math.PI * r;
    const color = pct === 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';
    return (
        <div className="relative shrink-0 w-11 h-11 flex items-center justify-center">
            <svg width="44" height="44" viewBox="0 0 44 44" className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="22" cy="22" r={r} fill="none" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth={5} />
                <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth={5}
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - pct / 100)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
            </svg>
            <span className="relative text-[9px] font-black leading-none" style={{ color }}>{pct}%</span>
        </div>
    );
};

// Deadline countdown badge
export const DeadlineCountdown = ({ deadline, isDark }) => {
    const { t } = useTranslation();
    if (!deadline) return <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t('teacher.tests.deadlineCountdown.noDeadline') || 'Cheksiz muddat'}</span>;
    const now = new Date();
    const dl = new Date(deadline);
    const diff = dl - now;
    if (diff < 0) return <span className="text-rose-500 font-bold">{t('teacher.tests.deadlineCountdown.expired') || "Muddati o'tgan"}</span>;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const color = days === 0 ? 'text-rose-500' : days <= 2 ? 'text-amber-500' : (isDark ? 'text-gray-300' : 'text-gray-700');
    if (days > 0) return <span className={`font-bold ${color}`}>{(t('teacher.tests.deadlineCountdown.daysLeft') || '{n} kun qoldi').replace('{n}', `${days}d ${hours}h`)}</span>;
    if (hours > 0) return <span className="font-bold text-rose-500">{(t('teacher.tests.deadlineCountdown.hoursLeft') || '{n} soat qoldi').replace('{n}', `${hours}h ${mins}m`)}</span>;
    return <span className="font-bold text-rose-600">{(t('teacher.tests.deadlineCountdown.minsLeft') || '{n} daqiqa qoldi').replace('{n}', mins)}</span>;
};

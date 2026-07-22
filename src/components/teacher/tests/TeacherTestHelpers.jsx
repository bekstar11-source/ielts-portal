import React from 'react';
import {
  BookOpen,
  NotePencil,
  Headphones,
  Trophy,
} from '@phosphor-icons/react';

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
    if (!deadline) return <span className="text-emerald-600 dark:text-emerald-400 font-bold">Cheksiz muddat</span>;
    const now = new Date();
    const dl = new Date(deadline);
    const diff = dl - now;
    if (diff < 0) return <span className="text-rose-500 font-bold">Muddati o'tgan</span>;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const color = days === 0 ? 'text-rose-500' : days <= 2 ? 'text-amber-500' : (isDark ? 'text-gray-300' : 'text-gray-700');
    if (days > 0) return <span className={`font-bold ${color}`}>{days}k {hours}s qoldi</span>;
    if (hours > 0) return <span className="font-bold text-rose-500">{hours}s {mins}d qoldi</span>;
    return <span className="font-bold text-rose-600">{mins} daqiqa qoldi!</span>;
};

export const getTestIconAndColor = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('reading')) return { icon: <BookOpen size={16} weight="fill" />, colorClass: 'bg-blue-500/10 text-blue-500' };
    if (t.includes('listening')) return { icon: <Headphones size={16} weight="fill" />, colorClass: 'bg-pink-500/10 text-pink-500' };
    if (t.includes('writing')) return { icon: <NotePencil size={16} weight="fill" />, colorClass: 'bg-orange-500/10 text-orange-500' };
    if (t.includes('podcast')) return { icon: <Headphones size={16} weight="fill" />, colorClass: 'bg-indigo-500/10 text-indigo-500' };
    if (t.includes('article')) return { icon: <BookOpen size={16} weight="fill" />, colorClass: 'bg-emerald-500/10 text-emerald-500' };
    return { icon: <Trophy size={16} weight="fill" />, colorClass: 'bg-purple-500/10 text-purple-500' };
};

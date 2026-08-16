import React from 'react';
import { CheckCircle2, Clock, Archive, Users, Gauge, LayoutList } from 'lucide-react';

const CARDS = [
    { key: 'total', label: 'Jami natija', icon: LayoutList, filter: 'all', accent: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' },
    { key: 'pending', label: 'Kutilmoqda', icon: Clock, filter: 'pending', accent: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10' },
    { key: 'graded', label: 'Baholangan', icon: CheckCircle2, filter: 'graded', accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' },
    { key: 'orphan', label: 'Arxiv (test o\'chirilgan)', icon: Archive, filter: 'orphan', accent: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10' },
    { key: 'students', label: 'O\'quvchilar', icon: Users, accent: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10' },
    { key: 'avgBand', label: "O'rtacha ball", icon: Gauge, accent: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10' },
];

/** Yuqoridagi statistika kartalari — statusli kartalar bosilganda filtr sifatida ham ishlaydi. */
const ResultsStats = ({ stats, isDark, statusFilter, onSelectStatus, loading }) => (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        {CARDS.map(({ key, label, icon, filter, accent }) => {
            const Icon = icon;
            const clickable = Boolean(filter);
            const active = clickable && statusFilter === filter;
            const value = key === 'avgBand' ? (stats?.avgBand ?? '-') : (stats?.[key] ?? 0);

            return (
                <button
                    key={key}
                    type="button"
                    disabled={!clickable}
                    onClick={clickable ? () => onSelectStatus(filter) : undefined}
                    aria-pressed={clickable ? active : undefined}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                        clickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default'
                    } ${
                        active
                            ? 'border-blue-500 ring-2 ring-blue-500/20 ' + (isDark ? 'bg-blue-500/10' : 'bg-blue-50/50')
                            : isDark
                                ? 'bg-[#1f1e1b] border-white/5 hover:border-white/10'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${accent}`}>
                        <Icon className="w-4 h-4" />
                    </div>
                    {loading ? (
                        <div className={`h-6 w-10 rounded animate-pulse ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                    ) : (
                        <div className={`text-2xl font-bold tracking-tight tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {value}
                        </div>
                    )}
                    <div className="text-[11px] font-medium text-gray-500 mt-0.5 truncate">{label}</div>
                </button>
            );
        })}
    </div>
);

export default ResultsStats;

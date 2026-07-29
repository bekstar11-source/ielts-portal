import React from 'react';
import { UserPlus, FileCheck } from 'lucide-react';

const timeAgo = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "hozir";
    if (mins < 60) return `${mins}m oldin`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}s oldin`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}k oldin`;
    return d.toLocaleDateString('uz-UZ');
};

const RecentActivity = ({ items = [], isDark }) => {
    if (!items.length) return null;

    return (
        <div className={`rounded-2xl border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-100'}`}>
            <div className="px-5 pt-5 pb-1 text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em]">
                So'nggi faoliyat
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/5">
                {items.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 px-5 py-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            item.type === 'user'
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                            {item.type === 'user' ? <UserPlus className="w-4 h-4" /> : <FileCheck className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {item.type === 'user'
                                    ? `${item.label} ro'yxatdan o'tdi`
                                    : `${item.label} — ${item.detail || 'test'} topshirdi`}
                            </p>
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">{timeAgo(item.date)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentActivity;

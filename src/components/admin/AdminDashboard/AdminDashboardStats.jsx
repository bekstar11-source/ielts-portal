import React from 'react';
import { Users, FileText, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, trend, icon: Icon, colorClass, isDark }) => (
    <div className={`col-span-12 sm:col-span-6 lg:col-span-4 rounded-2xl p-5 border
        ${isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-100'}`}>
        <div className="flex justify-between items-start">
            <div className={`p-2.5 rounded-xl ${colorClass}`}>
                <Icon className="w-5 h-5" />
            </div>
            {trend !== undefined && trend !== null && (
                <div className={`text-[11px] font-semibold flex items-center gap-1 ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{trend >= 0 ? `+${trend}%` : `${trend}%`}</span>
                </div>
            )}
        </div>
        <div className="mt-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</div>
            <h3 className="text-gray-400 dark:text-warm-muted text-xs font-medium mt-1">{title}</h3>
        </div>
    </div>
);

const AdminDashboardStats = ({ stats, isDark }) => {
    const trends = stats.trends || {};
    return (
        <div className="grid grid-cols-12 gap-4 mb-8">
            <StatCard
                title="O'quvchilar"
                value={stats.users}
                trend={trends.users}
                icon={Users}
                colorClass="bg-blue-500/10 text-blue-500"
                isDark={isDark}
            />
            <StatCard
                title="Testlar"
                value={stats.totalTests}
                trend={trends.tests}
                icon={FileText}
                colorClass="bg-purple-500/10 text-purple-600"
                isDark={isDark}
            />
            <StatCard
                title="Natijalar"
                value={stats.results}
                trend={trends.results}
                icon={BarChart3}
                colorClass="bg-orange-500/10 text-orange-600"
                isDark={isDark}
            />
        </div>
    );
};

export default AdminDashboardStats;

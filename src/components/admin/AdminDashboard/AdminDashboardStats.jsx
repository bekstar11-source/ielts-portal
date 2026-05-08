import React from 'react';
import { Users, FileText, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, trend, icon: Icon, colorClass, isDark }) => (
    <div className={`col-span-12 sm:col-span-6 lg:col-span-4 rounded-[20px] p-4 border shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group
        ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-100'}`}>
        <div className="flex justify-between items-start z-10 relative">
            <div>
                <h3 className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-[0.1em] mb-1.5">{title}</h3>
                <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</div>
                <div className={`text-[10px] mt-1.5 font-bold flex items-center gap-1 px-2 py-0.5 rounded-full w-fit ${trend >= 0 ? 'text-green-500 bg-green-500/10' : 'text-orange-500 bg-orange-500/10'}`}>
                    {trend >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {trend >= 0 ? `+${trend}%` : `${trend}%`}
                </div>
            </div>
            <div className={`p-2 rounded-lg transition-all duration-300 ${colorClass}`}>
                <Icon className="w-4 h-4" />
            </div>
        </div>
    </div>
);

const AdminDashboardStats = ({ stats, isDark }) => {
    return (
        <div className="grid grid-cols-12 gap-6 mb-8">
            <StatCard 
                title="O'quvchilar" 
                value={stats.users} 
                trend={12} 
                icon={Users} 
                colorClass="bg-blue-500/5 dark:bg-blue-400/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white"
                isDark={isDark}
            />
            <StatCard 
                title="Testlar" 
                value={stats.totalTests} 
                trend={5} 
                icon={FileText} 
                colorClass="bg-purple-500/5 dark:bg-purple-400/10 text-purple-600 group-hover:bg-purple-600 group-hover:text-white"
                isDark={isDark}
            />
            <StatCard 
                title="Natijalar" 
                value={stats.results} 
                trend={-2} 
                icon={BarChart3} 
                colorClass="bg-orange-500/5 dark:bg-orange-400/10 text-orange-600 group-hover:bg-orange-600 group-hover:text-white"
                isDark={isDark}
            />
        </div>
    );
};

export default AdminDashboardStats;

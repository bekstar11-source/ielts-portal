import React from 'react';
import { Users, FileText, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, trend, icon: Icon, colorClass, isDark }) => (
    <div className={`col-span-12 sm:col-span-6 lg:col-span-4 rounded-[24px] p-6 border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group
        ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-100'}`}>
        
        {/* Decorative background element */}
        <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${colorClass.split(' ')[0]}`}></div>
        
        <div className="flex justify-between items-start z-10 relative">
            <div>
                <h3 className="text-gray-400 dark:text-gray-500 text-[11px] font-black uppercase tracking-widest mb-2">{title}</h3>
                <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{value}</div>
                <div className={`text-[10px] mt-3 font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg w-fit ${trend >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                    {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{trend >= 0 ? `+${trend}%` : `${trend}%`}</span>
                    <span className="opacity-50 font-medium ml-1">last month</span>
                </div>
            </div>
            <div className={`p-3 rounded-2xl transition-all duration-500 shadow-sm ${colorClass}`}>
                <Icon className="w-5 h-5" />
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

import React from 'react';

export const KPICard = ({ title, value, icon: Icon, color, isDark }) => {
    const colorClasses = {
        blue: isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600',
        purple: isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600',
        orange: isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600',
        green: isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600',
    };

    return (
        <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-[24px] border shadow-sm transition-colors min-w-0 ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className={`p-2.5 sm:p-3 rounded-xl ${colorClasses[color]}`}>
                    <Icon size={20} />
                </div>
            </div>
            <div>
                <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{title}</p>
                <h3 className="text-2xl sm:text-3xl font-bold">{value}</h3>
            </div>
        </div>
    );
};

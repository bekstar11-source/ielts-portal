import React, { useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export default function AdvancedAnalyticsChart({ data = [], height = 350, seriesConfig }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const chartData = data || [];

    // Default series if none provided (but we'll pass them from AdminDashboard)
    const defaultConfig = [
        { key: 'tests', label: 'Testlar', color: '#3B82F6', type: 'count' },
        { key: 'score', label: 'O\'rtacha Ball', color: '#F59E0B', type: 'decimal' },
        { key: 'users', label: 'Yangi O\'quvchilar', color: '#EC4899', type: 'count' },
    ];

    const config = seriesConfig || defaultConfig;

    // Initialize visibility state based on config keys
    const [visibleSeries, setVisibleSeries] = useState(
        config.reduce((acc, s) => ({ ...acc, [s.key]: true }), {})
    );

    const toggleSeries = (key) => {
        setVisibleSeries(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Calculate totals or averages
    const stats = chartData.reduce((acc, curr) => {
        config.forEach(s => {
            acc[s.key] = (acc[s.key] || 0) + (curr[s.key] || 0);
        });
        return acc;
    }, {});

    // For "decimal" types, we might want to show the overall average instead of total
    const getDisplayTotal = (s) => {
        if (s.type === 'decimal') {
            const count = chartData.filter(d => d[s.key] > 0).length;
            return count > 0 ? (stats[s.key] / count).toFixed(1) : '0';
        }
        return stats[s.key] || 0;
    };

    const formatNumber = (num, type) => {
        if (type === 'decimal') return parseFloat(num).toFixed(1);
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num;
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className={`p-3 rounded-lg shadow-xl text-xs border ${isDark ? 'bg-[#2C2C2C] border-white/10' : 'bg-white border-gray-200'}`}>
                    <p className={`${isDark ? 'text-white/50' : 'text-gray-500'} mb-2 font-medium`}>{label}</p>

                    {payload.map((entry, index) => {
                        const s = config.find(c => c.key === entry.dataKey);
                        return (
                            <div key={index} className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                <span className={isDark ? "text-white/70" : "text-gray-600"}>{s?.label}:</span>
                                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>

                                    {s?.type === 'decimal' ? entry.value.toFixed(1) : entry.value.toLocaleString()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`border rounded-[24px] p-6 flex flex-col md:flex-row gap-8 min-h-[400px] transition-all duration-300 ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>


            {/* LEGEND ON THE LEFT */}
            <div className="w-full md:w-36 flex flex-col gap-6 pt-8">
                {config.map(s => (
                    <SeriesToggle 
                        key={s.key}
                        label={s.label} 
                        value={getDisplayTotal(s)} 
                        color={s.color} 
                        isActive={visibleSeries[s.key]} 
                        onToggle={() => toggleSeries(s.key)} 
                        format={(val) => formatNumber(val, s.type)}
                        isAvg={s.type === 'decimal'}
                        isDark={isDark}
                    />
                ))}

            </div>

            {/* CHART AREA */}
            <div className="flex-1 min-w-0 flex flex-col">
                <div style={{ width: '100%', height: height }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: isDark ? '#ffffff50' : '#9CA3AF', fontSize: 11 }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: isDark ? '#ffffff50' : '#9CA3AF', fontSize: 11 }}
                                tickFormatter={(val) => formatNumber(val, 'count')}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: isDark ? '#ffffff20' : '#e5e7eb', strokeWidth: 1 }} />

                            
                            {config.map(s => visibleSeries[s.key] && (
                                <Line 
                                    key={s.key}
                                    type="linear" 
                                    dataKey={s.key} 
                                    name={s.label}
                                    stroke={s.color} 
                                    strokeWidth={2} 
                                    dot={{ fill: s.color, r: 4, strokeWidth: 0 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    yAxisId={0} // We can use dual axis if needed, but for now single
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className={`text-center text-[10px] font-medium uppercase tracking-widest mt-2 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                    Analitika (kunlik tahlil)
                </div>

            </div>
        </div>
    );
}

function SeriesToggle({ label, value, color, isActive, onToggle, format, isAvg, isDark }) {

    return (
        <div className="flex flex-col gap-2">
            <p className={`text-[11px] font-medium uppercase tracking-wider truncate transition-colors ${isActive ? (isDark ? 'text-white/60' : 'text-gray-700') : (isDark ? 'text-white/20' : 'text-gray-400')}`} title={label}>{label}</p>
            <div className="flex items-center gap-3">
                <button 
                    onClick={onToggle}
                    className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors border ${isActive ? '' : (isDark ? 'border-white/20' : 'border-gray-300')}`}
                    style={{ backgroundColor: isActive ? color : 'transparent', borderColor: isActive ? color : '' }}
                >
                    {isActive && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </button>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold tracking-tight transition-colors" style={{ color: isActive ? color : (isDark ? '#ffffff20' : '#e5e7eb') }}>
                        {format(value)}
                    </span>
                    <span className={`text-[10px] font-medium transition-colors ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{isAvg ? 'avg' : 'total'}</span>
                </div>
            </div>
        </div>

    );
}

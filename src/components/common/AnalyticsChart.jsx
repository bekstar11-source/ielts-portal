import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export default function AnalyticsChart({ title, data, type = 'area', color = '#3B82F6', height = 300 }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className={`p-3 rounded-xl border shadow-lg ${isDark ? 'bg-[#2C2C2C] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                    <p className="text-xs font-medium opacity-50 mb-1">{label}</p>
                    <p className="text-sm font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                        {payload[0].value}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`p-6 rounded-[24px] border transition-colors ${isDark ? 'bg-[#272727] border-white/5' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center mb-6">
                <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                <select className={`text-xs p-2 rounded-lg outline-none border ${isDark ? 'bg-[#303030] border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                    <option>Bu hafta</option>
                    <option>Bu oy</option>
                    <option>Bu yil</option>
                </select>
            </div>

            <div style={{ width: '100%', height: height }}>
                <ResponsiveContainer>
                    {type === 'area' ? (
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id={`color${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#ffffff10' : '#f0f0f0'} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: isDark ? '#ffffff50' : '#9CA3AF', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: isDark ? '#ffffff50' : '#9CA3AF', fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: isDark ? '#ffffff20' : '#e5e7eb', strokeWidth: 1 }} />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={color}
                                strokeWidth={3}
                                fillOpacity={1}
                                fill={`url(#color${title.replace(/\s/g, '')})`}
                            />
                        </AreaChart>
                    ) : (
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#ffffff10' : '#f0f0f0'} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: isDark ? '#ffffff50' : '#9CA3AF', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: isDark ? '#ffffff50' : '#9CA3AF', fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? '#ffffff05' : '#f3f4f6' }} />
                            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}

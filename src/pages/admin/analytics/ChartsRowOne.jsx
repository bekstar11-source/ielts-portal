import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

export const ChartsRowOne = ({ activityData, skillRadar, isDark }) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* ACTIVITY CHART */}
        <div className={`col-span-2 p-6 rounded-[24px] border shadow-sm transition-colors ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
            <h3 className="text-lg font-bold mb-6">Weekly Activity</h3>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <AreaChart data={activityData}>
                        <defs>
                            <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#ffffff10" : "#e5e7eb"} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            itemStyle={{ color: isDark ? '#fff' : '#000' }}
                        />
                        <Area type="monotone" dataKey="tests" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorTests)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* SKILL RADAR */}
        <div className={`p-6 rounded-[24px] border shadow-sm transition-colors ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
            <h3 className="text-lg font-bold mb-2">Skill Balance</h3>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={skillRadar}>
                        <PolarGrid stroke={isDark ? "#ffffff20" : "#e5e7eb"} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 9]} tick={false} axisLine={false} />
                        <Radar name="Average Score" dataKey="A" stroke="#8B5CF6" strokeWidth={2} fill="#8B5CF6" fillOpacity={0.5} />
                        <Tooltip
                            contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderRadius: '12px', border: 'none' }}
                            itemStyle={{ color: isDark ? '#fff' : '#000' }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
);

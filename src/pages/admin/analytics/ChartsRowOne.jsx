import React, { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import AdvancedAnalyticsChart from '../../../components/common/AdvancedAnalyticsChart';

export const ChartsRowOne = ({ activityData, skillRadar, isDark }) => {
    const [chartRange, setChartRange] = useState("week");

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            {/* ACTIVITY CHART */}
            <AdvancedAnalyticsChart
                className="col-span-1 lg:col-span-2"
                data={chartRange === 'week' ? activityData?.slice(-7) : activityData}
                height={300}
                title="Faollik Statistikasi"
                headerActions={
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                        {["week", "month"].map(range => (
                            <button
                                key={range}
                                onClick={() => setChartRange(range)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${chartRange === range ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white/70'}`}
                            >
                                {range === 'week' ? 'Haftalik' : 'Oylik'}
                            </button>
                        ))}
                    </div>
                }
                seriesConfig={[
                    { key: 'tests', label: 'Bajarilgan Testlar', color: '#3B82F6', type: 'count' },
                    { key: 'score', label: 'O\'rtacha Ball', color: '#F59E0B', type: 'decimal' },
                    { key: 'users', label: 'Yangi O\'quvchilar', color: '#EC4899', type: 'count' },
                ]}
            />

            {/* SKILL RADAR */}
            <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-[24px] border shadow-sm transition-colors min-w-0 ${isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-200'}`}>
                <h3 className="text-base sm:text-lg font-bold mb-2">Skill Balance</h3>
                <div className="w-full h-[240px] sm:h-[300px]">
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
};

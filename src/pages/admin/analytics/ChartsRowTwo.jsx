import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle } from 'lucide-react';

export const ChartsRowTwo = ({ scoreDist, atRiskStudents, isDark }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* SCORE DISTRIBUTION */}
        <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-[24px] border shadow-sm transition-colors min-w-0 ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
            <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-6">Score Distribution</h3>
            <div className="w-full h-[220px] sm:h-[250px]">
                <ResponsiveContainer>
                    <BarChart data={scoreDist}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#ffffff10" : "#e5e7eb"} />
                        <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderRadius: '12px', border: 'none' }} />
                        <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* AT-RISK STUDENTS */}
        <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-[24px] border shadow-sm transition-colors min-w-0 ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
            <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-6 flex items-center gap-2">
                <AlertTriangle className="text-orange-500" size={20} /> At-Risk Students
            </h3>
            <div className="space-y-3 sm:space-y-4">
                {atRiskStudents.length > 0 ? (
                    atRiskStudents.map((student, i) => (
                        <div key={i} className={`flex items-center justify-between gap-2 p-3 sm:p-4 rounded-xl transition-colors ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                                    {student.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm truncate">{student.name}</p>
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Low Score in {student.subject}</p>
                                </div>
                            </div>
                            <span className="text-red-500 font-bold text-sm shrink-0">{student.score}</span>
                        </div>
                    ))
                ) : (
                    <div className={`p-4 text-center rounded-xl ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        No at-risk students detected.
                    </div>
                )}
            </div>
        </div>
    </div>
);

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
    ArrowLeft, TrendingUp, Users, Activity, AlertTriangle, CheckCircle,
    BookOpen, Headphones, PenTool, Mic, Calendar, Target
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function AdminAnalytics() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [loading, setLoading] = useState(true);

    // STATS STATE
    const [stats, setStats] = useState({
        totalTests: 0,
        avgScore: 0,
        activeStudents: 0,
        completionRate: 0
    });

    const [activityData, setActivityData] = useState([]);
    const [scoreDist, setScoreDist] = useState([]);
    const [skillRadar, setSkillRadar] = useState([]);
    const [recentTests, setRecentTests] = useState([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const [resultsSnap, usersSnap, testsSnap] = await Promise.all([
                    getDocs(query(collection(db, "results"), orderBy("createdAt", "asc"))),
                    getDocs(collection(db, "users")),
                    getDocs(collection(db, "tests"))
                ]);

                const results = resultsSnap.docs.map(d => ({ ...d.data(), createdAt: d.data().createdAt?.toDate() }));
                const users = usersSnap.docs.filter(d => d.data().role !== 'admin');
                const tests = testsSnap.docs;

                // 1. KPI STATS
                const totalScore = results.reduce((a, b) => a + (Number(b.score) || 0), 0);
                const avgScore = results.length ? (totalScore / results.length).toFixed(1) : 0;

                // Active Students (users who have taken at least 1 test)
                const activeUserCount = users.filter(u => (u.data().stats?.totalTests || 0) > 0).length;
                const completionRate = users.length ? Math.round((activeUserCount / users.length) * 100) : 0;

                setStats({
                    totalTests: results.length,
                    avgScore,
                    activeStudents: activeUserCount,
                    completionRate
                });

                // 2. ACTIVITY CHART (Last 7 Days)
                const last7Days = [...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return d.toISOString().split('T')[0];
                });

                const activityMap = last7Days.reduce((acc, date) => {
                    acc[date] = 0;
                    return acc;
                }, {});

                results.forEach(r => {
                    if (r.createdAt) {
                        const date = r.createdAt.toISOString().split('T')[0];
                        if (activityMap.hasOwnProperty(date)) activityMap[date]++;
                    }
                });

                setActivityData(Object.entries(activityMap).map(([date, count]) => ({
                    date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                    tests: count
                })));

                // 3. SCORE DISTRIBUTION
                const dist = { '0-4': 0, '4.5-5.5': 0, '6.0-7.0': 0, '7.5+': 0 };
                results.forEach(r => {
                    const s = Number(r.score) || 0; // Using raw correct answers as score logic in some parts, or bandScore?
                    // Assuming 'score' in results is bandScore or we should use bandScore if available
                    // The implemented logic uses r.score. Let's check if r.bandScore exists
                    const val = r.bandScore !== undefined ? Number(r.bandScore) : (Number(r.score) || 0);

                    if (val < 4.5) dist['0-4']++;
                    else if (val < 6) dist['4.5-5.5']++;
                    else if (val < 7.5) dist['6.0-7.0']++;
                    else dist['7.5+']++;
                });
                setScoreDist(Object.entries(dist).map(([range, count]) => ({ range, count })));

                // 4. SKILL RADAR
                const skills = { Reading: { sum: 0, n: 0 }, Listening: { sum: 0, n: 0 }, Writing: { sum: 0, n: 0 }, Speaking: { sum: 0, n: 0 } };
                const testTypeMap = {};
                tests.forEach(t => testTypeMap[t.id] = t.data().type);

                results.forEach(r => {
                    let type = r.type;
                    if (!type && r.testId) type = testTypeMap[r.testId];
                    if (type) type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

                    if (skills[type]) {
                        // Use bandScore for averages if available, else score
                        const val = r.bandScore !== undefined ? Number(r.bandScore) : (Number(r.score) || 0);
                        skills[type].sum += val;
                        skills[type].n++;
                    }
                });

                setSkillRadar(Object.entries(skills).map(([subject, data]) => ({
                    subject,
                    A: data.n ? (data.sum / data.n).toFixed(1) : 0,
                    fullMark: 9
                })));

                // 5. AT-RISK STUDENTS (Low recent scores)
                // Filter results where bandScore < 5.0 from last 30 days? Or just last attempt < 5.0
                const atRiskMap = new Map();
                results.forEach(r => {
                    const val = r.bandScore !== undefined ? Number(r.bandScore) : (Number(r.score) || 0);
                    if (val < 5.0) {
                        // Keep the lowest or most recent? Let's keep most recent low score
                        if (!atRiskMap.has(r.userId) || r.createdAt > atRiskMap.get(r.userId).createdAt) {
                            atRiskMap.set(r.userId, {
                                id: r.userId,
                                name: r.userName || 'Unknown Student',
                                score: val,
                                subject: r.type ? (r.type.charAt(0).toUpperCase() + r.type.slice(1)) : 'Test',
                                createdAt: r.createdAt
                            });
                        }
                    } else {
                        // If they scored >= 5.0 recently, maybe remove them? 
                        // For simplicity, let's just show recent fails.
                    }
                });
                // Convert to array and take top 5
                setRecentTests(Array.from(atRiskMap.values()).slice(0, 5));

                setLoading(false);
            } catch (e) {
                console.error("Analytics Error:", e);
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return (
        <div className={`h-screen flex items-center justify-center ${isDark ? 'bg-[#1E1E1E]' : 'bg-gray-50'}`}>
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className={`min-h-screen p-6 ${isDark ? 'bg-[#1E1E1E] text-white' : 'bg-gray-50 text-gray-900'}`}>
            {/* HEADER */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Advanced Analytics</h1>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Platform performance overview</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${isDark ? 'bg-green-500/10 text-green-500' : 'bg-green-100 text-green-700'}`}>
                        Live Data
                    </span>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard title="Total Tests" value={stats.totalTests} icon={Activity} color="blue" isDark={isDark} />
                <KPICard title="Avg. Score" value={stats.avgScore} icon={Target} color="purple" isDark={isDark} />
                <KPICard title="Active Students" value={stats.activeStudents} icon={Users} color="orange" isDark={isDark} />
                <KPICard title="Completion Rate" value={`${stats.completionRate}%`} icon={CheckCircle} color="green" isDark={isDark} />
            </div>

            {/* CHARTS ROW 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* ACTIVITY CHART (Area) */}
                <div className={`col-span-2 p-6 rounded-[24px] border shadow-sm ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                    <h3 className="text-lg font-bold mb-6">Weekly Activity</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
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
                <div className={`p-6 rounded-[24px] border shadow-sm ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                    <h3 className="text-lg font-bold mb-2">Skill Balance</h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
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

            {/* CHARTS ROW 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* SCORE DISTRIBUTION (Bar) */}
                <div className={`p-6 rounded-[24px] border shadow-sm ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                    <h3 className="text-lg font-bold mb-6">Score Distribution</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
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

                {/* RECENT ALERTS (Mock) */}
                <div className={`p-6 rounded-[24px] border shadow-sm ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <AlertTriangle className="text-orange-500" size={20} /> At-Risk Students
                    </h3>
                    <div className="space-y-4">
                        {recentTests.length > 0 ? (
                            recentTests.map((student, i) => (
                                <div key={i} className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-[#1E1E1E]' : 'bg-gray-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{student.name}</p>
                                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Low Score in {student.subject}</p>
                                        </div>
                                    </div>
                                    <span className="text-red-500 font-bold text-sm">{student.score}</span>
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
        </div>
    );
}

function KPICard({ title, value, icon: Icon, color, isDark }) {
    const colorClasses = {
        blue: isDark ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-50 text-blue-600',
        purple: isDark ? 'bg-purple-500/10 text-purple-500' : 'bg-purple-50 text-purple-600',
        orange: isDark ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-600',
        green: isDark ? 'bg-green-500/10 text-green-500' : 'bg-green-50 text-green-600',
    };

    return (
        <div className={`p-6 rounded-[24px] border shadow-sm ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
                    <Icon size={20} />
                </div>
                {/* Trend indicator could go here */}
            </div>
            <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{title}</p>
                <h3 className="text-3xl font-bold">{value}</h3>
            </div>
        </div>
    );
}
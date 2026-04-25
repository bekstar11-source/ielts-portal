import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { useStudentData } from '../hooks/useStudentData';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import {
    ChevronLeft, TrendingUp, Target, Clock, Activity,
    BookOpen, Headphones, PenTool, Mic, Award, Calendar
} from 'lucide-react';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import SiteFooter from '../components/common/SiteFooter';

export default function StudentStatistics() {
    const navigate = useNavigate();
    const { user, userData } = useAuth();
    const { userResults, loading: dataLoading } = useStudentData(user);
    const { stats, loading: analyticsLoading } = useAnalytics(user?.uid, userResults);

    const loading = dataLoading || analyticsLoading;

    // Process data for charts
    const chartData = useMemo(() => {
        if (!stats.allResults || stats.allResults.length === 0) return [];
        
        // Helper to get band score (reusing logic from useAnalytics but simplified for graph)
        const getBand = (r) => {
            if (r.type === 'mock_full' || r.type?.startsWith('mock')) {
                return parseFloat(r.scores?.overallBand || r.overallBand || 0);
            }
            return parseFloat(r.bandScore || 0);
        };

        return stats.allResults
            .slice()
            .reverse() // Chronological order
            .map(r => ({
                date: new Date(r.date || 0).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' }),
                band: getBand(r),
                name: r.testTitle || 'Test'
            }))
            .filter(d => d.band > 0);
    }, [stats.allResults]);

    const skillDistribution = useMemo(() => {
        return [
            { name: 'Reading', value: stats.skillAverages.reading, color: '#fa243c' },
            { name: 'Listening', value: stats.skillAverages.listening, color: '#65c400' },
            { name: 'Writing', value: stats.skillAverages.writing, color: '#ff8400' },
            { name: 'Speaking', value: stats.skillAverages.speaking, color: '#2a7ff6' },
        ].filter(s => s.value > 0);
    }, [stats.skillAverages]);

    const calculatedOverallBand = useMemo(() => {
        if (!stats || stats.totalTests === 0) {
            return parseFloat(userData?.currentBand || 0).toFixed(1);
        }
        
        const roundToIELTSBand = (score) => {
            const num = parseFloat(score);
            if (!num || isNaN(num)) return 0;
            return Math.round(num * 2) / 2;
        };

        const r = roundToIELTSBand(stats.skillAverages?.reading || 0);
        const l = roundToIELTSBand(stats.skillAverages?.listening || 0);
        const w = roundToIELTSBand(stats.skillAverages?.writing || 0);
        const s = roundToIELTSBand(stats.skillAverages?.speaking || 0);
        
        const avg = (r + l + w + s) / 4;
        return (Math.round(avg * 2) / 2).toFixed(1);
    }, [stats, userData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-black/10 border-t-black rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F7] font-sans selection:bg-black selection:text-white">
            <DashboardHeader user={user} userData={userData} />

            <main className="max-w-7xl mx-auto px-6 py-12 md:py-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-fade-in-up">
                    <div>
                        <button 
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1 text-sm font-medium text-black/50 hover:text-black transition-colors mb-4 group"
                        >
                            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Orqaga qaytish
                        </button>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-[#1D1D1F]">
                            Sizning yutuqlaringiz
                        </h1>
                        <p className="text-lg text-black/50 font-medium mt-2">
                            Barcha testlar va ko'rsatkichlar tahlili.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-black/[0.03]">
                        <div className="px-4 py-2 bg-black text-white rounded-xl">
                            <span className="text-xs font-bold uppercase tracking-widest opacity-70 block">Overall Band</span>
                            <span className="text-2xl font-bold tracking-tighter">{calculatedOverallBand}</span>
                        </div>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <KPICard 
                        title="Jami testlar" 
                        value={stats.totalTests} 
                        icon={Activity} 
                        color="blue" 
                    />
                    <KPICard 
                        title="O'rtacha ball" 
                        value={calculatedOverallBand} 
                        icon={Target} 
                        color="purple" 
                    />
                    <KPICard 
                        title="Sarflangan vaqt" 
                        value={`${Math.round(stats.timeSpent / 60)} min`} 
                        icon={Clock} 
                        color="orange" 
                    />
                    <KPICard 
                        title="Barqarorlik" 
                        value={stats.consistency} 
                        icon={TrendingUp} 
                        color="emerald" 
                    />
                </div>

                {/* Main Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                    {/* Progress Chart */}
                    <div className="lg:col-span-2 bg-white rounded-[32px] p-8 shadow-sm border border-black/[0.03] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-bold text-[#1D1D1F]">O'sish dinamikasi</h3>
                                <p className="text-sm text-black/40 font-medium">Oxirgi topshirilgan testlar natijalari</p>
                            </div>
                            <TrendingUp className="text-black/20" size={24} />
                        </div>

                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#000" stopOpacity={0.05} />
                                            <stop offset="95%" stopColor="#000" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#00000040', fontSize: 12, fontWeight: 500 }} 
                                        dy={10} 
                                    />
                                    <YAxis 
                                        domain={[0, 9]} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#00000040', fontSize: 12, fontWeight: 500 }} 
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                                            backdropFilter: 'blur(10px)',
                                            borderRadius: '20px', 
                                            border: '1px solid rgba(0,0,0,0.05)', 
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.05)' 
                                        }} 
                                        itemStyle={{ color: '#000', fontWeight: 700 }}
                                        labelStyle={{ color: '#00000040', marginBottom: '4px', fontWeight: 600 }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="band" 
                                        stroke="#000" 
                                        strokeWidth={4} 
                                        fillOpacity={1} 
                                        fill="url(#colorBand)" 
                                        animationDuration={2000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Skill Breakdown Chart */}
                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/[0.03] animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-bold text-[#1D1D1F]">Ko'nikmalar</h3>
                                <p className="text-sm text-black/40 font-medium">Har bir bo'lim bo'yicha o'rtacha ball</p>
                            </div>
                            <Award className="text-black/20" size={24} />
                        </div>

                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={skillDistribution} layout="vertical" margin={{ left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#00000008" />
                                    <XAxis type="number" domain={[0, 9]} hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#1D1D1F', fontSize: 13, fontWeight: 600 }}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ 
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                                            backdropFilter: 'blur(10px)',
                                            borderRadius: '16px', 
                                            border: '1px solid rgba(0,0,0,0.05)' 
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={32}>
                                        {skillDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Weak Areas & Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/[0.03]">
                        <h3 className="text-xl font-bold text-[#1D1D1F] mb-6 flex items-center gap-2">
                            <PenTool size={20} className="text-orange-500" />
                            E'tibor berish kerak
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {stats.weakAreas.length > 0 ? stats.weakAreas.map(area => (
                                <span key={area} className="px-4 py-2 bg-orange-50 text-orange-600 rounded-full text-sm font-bold border border-orange-100">
                                    {area}
                                </span>
                            )) : (
                                <p className="text-black/40 font-medium italic">Sizda barcha ko'rsatkichlar a'lo darajada!</p>
                            )}
                        </div>
                        <p className="text-sm text-black/40 mt-6 leading-relaxed font-medium">
                            Ushbu yo'nalishlar bo'yicha ko'proq mashq bajarish umumiy ballingizni sezilarli darajada oshiradi.
                        </p>
                    </div>

                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/[0.03]">
                        <h3 className="text-xl font-bold text-[#1D1D1F] mb-6 flex items-center gap-2">
                            <Calendar size={20} className="text-blue-500" />
                            Kelgusi qadamlar
                        </h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-xs font-bold">1</span>
                                </div>
                                <p className="text-sm text-black/70 font-medium">Haftada kamida 2 ta to'liq Listening testini ishlang.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-xs font-bold">2</span>
                                </div>
                                <p className="text-sm text-black/70 font-medium">Vocabulary bo'limidan har kuni 10 ta yangi so'z o'rganing.</p>
                            </li>
                        </ul>
                    </div>
                </div>
            </main>

            <SiteFooter />

            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
            `}</style>
        </div>
    );
}

function KPICard({ title, value, icon: Icon, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
        emerald: 'bg-emerald-50 text-emerald-600',
    };

    return (
        <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-black/[0.03] hover:scale-[1.02] transition-transform duration-300">
            <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center mb-6`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-xs font-bold text-black/30 uppercase tracking-widest mb-1">{title}</p>
                <h4 className="text-2xl md:text-3xl font-bold tracking-tighter text-[#1D1D1F]">{value}</h4>
            </div>
        </div>
    );
}

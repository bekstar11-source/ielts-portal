import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useStudentData } from '../../hooks/useStudentData';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import {
    ChevronLeft, TrendingUp, Target, Clock, Activity,
    BookOpen, Headphones, PenTool, Mic, Award, Calendar, Trophy
} from 'lucide-react';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import SiteFooter from '../../components/common/SiteFooter';

export default function StudentStatistics() {
    const navigate = useNavigate();
    const { user, userData } = useAuth();
    const { userResults, loading: dataLoading } = useStudentData(user);
    const { stats, loading: analyticsLoading } = useAnalytics(user?.uid, userResults);

    const loading = dataLoading || analyticsLoading;

    // Line Graph Toggles
    const [activeLines, setActiveLines] = useState({
        reading: true,
        listening: true,
        writing: true,
        speaking: true
    });

    const toggleLine = (key) => {
        setActiveLines(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const [timeRange, setTimeRange] = useState('barchasi');

    // Process data for charts
    const rawChartData = useMemo(() => {
        if (!stats.allResults || stats.allResults.length === 0) return [];
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return stats.allResults
            .slice()
            .reverse() // Chronological order
            .map((res, index) => {
                let dateStr = '';
                if (res.date) {
                    const d = new Date(res.date);
                    if (!isNaN(d.getTime())) {
                        dateStr = `${months[d.getMonth()]} ${d.getDate()}`;
                    }
                }

                const point = { 
                    name: `T${index + 1}`,
                    date: dateStr,
                    rawDate: res.date
                };
                const type = (res.type || 'other').toLowerCase();
                const score = parseFloat(res.bandScore || res.score || 0);
                
                if (type.includes('mock')) {
                    point.reading = parseFloat(res.scores?.reading || 0);
                    point.listening = parseFloat(res.scores?.listening || 0);
                    point.writing = parseFloat(res.scores?.writing || 0);
                    point.speaking = parseFloat(res.scores?.speaking || 0);
                } else {
                    if (type === 'reading') point.reading = score;
                    else if (type === 'listening') point.listening = score;
                    else if (type === 'writing') point.writing = score;
                    else if (type === 'speaking') point.speaking = score;
                    else point.other = score;
                }
                return point;
            });
    }, [stats.allResults]);

    const chartData = useMemo(() => {
        let filtered = rawChartData;
        
        if (timeRange !== 'barchasi') {
            const now = new Date();
            const pastDate = new Date();
            if (timeRange === 'haftalik') {
                pastDate.setDate(now.getDate() - 7);
            } else if (timeRange === 'oylik') {
                pastDate.setMonth(now.getMonth() - 1);
            }
            
            filtered = rawChartData.filter(d => {
                if (!d.rawDate) return true; 
                return new Date(d.rawDate) >= pastDate;
            });
        }

        return filtered.map(d => ({
            ...d,
            displayDate: d.date 
        }));
    }, [rawChartData, timeRange]);

    const skillDistribution = useMemo(() => {
        return [
            { name: 'Reading', value: stats.skillAverages.reading, color: '#007AFF' },
            { name: 'Listening', value: stats.skillAverages.listening, color: '#34C759' },
            { name: 'Writing', value: stats.skillAverages.writing, color: '#FF9500' },
            { name: 'Speaking', value: stats.skillAverages.speaking, color: '#AF52DE' },
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

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/leaderboard')}
                            className="bg-[#007AFF] text-white px-6 py-3 rounded-full font-semibold flex items-center gap-2 hover:bg-[#0066CC] hover:scale-105 active:scale-95 transition-all shadow-[0_8px_20px_rgba(0,122,255,0.25)] h-[52px]"
                        >
                            <Trophy size={18} /> Reyting
                        </button>
                        <div className="bg-gradient-to-b from-gray-800 to-black p-0.5 rounded-[20px] shadow-lg h-[52px] flex items-center justify-center overflow-hidden">
                            <div className="px-5 py-2 bg-gradient-to-b from-gray-900 to-black text-white rounded-[18px] h-full flex flex-col justify-center">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-white/60 block leading-none mb-1.5">Overall Band</span>
                                <span className="text-2xl font-bold tracking-tighter leading-none">{calculatedOverallBand}</span>
                            </div>
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
                    {/* Progress Chart with Left Legend Panel */}
                    <div className="lg:col-span-3 bg-white rounded-[32px] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-black/[0.03] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-[#1D1D1F]">Faollik Statistikasi</h3>
                            </div>
                            <div className="flex bg-[#F5F5F7] p-1 rounded-xl">
                                <button 
                                    onClick={() => setTimeRange('haftalik')} 
                                    className={`px-4 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-colors ${timeRange === 'haftalik' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-black' : 'text-black/50 hover:text-black'}`}
                                >
                                    Haftalik
                                </button>
                                <button 
                                    onClick={() => setTimeRange('oylik')} 
                                    className={`px-4 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-colors ${timeRange === 'oylik' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-black' : 'text-black/50 hover:text-black'}`}
                                >
                                    Oylik
                                </button>
                                <button 
                                    onClick={() => setTimeRange('barchasi')} 
                                    className={`px-4 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-colors ${timeRange === 'barchasi' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-black' : 'text-black/50 hover:text-black'}`}
                                >
                                    Barchasi
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Left Legend Panel */}
                            <div className="lg:w-[240px] flex flex-col gap-8 lg:border-r border-black/[0.03] lg:pr-8 py-4 shrink-0">
                                <LegendItem 
                                    title="READING" 
                                    value={stats.skillAverages.reading} 
                                    color="#007AFF" 
                                    isActive={activeLines.reading} 
                                    onToggle={() => toggleLine('reading')} 
                                />
                                <LegendItem 
                                    title="LISTENING" 
                                    value={stats.skillAverages.listening} 
                                    color="#34C759" 
                                    isActive={activeLines.listening} 
                                    onToggle={() => toggleLine('listening')} 
                                />
                                <LegendItem 
                                    title="WRITING" 
                                    value={stats.skillAverages.writing} 
                                    color="#FF9500" 
                                    isActive={activeLines.writing} 
                                    onToggle={() => toggleLine('writing')} 
                                />
                                <LegendItem 
                                    title="SPEAKING" 
                                    value={stats.skillAverages.speaking} 
                                    color="#AF52DE" 
                                    isActive={activeLines.speaking} 
                                    onToggle={() => toggleLine('speaking')} 
                                />
                            </div>

                            {/* Line Chart */}
                            <div className="flex-1 h-[340px] w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                                        <XAxis 
                                            dataKey="displayDate" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#00000060', fontSize: 11, fontWeight: 600 }} 
                                            dy={15} 
                                        />
                                        <YAxis 
                                            domain={[0, 9]} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#00000060', fontSize: 11, fontWeight: 600 }} 
                                        />
                                        <Tooltip 
                                            cursor={{ stroke: '#000000', strokeWidth: 1, opacity: 0.1 }}
                                            contentStyle={{ 
                                                backgroundColor: '#ffffff', 
                                                borderRadius: '8px', 
                                                border: '1px solid rgba(0,0,0,0.05)', 
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                                padding: '12px 16px'
                                            }} 
                                            itemStyle={{ fontWeight: 700, fontSize: 13, color: '#1D1D1F' }}
                                            labelStyle={{ color: '#00000080', marginBottom: '8px', fontWeight: 600, fontSize: 12 }}
                                        />
                                        {activeLines.reading && <Line type="linear" dataKey="reading" stroke="#007AFF" strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: '#007AFF' }} activeDot={{ r: 6, strokeWidth: 0 }} name="Reading" connectNulls />}
                                        {activeLines.listening && <Line type="linear" dataKey="listening" stroke="#34C759" strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: '#34C759' }} activeDot={{ r: 6, strokeWidth: 0 }} name="Listening" connectNulls />}
                                        {activeLines.writing && <Line type="linear" dataKey="writing" stroke="#FF9500" strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: '#FF9500' }} activeDot={{ r: 6, strokeWidth: 0 }} name="Writing" connectNulls />}
                                        {activeLines.speaking && <Line type="linear" dataKey="speaking" stroke="#AF52DE" strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: '#AF52DE' }} activeDot={{ r: 6, strokeWidth: 0 }} name="Speaking" connectNulls />}
                                    </LineChart>
                                </ResponsiveContainer>
                                <p className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-black/30 uppercase tracking-widest">Analitika (Vaqt o'qida)</p>
                            </div>
                        </div>
                    </div>

                    {/* Skill Breakdown Chart */}
                    <div className="lg:col-span-3 bg-white rounded-[32px] p-8 shadow-sm border border-black/[0.03] animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-bold text-[#1D1D1F]">Ko'nikmalar</h3>
                                <p className="text-sm text-black/40 font-medium">Har bir bo'lim bo'yicha o'rtacha ball</p>
                            </div>
                            <Award className="text-black/20" size={24} />
                        </div>

                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={skillDistribution} layout="vertical" margin={{ left: 10, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#00000008" />
                                    <XAxis type="number" domain={[0, 9]} hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        width={80}
                                        tick={{ fill: '#1D1D1F', fontSize: 13, fontWeight: 600 }}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                        formatter={(value) => [Number(value).toFixed(1), "O'rtacha ball"]}
                                        contentStyle={{ 
                                            backgroundColor: 'rgba(255, 255, 255, 0.85)', 
                                            backdropFilter: 'blur(20px)',
                                            WebkitBackdropFilter: 'blur(20px)',
                                            borderRadius: '16px', 
                                            border: '1px solid rgba(0,0,0,0.05)',
                                            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                                        }}
                                        itemStyle={{ fontWeight: 700, fontSize: 14, color: '#1D1D1F' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 16, 16, 0]} barSize={28}>
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

function LegendItem({ title, value, color, isActive, onToggle }) {
    const formattedValue = typeof value === 'number' ? value.toFixed(1) : parseFloat(value || 0).toFixed(1);
    
    return (
        <div>
            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-3">{title}</p>
            <div className="flex items-center gap-4 cursor-pointer select-none group" onClick={onToggle}>
                <button className={`w-5 h-5 rounded-[6px] flex items-center justify-center transition-all flex-shrink-0 ${isActive ? 'shadow-sm' : 'bg-gray-100 border border-black/10'}`} style={{ backgroundColor: isActive ? color : undefined }}>
                    {isActive && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                </button>
                <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-bold tracking-tighter transition-colors ${isActive ? '' : 'text-black/30'}`} style={{ color: isActive ? color : undefined }}>
                        {formattedValue}
                    </span>
                    <span className="text-xs text-black/40 font-semibold tracking-normal">avg</span>
                </div>
            </div>
        </div>
    );
}

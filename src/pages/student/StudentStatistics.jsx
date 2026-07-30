import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useStudentData } from '../../hooks/useStudentData';
import { useTranslation } from '../../context/LanguageContext';
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
    const { t } = useTranslation();
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
            { name: t('dashboard.reading'), value: stats.skillAverages.reading, color: '#cc785c' },
            { name: t('dashboard.listening'), value: stats.skillAverages.listening, color: '#5db8a6' },
            { name: t('dashboard.writing'), value: stats.skillAverages.writing, color: '#d4a017' },
            { name: t('dashboard.speaking'), value: stats.skillAverages.speaking, color: '#c64545' },
        ].filter(s => s.value > 0);
    }, [stats.skillAverages, t]);

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
            <div className="min-h-screen bg-warm-canvas dark:bg-warm-dark flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-warm-hairline dark:border-white/10 border-t-warm-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-warm-canvas dark:bg-warm-dark font-sans selection:bg-warm-primary selection:text-white">
            <DashboardHeader user={user} userData={userData} />

            <main className="max-w-7xl mx-auto px-6 py-12 md:py-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-fade-in-up">
                    <div>
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1 text-sm font-medium text-warm-muted hover:text-warm-ink dark:text-warm-on-dark-soft dark:hover:text-warm-on-dark transition-colors mb-4 group"
                        >
                            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            {t('statistics.back')}
                        </button>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-warm-ink dark:text-warm-on-dark">
                            {t('statistics.title')}
                        </h1>
                        <p className="text-lg text-warm-muted dark:text-warm-on-dark-soft font-medium mt-2">
                            {t('statistics.subtitle')}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* <button
                            onClick={() => navigate('/leaderboard')}
                            className="bg-warm-primary text-white px-6 py-3 rounded-full font-semibold flex items-center gap-2 hover:bg-warm-primary-active hover:scale-105 active:scale-95 transition-all shadow-[0_8px_20px_rgba(0,122,255,0.25)] h-[52px]"
                        >
                            <Trophy size={18} /> {t('dashboard.ranking')}
                        </button> */}
                        <div className="bg-warm-ink dark:bg-warm-dark-elevated p-0.5 rounded-lg shadow-lg h-[52px] flex items-center justify-center overflow-hidden">
                            <div className="px-5 py-2 bg-warm-ink dark:bg-warm-dark-soft text-white rounded-md h-full flex flex-col justify-center">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-white/60 block leading-none mb-1.5">Overall Band</span>
                                <span className="text-2xl font-bold tracking-tighter leading-none">{calculatedOverallBand}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <KPICard 
                        title={t('statistics.totalTests')} 
                        value={stats.totalTests} 
                        icon={Activity} 
                        color="blue" 
                    />
                    <KPICard 
                        title={t('statistics.averageScore')} 
                        value={calculatedOverallBand} 
                        icon={Target} 
                        color="purple" 
                    />
                    <KPICard 
                        title={t('statistics.timeSpent')} 
                        value={`${Math.round(stats.timeSpent / 60)} min`} 
                        icon={Clock} 
                        color="orange" 
                    />
                    <KPICard 
                        title={t('statistics.consistency')} 
                        value={
                            stats.consistency === "Barkamol" ? t('statistics.consistencyLabels.barkamol') :
                            stats.consistency === "O'zgaruvchan" ? t('statistics.consistencyLabels.ozgaruvchan') :
                            stats.consistency === "Barqaror" ? t('statistics.consistencyLabels.barqaror') :
                            stats.consistency === "Kam ma'lumot" ? t('statistics.consistencyLabels.kamMalumot') :
                            t('statistics.consistencyLabels.nomalum')
                        } 
                        icon={TrendingUp} 
                        color="emerald" 
                    />
                </div>

                {/* Main Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                    {/* Progress Chart with Left Legend Panel */}
                    <div className="lg:col-span-3 bg-white dark:bg-warm-dark-elevated rounded-xl p-8 shadow-sm border border-warm-hairline dark:border-white/10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-warm-ink dark:text-warm-on-dark">{t('statistics.activityStats')}</h3>
                            </div>
                            <div className="flex bg-warm-canvas dark:bg-warm-dark-soft p-1 rounded-md">
                               <button
                                    onClick={() => setTimeRange('haftalik')}
                                    className={`px-4 py-1.5 text-xs md:text-sm font-semibold rounded-md transition-colors ${timeRange === 'haftalik' ? 'bg-white dark:bg-warm-dark-elevated shadow-sm text-warm-ink dark:text-warm-on-dark' : 'text-warm-muted hover:text-warm-ink dark:text-warm-on-dark-soft dark:hover:text-warm-on-dark'}`}
                                >
                                    {t('statistics.weekly')}
                                </button>
                                <button
                                    onClick={() => setTimeRange('oylik')}
                                    className={`px-4 py-1.5 text-xs md:text-sm font-semibold rounded-md transition-colors ${timeRange === 'oylik' ? 'bg-white dark:bg-warm-dark-elevated shadow-sm text-warm-ink dark:text-warm-on-dark' : 'text-warm-muted hover:text-warm-ink dark:text-warm-on-dark-soft dark:hover:text-warm-on-dark'}`}
                                >
                                    {t('statistics.monthly')}
                                </button>
                                <button
                                    onClick={() => setTimeRange('barchasi')}
                                    className={`px-4 py-1.5 text-xs md:text-sm font-semibold rounded-md transition-colors ${timeRange === 'barchasi' ? 'bg-white dark:bg-warm-dark-elevated shadow-sm text-warm-ink dark:text-warm-on-dark' : 'text-warm-muted hover:text-warm-ink dark:text-warm-on-dark-soft dark:hover:text-warm-on-dark'}`}
                                >
                                    {t('statistics.all')}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Left Legend Panel */}
                            <div className="lg:w-[240px] flex flex-col gap-8 lg:border-r border-warm-hairline dark:border-white/10 lg:pr-8 py-4 shrink-0">
                                <LegendItem
                                    title={t('dashboard.reading').toUpperCase()}
                                    value={stats.skillAverages.reading}
                                    color="#cc785c"
                                    isActive={activeLines.reading}
                                    onToggle={() => toggleLine('reading')}
                                  />
                                  <LegendItem
                                    title={t('dashboard.listening').toUpperCase()}
                                    value={stats.skillAverages.listening}
                                    color="#5db8a6"
                                    isActive={activeLines.listening}
                                    onToggle={() => toggleLine('listening')}
                                  />
                                  <LegendItem
                                    title={t('dashboard.writing').toUpperCase()}
                                    value={stats.skillAverages.writing}
                                    color="#d4a017"
                                    isActive={activeLines.writing}
                                    onToggle={() => toggleLine('writing')}
                                  />
                                  <LegendItem
                                    title={t('dashboard.speaking').toUpperCase()}
                                    value={stats.skillAverages.speaking}
                                    color="#c64545"
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
                                              tick={{ fill: '#8e8b82', fontSize: 11, fontWeight: 600 }}
                                              dy={15}
                                          />
                                          <YAxis
                                              domain={[0, 9]}
                                              axisLine={false}
                                              tickLine={false}
                                              tick={{ fill: '#8e8b82', fontSize: 11, fontWeight: 600 }}
                                          />
                                          <Tooltip
                                              cursor={{ stroke: '#cc785c', strokeWidth: 1, opacity: 0.15 }}
                                              contentStyle={{
                                                  backgroundColor: '#ffffff',
                                                  borderRadius: '8px',
                                                  border: '1px solid #e6dfd8',
                                                  boxShadow: '0 4px 20px rgba(20,20,19,0.08)',
                                                  padding: '12px 16px'
                                              }}
                                              itemStyle={{ fontWeight: 700, fontSize: 13, color: '#141413' }}
                                              labelStyle={{ color: '#6c6a64', marginBottom: '8px', fontWeight: 600, fontSize: 12 }}
                                          />
                                          {activeLines.reading && <Line type="linear" dataKey="reading" stroke="#cc785c" strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: '#cc785c' }} activeDot={{ r: 6, strokeWidth: 0 }} name={t('dashboard.reading')} connectNulls />}
                                          {activeLines.listening && <Line type="linear" dataKey="listening" stroke="#5db8a6" strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: '#5db8a6' }} activeDot={{ r: 6, strokeWidth: 0 }} name={t('dashboard.listening')} connectNulls />}
                                          {activeLines.writing && <Line type="linear" dataKey="writing" stroke="#d4a017" strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: '#d4a017' }} activeDot={{ r: 6, strokeWidth: 0 }} name={t('dashboard.writing')} connectNulls />}
                                          {activeLines.speaking && <Line type="linear" dataKey="speaking" stroke="#c64545" strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: '#c64545' }} activeDot={{ r: 6, strokeWidth: 0 }} name={t('dashboard.speaking')} connectNulls />}
                                      </LineChart>
                                  </ResponsiveContainer>
                                  <p className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-warm-muted-soft dark:text-warm-on-dark-soft uppercase tracking-widest">{t('statistics.analyticsTimeAxis')}</p>
                              </div>
                        </div>
                    </div>

                    {/* Skill Breakdown Chart */}
                    <div className="lg:col-span-3 bg-white dark:bg-warm-dark-elevated rounded-xl p-8 shadow-sm border border-warm-hairline dark:border-white/10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-bold text-warm-ink dark:text-warm-on-dark">{t('statistics.skills')}</h3>
                                <p className="text-sm text-warm-muted dark:text-warm-on-dark-soft font-medium">{t('statistics.avgPerSection')}</p>
                            </div>
                            <Award className="text-warm-muted-soft dark:text-warm-on-dark-soft" size={24} />
                        </div>

                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={skillDistribution} layout="vertical" margin={{ left: 10, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e6dfd8" />
                                    <XAxis type="number" domain={[0, 9]} hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        width={80}
                                        tick={{ fill: '#141413', fontSize: 13, fontWeight: 600 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(20,20,19,0.03)' }}
                                        formatter={(value) => [Number(value).toFixed(1), t('statistics.avg')]}
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.85)',
                                            backdropFilter: 'blur(20px)',
                                            WebkitBackdropFilter: 'blur(20px)',
                                            borderRadius: '12px',
                                            border: '1px solid #e6dfd8',
                                            boxShadow: '0 20px 40px rgba(20,20,19,0.1)'
                                        }}
                                        itemStyle={{ fontWeight: 700, fontSize: 14, color: '#141413' }}
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
                    <div className="bg-white dark:bg-warm-dark-elevated rounded-xl p-8 shadow-sm border border-warm-hairline dark:border-white/10">
                        <h3 className="text-xl font-bold text-warm-ink dark:text-warm-on-dark mb-6 flex items-center gap-2">
                            <PenTool size={20} className="text-warm-warning" />
                            {t('statistics.focusAreas')}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {stats.weakAreas.length > 0 ? stats.weakAreas.map(area => (
                                <span key={area} className="px-4 py-2 bg-warm-warning/10 text-warm-warning rounded-full text-sm font-bold border border-warm-warning/20">
                                    {t('dashboard.' + area.toLowerCase())}
                                </span>
                            )) : (
                                <p className="text-warm-muted dark:text-warm-on-dark-soft font-medium italic">{t('statistics.allExcellent')}</p>
                            )}
                        </div>
                        <p className="text-sm text-warm-muted dark:text-warm-on-dark-soft mt-6 leading-relaxed font-medium">
                            {t('statistics.focusExplanation')}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-warm-dark-elevated rounded-xl p-8 shadow-sm border border-warm-hairline dark:border-white/10">
                        <h3 className="text-xl font-bold text-warm-ink dark:text-warm-on-dark mb-6 flex items-center gap-2">
                            <Calendar size={20} className="text-warm-primary" />
                            {t('statistics.nextSteps')}
                        </h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-warm-primary/10 text-warm-primary flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-xs font-bold">1</span>
                                </div>
                                <p className="text-sm text-warm-body dark:text-warm-on-dark-soft font-medium">{t('statistics.step1')}</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-warm-primary/10 text-warm-primary flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-xs font-bold">2</span>
                                </div>
                                <p className="text-sm text-warm-body dark:text-warm-on-dark-soft font-medium">{t('statistics.step2')}</p>
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
        blue: 'bg-warm-primary/10 text-warm-primary',
        purple: 'bg-warm-accent-teal/10 text-warm-accent-teal',
        orange: 'bg-warm-accent-amber/10 text-warm-accent-amber',
        emerald: 'bg-warm-success/10 text-warm-success',
    };

    return (
        <div className="bg-white dark:bg-warm-dark-elevated p-6 md:p-8 rounded-xl shadow-sm border border-warm-hairline dark:border-white/10 hover:scale-[1.02] transition-transform duration-300">
            <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center mb-6`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-xs font-bold text-warm-muted-soft dark:text-warm-on-dark-soft uppercase tracking-widest mb-1">{title}</p>
                <h4 className="text-2xl md:text-3xl font-bold tracking-tighter text-warm-ink dark:text-warm-on-dark">{value}</h4>
            </div>
        </div>
    );
}

function LegendItem({ title, value, color, isActive, onToggle }) {
    const formattedValue = typeof value === 'number' ? value.toFixed(1) : parseFloat(value || 0).toFixed(1);

    return (
        <div>
            <p className="text-[10px] font-bold text-warm-muted dark:text-warm-on-dark-soft uppercase tracking-widest mb-3">{title}</p>
            <div className="flex items-center gap-4 cursor-pointer select-none group" onClick={onToggle}>
                <button className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${isActive ? 'shadow-sm' : 'bg-warm-card dark:bg-white/10 border border-warm-hairline dark:border-white/10'}`} style={{ backgroundColor: isActive ? color : undefined }}>
                    {isActive && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                </button>
                <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-bold tracking-tighter transition-colors ${isActive ? '' : 'text-warm-muted-soft dark:text-warm-on-dark-soft'}`} style={{ color: isActive ? color : undefined }}>
                        {formattedValue}
                    </span>
                    <span className="text-xs text-warm-muted dark:text-warm-on-dark-soft font-semibold tracking-normal">avg</span>
                </div>
            </div>
        </div>
    );
}

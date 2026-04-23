import React, { useEffect, useState, useRef } from 'react';
import { Target, BarChart2, Clock, ArrowRight, Sparkles, TrendingUp, Play, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Stat Card 3D ────────────────────────────────────────────────────────────
const StatCard3D = ({ 
    type = 'center', // 'left', 'center', 'right'
    icon: Icon, 
    label, 
    value, 
    unit = '', 
    subLabel, 
    accentColor, 
    extra,
    badgeValue,
    chartType = null,   // 'donut' | 'bar' | 'progress'
    chartValue = 0,     // donut: 0-100 percentage, progress: 0-100 percentage
}) => {
    const cardRef = useRef(null);
    const glareRef = useRef(null);
    const hitboxRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);

    // Initial transforms based on type
    const getBaseTransform = () => {
        if (type === 'left') return 'rotateY(15deg) translateZ(-20px)';
        if (type === 'right') return 'rotateY(-15deg) translateZ(-20px)';
        return 'translateZ(20px)';
    };

    const getBaseZ = () => {
        if (type === 'center') return '10';
        return '1';
    };

    const handleMouseMove = (e) => {
        if (!hitboxRef.current || !cardRef.current || !glareRef.current) return;

        const rect = hitboxRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -12;
        const rotateY = ((x - centerX) / centerX) * 12;

        const percentX = (x / rect.width) * 100;
        const percentY = (y / rect.height) * 100;
        
        glareRef.current.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, rgba(255,255,255,0.9) 0%, transparent 60%)`;
        glareRef.current.style.opacity = '1';

        cardRef.current.style.transition = 'transform 0.1s ease-out';
        cardRef.current.style.transform = `translateZ(60px) translateY(-8px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (!cardRef.current || !glareRef.current) return;
        
        glareRef.current.style.opacity = '0';
        cardRef.current.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)'; 
        cardRef.current.style.transform = getBaseTransform();
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (!cardRef.current) return;
        cardRef.current.style.transition = 'transform 0.2s ease-out';
    };

    // Color mapping
    const colors = {
        red: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-500', gradient: 'via-red-400', glow: 'bg-red-400/10' },
        blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-500', gradient: 'via-blue-500', glow: 'bg-blue-400/10' },
        purple: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-500', gradient: 'via-purple-400', glow: 'bg-purple-400/10' }
    };
    
    const theme = colors[accentColor] || colors.blue;

    return (
        <div 
            ref={hitboxRef}
            className="hitbox relative w-full md:w-64 cursor-pointer group"
            style={{ 
                zIndex: isHovered ? 50 : getBaseZ(),
                transformStyle: 'preserve-3d',
                height: type === 'center' ? '360px' : '340px',
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div 
                ref={cardRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ 
                    transformStyle: 'preserve-3d',
                    transform: getBaseTransform(),
                    transition: 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)'
                }}
            >
                <div className="glass-card w-full h-full rounded-[2.5rem] p-8 flex flex-col items-start text-left relative overflow-hidden bg-[#F6F6FA] border border-black/[0.06] shadow-[0_2px_20px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.10),0_2px_8px_rgba(0,0,0,0.06)] hover:bg-white transition-all duration-500">
                    <div ref={glareRef} className="glare absolute inset-0 pointer-events-none rounded-[2.5rem] opacity-0 transition-opacity duration-300 z-20 mix-blend-overlay"></div>
                    
                    <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent ${theme.gradient} to-transparent opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500`}></div>
                    <div className={`absolute -top-20 ${type === 'right' ? '-right-20' : '-left-20'} w-40 h-40 ${theme.glow} rounded-full blur-[50px] group-hover:bg-${accentColor}-400/20 transition-colors duration-500`}></div>
                    
                    <div className="relative z-10 w-full flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl ${theme.bg} border ${theme.border} flex items-center justify-center ${theme.text} shadow-sm shrink-0`}>
                                <Icon size={24} />
                            </div>
                            <h3 className="text-[13px] font-bold text-gray-400 tracking-[0.15em] uppercase mt-1">{label}</h3>
                        </div>

                        {/* Main Value */}
                        <div className="mt-6 flex items-baseline gap-2">
                            <span className="text-[72px] font-medium text-gray-900 leading-none tracking-tighter">{value}</span>
                            {unit && <span className="text-[28px] text-gray-400 font-normal">{unit}</span>}
                            {badgeValue && (
                                <div className="px-3 py-1.5 rounded-xl bg-[#E8F5E9] border border-[#C8E6C9] text-[#2E7D32] text-sm font-semibold flex items-center gap-1 ml-1 mb-3 shadow-sm self-end">
                                    {badgeValue}
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* ── Donut Chart (target card) ── */}
                        {chartType === 'donut' && (
                            <div className="relative w-14 h-14 mt-8 mb-2">
                                <svg className="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 36 36">
                                    <path stroke="#e5e7eb" strokeWidth="3.5" fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path
                                        stroke="#FF5A2A"
                                        style={{ filter: 'drop-shadow(0px 0px 8px rgba(255,90,42,0.8)) drop-shadow(0px 0px 3px rgba(255,90,42,0.6))' }}
                                        strokeDasharray={`${chartValue}, 100`}
                                        strokeLinecap="round"
                                        strokeWidth="4"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                            </div>
                        )}

                        {/* ── Bar Chart (current band card) ── */}
                        {chartType === 'bar' && (
                            <div className="flex items-end gap-[5px] mt-auto mb-4 h-10 w-3/4">
                                <div className="flex-1 bg-gray-200 rounded-[3px]" style={{ height: '30%' }} />
                                <div className="flex-1 bg-gray-200 rounded-[3px]" style={{ height: '50%' }} />
                                <div className="flex-1 bg-[#FF5A2A] rounded-[3px] relative z-10" style={{ height: '100%', boxShadow: '0 0 15px rgba(255,90,42,0.7), 0 0 6px rgba(255,90,42,0.5)' }} />
                                <div className="flex-1 bg-gray-200 rounded-[3px]" style={{ height: '40%' }} />
                                <div className="flex-1 bg-gray-200 rounded-[3px]" style={{ height: '65%' }} />
                            </div>
                        )}

                        {/* ── Progress Bar (days card) ── */}
                        {chartType === 'progress' && (
                            <div className="w-full mt-auto mb-5">
                                <div className="w-full h-2.5 bg-gray-200 rounded-full relative">
                                    <div
                                        className="absolute top-0 left-0 h-full bg-[#FF5A2A] rounded-full"
                                        style={{ width: `${chartValue}%`, boxShadow: '0 0 15px rgba(255,90,42,0.7), 0 0 6px rgba(255,90,42,0.5)' }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Footer text */}
                        <p className="text-[15px] text-slate-500 font-medium mt-auto">{subLabel}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
// ─── Main Component ──────────────────────────────────────────────────────────
export default function HeroSection({
    userName = "O'quvchi",
    targetBand = 7.5,
    currentBand = 0,
    previousBand = 0,
    daysRemaining = null,
    examDate = null,
    onUpgradeClick,
    skillStats = [],
    streakCount = 0,
    points = 0,
}) {
    const navigate = useNavigate();

    const [animatedCurrent, setAnimatedCurrent] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isReadingPaused, setIsReadingPaused] = useState(false);
    const [isListeningPaused, setIsListeningPaused] = useState(false);
    const [animatedDays, setAnimatedDays] = useState(0);

    const calculatedDays = examDate
        ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000))
        : daysRemaining;
    const finalDays = calculatedDays ?? 0;

    useEffect(() => {
        const steps = 60;
        const stepDuration = 1500 / steps;
        let step = 0;
        const t = setInterval(() => {
            step++;
            const p = step / steps;
            setAnimatedCurrent(parseFloat((currentBand * p).toFixed(1)));
            setAnimatedDays(Math.round(finalDays * p));
            if (step >= steps) {
                clearInterval(t);
                setAnimatedCurrent(currentBand);
                setAnimatedDays(finalDays);
            }
        }, stepDuration);
        return () => clearInterval(t);
    }, [currentBand, finalDays]);

    return (
        <section className="flex flex-col items-center w-full">
            {/* Hero Content */}
            <main className="flex flex-col items-center justify-center text-center px-4 pt-[10vh] pb-20 max-w-[1100px] mx-auto animate-fade-in w-full">
                
                {/* Top Badge */}
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3 tracking-wide uppercase">
                    <span className="text-black">IELTS 2026</span>
                    <span className="text-[10px]">•</span>
                    <span>Reallik</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-[52px] sm:text-[64px] md:text-[88px] font-bold text-black tracking-[-0.04em] leading-[1.05] mb-8 max-w-[1000px]">
                    Mo'jiza kutma,<br />
                    o'zing mo'jiza yarat.
                </h1>

                {/* Subheadline */}
                <p className="text-[18px] md:text-[21px] text-zinc-400 font-normal leading-[1.6] max-w-[760px] mb-12">
                    Hech qanday "maxfiy strategiya" yo'q. Bor narsa — shu ekran, matnlar, audiyolar va sening vaqting. Diqqatingni jamla, bugun kechagidan bir oz yaxshroq bo'l.
                </p>

                {/* Call to Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button 
                        onClick={() => navigate('/practice')}
                        className="w-full sm:w-auto px-10 py-4 bg-black text-white text-[15px] font-semibold rounded-full hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/10"
                    >
                        Bugungi vazifalar
                    </button>
                    <button 
                        onClick={() => navigate('/my-results')}
                        className="w-full sm:w-auto px-10 py-4 bg-[#F5F5F7] text-black text-[15px] font-semibold rounded-full border border-zinc-200/60 hover:bg-zinc-100 transition-all hover:scale-105 active:scale-95"
                    >
                        Natijalarni ko'rish
                    </button>
                </div>
            </main>

            {/* 3D Cards Grid */}
            <div
                style={{
                    perspective: '1200px',
                    transformStyle: 'preserve-3d',
                }}
                className="w-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-10 lg:gap-14 px-6 md:h-[380px]"
            >
                {/* Target Card */}
                <StatCard3D 
                    type="left"
                    icon={() => (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <circle cx="12" cy="12" r="6"></circle>
                            <circle cx="12" cy="12" r="2"></circle>
                        </svg>
                    )}
                    label="Maqsad ball"
                    value={targetBand.toFixed(1)}
                    subLabel="Siz erishmoqchi bo'lgan IELTS bali"
                    accentColor="red"
                    chartType="donut"
                    chartValue={Math.min(100, Math.round((currentBand / targetBand) * 100)) || 0}
                />

                {/* Overall Score Card */}
                <StatCard3D 
                    type="center"
                    icon={() => (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                            <path d="M4 22h16"></path>
                            <path d="M10 14.66V17c0 .55.47.98.97 1.21C11.47 18.44 12 19 12 19s.53-.56 1.03-.79c.5-.23.97-.66.97-1.21v-2.34"></path>
                            <path d="M12 2a4 4 0 0 1 4 4v3H8V6a4 4 0 0 1 4-4Z"></path>
                            <path d="M12 22v-3"></path>
                        </svg>
                    )}
                    label="Umumiy Ball"
                    value={animatedCurrent.toFixed(1)}
                    subLabel="Sizning joriy IELTS ko'rsatkichingiz"
                    accentColor="orange"
                    chartType="bar"
                />

                {/* Days Card */}
                <StatCard3D 
                    type="right"
                    icon={() => (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    )}
                    label="Imtihongacha"
                    value={finalDays > 0 ? animatedDays : '—'}
                    unit={finalDays > 0 ? 'kun' : ''}
                    subLabel="Imtihon sanasigacha qolgan kun"
                    accentColor="purple"
                    chartType="progress"
                    chartValue={finalDays > 0 ? Math.min(100, Math.round(((90 - finalDays) / 90) * 100)) : 0}
                />
            </div>

            {/* ── New Analytics Section (Full-Width Breakout) ── */}
            <div className="relative w-full mt-12">
                {/* Background Breakout */}
                <div className="absolute inset-0 w-screen left-1/2 -translate-x-1/2 bg-[#F5F5F7] border-y border-black/[0.03]" />
                
                {/* Content (Respecting parent max-width and centering) */}
                <div className="relative max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-8 py-24 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    
                    {/* Left Side: Title & Info */}
                    <div className="flex-1 flex flex-col items-center lg:items-start max-w-[520px] text-center lg:text-left">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[60px] md:text-[86px] font-semibold tracking-tighter text-[#1D1D1F] leading-none">
                                IELTS
                            </span>
                        </div>
                        
                        <h2 className="text-[28px] md:text-[42px] font-bold text-[#1D1D1F] leading-[1.05] tracking-tight mb-10">
                            Barcha to'rt ko'nikmani bitta joyda jamlang va yuqori ballga erishing.
                        </h2>
                        
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                            <button 
                                onClick={() => navigate('/practice')}
                                className="bg-[#1D1D1F] hover:bg-black text-white px-8 py-3.5 rounded-full text-[15px] font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
                            >
                                Mashqni boshlash
                            </button>
                            <button 
                                onClick={() => navigate('/my-results')}
                                className="border border-[#1D1D1F] hover:bg-black/5 text-[#1D1D1F] px-8 py-3.5 rounded-full text-[15px] font-medium transition-all"
                            >
                                Batafsil statistika
                            </button>
                        </div>
                    </div>

                    {/* Right Side: Skills List (Huge Bold Typography) */}
                    <div className="flex-1 flex flex-col items-center lg:items-end gap-2 md:gap-4 w-full">
                        {[
                            { name: 'Reading', score: skillStats[0]?.score || '0.0', color: 'text-[#fa243c]' },
                            { name: 'Listening', score: skillStats[1]?.score || '0.0', color: 'text-[#65c400]' },
                            { name: 'Writing', score: skillStats[2]?.score || '0.0', color: 'text-[#ff8400]' },
                            { name: 'Speaking', score: skillStats[3]?.score || '0.0', color: 'text-[#2a7ff6]' },
                        ].map(skill => (
                            <div key={skill.name} className="grid grid-cols-[1fr_100px] md:grid-cols-[1fr_140px] items-center w-full max-w-[480px] group cursor-default">
                                {/* Skill Name */}
                                <div className={`${skill.color} transition-transform duration-300 group-hover:translate-x-[-8px]`}>
                                    <span className="text-[48px] md:text-[68px] font-bold tracking-tighter leading-none">
                                        {skill.name}
                                    </span>
                                </div>
                                
                                {/* Skill Score (Aligned) */}
                                <div className="text-right">
                                    <span className="text-[44px] md:text-[56px] font-bold text-[#1D1D1F] leading-none tracking-tighter group-hover:scale-110 transition-transform duration-300 inline-block">
                                        {parseFloat(skill.score).toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Recommended Reading Passages Section (Practice Page Style) ── */}
            <div className="w-full mt-32 mb-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <div className="max-w-7xl mx-auto px-6">
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
                        <div className="max-w-3xl">
                            <h2 className="text-[28px] md:text-[36px] lg:text-[42px] font-semibold text-[#1D1D1F] leading-[1.1] tracking-tight">
                                Tavsiya etilgan matnlar. <br className="hidden md:block" />
                                Sizning darajangizga mos Reading passagelar.
                            </h2>
                        </div>
                        <button className="text-[#1D1D1F] hover:underline text-[16px] font-medium flex items-center gap-1 group whitespace-nowrap">
                            Barchasini ko'rish
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* Full-width Breakout Scrollable Container for Reading Passages */}
                    <div className="relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] w-[100vw] overflow-hidden">
                        <div className="flex gap-6 overflow-x-auto pb-12 pt-4 hide-scrollbar snap-x">
                            {/* Left Alignment Spacer */}
                            <div className="flex-none w-6 xl:w-[calc(50vw-40rem+1.5rem)]" />
                            {[
                                { 
                                    title: "Ancient Civilizations", 
                                    sub: "O'tmishning sirlarini oching va qadimgi madaniyatlarni o'rganing.", 
                                    questions: "13 Questions",
                                    img: "/images/dashboard/reading_passage_ancient_civ_1776973843121.png",
                                    tag: "History",
                                    delay: '0.1s'
                                },
                                { 
                                    title: "Space Exploration", 
                                    sub: "Koinot fathi va insoniyatning yulduzlar sari sayohati.", 
                                    questions: "14 Questions",
                                    img: "/images/dashboard/reading_passage_space_exp_1776973865586.png",
                                    tag: "Science",
                                    delay: '0.2s'
                                },
                                { 
                                    title: "Modern Architecture", 
                                    sub: "Zamonaviy shaharsozlik va innovatsion dizayn yutuqlari.", 
                                    questions: "13 Questions",
                                    img: "/images/dashboard/reading_passage_architecture_1776974534002.png",
                                    tag: "Design",
                                    delay: '0.3s'
                                },
                                { 
                                    title: "Renewable Energy", 
                                    sub: "Yashil energiya va kelajak texnologiyalari haqida.", 
                                    questions: "12 Questions",
                                    img: "/images/dashboard/reading_passage_renewable_energy_1776974514627.png",
                                    tag: "Energy",
                                    delay: '0.4s'
                                },
                                { 
                                    title: "Neuroscience", 
                                    sub: "Inson miyasi qanday ishlaydi? Eng so'nggi ilmiy tadqiqotlar.", 
                                    questions: "13 Questions",
                                    img: "/images/dashboard/reading_passage_neuroscience_1776973886667.png",
                                    tag: "Biology",
                                    delay: '0.5s'
                                },
                                { 
                                    title: "Climate Change", 
                                    sub: "Global iqlim o'zgarishi va uning sayyoramizga ta'siri.", 
                                    questions: "13 Questions",
                                    img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
                                    tag: "Nature",
                                    delay: '0.6s'
                                },
                                { 
                                    title: "Urban Planning", 
                                    sub: "Kelajak shaharlari va aholi yashash joylarini loyihalash.", 
                                    questions: "14 Questions",
                                    img: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80",
                                    tag: "Society",
                                    delay: '0.7s'
                                }
                            ].map((item, i) => (
                                <div 
                                    key={i} 
                                    className="group/apple-card relative flex-none w-[320px] md:w-[380px] aspect-[3/4.5] bg-[#F6F6FA] rounded-[24px] p-7 transition-all duration-500 cursor-pointer overflow-hidden animate-fade-in-up hover:scale-[1.005] snap-start"
                                    style={{ animationDelay: item.delay }}
                                >
                                    {/* Text Content (Top) */}
                                    <div className="relative z-10 space-y-3">
                                        <span className="text-[11px] font-extrabold text-[#86868b] uppercase tracking-[0.12em]">{item.tag}</span>
                                        <h3 className="text-[28px] font-extrabold text-[#1d1d1f] leading-[1.1] tracking-tight group-hover/apple-card:text-[#0066cc] transition-colors line-clamp-2">
                                            {item.title}
                                        </h3>
                                        <p className="text-[15px] text-zinc-500 font-medium leading-snug line-clamp-3">
                                            {item.sub}
                                        </p>
                                        <div className="pt-2">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold text-[#424245] bg-white/50 border border-black/[0.04] uppercase tracking-wide">
                                                {item.questions}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Image Content (Bottom) */}
                                    <div className="absolute bottom-0 left-0 right-0 h-[45%] overflow-hidden transition-all duration-700">
                                        <img 
                                            src={item.img} 
                                            alt={item.title}
                                            className="w-full h-full object-cover transition-transform duration-700"
                                        />
                                    </div>
                                </div>
                            ))}
                            {/* Right Alignment Spacer */}
                            <div className="flex-none w-6 xl:w-[calc(50vw-40rem+1.5rem)]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── New Articles Recommendation Section ── */}
            <div className="w-full mt-32 mb-40 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <div className="max-w-7xl mx-auto px-6">
                    {/* Header with Title and Controls */}
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
                        <div className="max-w-3xl">
                            <h2 className="text-[28px] md:text-[36px] lg:text-[42px] font-semibold text-[#1D1D1F] leading-[1.1] tracking-tight">
                                Eng sara maqolalar va nashrlar. <br className="hidden md:block" />
                                Hammasi bitta joyda.
                            </h2>
                        </div>
                        
                        <div className="flex items-center gap-6 pb-2">
                            <button className="bg-[#1D1D1F] text-white px-8 py-3 rounded-full text-[15px] font-semibold hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg whitespace-nowrap">
                                Bepul o'qish
                            </button>
                            <div className="flex items-center gap-24">
                                <button className="text-[#1D1D1F] hover:underline text-[16px] font-medium flex items-center gap-1 group whitespace-nowrap">
                                    Barchasini ko'rish
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                                
                                {/* Play/Pause Toggle Button */}
                                <button 
                                    onClick={() => setIsPaused(!isPaused)}
                                    className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-black hover:border-zinc-400 transition-all active:scale-90"
                                    title={isPaused ? "Play" : "Pause"}
                                >
                                    {isPaused ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M5 3l14 9-14 9V3z"/></svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Horizontal Scrolling Carousel (True Seamless Loop) */}
                {/* Horizontal Scrolling Carousel (CSS Marquee for Smooth Pause/Resume) */}
                <div 
                    className="relative overflow-hidden -mx-6 group/marquee"
                >
                    <style>
                        {`
                            @keyframes marquee {
                                0% { transform: translateX(0); }
                                100% { transform: translateX(-50%); }
                            }
                            .marquee-content {
                                display: flex;
                                gap: 1rem;
                                width: max-content;
                                animation: marquee 60s linear infinite;
                            }
                            .marquee-paused {
                                animation-play-state: paused !important;
                            }
                            .group-hover-pause:hover .marquee-content {
                                animation-play-state: paused;
                            }
                        `}
                    </style>
                    <div className="group-hover-pause">
                        <div className={`marquee-content ${isPaused ? 'marquee-paused' : ''}`}>
                            {[...Array(2)].map((_, listIdx) => (
                                <div key={listIdx} className="flex gap-4">
                                    {[
                                        { 
                                            title: "The Economist", 
                                            sub: "Building Future Cities", 
                                            img: "/images/dashboard/economist_cover_future_cities_1776973021230.png",
                                            date: "Oct 2024"
                                        },
                                        { 
                                            title: "National Geographic", 
                                            sub: "Patagonia's Wild Heart", 
                                            img: "/images/dashboard/natgeo_cover_patagonia_1776973046094.png",
                                            date: "Dec 2023"
                                        },
                                        { 
                                            title: "Kinfolk Journal", 
                                            sub: "The Art of Work", 
                                            img: "/images/dashboard/kinfolk_cover_art_of_work_1776973065900.png",
                                            date: "Spring 2024"
                                        },
                                        { 
                                            title: "The New Yorker", 
                                            sub: "The Future of AI in Education", 
                                            img: "/images/dashboard/newyorker_cover_ai_education_1776973104350.png",
                                            date: "Nov 2023"
                                        },
                                        { 
                                            title: "Wired", 
                                            sub: "The Great Tech Reset", 
                                            img: "/images/dashboard/wired_cover_tech_reset_1776973125543.png",
                                            date: "Oct 2023"
                                        },
                                        { 
                                            title: "Vogue", 
                                            sub: "Sustainable Fashion 2025", 
                                            img: "/images/dashboard/vogue_cover_sustainable_fashion_1776973146230.png",
                                            date: "Jan 2025"
                                        }
                                    ].map((article, i) => (
                                        <div key={`${listIdx}-${i}`} className="flex-none w-[180px] md:w-[200px] group/card cursor-pointer">
                                            <div className="relative aspect-[3/4] rounded-md overflow-hidden mb-3 shadow-md group-hover:shadow-xl transition-all duration-500 bg-zinc-100">
                                                <img 
                                                    src={article.img} 
                                                    alt={article.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                />
                                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
                                                    <div className="bg-white text-black px-4 py-1.5 rounded-full text-[12px] font-bold shadow-lg transform translate-y-2 group-hover/card:translate-y-0 transition-transform duration-300">
                                                        O'qish
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <h4 className="text-[12px] font-bold text-[#1D1D1F]">{article.title}</h4>
                                                <p className="text-[12px] text-zinc-500 font-medium leading-tight line-clamp-1">{article.sub}</p>
                                                <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{article.date}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* ── Popular Listening Section (Apple Music Style Banner) ── */}
            <div className="w-full mt-0 mb-40 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                <div className="relative w-screen h-[400px] mb-0 overflow-hidden shadow-2xl left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
                    {/* Vibrant Background with Mesh Gradient */}
                    <div className="absolute inset-0 bg-[#d60017] flex items-center justify-center overflow-hidden">
                        {/* Huge Stylized Text Background */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none select-none opacity-20 transform scale-125">
                             <h1 className="text-white text-[150px] md:text-[220px] lg:text-[280px] font-black tracking-tighter leading-none italic blur-[2px]">
                                LISTENING
                             </h1>
                        </div>
                        
                        {/* Animated Mesh Gradients */}
                        <div className="absolute inset-0 opacity-60">
                            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-pink-500 blur-[100px] animate-pulse" />
                            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                        </div>
                    </div>

                    {/* Content Overlay */}
                    <div className="relative h-full flex flex-col justify-end pb-16">
                        <div className="max-w-7xl mx-auto w-full px-6">
                            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                                <div className="max-w-3xl">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1 bg-white rounded-md">
                                            <Play size={14} className="text-[#d60017] fill-[#d60017]" />
                                        </div>
                                        <span className="text-white font-bold text-[13px] tracking-wider uppercase">Listening Premium</span>
                                    </div>
                                    <h2 className="text-[28px] md:text-[36px] lg:text-[42px] font-semibold text-white leading-[1.1] tracking-tight">
                                        Barcha listening materiallari. <br className="hidden md:block" />
                                        Oliy sifat va reklamasiz.
                                    </h2>
                                </div>
                                
                                <div className="flex items-center gap-6">
                                    <button 
                                        onClick={() => navigate('/practice?tab=listening')}
                                        className="bg-white text-black px-8 py-3 rounded-full text-[15px] font-bold hover:bg-zinc-100 transition-all hover:scale-105 active:scale-95 shadow-lg whitespace-nowrap"
                                    >
                                        Bepul o'rganing
                                    </button>
                                    <button className="border-2 border-white/30 text-white px-8 py-3 rounded-full text-[15px] font-bold hover:bg-white/10 transition-all hover:scale-105 active:scale-95 whitespace-nowrap">
                                        Ko'proq ma'lumot
                                    </button>
                                    
                                    {/* Play/Pause Toggle Button (for Listening) */}
                                    <button 
                                        onClick={() => setIsListeningPaused(!isListeningPaused)}
                                        className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90 ml-4"
                                        title={isListeningPaused ? "Play" : "Pause"}
                                    >
                                        {isListeningPaused ? (
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M5 3l14 9-14 9V3z"/></svg>
                                        ) : (
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Horizontal Scrolling Carousel (Listening) */}
                <div className="relative overflow-hidden -mx-6 group/listening-marquee mt-6">
                    <style>
                        {`
                            @keyframes marquee-listening {
                                0% { transform: translateX(0); }
                                100% { transform: translateX(-50%); }
                            }
                            .listening-marquee-content {
                                display: flex;
                                gap: 1rem;
                                width: max-content;
                                animation: marquee-listening 50s linear infinite;
                            }
                            .listening-paused {
                                animation-play-state: paused !important;
                            }
                            .group-hover-listening-pause:hover .listening-marquee-content {
                                animation-play-state: paused;
                            }
                        `}
                    </style>
                    <div className="group-hover-listening-pause">
                        <div className={`listening-marquee-content ${isListeningPaused ? 'listening-paused' : ''}`}>
                            {[...Array(2)].map((_, listIdx) => (
                                <div key={listIdx} className="flex gap-4">
                                    {[
                                        { 
                                            title: "Daily Dictation", 
                                            sub: "Improve accuracy with native audio", 
                                            img: "/images/dashboard/listening_cover_1_vibrant_apple_music_style_1776972033954.png",
                                            tag: "Podcast"
                                        },
                                        { 
                                            title: "Native Speed", 
                                            sub: "Master fast British accents", 
                                            img: "/images/dashboard/listening_cover_2_vibrant_apple_music_style_1776972053148.png",
                                            tag: "Intensive"
                                        },
                                        { 
                                            title: "Master Class", 
                                            sub: "Advanced strategies for band 8+", 
                                            img: "/images/dashboard/listening_cover_3_vibrant_apple_music_style_1776972075391.png",
                                            tag: "Expert"
                                        },
                                        { 
                                            title: "Cambridge 19", 
                                            sub: "Official practice tests section 1-4", 
                                            img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
                                            tag: "Test"
                                        },
                                        { 
                                            title: "Accent Neutralizer", 
                                            sub: "American vs British listening", 
                                            img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
                                            tag: "Skill"
                                        },
                                        { 
                                            title: "News Analysis", 
                                            sub: "Complex topics and context", 
                                            img: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=800&q=80",
                                            tag: "Daily"
                                        }
                                    ].map((item, i) => (
                                        <div key={`${listIdx}-${i}`} className="flex-none w-[220px] md:w-[260px] group/item cursor-pointer">
                                            <div className="relative aspect-square rounded-[6px] overflow-hidden mb-4 shadow-lg group-hover:shadow-2xl transition-all duration-500 bg-zinc-100">
                                                <img 
                                                    src={item.img} 
                                                    alt={item.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                />
                                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 transform scale-90 group-hover/item:scale-100 transition-transform duration-300">
                                                        <Play size={24} className="text-white fill-white ml-1" />
                                                    </div>
                                                </div>
                                                <div className="absolute top-4 left-4">
                                                    <span className="bg-black/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-widest">
                                                        {item.tag}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-[14px] font-bold text-[#1D1D1F] group-hover:text-[#0066CC] transition-colors">{item.title}</h4>
                                                <p className="text-[13px] text-zinc-500 font-medium leading-tight line-clamp-1">{item.sub}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

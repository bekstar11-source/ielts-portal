import React, { useEffect, useState, useRef } from 'react';
import { Target, BarChart2, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
                height: type === 'center' ? '420px' : '400px',
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
}) {
    const navigate = useNavigate();

    const [animatedCurrent, setAnimatedCurrent] = useState(0);
    const [animatedDays, setAnimatedDays] = useState(0);

    const calculatedDays = examDate
        ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000))
        : daysRemaining;
    const finalDays = calculatedDays ?? 0;

    let improvement = 0;
    if (previousBand > 0) improvement = currentBand - previousBand;
    else if (currentBand > 2.0) improvement = 0.5;
    else improvement = currentBand;

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
        <section className="hero-section">
            <style>{`
                .hero-section {
                    position: relative;
                    z-index: 10;
                    margin-bottom: 3rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    animation: fadeInUp 0.6s ease both;
                }

                .perspective-container {
                    perspective: 1200px;
                    transform-style: preserve-3d;
                }

                .hero-name {
                    font-family: 'Abel', 'Outfit', -apple-system, sans-serif;
                    font-size: clamp(52px, 8vw, 100px);
                    line-height: 0.9;
                    letter-spacing: -0.03em;
                    color: #161616;
                    text-align: center;
                    margin: 0 0 1.5rem;
                    animation: fadeInUp 0.55s ease both;
                }
                .hero-name span {
                    background: linear-gradient(135deg, #161616 0%, #F44A22 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .hero-tagline {
                    font-size: clamp(15px, 2vw, 18px);
                    color: #6B6B6B;
                    text-align: center;
                    max-width: 480px;
                    line-height: 1.65;
                    margin: 0 auto 2rem;
                    animation: fadeInUp 0.6s ease both;
                    animation-delay: 0.1s;
                }

                .hero-cta {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: #161616;
                    color: #ffffff;
                    font-size: 14px;
                    font-weight: 600;
                    padding: 13px 28px;
                    border-radius: 999px;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
                    text-decoration: none;
                    margin-bottom: 3.5rem;
                    animation: fadeInUp 0.65s ease both;
                    animation-delay: 0.15s;
                    box-shadow: 0 4px 20px rgba(22,22,22,0.18);
                }
                .hero-cta:hover {
                    background: #F44A22;
                    transform: scale(1.04);
                    box-shadow: 0 8px 30px rgba(244,74,34,0.3);
                }

                .hero-divider {
                    width: 100%;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, #E4E2E3 20%, #E4E2E3 80%, transparent);
                    margin-bottom: 4rem;
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* Name */}
            <h1 className="hero-name">
                <span>{userName}</span>
            </h1>

            {/* Tagline */}
            <p className="hero-tagline">
                Maqsadlaringiz va joriy statistikangiz. Har bir mashq sizi maqsadingizga yaqinlashtiradi.
            </p>

            {/* CTA */}
            <button
                className="hero-cta"
                onClick={() => navigate('/practice')}
            >
                Amaliyotni boshlash
                <ArrowRight size={16} />
            </button>

            {/* Divider */}
            <div className="hero-divider" />

            {/* 3D Cards Grid */}
            <div
                style={{
                    perspective: '1200px',
                    transformStyle: 'preserve-3d',
                }}
                className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-10 lg:gap-14 px-6 md:h-[450px]"
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
                    value={targetBand}
                    subLabel="Siz erishmoqchi bo'lgan IELTS bali"
                    accentColor="red"
                    chartType="donut"
                    chartValue={Math.min(100, Math.round((currentBand / targetBand) * 100)) || 0}
                />

                {/* Current Card */}
                <StatCard3D 
                    type="center"
                    icon={() => (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 20V10"></path>
                            <path d="M12 20V4"></path>
                            <path d="M6 20v-6"></path>
                        </svg>
                    )}
                    label="Hozirgi ball"
                    value={animatedCurrent || '—'}
                    subLabel="Oxirgi testlar bo'yicha o'rtacha"
                    accentColor="blue"
                    badgeValue={currentBand > 0 ? `+${improvement.toFixed(1)}` : null}
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

            {/* ── Skill Showcase Grid ── */}
            <div className="w-full mt-16 grid grid-cols-1 md:grid-cols-2 gap-2 -mx-6" style={{ width: 'calc(100% + 3rem)' }}>

                {/* Reading */}
                <div className="relative overflow-hidden cursor-pointer group aspect-[4/3]" style={{ background: 'linear-gradient(145deg, #dbeafe 0%, #bfdbfe 60%, #a5f3fc 100%)' }} onClick={() => navigate('/practice')}>
                    <div className="p-10 flex flex-col items-center text-center z-10 relative">
                        <h2 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">Reading</h2>
                        <p className="text-[15px] text-[#3a3a3c] mt-1.5 font-normal">Matnlarni tez va aniq tushunish.</p>
                        <button className="mt-4 px-5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-semibold rounded-full transition-all duration-200 shadow-sm">
                            Mashq qilish
                        </button>
                    </div>
                    {/* Laptop + IELTS Reading Interface */}
                    <div className="absolute bottom-0 left-1/2 w-[88%] transition-transform duration-500 group-hover:-translate-y-3 group-hover:scale-[1.03]" style={{ transform: 'translateX(-50%)' }}>
                        <svg viewBox="0 0 560 340" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-2xl">
                            <rect x="20" y="8" width="520" height="295" rx="12" fill="#1d1d1f"/>
                            <rect x="26" y="14" width="508" height="283" rx="9" fill="#e8f4fd"/>
                            <rect x="26" y="14" width="508" height="22" rx="9" fill="white" fillOpacity="0.9"/>
                            <circle cx="42" cy="25" r="4" fill="#ff5f57"/>
                            <circle cx="56" cy="25" r="4" fill="#ffbd2e"/>
                            <circle cx="70" cy="25" r="4" fill="#28c840"/>
                            <rect x="36" y="44" width="30" height="8" rx="2" fill="#d71920"/>
                            <rect x="36" y="58" width="120" height="5" rx="2" fill="#1d1d1f" fillOpacity="0.8"/>
                            <rect x="36" y="67" width="160" height="7" rx="2" fill="#1d1d1f"/>
                            <rect x="36" y="78" width="195" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="87" width="185" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="96" width="195" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="105" width="140" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="105" width="120" height="4" rx="2" fill="#fbbf24" fillOpacity="0.55"/>
                            <rect x="36" y="114" width="195" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="123" width="185" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="132" width="195" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="141" width="140" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="150" width="195" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="159" width="185" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="168" width="195" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="177" width="155" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="186" width="195" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="195" width="140" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="204" width="185" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="213" width="195" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="222" width="155" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <rect x="36" y="231" width="195" height="4" rx="2" fill="#374151" fillOpacity="0.5"/>
                            <line x1="248" y1="36" x2="248" y2="292" stroke="#e5e7eb" strokeWidth="1"/>
                            <rect x="258" y="44" width="90" height="6" rx="2" fill="#1d1d1f" fillOpacity="0.7"/>
                            <rect x="258" y="58" width="240" height="4" rx="2" fill="#6b7280" fillOpacity="0.5"/>
                            <rect x="258" y="66" width="200" height="4" rx="2" fill="#6b7280" fillOpacity="0.4"/>
                            <rect x="258" y="80" width="180" height="4" rx="2" fill="#9ca3af" fillOpacity="0.4"/>
                            <rect x="385" y="78" width="30" height="8" rx="3" fill="white" stroke="#d1d5db" strokeWidth="1"/>
                            <rect x="387" y="80" width="16" height="4" rx="1.5" fill="#93c5fd"/>
                            <rect x="258" y="96" width="180" height="4" rx="2" fill="#9ca3af" fillOpacity="0.4"/>
                            <rect x="388" y="94" width="30" height="8" rx="3" fill="white" stroke="#d1d5db" strokeWidth="1"/>
                            <rect x="390" y="96" width="16" height="4" rx="1.5" fill="#93c5fd"/>
                            <rect x="258" y="112" width="180" height="4" rx="2" fill="#9ca3af" fillOpacity="0.4"/>
                            <rect x="391" y="110" width="30" height="8" rx="3" fill="white" stroke="#d1d5db" strokeWidth="1"/>
                            <rect x="393" y="112" width="16" height="4" rx="1.5" fill="#93c5fd"/>
                            <rect x="258" y="130" width="90" height="6" rx="2" fill="#1d1d1f" fillOpacity="0.7"/>
                            <rect x="258" y="144" width="155" height="4" rx="2" fill="#9ca3af" fillOpacity="0.35"/>
                            <rect x="323" y="142" width="14" height="8" rx="2" fill="#dbeafe" stroke="#bfdbfe" strokeWidth="0.5"/>
                            <rect x="340" y="142" width="40" height="8" rx="2" fill="white" stroke="#d1d5db" strokeWidth="0.8"/>
                            <rect x="342" y="144" width="22" height="4" rx="1.5" fill="#bfdbfe"/>
                            <rect x="258" y="160" width="155" height="4" rx="2" fill="#9ca3af" fillOpacity="0.35"/>
                            <rect x="323" y="158" width="14" height="8" rx="2" fill="#dbeafe" stroke="#bfdbfe" strokeWidth="0.5"/>
                            <rect x="340" y="158" width="40" height="8" rx="2" fill="white" stroke="#d1d5db" strokeWidth="0.8"/>
                            <rect x="342" y="160" width="22" height="4" rx="1.5" fill="#bfdbfe"/>
                            <rect x="258" y="176" width="155" height="4" rx="2" fill="#9ca3af" fillOpacity="0.35"/>
                            <rect x="323" y="174" width="14" height="8" rx="2" fill="#dbeafe" stroke="#bfdbfe" strokeWidth="0.5"/>
                            <rect x="340" y="174" width="40" height="8" rx="2" fill="white" stroke="#d1d5db" strokeWidth="0.8"/>
                            <rect x="342" y="176" width="22" height="4" rx="1.5" fill="#bfdbfe"/>
                            <rect x="258" y="192" width="155" height="4" rx="2" fill="#9ca3af" fillOpacity="0.35"/>
                            <rect x="323" y="190" width="14" height="8" rx="2" fill="#dbeafe" stroke="#bfdbfe" strokeWidth="0.5"/>
                            <rect x="340" y="190" width="40" height="8" rx="2" fill="white" stroke="#d1d5db" strokeWidth="0.8"/>
                            <rect x="342" y="192" width="22" height="4" rx="1.5" fill="#bfdbfe"/>
                            <rect x="26" y="280" width="508" height="17" rx="0" fill="white" fillOpacity="0.85"/>
                            <line x1="26" y1="280" x2="534" y2="280" stroke="#e5e7eb" strokeWidth="1"/>
                            <rect x="36" y="285" width="12" height="7" rx="2" fill="#e5e7eb"/>
                            <rect x="54" y="285" width="12" height="7" rx="2" fill="#e5e7eb"/>
                            <rect x="72" y="285" width="12" height="7" rx="2" fill="#e5e7eb"/>
                            <rect x="90" y="285" width="12" height="7" rx="2" fill="#0071e3"/>
                            <rect x="108" y="285" width="12" height="7" rx="2" fill="#e5e7eb"/>
                            <rect x="126" y="285" width="12" height="7" rx="2" fill="#e5e7eb"/>
                            <rect x="144" y="285" width="12" height="7" rx="2" fill="#e5e7eb"/>
                            <rect x="162" y="285" width="12" height="7" rx="2" fill="#e5e7eb"/>
                            <rect x="180" y="285" width="12" height="7" rx="2" fill="#e5e7eb"/>
                            <rect x="0" y="303" width="560" height="18" rx="3" fill="#2d2d2f"/>
                            <rect x="210" y="303" width="140" height="5" rx="2" fill="#1a1a1c"/>
                            <ellipse cx="280" cy="322" rx="80" ry="4" fill="#1d1d1f" fillOpacity="0.15"/>
                        </svg>
                    </div>
                </div>

                {/* Listening */}
                <div className="relative overflow-hidden cursor-pointer group aspect-[4/3]" style={{ background: 'linear-gradient(145deg, #ede9fe 0%, #ddd6fe 60%, #c4b5fd 100%)' }} onClick={() => navigate('/practice')}>
                    <div className="p-10 flex flex-col items-center text-center z-10 relative">
                        <h2 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">Listening</h2>
                        <p className="text-[15px] text-[#3a3a3c] mt-1.5 font-normal">Audio materiallarda barcha tafsilotlarni qo'lga kiriting.</p>
                        <button className="mt-4 px-5 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[13px] font-semibold rounded-full transition-all duration-200 shadow-sm">
                            Mashq qilish
                        </button>
                    </div>
                    {/* Headphone SVG */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 opacity-90 group-hover:-translate-y-2 group-hover:scale-105 transition-transform duration-500" style={{ transform: 'translateX(-50%)' }}>
                        <svg viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-xl">
                            {/* Headphone arc */}
                            <path d="M40 110 C40 55 180 55 180 110" stroke="#a78bfa" strokeWidth="12" strokeLinecap="round" fill="none"/>
                            {/* Left ear cup */}
                            <rect x="20" y="100" width="38" height="58" rx="16" fill="#c4b5fd" />
                            <rect x="28" y="110" width="22" height="38" rx="10" fill="#7c3aed" fillOpacity="0.4" />
                            {/* Right ear cup */}
                            <rect x="162" y="100" width="38" height="58" rx="16" fill="#c4b5fd" />
                            <rect x="170" y="110" width="22" height="38" rx="10" fill="#7c3aed" fillOpacity="0.4" />
                            {/* Sound waves */}
                            <path d="M100 130 Q110 120 110 135 Q110 150 100 140" stroke="#a78bfa" strokeWidth="3" fill="none" strokeLinecap="round"/>
                            <path d="M88 125 Q75 120 75 137 Q75 154 88 148" stroke="#c4b5fd" strokeWidth="3" fill="none" strokeLinecap="round"/>
                        </svg>
                    </div>
                </div>

                {/* Writing */}
                <div className="relative overflow-hidden cursor-pointer group aspect-[4/3]" style={{ background: 'linear-gradient(145deg, #dcfce7 0%, #bbf7d0 60%, #a7f3d0 100%)' }} onClick={() => navigate('/practice')}>
                    <div className="p-10 flex flex-col items-center text-center z-10 relative">
                        <h2 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">Writing</h2>
                        <p className="text-[15px] text-[#3a3a3c] mt-1.5 font-normal">G'oyalaringizni aniq va ishonchli ifodalang.</p>
                        <button className="mt-4 px-5 py-1.5 bg-[#059669] hover:bg-[#047857] text-white text-[13px] font-semibold rounded-full transition-all duration-200 shadow-sm">
                            Mashq qilish
                        </button>
                    </div>
                    {/* Pen & paper SVG */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 opacity-90 group-hover:-translate-y-2 group-hover:scale-105 transition-transform duration-500" style={{ transform: 'translateX(-50%)' }}>
                        <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-xl">
                            {/* Paper */}
                            <rect x="40" y="20" width="160" height="145" rx="10" fill="white" fillOpacity="0.85" />
                            <rect x="60" y="50" width="120" height="6" rx="3" fill="#6ee7b7"/>
                            <rect x="60" y="66" width="100" height="6" rx="3" fill="#a7f3d0"/>
                            <rect x="60" y="82" width="110" height="6" rx="3" fill="#6ee7b7"/>
                            <rect x="60" y="98" width="80" height="6" rx="3" fill="#a7f3d0"/>
                            <rect x="60" y="114" width="115" height="6" rx="3" fill="#6ee7b7"/>
                            <rect x="60" y="130" width="90" height="6" rx="3" fill="#a7f3d0"/>
                            {/* Pen */}
                            <g transform="rotate(-35 200 80)">
                                <rect x="190" y="30" width="14" height="70" rx="4" fill="#34d399"/>
                                <polygon points="190,100 204,100 197,118" fill="#059669"/>
                                <rect x="190" y="30" width="14" height="10" rx="3" fill="#6ee7b7"/>
                            </g>
                        </svg>
                    </div>
                </div>

                {/* Speaking */}
                <div className="relative overflow-hidden cursor-pointer group aspect-[4/3]" style={{ background: 'linear-gradient(145deg, #fff7ed 0%, #fed7aa 60%, #fca5a5 100%)' }} onClick={() => navigate('/practice')}>
                    <div className="p-10 flex flex-col items-center text-center z-10 relative">
                        <h2 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">Speaking</h2>
                        <p className="text-[15px] text-[#3a3a3c] mt-1.5 font-normal">Ravon va ishonch bilan inglizcha gapiring.</p>
                        <button className="mt-4 px-5 py-1.5 bg-[#ea580c] hover:bg-[#dc2626] text-white text-[13px] font-semibold rounded-full transition-all duration-200 shadow-sm">
                            Mashq qilish
                        </button>
                    </div>
                    {/* Microphone SVG */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-52 opacity-90 group-hover:-translate-y-2 group-hover:scale-105 transition-transform duration-500" style={{ transform: 'translateX(-50%)' }}>
                        <svg viewBox="0 0 200 190" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-xl">
                            {/* Mic body */}
                            <rect x="75" y="20" width="50" height="90" rx="25" fill="#fdba74"/>
                            <rect x="82" y="28" width="36" height="74" rx="18" fill="#fed7aa" fillOpacity="0.6"/>
                            {/* Stand arc */}
                            <path d="M50 100 Q50 150 100 150 Q150 150 150 100" stroke="#fb923c" strokeWidth="8" strokeLinecap="round" fill="none"/>
                            {/* Stand pole */}
                            <line x1="100" y1="150" x2="100" y2="175" stroke="#fb923c" strokeWidth="8" strokeLinecap="round"/>
                            <line x1="70" y1="175" x2="130" y2="175" stroke="#fb923c" strokeWidth="8" strokeLinecap="round"/>
                            {/* Sound waves */}
                            <path d="M30 85 Q20 100 30 115" stroke="#fca5a5" strokeWidth="4" strokeLinecap="round" fill="none"/>
                            <path d="M170 85 Q180 100 170 115" stroke="#fca5a5" strokeWidth="4" strokeLinecap="round" fill="none"/>
                            <path d="M18 72 Q4 100 18 128" stroke="#fed7aa" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
                            <path d="M182 72 Q196 100 182 128" stroke="#fed7aa" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
                        </svg>
                    </div>
                </div>

            </div>
        </section>
    );
}

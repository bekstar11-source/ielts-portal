import React, { useEffect, useState } from 'react';
import { Target, BarChart2, Clock, PlayCircle, Calendar, ArrowUp } from 'lucide-react';

const GlassCard = ({ children, delay = "0s", className = "" }) => (
    <div
        className={`glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden group transition-all duration-500 animate-fade-in-up ${className}`}
        style={{ animationDelay: delay }}
    >
        {children}
    </div>
);

export default function HeroSection({
    userName = "O'quvchi",
    targetBand = 7.5,
    currentBand = 6.0,
    previousBand = 5.5,
    daysRemaining = null,
    examDate = null
}) {
    const [animatedCurrent, setAnimatedCurrent] = useState(0);
    const [animatedDays, setAnimatedDays] = useState(0);

    // Calculate days remaining if examDate is provided
    const calculatedDays = examDate ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24))) : daysRemaining;
    const finalDays = calculatedDays !== null ? calculatedDays : 0;

    // Calculate improvement
    const improvement = currentBand - previousBand;
    // const hasImprovement = improvement > 0;

    // Calculate progress percentage (current vs target)
    // const progressToTarget = Math.min(100, Math.round((currentBand / targetBand) * 100));

    // Logic moved to effect
    const radius = 40;
    const circumference = radius * 2 * Math.PI;
    const targetPercentage = 85;
    const strokeDashoffset = circumference - (targetPercentage / 100) * circumference;

    // Counter animation
    useEffect(() => {
        const duration = 1500;
        const steps = 60;
        const stepDuration = duration / steps;

        let currentStep = 0;
        const timer = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;

            setAnimatedCurrent(parseFloat((currentBand * progress).toFixed(1)));
            setAnimatedDays(Math.round(finalDays * progress));

            if (currentStep >= steps) {
                clearInterval(timer);
                setAnimatedCurrent(currentBand);
                setAnimatedDays(finalDays);
            }
        }, stepDuration);

        return () => clearInterval(timer);
    }, [currentBand, finalDays]);

    return (
        <section className="relative z-10 mb-20">
            <style>{`
                .glass-card {
                    background: rgba(15, 15, 15, 0.6);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 0 0 1px rgba(0,0,0,0.2);
                }
                .glass-card:hover {
                    border-color: rgba(255, 85, 32, 0.5);
                    box-shadow: 0 0 30px rgba(255, 85, 32, 0.15);
                    transform: translateY(-2px);
                    background: rgba(20, 20, 20, 0.8);
                }
                .text-gradient-orange {
                    background: linear-gradient(135deg, #FFFFFF 0%, #FF5520 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .progress-ring__circle {
                    transition: stroke-dashoffset 1.5s ease-in-out;
                    transform: rotate(-90deg);
                    transform-origin: 50% 50%;
                }
            `}</style>

            <div className="flex flex-col xl:flex-row gap-8 xl:gap-20 items-center">

                {/* LEFT SIDE */}
                <div className="w-full xl:w-5/12 space-y-8 text-center xl:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-vetra-border/50 border border-vetra-border text-vetra-textMuted text-xs font-medium tracking-wide uppercase hover:border-vetra-orange/50 transition-colors cursor-default backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-vetra-orange animate-pulse"></span>
                        Student Dashboard
                    </div>

                    <div>
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-4 text-white tracking-tight animate-fade-in-up">
                            Salom, <br />
                            <span className="text-gradient-orange">{userName}!</span>
                        </h1>
                        <p className="text-xl text-vetra-textMuted leading-relaxed max-w-md mx-auto xl:mx-0">
                            IELTS sayohatingiz ajoyib davom etmoqda. Bugun yangi natijalarga erishamiz.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center xl:justify-start">
                        <button className="px-8 py-4 bg-vetra-orange hover:bg-[#FF3300] text-white font-bold rounded-full transition-all duration-300 transform hover:scale-105 shadow-[0_0_30px_rgba(255,85,32,0.4)] flex items-center justify-center gap-2">
                            <PlayCircle className="w-5 h-5 fill-white text-white" />
                            Darsni Boshlash
                        </button>
                        <button className="px-8 py-4 bg-white/5 text-white hover:bg-white/10 font-semibold rounded-full transition-all duration-300 border border-white/10 flex items-center justify-center gap-2 backdrop-blur-md">
                            <Calendar className="w-5 h-5" />
                            Jadvalni Ko'rish
                        </button>
                    </div>
                </div>

                {/* RIGHT SIDE: Stats */}
                <div className="w-full xl:w-7/12 grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Card 1: Target */}
                    <GlassCard delay="0.2s">
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-3 rounded-2xl bg-white/5 text-vetra-orange border border-white/10 group-hover:border-vetra-orange/50 transition-colors">
                                <Target className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-vetra-textMuted uppercase tracking-wider">Maqsad</span>
                        </div>

                        <div className="relative flex items-end justify-between">
                            <div>
                                <div className="text-5xl font-bold text-white mb-2 tracking-tighter">{targetBand}</div>
                                <div className="text-sm text-vetra-textMuted font-medium">Target Band</div>
                            </div>
                            <div className="relative w-16 h-16">
                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                    <circle className="text-white/10 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                                    <circle
                                        className="text-vetra-orange progress-ring__circle stroke-current drop-shadow-[0_0_10px_rgba(255,85,32,0.8)]"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="transparent"
                                        strokeDasharray={`${circumference} ${circumference}`}
                                        strokeDashoffset={strokeDashoffset}
                                    ></circle>
                                </svg>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Card 2: Current */}
                    <GlassCard delay="0.3s">
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-3 rounded-2xl bg-white/5 text-white border border-white/10 group-hover:border-white/50 transition-colors">
                                <BarChart2 className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-vetra-textMuted uppercase tracking-wider">Hozirgi</span>
                        </div>

                        <div>
                            <div className="flex items-baseline gap-2 mb-2">
                                <div className="text-5xl font-bold text-white tracking-tighter">{animatedCurrent}</div>
                                <span className="px-2 py-1 rounded-md bg-green-500/20 text-green-400 text-xs font-bold flex items-center gap-1 border border-green-500/20">
                                    +{improvement.toFixed(1)} <ArrowUp className="w-3 h-3" />
                                </span>
                            </div>
                            <div className="text-sm text-vetra-textMuted font-medium mb-4">Current Band</div>

                            <div className="flex items-end gap-1 h-8 w-full opacity-50">
                                <div className="w-full bg-white/20 rounded-t-sm h-[40%]"></div>
                                <div className="w-full bg-white/20 rounded-t-sm h-[60%]"></div>
                                <div className="w-full bg-vetra-orange rounded-t-sm h-[80%] shadow-[0_0_10px_rgba(255,85,32,0.5)]"></div>
                                <div className="w-full bg-white/20 rounded-t-sm h-[50%]"></div>
                                <div className="w-full bg-white/20 rounded-t-sm h-[70%]"></div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Card 3: Time Remaining */}
                    <GlassCard delay="0.4s">
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-3 rounded-2xl bg-white/5 text-vetra-textMuted border border-white/10 group-hover:text-white transition-colors">
                                <Clock className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-vetra-textMuted uppercase tracking-wider">Imtihongacha</span>
                        </div>

                        <div>
                            <div className="flex items-baseline gap-1 mb-2">
                                <div className="text-5xl font-bold text-white tracking-tighter">{animatedDays}</div>
                                <span className="text-xl text-vetra-textMuted font-medium">kun</span>
                            </div>
                            <div className="text-sm text-vetra-textMuted font-medium mb-4">Vaqt qoldi</div>

                            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-vetra-orange h-full rounded-full w-[60%] shadow-[0_0_10px_rgba(255,85,32,0.8)] animate-pulse"></div>
                            </div>
                        </div>
                    </GlassCard>

                </div>
            </div>
        </section>
    );
}

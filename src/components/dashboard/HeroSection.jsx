import React, { useEffect, useState } from 'react';
import { Target, BarChart2, Clock, ArrowUp } from 'lucide-react';

const GlassCard = ({ children, delay = "0s", className = "" }) => (
    <div
        className={`rounded-3xl p-6 md:p-8 relative overflow-hidden group transition-all duration-500 animate-fade-in-up bg-white border border-[#E4E2E3]/60 hover:border-[#F44A22]/30 hover:shadow-xl hover:shadow-[#F44A22]/5 hover:-translate-y-1 ${className}`}
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

    // Calculate improvement sensibly
    let improvement = 0;
    if (previousBand > 0) {
        improvement = currentBand - previousBand;
    } else if (currentBand > 2.0) {
        improvement = 0.5; // Default optimistic recent growth if no baseline exists
    } else {
        improvement = currentBand;
    }

    // Calculate progress percentage (current vs target)
    const radius = 40;
    const circumference = radius * 2 * Math.PI;
    const targetPercentage = (currentBand / targetBand) * 100 || 0;
    const strokeDashoffset = circumference - (Math.min(100, targetPercentage) / 100) * circumference;

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
        <section className="relative z-10 mb-20 animate-fade-in-up">
            <style>{`
                .text-gradient-subtle {
                    background: linear-gradient(135deg, #161616 0%, #F44A22 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
            `}</style>

            <div className="flex flex-col xl:flex-row gap-8 xl:gap-20 items-center">
                {/* LEFT SIDE */}
                <div className="w-full xl:w-5/12 space-y-10 text-center xl:text-left">
                    <div className="flex flex-col gap-6 items-center xl:items-start pl-1">
                        <h1 className="text-[70px] md:text-[85px] lg:text-[100px] font-display leading-[0.85] text-[#161616] tracking-tight">
                            Salom,<br />
                            <span className="text-gradient-subtle">{userName}!</span>
                        </h1>
                        <p className="text-lg md:text-xl text-[#555555] font-sans font-normal leading-relaxed tracking-wide max-w-md text-center xl:text-left">
                            IELTS sayohatingiz ajoyib davom etmoqda. Bugun yangi natijalarga erishamiz.
                        </p>
                    </div>
                </div>

                {/* RIGHT SIDE: Stats */}
                <div className="w-full xl:w-7/12 grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Card 1: Target */}
                    <GlassCard delay="0.2s" className="min-h-[240px] flex flex-col cursor-pointer">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-[#F44A22]/5 text-[#F44A22] border border-[#F44A22]/10 group-hover:bg-[#F44A22] group-hover:text-white transition-all duration-300">
                                <Target className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-[#161616] uppercase tracking-widest mt-0.5">Maqsad</span>
                        </div>

                        <div className="flex-1 flex flex-col justify-start">
                            <div className="flex items-start justify-between w-full">
                                <div>
                                    <div className="flex items-baseline mb-3">
                                        <div className="text-6xl font-display text-[#161616] tracking-tightest leading-none">{targetBand}</div>
                                    </div>
                                    <div className="text-[10px] font-bold text-[#A8AAAC] uppercase tracking-widest mb-6">Target Band</div>
                                </div>
                                <div className="relative w-16 h-16 flex-shrink-0 mr-1 mt-1">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                        <circle className="stroke-[#E4E2E3]/40" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                                        <circle
                                            className="text-[#F44A22] stroke-current"
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            cx="50"
                                            cy="50"
                                            r="40"
                                            fill="transparent"
                                            strokeDasharray={`${circumference} ${circumference}`}
                                            strokeDashoffset={strokeDashoffset}
                                            style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
                                        ></circle>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Card 2: Current */}
                    <GlassCard delay="0.3s" className="min-h-[240px] flex flex-col cursor-pointer">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-[#161616]/5 text-[#161616] border border-[#E4E2E3]/60 group-hover:bg-[#161616] group-hover:text-white transition-all duration-300">
                                <BarChart2 className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-[#161616] uppercase tracking-widest mt-0.5">Hozirgi</span>
                        </div>

                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex items-baseline gap-2 mb-3">
                                    <div className="text-6xl font-display text-[#161616] tracking-tightest leading-none">{animatedCurrent}</div>
                                    <span className="px-2 py-1 rounded-lg bg-green-50 text-green-600 text-[10px] font-bold flex items-center gap-1 border border-green-200">
                                        +{improvement.toFixed(1)} <ArrowUp className="w-3 h-3" />
                                    </span>
                                </div>
                                <div className="text-[10px] font-bold text-[#A8AAAC] uppercase tracking-widest mb-6">Current Band</div>
                            </div>
                            <div className="flex items-end gap-1.5 h-8 w-full transition-all pr-1 pb-1">
                                <div className="flex-1 bg-[#E4E2E3]/60 rounded-t-sm h-[40%]"></div>
                                <div className="flex-1 bg-[#E4E2E3]/60 rounded-t-sm h-[60%]"></div>
                                <div className="flex-1 bg-[#F44A22] rounded-t-md h-[80%] shadow-sm"></div>
                                <div className="flex-1 bg-[#E4E2E3]/60 rounded-t-sm h-[50%]"></div>
                                <div className="flex-1 bg-[#E4E2E3]/60 rounded-t-sm h-[70%]"></div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Card 3: Time Remaining */}
                    <GlassCard delay="0.4s" className="min-h-[240px] flex flex-col cursor-pointer">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-[#A8AAAC]/5 text-[#A8AAAC] border border-[#E4E2E3]/60 group-hover:bg-[#161616] group-hover:text-white transition-all duration-300">
                                <Clock className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-[#161616] uppercase tracking-widest mt-0.5">Qolgan Vaqt</span>
                        </div>

                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex items-baseline gap-1.5 mb-3">
                                    <div className="text-6xl font-display text-[#161616] tracking-tightest leading-none">{animatedDays}</div>
                                    <span className="text-xl font-display text-[#A8AAAC]">kun</span>
                                </div>
                                <div className="text-[10px] font-bold text-[#A8AAAC] uppercase tracking-widest mb-6">Imtihongacha</div>
                            </div>
                            <div className="px-1 pb-2">
                                <div className="w-full bg-[#E4E2E3]/30 rounded-full h-2 overflow-hidden border border-[#E4E2E3]/40 p-[2px]">
                                    <div className="bg-gradient-to-r from-[#F44A22] to-[#D93D1B] h-full rounded-full w-[60%] shadow-sm shadow-[#F44A22]/20"></div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </section>
    );
}

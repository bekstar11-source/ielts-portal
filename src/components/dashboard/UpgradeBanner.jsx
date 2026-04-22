import React from 'react';
import { ShineBorder } from '../ui/shine-border';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function UpgradeBanner({ 
    targetBand = 7.5, 
    onClick 
}) {
    return (
        <button 
            onClick={onClick}
            className="w-full mt-6 group focus:outline-none focus:ring-2 focus:ring-vetra-orange/20 rounded-2xl overflow-hidden transition-all duration-300 transform active:scale-[0.98]"
        >
            <ShineBorder 
                borderRadius={20}
                borderWidth={2}
                duration={10}
                color={["#FFD700", "#7D2AE8", "#F44A22"]}
                className="w-full !p-0"
            >
                <div className="relative w-full px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden bg-gradient-to-r from-[#7D2AE8] via-[#2D1B69] to-[#7D2AE8] bg-[length:200%_auto] animate-gradient-shift">
                    {/* Background sparkles decoration */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <div className="absolute top-0 left-10 w-24 h-24 bg-yellow-400 blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-0 right-10 w-32 h-32 bg-purple-400 blur-3xl animate-pulse delay-700"></div>
                    </div>

                    <div className="flex items-center gap-4 z-10">
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                            <Sparkles className="w-6 h-6 text-[#FFD700] animate-pulse" />
                        </div>
                        <div className="text-left">
                            <h4 className="text-white font-bold text-lg md:text-xl tracking-tight leading-tight">
                                Ballingizni <span className="text-[#FFD700] underline decoration-wavy decoration-yellow-500/50 underline-offset-4">{targetBand}</span> ga olib chiqish uchun individual o'quv rejasini oching
                            </h4>
                            <p className="text-white/60 text-xs font-medium mt-1 uppercase tracking-widest">Premium Plan • AI Optimized Learning</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white text-[#161616] px-6 py-3 rounded-full font-bold text-sm shadow-xl shadow-black/20 group-hover:bg-[#FFD700] group-hover:scale-105 transition-all duration-300 z-10 whitespace-nowrap">
                        Rejani ochish
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </ShineBorder>

            <style>{`
                @keyframes gradient-shift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient-shift {
                    animation: gradient-shift 6s ease infinite;
                }
            `}</style>
        </button>
    );
}

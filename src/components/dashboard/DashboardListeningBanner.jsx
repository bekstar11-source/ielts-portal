import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';

export default function DashboardListeningBanner({ isListeningPaused, setIsListeningPaused }) {
    const navigate = useNavigate();

    return (
        <div className="w-full mt-0 mb-0 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <div className="relative w-full h-[400px] mb-0 overflow-hidden shadow-2xl">
                {/* Vibrant Background with Mesh Gradient */}
                <div className="absolute inset-0 bg-[#d60017] flex items-center justify-center overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none select-none opacity-20 transform scale-125">
                         <h1 className="text-white text-[150px] md:text-[220px] lg:text-[280px] font-black tracking-tighter leading-none italic blur-[2px]">
                            LISTENING
                         </h1>
                    </div>
                    
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
                                
                                <button 
                                    onClick={() => setIsListeningPaused(!isListeningPaused)}
                                    className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90 ml-4"
                                >
                                    {isListeningPaused ? (
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
                                    ) : (
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

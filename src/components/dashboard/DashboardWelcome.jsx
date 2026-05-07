import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard3D from './StatCard3D';

export default function DashboardWelcome({ 
    userName, 
    targetBand, 
    currentBand, 
    finalDays, 
    animatedCurrent, 
    animatedDays 
}) {
    const navigate = useNavigate();

    return (
        <>
            {/* Hero Content */}
            <main className="flex flex-col items-center justify-center text-center px-4 pt-[6vh] sm:pt-[10vh] pb-12 sm:pb-20 max-w-[1100px] mx-auto animate-fade-in w-full">
                {/* Top Badge */}
                <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 mb-3 tracking-wide uppercase">
                    <span className="text-black">IELTS 2026</span>
                    <span className="text-[10px]">•</span>
                    <span>Reallik</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-[36px] sm:text-[64px] md:text-[88px] font-bold text-black tracking-[-0.04em] leading-[1.1] mb-5 sm:mb-8 max-w-[1000px]">
                    Mo'jiza kutma,<br />
                    o'zing mo'jiza yarat.
                </h1>

                {/* Subheadline */}
                <p className="text-[15px] sm:text-[18px] md:text-[21px] text-zinc-400 font-normal leading-[1.6] max-w-[760px] mb-8 sm:mb-12 px-2">
                    Hech qanday "maxfiy strategiya" yo'q. Bor narsa — shu ekran, matnlar, audiyolar va sening vaqting. Diqqatingni jamla.
                </p>

                {/* Call to Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <button 
                        onClick={() => navigate('/practice')}
                        className="w-[240px] sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-black text-white text-[15px] font-semibold rounded-full hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/10"
                    >
                        Bugungi vazifalar
                    </button>
                    <button 
                        onClick={() => navigate('/my-results')}
                        className="w-[240px] sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-[#F5F5F7] text-black text-[15px] font-semibold rounded-full border border-zinc-200/60 hover:bg-zinc-100 transition-all hover:scale-105 active:scale-95"
                    >
                        Natijalarni ko'rish
                    </button>
                </div>
            </main>

            {/* 3D Cards Grid - Scrollable on mobile, Grid on desktop */}
            <div className="w-full px-0 overflow-x-auto md:overflow-visible no-scrollbar -mt-8 pb-10">
                <div
                    style={{
                        perspective: '1200px',
                        transformStyle: 'preserve-3d',
                    }}
                    className="flex flex-row items-center md:justify-center gap-6 md:gap-10 lg:gap-14 min-w-max md:min-w-0 md:h-[380px] py-4 px-6 md:px-0"
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
                        value={parseFloat(targetBand || 7.5).toFixed(1)}
                        subLabel="Siz erishmoqchi bo'lgan IELTS bali"
                        accentColor="red"
                        chartType="donut"
                        chartValue={Math.min(100, Math.round((parseFloat(currentBand || 0) / parseFloat(targetBand || 7.5)) * 100)) || 0}
                    />

                    {/* Overall Score Card */}
                    <StatCard3D 
                        type="center"
                        icon={() => (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                            </svg>
                        )}
                        label="Umumiy Ball"
                        value={parseFloat(animatedCurrent || 0).toFixed(1)}
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
            </div>
        </>
    );
}

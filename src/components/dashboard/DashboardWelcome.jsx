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
        </>
    );
}

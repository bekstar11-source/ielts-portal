import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard3D from './StatCard3D';
import { useTranslation } from '../../context/LanguageContext';

export default function DashboardWelcome({ 
    userName, 
    targetBand, 
    currentBand, 
    finalDays, 
    animatedCurrent, 
    animatedDays,
    skillStats = []
}) {
    const navigate = useNavigate();
    const { t, lang } = useTranslation();

    const getScore = (skillName) => {
        const stat = skillStats && skillStats.find(s => s.name === skillName);
        return stat && stat.score ? parseFloat(stat.score).toFixed(1) : '0.0';
    };

    const getCEFR = (score) => {
        const s = parseFloat(score);
        if (s >= 8.5) return 'C2';
        if (s >= 7.0) return 'C1';
        if (s >= 5.5) return 'B2';
        if (s >= 4.0) return 'B1';
        return 'B1';
    };

    const listeningVal = getScore('Listening');
    const readingVal = getScore('Reading');
    const writingVal = getScore('Writing');
    const speakingVal = getScore('Speaking');
    const overallVal = parseFloat(currentBand || 0).toFixed(1);
    const cefrVal = getCEFR(overallVal);

    return (
        <>
            {/* Hero Content */}
            <main className="flex flex-col items-center justify-center text-center px-4 pt-[3vh] sm:pt-[5vh] pb-6 sm:pb-10 max-w-[1100px] mx-auto animate-fade-in w-full">
                {/* Top Badge */}
                <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 mb-2 tracking-wide uppercase">
                    <span className="text-black">IELTS 2026</span>
                    <span className="text-[10px]">•</span>
                    <span>{t('dashboard.reality')}</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-[26px] sm:text-[44px] md:text-[56px] font-bold text-black tracking-[-0.04em] leading-[1.1] mb-3 sm:mb-4 max-w-[1000px] whitespace-pre-line">
                    {t('dashboard.welcomeHeadline')}
                </h1>

                {/* Subheadline */}
                <p className="text-[14px] sm:text-[16px] md:text-[18px] text-zinc-400 font-normal leading-[1.6] max-w-[760px] mb-5 sm:mb-8 px-2">
                    {t('dashboard.welcomeSub')}
                </p>

                {/* Call to Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <button 
                        onClick={() => navigate('/practice')}
                        className="w-[220px] sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-black text-white text-[14px] font-semibold rounded-full hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
                    >
                        {t('dashboard.todayTasks')}
                    </button>
                    <button 
                        onClick={() => navigate('/my-results')}
                        className="w-[220px] sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-[#F5F5F7] text-black text-[14px] font-semibold rounded-full border border-zinc-200/60 hover:bg-zinc-100 transition-all hover:scale-105 active:scale-95"
                    >
                        {t('dashboard.viewResults')}
                    </button>
                </div>

                {/* Overlapping IELTS Scores Carousel */}
                <div className="relative w-full mt-8 sm:mt-10 select-none flex justify-center">
                    <style>{`
                      .card-transition {
                        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                      }
                    `}</style>

                    {/* Cards Carousel Stack */}
                    <div className="flex items-center justify-center w-full relative max-w-5xl mx-auto py-2">
                        {/* 1. Listening (L) - Chapdagi eng chetki */}
                        <div className="relative z-10 w-24 h-16 sm:w-32 sm:h-22 md:w-44 md:h-28 bg-zinc-900 rounded-lg md:rounded-2xl flex flex-col justify-center items-start pl-3 sm:pl-5 md:pl-6 shadow-2xl card-transition border border-zinc-800/80 group overflow-hidden cursor-default">
                            <span className="absolute -bottom-2 -right-2 text-4xl sm:text-6xl md:text-7xl font-black text-zinc-800/30 group-hover:text-blue-500/10 card-transition select-none">L</span>
                            <span className="relative z-10 text-[8px] sm:text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">
                                {lang === 'uz' ? "Tinglash" : "Listening"}
                            </span>
                            <span className="relative z-10 text-xl sm:text-2xl md:text-3xl font-bold text-white group-hover:text-blue-400 card-transition">
                                {listeningVal}
                            </span>
                        </div>

                        {/* 2. Reading (R) - Chapdagi o'rta */}
                        <div className="relative z-20 w-28 h-20 sm:w-38 sm:h-26 md:w-52 md:h-34 bg-zinc-800 rounded-lg md:rounded-2xl flex flex-col justify-center items-start pl-3 sm:pl-5 md:pl-6 shadow-2xl card-transition border border-zinc-700 -ml-6 sm:-ml-10 md:-ml-14 group overflow-hidden cursor-default">
                            <span className="absolute -bottom-3 -right-2 text-5xl sm:text-7xl md:text-[90px] font-black text-zinc-700/30 group-hover:text-emerald-500/10 card-transition select-none">R</span>
                            <span className="relative z-10 text-[9px] sm:text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest mb-0.5">
                                {lang === 'uz' ? "O'qish" : "Reading"}
                            </span>
                            <span className="relative z-10 text-2xl sm:text-3xl md:text-4xl font-bold text-white group-hover:text-emerald-400 card-transition">
                                {readingVal}
                            </span>
                        </div>

                        {/* 3. Overall (Markaziy) */}
                        <div className="relative z-30 w-36 h-26 sm:w-48 sm:h-34 md:w-64 md:h-44 bg-white rounded-xl md:rounded-[1.5rem] flex flex-col items-center justify-center shadow-[0_0_60px_rgba(209,18,65,0.2)] hover:-translate-y-1.5 card-transition border-2 md:border-4 border-gray-100 -ml-6 sm:-ml-10 md:-ml-14 overflow-hidden group cursor-default">
                            <div className="absolute top-0 w-full h-1.5 md:h-2.5 bg-[#d11241]"></div>
                            <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-gray-100 to-transparent"></div>
                            <span className="absolute inset-0 flex items-center justify-center text-[60px] sm:text-[90px] md:text-[120px] font-black text-gray-50/80 pointer-events-none select-none">O</span>
                            <span className="relative z-10 text-[8px] sm:text-[9px] md:text-[10px] font-bold text-[#d11241] uppercase tracking-widest mb-0.5">
                                {lang === 'uz' ? "Umumiy Natija" : "Overall Score"}
                            </span>
                            <span className="relative z-10 text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 drop-shadow-sm transform group-hover:scale-105 card-transition my-0.5 sm:my-1">
                                {overallVal}
                            </span>
                            <div className="relative z-10 mt-0.5 sm:mt-1 md:mt-2 px-2.5 sm:px-3.5 py-0.5 md:py-1 rounded-full bg-gray-900 border border-black shadow-md">
                                <span className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-white uppercase tracking-wider">
                                    CEFR: {cefrVal}
                                </span>
                            </div>
                        </div>

                        {/* 4. Writing (W) - O'ngdagi o'rta */}
                        <div className="relative z-20 w-28 h-20 sm:w-38 sm:h-26 md:w-52 md:h-34 bg-zinc-800 rounded-lg md:rounded-2xl flex flex-col justify-center items-end pr-3 sm:pr-5 md:pr-6 shadow-2xl card-transition border border-zinc-700 -ml-6 sm:-ml-10 md:-ml-14 group overflow-hidden cursor-default text-right">
                            <span className="absolute -bottom-3 -left-2 text-5xl sm:text-7xl md:text-[90px] font-black text-zinc-700/30 group-hover:text-amber-500/10 card-transition select-none">W</span>
                            <span className="relative z-10 text-[9px] sm:text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest mb-0.5">
                                {lang === 'uz' ? "Yozish" : "Writing"}
                            </span>
                            <span className="relative z-10 text-2xl sm:text-3xl md:text-4xl font-bold text-white group-hover:text-amber-400 card-transition">
                                {writingVal}
                            </span>
                        </div>

                        {/* 5. Speaking (S) - O'ngdagi eng chetki */}
                        <div className="relative z-10 w-24 h-16 sm:w-32 sm:h-22 md:w-44 md:h-28 bg-zinc-900 rounded-lg md:rounded-2xl flex flex-col justify-center items-end pr-3 sm:pr-5 md:pr-6 shadow-2xl card-transition border border-zinc-800/80 -ml-6 sm:-ml-10 md:-ml-14 group overflow-hidden cursor-default text-right">
                            <span className="absolute -bottom-2 -left-2 text-4xl sm:text-6xl md:text-7xl font-black text-zinc-800/30 group-hover:text-purple-500/10 card-transition select-none">S</span>
                            <span className="relative z-10 text-[8px] sm:text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">
                                {lang === 'uz' ? "Gapirish" : "Speaking"}
                            </span>
                            <span className="relative z-10 text-xl sm:text-2xl md:text-3xl font-bold text-white group-hover:text-purple-400 card-transition">
                                {speakingVal}
                            </span>
                        </div>
                    </div>
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
                        label={t('dashboard.targetScore')}
                        value={parseFloat(targetBand || 7.5).toFixed(1)}
                        subLabel={t('dashboard.targetScoreDesc')}
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
                        label={t('dashboard.overallScore')}
                        value={parseFloat(animatedCurrent || 0).toFixed(1)}
                        subLabel={t('dashboard.overallScoreDesc')}
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
                        label={t('dashboard.untilExam')}
                        value={finalDays > 0 ? animatedDays : '—'}
                        unit={finalDays > 0 ? t('dashboard.daysUnit') : ''}
                        subLabel={t('dashboard.untilExamDesc')}
                        accentColor="purple"
                        chartType="progress"
                        chartValue={finalDays > 0 ? Math.min(100, Math.round(((90 - finalDays) / 90) * 100)) : 0}
                    />
                </div>
            </div>
        </>
    );
}

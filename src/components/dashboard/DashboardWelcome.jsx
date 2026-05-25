import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';

export default function DashboardWelcome({ 
    userName, 
    targetBand, 
    currentBand, 
    finalDays, 
    animatedCurrent, 
    animatedDays,
    skillStats = [],
    loading = false
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
            <main className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 px-4 sm:px-6 pt-[3vh] sm:pt-[5vh] pb-6 sm:pb-10 max-w-7xl mx-auto animate-fade-in w-full">
                {/* Left Side: Headline & Subheadline */}
                <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl">
                    {/* Top Badge */}
                    <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-zinc-400 mb-3 tracking-wide uppercase">
                        <span className="text-black">IELTS 2026</span>
                        <span className="text-[10px]">•</span>
                        <span>{t('dashboard.reality')}</span>
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-[28px] sm:text-[48px] lg:text-[54px] xl:text-[64px] font-bold text-black tracking-[-0.04em] leading-[1.1] mb-4 sm:mb-5 whitespace-pre-line">
                        {t('dashboard.welcomeHeadline')}
                    </h1>

                    {/* Subheadline */}
                    <p className="text-[15px] sm:text-[18px] md:text-[20px] lg:text-[21px] text-zinc-400 font-normal leading-[1.6] mb-4 sm:mb-9">
                        {t('dashboard.welcomeSub')}
                    </p>
                </div>

                {/* Right Side: Scores & Cards */}
                <div className="flex-1 flex flex-col items-center justify-center w-full lg:max-w-[550px] xl:max-w-[650px] mt-2 lg:mt-0">
                    {/* Overlapping IELTS Scores Carousel */}
                    <div className="relative w-full select-none flex justify-center">
                        <style>{`
                          .card-transition {
                            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                          }
                        `}</style>

                        {/* Cards Carousel Stack */}
                        <div className="flex items-center justify-center w-full relative max-w-6xl mx-auto py-1 sm:py-2 scale-100 origin-center card-transition">
                            {/* 1. Listening (L) - Chapdagi eng chetki */}
                            <div className="relative z-10 w-20 sm:w-28 md:w-36 lg:w-28 xl:w-36 h-12 sm:h-16 md:h-20 lg:h-16 xl:h-20 bg-zinc-900 rounded-xl md:rounded-3xl flex flex-col justify-center items-start pl-2 sm:pl-3 md:pl-5 lg:pl-3 xl:pl-5 shadow-2xl card-transition border border-zinc-800/80 group overflow-hidden cursor-default">
                                <span className="absolute -bottom-2 -right-2 text-2xl sm:text-4xl md:text-5xl lg:text-4xl xl:text-5xl font-black text-zinc-800/20 group-hover:text-blue-500/10 card-transition select-none">L</span>
                                <span className="relative z-10 text-[7px] sm:text-[8px] md:text-[9px] lg:text-[8px] xl:text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">
                                    {lang === 'uz' ? "Tinglash" : "Listening"}
                                </span>
                                {loading ? (
                                    <div className="w-8 h-4 sm:w-12 sm:h-6 bg-zinc-800 animate-pulse rounded mt-1"></div>
                                ) : (
                                    <span className="relative z-10 text-sm sm:text-base md:text-xl lg:text-base xl:text-xl font-bold text-white group-hover:text-blue-400 card-transition">
                                        {listeningVal}
                                    </span>
                                )}
                            </div>

                            {/* 2. Reading (R) - Chapdagi o'rta */}
                            <div className="relative z-20 w-24 sm:w-32 md:w-44 lg:w-36 xl:w-44 h-14 sm:h-18 md:h-24 lg:h-20 xl:h-24 bg-zinc-800 rounded-xl md:rounded-3xl flex flex-col justify-center items-start pl-2.5 sm:pl-4 md:pl-6 lg:pl-4 xl:pl-6 shadow-2xl card-transition border border-zinc-700 -ml-[28px] sm:-ml-[40px] md:-ml-[56px] lg:-ml-[40px] xl:-ml-[56px] group overflow-hidden cursor-default">
                                <span className="absolute -bottom-3 -right-2 text-3xl sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl font-black text-zinc-700/20 group-hover:text-emerald-500/10 card-transition select-none">R</span>
                                <span className="relative z-10 text-[7px] sm:text-[9px] md:text-[10px] lg:text-[9px] xl:text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">
                                    {lang === 'uz' ? "O'qish" : "Reading"}
                                </span>
                                {loading ? (
                                    <div className="w-8 h-4 sm:w-12 sm:h-6 bg-zinc-700 animate-pulse rounded mt-1"></div>
                                ) : (
                                    <span className="relative z-10 text-base sm:text-lg md:text-2xl lg:text-lg xl:text-2xl font-bold text-white group-hover:text-emerald-400 card-transition">
                                        {readingVal}
                                    </span>
                                )}
                            </div>

                            {/* 3. Overall (Markaziy) */}
                            <div className="relative z-30 w-24 sm:w-36 md:w-48 lg:w-40 xl:w-48 h-24 sm:h-28 md:h-36 lg:h-28 xl:h-36 bg-white rounded-xl sm:rounded-2xl md:rounded-[2rem] flex flex-col items-center justify-center shadow-[0_0_80px_rgba(209,18,65,0.25)] hover:-translate-y-2 card-transition border-2 sm:border-4 border-gray-100 -ml-[28px] sm:-ml-[40px] md:-ml-[56px] lg:-ml-[40px] xl:-ml-[56px] overflow-hidden group cursor-default">
                                <div className="absolute top-0 w-full h-1 bg-[#d11241]"></div>
                                <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-gray-100 to-transparent"></div>
                                <span className="absolute inset-0 flex items-center justify-center text-[40px] sm:text-[60px] md:text-[80px] lg:text-[60px] xl:text-[80px] font-black text-gray-50/80 pointer-events-none select-none">O</span>
                                <span className="relative z-10 text-[7px] sm:text-[9px] md:text-xs lg:text-[9px] xl:text-xs font-bold text-[#d11241] uppercase tracking-widest pt-1 sm:pt-0 mb-0.5">
                                    {lang === 'uz' ? "Umumiy Natija" : "Overall Score"}
                                </span>
                                {loading ? (
                                    <div className="w-12 h-6 sm:w-20 sm:h-10 bg-gray-200 animate-pulse rounded my-1 sm:my-2"></div>
                                ) : (
                                    <span className="relative z-10 text-xl sm:text-3xl md:text-4xl lg:text-3xl xl:text-4xl font-black text-gray-900 drop-shadow-sm transform group-hover:scale-105 card-transition my-0.5 sm:my-1">
                                        {overallVal}
                                    </span>
                                )}
                                {loading ? (
                                    <div className="w-10 h-3 sm:w-16 sm:h-5 bg-gray-200 animate-pulse rounded-full mt-1"></div>
                                ) : (
                                    <div className="relative z-10 mt-0.5 sm:mt-1 md:mt-2 lg:mt-1 xl:mt-2 rounded-full sm:bg-gray-900 sm:border sm:border-black sm:shadow-lg px-0 py-0 sm:px-3 sm:py-1 md:px-4 md:py-1.5 lg:px-3 lg:py-1 xl:px-4 xl:py-1.5">
                                        <span className="text-[7px] sm:text-[8px] md:text-[10px] lg:text-[8px] xl:text-[10px] font-bold text-gray-900 sm:text-white uppercase tracking-wider">
                                            CEFR: {cefrVal}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* 4. Writing (W) - O'ngdagi o'rta */}
                            <div className="relative z-20 w-24 sm:w-32 md:w-44 lg:w-36 xl:w-44 h-14 sm:h-18 md:h-24 lg:h-20 xl:h-24 bg-zinc-800 rounded-xl md:rounded-3xl flex flex-col justify-center items-end pr-2.5 sm:pr-4 md:pr-6 lg:pr-4 xl:pr-6 shadow-2xl card-transition border border-zinc-700 -ml-[28px] sm:-ml-[40px] md:-ml-[56px] lg:-ml-[40px] xl:-ml-[56px] group overflow-hidden cursor-default text-right">
                                <span className="absolute -bottom-3 -left-2 text-3xl sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl font-black text-zinc-700/20 group-hover:text-amber-500/10 card-transition select-none">W</span>
                                <span className="relative z-10 text-[7px] sm:text-[9px] md:text-[10px] lg:text-[9px] xl:text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">
                                    {lang === 'uz' ? "Yozish" : "Writing"}
                                </span>
                                {loading ? (
                                    <div className="w-8 h-4 sm:w-12 sm:h-6 bg-zinc-700 animate-pulse rounded mt-1"></div>
                                ) : (
                                    <span className="relative z-10 text-base sm:text-lg md:text-2xl lg:text-lg xl:text-2xl font-bold text-white group-hover:text-amber-400 card-transition">
                                        {writingVal}
                                    </span>
                                )}
                            </div>

                            {/* 5. Speaking (S) - O'ngdagi eng chetki */}
                            <div className="relative z-10 w-20 sm:w-28 md:w-36 lg:w-28 xl:w-36 h-12 sm:h-16 md:h-20 lg:h-16 xl:h-20 bg-zinc-900 rounded-xl md:rounded-3xl flex flex-col justify-center items-end pr-2 sm:pr-3 md:pr-5 lg:pr-3 xl:pr-5 shadow-2xl card-transition border border-zinc-800/80 -ml-[28px] sm:-ml-[40px] md:-ml-[56px] lg:-ml-[40px] xl:-ml-[56px] group overflow-hidden cursor-default text-right">
                                <span className="absolute -bottom-2 -left-2 text-2xl sm:text-4xl md:text-5xl lg:text-4xl xl:text-5xl font-black text-zinc-800/20 group-hover:text-purple-500/10 card-transition select-none">S</span>
                                <span className="relative z-10 text-[7px] sm:text-[8px] md:text-[9px] lg:text-[8px] xl:text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">
                                    {lang === 'uz' ? "Gapirish" : "Speaking"}
                                </span>
                                {loading ? (
                                    <div className="w-8 h-4 sm:w-12 sm:h-6 bg-zinc-800 animate-pulse rounded mt-1"></div>
                                ) : (
                                    <span className="relative z-10 text-sm sm:text-base md:text-xl lg:text-base xl:text-xl font-bold text-white group-hover:text-purple-400 card-transition">
                                        {speakingVal}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Target Band & Days Remaining Cards */}
                    <div className="flex items-center justify-center relative py-1 mt-3 lg:mt-4 select-none scale-100 origin-center card-transition">
                        {/* Target Card (White) */}
                        <div className="relative z-20 w-28 h-14 sm:w-32 sm:h-16 bg-white rounded-xl flex flex-col justify-center items-center shadow-md border border-gray-150 overflow-hidden group cursor-default">
                            <div className="absolute top-0 w-full h-0.5 sm:h-1 bg-[#d11241]"></div>
                            <span className="absolute inset-0 flex items-center justify-center text-3xl sm:text-4xl font-black text-gray-50 pointer-events-none select-none">T</span>
                            <span className="relative z-10 text-[7px] sm:text-[8px] font-bold text-[#d11241] uppercase tracking-widest mb-0.5">
                                {t('dashboard.targetScore')}
                            </span>
                            <span className="relative z-10 text-base sm:text-lg font-black text-gray-900 transform group-hover:scale-105 card-transition">
                                {parseFloat(targetBand || 7.5).toFixed(1)}
                            </span>
                        </div>

                        {/* Days Remaining Card (Black) */}
                        <div className="relative z-10 w-28 h-14 sm:w-32 sm:h-16 bg-zinc-900 rounded-xl flex flex-col justify-center items-center shadow-md border border-zinc-800/80 -ml-4 sm:-ml-6 group overflow-hidden cursor-default">
                            <span className="absolute -bottom-1 -right-1 text-3xl sm:text-4xl font-black text-zinc-800/20 group-hover:text-purple-500/10 card-transition select-none">D</span>
                            <span className="relative z-10 text-[7px] sm:text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">
                                {t('dashboard.untilExam')}
                            </span>
                            <span className="relative z-10 text-base sm:text-lg font-bold text-white group-hover:text-purple-400 card-transition">
                                {finalDays > 0 ? animatedDays : '—'} <span className="text-[8px] sm:text-[9px] font-normal text-zinc-400">{t('dashboard.daysUnit')}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardAnalytics({ skillStats }) {
    const navigate = useNavigate();

    return (
        <div className="relative w-full mt-12">
            {/* Background Breakout */}
            <div className="absolute inset-0 bg-[#F5F5F7] border-y border-black/[0.03]" />
            
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
    );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardAnalytics({ skillStats, onToggleSkill }) {
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
                        <span className="text-[52px] md:text-[86px] font-semibold tracking-tighter text-[#1D1D1F] leading-none">
                            IELTS
                        </span>
                    </div>
                    
                    <h2 className="text-[24px] md:text-[42px] font-bold text-[#1D1D1F] leading-[1.1] tracking-tight mb-8 sm:mb-10">
                        Barcha to'rt ko'nikmani bitta joyda jamlang va yuqori ballga erishing.
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 w-full sm:w-auto">
                        <button 
                            onClick={() => navigate('/practice')}
                            className="w-full sm:w-auto bg-[#1D1D1F] hover:bg-black text-white px-8 py-3.5 rounded-full text-[15px] font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
                        >
                            Mashqni boshlash
                        </button>
                        <button 
                            onClick={() => navigate('/statistics')}
                            className="w-full sm:w-auto border border-[#1D1D1F] hover:bg-black/5 text-[#1D1D1F] px-8 py-3.5 rounded-full text-[15px] font-medium transition-all"
                        >
                            Batafsil statistika
                        </button>
                    </div>
                </div>

                {/* Right Side: Skills List (Huge Bold Typography) */}
                <div className="flex-1 flex flex-col items-center lg:items-end gap-2 md:gap-4 w-full">
                    {(skillStats && skillStats.length > 0 ? skillStats : [
                        { name: 'Reading', score: '0.0', color: 'text-[#fa243c]', isActive: true },
                        { name: 'Listening', score: '0.0', color: 'text-[#65c400]', isActive: true },
                        { name: 'Writing', score: '0.0', color: 'text-[#ff8400]', isActive: true },
                        { name: 'Speaking', score: '0.0', color: 'text-[#2a7ff6]', isActive: true },
                    ]).map((skill, index) => {
                        // Parent'dan kelgan ranglarni mapplash yoki default ranglarni ishlatish
                        const colors = ['text-[#fa243c]', 'text-[#65c400]', 'text-[#ff8400]', 'text-[#2a7ff6]'];
                        const defaultColor = skill.color && skill.color.includes('#') ? skill.color : (colors[index] || 'text-[#1D1D1F]');
                        
                        // Faol bo'lmagan skill kulrang (gray-300 / opacity-40) bo'ladi
                        const isActive = skill.isActive !== false;
                        const skillColor = isActive ? defaultColor : 'text-black/20';
                        const scoreColor = isActive ? 'text-[#1D1D1F]' : 'text-black/20';
                        
                        return (
                            <div 
                                key={skill.name} 
                                onClick={() => onToggleSkill && onToggleSkill(skill.name)}
                                className={`grid grid-cols-[1fr_80px] md:grid-cols-[1fr_140px] items-center w-full max-w-[480px] group ${onToggleSkill ? 'cursor-pointer' : 'cursor-default'}`}
                                title={onToggleSkill ? "Ushbu bo'limni umumiy balldan chiqarib tashlash/qo'shish uchun bosing" : ""}
                            >
                                {/* Skill Name */}
                                <div className={`${skillColor} transition-all duration-300 ${isActive ? 'group-hover:translate-x-[-8px]' : 'group-hover:opacity-70'} overflow-hidden`}>
                                    <span className={`text-[36px] sm:text-[48px] md:text-[68px] font-bold tracking-tighter leading-none whitespace-nowrap ${isActive ? '' : 'line-through decoration-black/20 decoration-2'}`}>
                                        {skill.name}
                                    </span>
                                </div>
                                
                                {/* Skill Score (Aligned) */}
                                <div className="text-right">
                                    <span className={`text-[38px] sm:text-[44px] md:text-[56px] font-bold ${scoreColor} leading-none tracking-tighter transition-all duration-300 inline-block ${isActive ? 'group-hover:scale-110' : ''}`}>
                                        {parseFloat(skill.score || 0).toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

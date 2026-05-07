import React, { useState, useRef } from 'react';

const StatCard3D = ({ 
    type = 'center', // 'left', 'center', 'right'
    icon: Icon, 
    label, 
    value, 
    unit = '', 
    subLabel, 
    accentColor, 
    chartType = null,   // 'donut' | 'bar' | 'progress'
    chartValue = 0,     // donut: 0-100 percentage, progress: 0-100 percentage
}) => {
    const cardRef = useRef(null);
    const glareRef = useRef(null);
    const hitboxRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);

    // Initial transforms based on type
    const getBaseTransform = () => {
        if (type === 'left') return 'rotateY(15deg) translateZ(-20px)';
        if (type === 'right') return 'rotateY(-15deg) translateZ(-20px)';
        return 'translateZ(20px)';
    };

    const getBaseZ = () => {
        if (type === 'center') return '10';
        return '1';
    };

    const handleMouseMove = (e) => {
        if (!hitboxRef.current || !cardRef.current || !glareRef.current) return;

        const rect = hitboxRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -12;
        const rotateY = ((x - centerX) / centerX) * 12;

        const percentX = (x / rect.width) * 100;
        const percentY = (y / rect.height) * 100;
        
        glareRef.current.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, rgba(255,255,255,0.9) 0%, transparent 60%)`;
        glareRef.current.style.opacity = '1';

        cardRef.current.style.transition = 'transform 0.1s ease-out';
        cardRef.current.style.transform = `translateZ(60px) translateY(-8px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (!cardRef.current || !glareRef.current) return;
        
        glareRef.current.style.opacity = '0';
        cardRef.current.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)'; 
        cardRef.current.style.transform = getBaseTransform();
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (!cardRef.current) return;
        cardRef.current.style.transition = 'transform 0.2s ease-out';
    };

    // Color mapping
    const colors = {
        red: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-500', gradient: 'via-red-400', glow: 'bg-red-400/10' },
        blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-500', gradient: 'via-blue-500', glow: 'bg-blue-400/10' },
        purple: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-500', gradient: 'via-purple-400', glow: 'bg-purple-400/10' },
        orange: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-[#FF5A2A]', gradient: 'via-[#FF5A2A]', glow: 'bg-[#FF5A2A]/10' }
    };
    
    const theme = colors[accentColor] || colors.blue;

    return (
        <div 
            ref={hitboxRef}
            className="hitbox relative w-[260px] sm:w-64 cursor-pointer group"
            style={{ 
                zIndex: isHovered ? 50 : getBaseZ(),
                transformStyle: 'preserve-3d',
                height: type === 'center' ? '340px' : '320px',
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div 
                ref={cardRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ 
                    transformStyle: 'preserve-3d',
                    transform: getBaseTransform(),
                    transition: 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)'
                }}
            >
                <div className="glass-card w-full h-full rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 flex flex-col items-start text-left relative overflow-hidden bg-[#F6F6FA] border border-black/[0.06] shadow-[0_2px_20px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.10),0_2px_8px_rgba(0,0,0,0.06)] hover:bg-white transition-all duration-500">
                    <div ref={glareRef} className="glare absolute inset-0 pointer-events-none rounded-[2.5rem] opacity-0 transition-opacity duration-300 z-20 mix-blend-overlay"></div>
                    
                    <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent ${theme.gradient} to-transparent opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500`}></div>
                    <div className={`absolute -top-20 ${type === 'right' ? '-right-20' : '-left-20'} w-40 h-40 ${theme.glow} rounded-full blur-[50px] transition-colors duration-500`}></div>
                    
                    <div className="relative z-10 w-full flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${theme.bg} border ${theme.border} flex items-center justify-center ${theme.text} shadow-sm shrink-0`}>
                                <Icon size={20} />
                            </div>
                            <h3 className="text-[11px] sm:text-[13px] font-bold text-gray-400 tracking-[0.1em] sm:tracking-[0.15em] uppercase mt-1">{label}</h3>
                        </div>

                        {/* Main Value */}
                        <div className="mt-4 sm:mt-6 flex items-baseline gap-2">
                            <span className="text-[56px] sm:text-[72px] font-medium text-gray-900 leading-none tracking-tighter">{value}</span>
                            {unit && <span className="text-[20px] sm:text-[28px] text-gray-400 font-normal">{unit}</span>}
                        </div>

                        {/* Charts */}
                        {chartType === 'donut' && (
                            <div className="relative w-14 h-14 mt-8 mb-2">
                                <svg className="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 36 36">
                                    <path stroke="#e5e7eb" strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path
                                        stroke="#FF5A2A"
                                        style={{ filter: 'drop-shadow(0px 0px 8px rgba(255,90,42,0.8))' }}
                                        strokeDasharray={`${chartValue}, 100`}
                                        strokeLinecap="round"
                                        strokeWidth="4"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                            </div>
                        )}

                        {chartType === 'bar' && (
                            <div className="flex items-end gap-[5px] mt-auto mb-4 h-10 w-3/4">
                                <div className="flex-1 bg-gray-200 rounded-[3px]" style={{ height: '30%' }} />
                                <div className="flex-1 bg-gray-200 rounded-[3px]" style={{ height: '50%' }} />
                                <div className="flex-1 bg-[#FF5A2A] rounded-[3px] relative z-10" style={{ height: '100%', boxShadow: '0 0 15px rgba(255,90,42,0.7)' }} />
                                <div className="flex-1 bg-gray-200 rounded-[3px]" style={{ height: '40%' }} />
                                <div className="flex-1 bg-gray-200 rounded-[3px]" style={{ height: '65%' }} />
                            </div>
                        )}

                        {chartType === 'progress' && (
                            <div className="w-full mt-auto mb-5">
                                <div className="w-full h-2.5 bg-gray-200 rounded-full relative">
                                    <div
                                        className="absolute top-0 left-0 h-full bg-[#FF5A2A] rounded-full"
                                        style={{ width: `${chartValue}%`, boxShadow: '0 0 15px rgba(255,90,42,0.7)' }}
                                    />
                                </div>
                            </div>
                        )}

                        <p className="text-[13px] sm:text-[15px] text-slate-500 font-medium mt-auto leading-snug">{subLabel}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatCard3D;

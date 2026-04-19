import React from 'react';
import { BookOpen, Headphones, PenTool, Zap, ArrowUpRight } from 'lucide-react';

export default function ModuleBanner({ 
    userName = "O'quvchi", 
    userXP = 1230, 
    completedModules = 5, 
    onViewProgress 
}) {
    return (
        <section className="relative z-10 mb-20 animate-fade-in-up">
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div className="relative bg-[#3A231D] w-full rounded-[1.5rem] p-8 md:p-12 flex flex-col md:flex-row justify-between items-center shadow-2xl overflow-hidden gap-8 border border-white/5">
                
                {/* Left side: Text & CTA (Narrower) */}
                <div className="w-full md:w-[35%] flex flex-col items-start z-10 pt-6 md:pt-0">
                    <h1 className="text-white text-3xl md:text-[2.4rem] font-bold leading-[1.1] mb-8 tracking-tight">
                        Siz bu hafta <br className="hidden md:block" /> {completedModules} ta modulni <br className="hidden md:block" /> yakunladingiz
                    </h1>
                    <button 
                        onClick={onViewProgress}
                        className="bg-[#F44A22] hover:bg-[#D93D1B] text-[#161616] font-bold px-8 py-3.5 rounded-full flex items-center gap-2 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-[#F44A22]/20"
                    >
                        Jarayonni ko'rish
                        <ArrowUpRight size={20} strokeWidth={3} />
                    </button>
                </div>

                {/* Right side: Practice Cards (Wider Grid) */}
                <div className="w-full md:w-[65%] grid grid-cols-1 sm:grid-cols-3 gap-6 z-10 pt-4 md:pt-0">
                    
                    {/* reading Card */}
                    <div className="bg-[#F8F9FA] rounded-[1.2rem] p-6 lg:h-[270px] h-[240px] flex flex-col relative overflow-hidden shadow-xl group cursor-pointer transition-all duration-500 hover:-translate-y-0.5 border border-white">
                        <span className="text-[#F44A22] text-sm font-bold uppercase tracking-widest mb-1">01</span>
                        <h3 className="text-[#161616] lg:text-[1.5rem] text-[1.25rem] font-bold leading-tight z-10">Reading</h3>
                        <BookOpen strokeWidth={0.75} className="absolute -bottom-8 -right-8 text-[#161616] opacity-15 group-hover:opacity-25 transition-all duration-500 transform rotate-3 group-hover:rotate-0 w-24 h-24 lg:w-32 lg:h-32" />
                    </div>

                    {/* listening Card */}
                    <div className="bg-[#F44A22] rounded-[1.2rem] p-6 lg:h-[270px] h-[240px] flex flex-col relative overflow-hidden shadow-xl group cursor-pointer transition-all duration-500 hover:-translate-y-0.5">
                        <span className="text-black/40 text-sm font-bold uppercase tracking-widest mb-1">02</span>
                        <h3 className="text-white lg:text-[1.5rem] text-[1.25rem] font-bold leading-tight z-10">Listening</h3>
                        <Headphones strokeWidth={0.75} className="absolute -bottom-10 -right-8 text-black opacity-20 group-hover:opacity-30 transition-all duration-500 transform -rotate-3 group-hover:rotate-0 w-28 h-28 lg:w-36 lg:h-36" />
                    </div>

                    {/* writing Card */}
                    <div className="bg-[#F8F9FA] rounded-[1.2rem] p-6 lg:h-[270px] h-[240px] flex flex-col relative overflow-hidden shadow-xl group cursor-pointer transition-all duration-500 hover:-translate-y-0.5 border border-white">
                        <span className="text-[#F44A22] text-sm font-bold uppercase tracking-widest mb-1">03</span>
                        <h3 className="text-[#161616] lg:text-[1.5rem] text-[1.25rem] font-bold leading-tight z-10">Writing</h3>
                        <PenTool strokeWidth={0.75} className="absolute -bottom-6 -right-6 text-[#161616] opacity-15 group-hover:opacity-25 transition-all duration-500 transform rotate-6 group-hover:rotate-0 w-24 h-24 lg:w-32 lg:h-32" />
                    </div>

                </div>
            </div>
        </section>
    );
}

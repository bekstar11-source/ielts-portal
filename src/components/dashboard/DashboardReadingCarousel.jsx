import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePracticeScroll } from '../../hooks/usePracticeScroll';

export default function DashboardReadingCarousel() {
    const navigate = useNavigate();
    const { scrollRef, canLeft, canRight, handleScroll, updateScrollState } = usePracticeScroll();

    const items = [
        { 
            title: "Ancient Civilizations", 
            sub: "O'tmishning sirlarini oching va qadimgi madaniyatlarni o'rganing.", 
            questions: "13 Questions",
            img: "/images/dashboard/reading_passage_ancient_civ_1776973843121.png",
            tag: "History",
            delay: '0.1s'
        },
        { 
            title: "Space Exploration", 
            sub: "Koinot fathi va insoniyatning yulduzlar sari sayohati.", 
            questions: "14 Questions",
            img: "/images/dashboard/reading_passage_space_exp_1776973865586.png",
            tag: "Science",
            delay: '0.2s'
        },
        { 
            title: "Modern Architecture", 
            sub: "Zamonaviy shaharsozlik va innovatsion dizayn yutuqlari.", 
            questions: "13 Questions",
            img: "/images/dashboard/reading_passage_architecture_1776974534002.png",
            tag: "Design",
            delay: '0.3s'
        },
        { 
            title: "Renewable Energy", 
            sub: "Yashil energiya va kelajak texnologiyalari haqida.", 
            questions: "12 Questions",
            img: "/images/dashboard/reading_passage_renewable_energy_1776974514627.png",
            tag: "Energy",
            delay: '0.4s'
        },
        { 
            title: "Neuroscience", 
            sub: "Inson miyasi qanday ishlaydi? Eng so'nggi ilmiy tadqiqotlar.", 
            questions: "13 Questions",
            img: "/images/dashboard/reading_passage_neuroscience_1776973886667.png",
            tag: "Biology",
            delay: '0.5s'
        },
        { 
            title: "Climate Change", 
            sub: "Global iqlim o'zgarishi va uning sayyoramizga ta'siri.", 
            questions: "13 Questions",
            img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
            tag: "Nature",
            delay: '0.6s'
        },
        { 
            title: "Urban Planning", 
            sub: "Kelajak shaharlari va aholi yashash joylarini loyihalash.", 
            questions: "14 Questions",
            img: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80",
            tag: "Society",
            delay: '0.7s'
        }
    ];

    return (
        <div className="w-full mt-32 mb-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
                    <div className="max-w-3xl">
                        <h2 className="text-[28px] md:text-[36px] lg:text-[42px] font-semibold text-[#1D1D1F] leading-[1.1] tracking-tight">
                            Tavsiya etilgan matnlar. <br className="hidden md:block" />
                            <span className="text-[18px] md:text-[24px] lg:text-[28px] text-zinc-500 block mt-2 font-medium">Sizning darajangizga mos Reading passagelar.</span>
                        </h2>
                    </div>
                    <button 
                        onClick={() => navigate('/practice?tab=reading')}
                        className="text-[#1D1D1F] hover:underline text-[16px] font-medium flex items-center gap-1 group whitespace-nowrap"
                    >
                        Barchasini ko'rish
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Carousel Container */}
            <div className="w-full">
                <div className="group/scroll relative">
                    <div 
                        ref={scrollRef}
                        onScroll={(e) => updateScrollState(e.currentTarget)}
                        className="grid grid-flow-col auto-cols-[minmax(320px,1fr)] md:auto-cols-[minmax(380px,1fr)] items-stretch gap-5 overflow-x-auto pt-4 pb-12 hide-scrollbar px-6 xl:pl-[max(1.5rem,calc((100vw-80rem)/2-2rem))] xl:pr-6"
                    >
                        {items.map((item, i) => (
                            <div 
                                key={i} 
                                className="group/apple-card relative aspect-[3/3.8] bg-[#F6F6FA] rounded-[24px] p-7 transition-all duration-500 cursor-pointer overflow-hidden animate-fade-in-up hover:scale-[1.005]"
                                style={{ animationDelay: item.delay }}
                            >
                                <div className="relative z-10 space-y-3">
                                    <span className="text-[11px] font-extrabold text-[#86868b] uppercase tracking-[0.12em]">{item.tag}</span>
                                    <h3 className="text-[28px] font-extrabold text-[#1d1d1f] leading-[1.1] tracking-tight group-hover/apple-card:text-[#0066cc] transition-colors line-clamp-2">
                                        {item.title}
                                    </h3>
                                    <p className="text-[15px] text-zinc-500 font-medium leading-snug line-clamp-3">
                                        {item.sub}
                                    </p>
                                    <div className="pt-2">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold text-[#424245] bg-white/50 border border-black/[0.04] uppercase tracking-wide">
                                            {item.questions}
                                        </span>
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 h-[45%] overflow-hidden transition-all duration-700">
                                    <img 
                                        src={item.img} 
                                        alt={item.title}
                                        className="w-full h-full object-cover transition-transform duration-700"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="max-w-7xl mx-auto px-6 pointer-events-none">
                        <div className="flex items-center justify-end gap-2 -mt-6 mb-8 relative z-20 pointer-events-auto">
                            <button 
                                onClick={() => handleScroll(-1)}
                                disabled={!canLeft}
                                className={`w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#1d1d1f] active:scale-95 transition-all shadow-lg border border-black/5 ${canLeft ? 'hover:bg-white cursor-pointer' : 'opacity-30 cursor-default'}`}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button 
                                onClick={() => handleScroll(1)}
                                disabled={!canRight}
                                className={`w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#1d1d1f] active:scale-95 transition-all shadow-lg border border-black/5 ${canRight ? 'hover:bg-white cursor-pointer' : 'opacity-30 cursor-default'}`}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

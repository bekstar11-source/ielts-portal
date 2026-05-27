import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';

export default function DashboardArticles() {
    const [isPaused, setIsPaused] = useState(false);
    const marqueeRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    
    // Animation state
    const offsetRef = useRef(0);
    const requestRef = useRef(null);
    const lastTimeRef = useRef(null);

    const articles = [
        { 
            title: "The Economist", 
            sub: "Building Future Cities", 
            img: "/images/dashboard/economist_cover_future_cities_1776973021230.png",
            date: "Oct 2024"
        },
        { 
            title: "National Geographic", 
            sub: "Patagonia's Wild Heart", 
            img: "/images/dashboard/natgeo_cover_patagonia_1776973046094.png",
            date: "Dec 2023"
        },
        { 
            title: "Kinfolk Journal", 
            sub: "The Art of Work", 
            img: "/images/dashboard/kinfolk_cover_art_of_work_1776973065900.png",
            date: "Spring 2024"
        },
        { 
            title: "The New Yorker", 
            sub: "The Future of AI in Education", 
            img: "/images/dashboard/newyorker_cover_ai_education_1776973104350.png",
            date: "Nov 2023"
        },
        { 
            title: "Wired", 
            sub: "The Great Tech Reset", 
            img: "/images/dashboard/wired_cover_tech_reset_1776973125543.png",
            date: "Oct 2023"
        },
        { 
            title: "Vogue", 
            sub: "Sustainable Fashion 2025", 
            img: "/images/dashboard/vogue_cover_sustainable_fashion_1776973146230.png",
            date: "Jan 2025"
        }
    ];

    const animate = (time) => {
        if (lastTimeRef.current !== undefined) {
            const deltaTime = time - lastTimeRef.current;
            
            // Articles speed (slightly slower than listening for better readability)
            // Normal: ~0.025px/ms (25px per second)
            // Slow: ~0.005px/ms (5px per second)
            const baseSpeed = isHovered ? 0.005 : 0.025;
            
            // If globally paused, speed is 0
            const currentSpeed = isPaused ? 0 : baseSpeed;
            
            offsetRef.current += currentSpeed * deltaTime;
            
            if (marqueeRef.current) {
                const halfWidth = marqueeRef.current.scrollWidth / 2;
                if (offsetRef.current >= halfWidth) {
                    offsetRef.current = 0;
                }
                marqueeRef.current.style.transform = `translateX(-${offsetRef.current}px)`;
            }
        }
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isHovered, isPaused]);

    return (
        <div className="w-full mt-12 mb-40 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
                    <div className="max-w-3xl">
                        <h2 className="text-[28px] md:text-[36px] lg:text-[42px] font-semibold text-[#1D1D1F] dark:text-white leading-[1.1] tracking-tight">
                            Eng sara maqolalar va nashrlar. <br className="hidden md:block" />
                            Hammasi bitta joyda.
                        </h2>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pb-2 w-full lg:w-auto mt-6 lg:mt-0">
                        <button className="w-full sm:w-auto bg-[#1D1D1F] dark:bg-white text-white dark:text-black px-8 py-3.5 sm:py-3 rounded-full text-[15px] font-semibold hover:bg-black dark:hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-lg whitespace-nowrap">
                            Bepul o'qish
                        </button>
                        <div className="flex items-center justify-between w-full sm:w-auto sm:justify-start gap-4 sm:gap-8 lg:gap-24">
                            <button className="text-[#1D1D1F] dark:text-[#f5f5f7] hover:underline text-[16px] font-medium flex items-center gap-1 group whitespace-nowrap">
                                Barchasini ko'rish
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            
                            <button 
                                onClick={() => setIsPaused(!isPaused)}
                                className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-550 hover:text-black dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-700 transition-all active:scale-90 shrink-0"
                            >
                                {isPaused ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div 
                className="relative overflow-hidden w-full"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div 
                    ref={marqueeRef}
                    className="flex gap-0 w-max will-change-transform"
                >
                    {[...Array(2)].map((_, listIdx) => (
                        <div key={listIdx} className="flex gap-4 pr-4">
                            {articles.map((article, i) => (
                                <div key={`${listIdx}-${i}`} className="flex-none w-[180px] md:w-[200px] group/card cursor-pointer">
                                    <div className="relative aspect-[3/4] rounded-md overflow-hidden mb-3 shadow-md group-hover:shadow-xl transition-all duration-500 bg-zinc-100 dark:bg-zinc-800">
                                        <img 
                                            src={article.img} 
                                            alt={article.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
                                            <div className="bg-white text-black px-4 py-1.5 rounded-full text-[12px] font-bold shadow-lg transform translate-y-2 group-hover/card:translate-y-0 transition-transform duration-300">
                                                O'qish
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="text-[12px] font-bold text-[#1D1D1F] dark:text-white">{article.title}</h4>
                                        <p className="text-[12px] text-zinc-500 dark:text-zinc-400 font-medium leading-tight line-clamp-1">{article.sub}</p>
                                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">{article.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

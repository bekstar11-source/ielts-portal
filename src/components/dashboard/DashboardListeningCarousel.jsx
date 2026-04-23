import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';

export default function DashboardListeningCarousel({ isListeningPaused }) {
    const navigate = useNavigate();
    const marqueeRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    
    // Animation state
    const offsetRef = useRef(0);
    const requestRef = useRef(null);
    const lastTimeRef = useRef(null);

    const items = [
        { 
            title: "IELTS Listening Part 1", 
            sub: "Kundalik vaziyatlardagi suhbatlar. Ismlar, raqamlar va manzillar.", 
            questions: "10 Questions",
            img: "/images/dashboard/listening_cover_1_vibrant_apple_music_style_1776972033954.png",
            tag: "Conversation"
        },
        { 
            title: "IELTS Listening Part 2", 
            sub: "Ijtimoiy mavzudagi monologlar. Shahar xaritasi va marshrutlar.", 
            questions: "10 Questions",
            img: "/images/dashboard/listening_cover_2_vibrant_apple_music_style_1776972053148.png",
            tag: "Social Context"
        },
        { 
            title: "IELTS Listening Part 3", 
            sub: "Akademik muhitdagi muhokamalar. Talabalar va ustozlar suhbati.", 
            questions: "10 Questions",
            img: "/images/dashboard/listening_cover_3_vibrant_apple_music_style_1776972075391.png",
            tag: "Education"
        },
        { 
            title: "IELTS Listening Part 4", 
            sub: "Akademik mavzudagi monolog. Ma'ruza va ilmiy tadqiqotlar.", 
            questions: "10 Questions",
            img: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80",
            tag: "Academic Lecture"
        },
        { 
            title: "Listening Mock Set 1", 
            sub: "To'liq listening testi. Barcha 4 ta qismni o'z ichiga oladi.", 
            questions: "40 Questions",
            img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
            tag: "Full Test"
        },
        { 
            title: "Daily Practice", 
            sub: "Har kungi qisqa audio mashqlar. Ko'nikmalarni rivojlantirish.", 
            questions: "10 Questions",
            img: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&q=80",
            tag: "Daily"
        }
    ];

    const animate = (time) => {
        if (lastTimeRef.current !== undefined) {
            const deltaTime = time - lastTimeRef.current;
            
            // Base speed: pixels per millisecond
            // Normal: ~0.03px/ms (30px per second)
            // Slow: ~0.01px/ms (10px per second)
            const baseSpeed = isHovered ? 0.008 : 0.03;
            
            // If globally paused, speed is 0
            const currentSpeed = isListeningPaused ? 0 : baseSpeed;
            
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
    }, [isHovered, isListeningPaused]);

    return (
        <div className="w-full mt-4 mb-32 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
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
                        <div key={listIdx} className="flex gap-3 pr-3">
                            {items.map((item, i) => (
                                <div key={`${listIdx}-${i}`} className="flex-none w-[200px] md:w-[240px] group/card cursor-pointer">
                                    <div className="relative aspect-[3/2.8] rounded-lg overflow-hidden mb-3 shadow-md group-hover:shadow-2xl transition-all duration-500 bg-zinc-100">
                                        <img 
                                            src={item.img} 
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                            <div className="bg-white text-black w-10 h-10 rounded-full flex items-center justify-center shadow-2xl transform scale-75 group-hover/card:scale-100 transition-transform duration-300">
                                                <Play size={18} className="fill-black ml-1" />
                                            </div>
                                        </div>
                                        <div className="absolute top-3 left-3">
                                            <span className="px-2 py-0.5 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-bold text-black uppercase tracking-wider border border-black/5">
                                                {item.tag}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="px-1">
                                        <h4 className="text-[14px] font-bold text-[#1D1D1F] leading-tight mb-1">{item.title}</h4>
                                        <p className="text-[12px] text-zinc-500 font-medium leading-snug line-clamp-2">{item.sub}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] font-bold text-[#0066cc] uppercase tracking-wide">{item.questions}</span>
                                        </div>
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

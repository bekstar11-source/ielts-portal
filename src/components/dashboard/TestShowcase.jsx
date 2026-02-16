import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { ArrowRight, Star, Zap, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import TestGrid from './TestGrid'; // We will use TestCard from TestGrid or refactor TestCard to be standalone?
// Let's assume we can reuse TestGrid's internal TestCard if it was exported, 
// BUT TestGrid exports TestGrid as default. 
// I will copy TestCard logic or ideally refactor TestGrid to export TestCard.
// For now, to avoid breaking changes, I will define a simplified MiniTestCard here or use the one from TestGrid if I can export it.

// Let's look at TestGrid.jsx first. It defines TestCard internally. 
// I should refactor TestGrid to export TestCard.
// BUT to save time, I will create a ShowcaseCard here which is similar but optimized for Carousel.

const ShowcaseCard = ({ test, onStart }) => {
    const { user } = useAuth();
    const [hasDraft, setHasDraft] = useState(false);

    useEffect(() => {
        if (user && test && test.id) {
            const key = `draft_${user.uid}_${test.id}`;
            if (localStorage.getItem(key)) {
                setHasDraft(true);
            }
        }
    }, [user, test]);

    const isMock = test.type === 'mock_full';

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className={`min-w-[280px] md:min-w-[320px] p-5 rounded-[24px] border border-white/5 relative group overflow-hidden flex flex-col justify-between
            ${isMock ? 'bg-gradient-to-br from-gray-900 to-black' : 'bg-[#181210]'}
            `}
        >
            {/* Glow Effect */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition group-hover:bg-blue-500/20`} />

            <div>
                <div className="flex justify-between items-start mb-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border 
                        ${isMock ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}
                    `}>
                        {isMock ? 'Mock Exam' : test.type || 'Practice'}
                    </span>
                    {test.isNew && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400"><Zap size={12} fill="currentColor" /> NEW</span>}
                </div>

                <h3 className="text-lg font-bold text-white leading-snug mb-2 line-clamp-2">{test.title}</h3>

                <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                    <span className="flex items-center gap-1"><Clock size={12} /> {test.duration || 40} min</span>
                    <span className="flex items-center gap-1"><Star size={12} className="text-yellow-500" /> {test.difficulty || 'Medium'}</span>
                </div>
            </div>

            <button
                onClick={() => onStart(test)}
                className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/5 rounded-xl text-white text-xs font-bold transition flex items-center justify-center gap-2 group-hover:border-white/10"
            >
                {hasDraft ? 'Davom ettirish' : 'Boshlash'} <ArrowRight size={14} />
            </button>
        </motion.div>
    );
};

const DiagnosticBanner = () => (
    <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-blue-600 to-indigo-700 p-8 md:p-10 text-white shadow-2xl shadow-blue-900/20 mb-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>

        <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold mb-4 border border-white/20">
                <Star size={12} fill="currentColor" /> Tavsiya etiladi
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Darajangizni aniqlaymiz!</h2>
            <p className="text-blue-100 text-sm md:text-base mb-8 max-w-lg leading-relaxed">
                Hozirgi IELTS darajangizni bilish uchun 40 daqiqalik diagnostik testdan o'ting.
                Natijaga qarab sizga mos o'quv rejasini tuzib beramiz.
            </p>
            <button className="bg-white text-blue-700 px-8 py-3.5 rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition shadow-xl shadow-blue-900/10 flex items-center gap-2">
                Diagnostik Testni Boshlash <ArrowRight size={16} />
            </button>
        </div>

        {/* Decorative Image/Icon placeholder for right side */}
        <div className="hidden md:block absolute right-10 top-1/2 -translate-y-1/2">
            <div className="w-32 h-32 bg-white/10 backdrop-blur-md rounded-3xl rotate-12 flex items-center justify-center border border-white/20 shadow-xl">
                <span className="text-6xl">🎯</span>
            </div>
        </div>
    </div>
);

export default function TestShowcase({ tests, onStartTest }) {
    const scrollRef = useRef(null);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = direction === 'left' ? -340 : 340;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    // Filter logic for Showcase
    const recommendedTests = tests.slice(0, 6); // Just take first 6 for now
    const newArrivals = tests.filter(t => t.isNew).slice(0, 4);

    // Assume user has NO results for now to show Banner
    const showBanner = true;

    return (
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {showBanner && <DiagnosticBanner />}

            {/* Recommended Carousel */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-6 px-1">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Siz uchun tavsiyalar</h2>
                        <p className="text-gray-400 text-sm">Sun'iy intellekt tanlagan testlar</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => scroll('left')} className="p-2 rounded-xl bg-[#181210] border border-white/10 text-white hover:bg-white/5 active:scale-95 transition">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => scroll('right')} className="p-2 rounded-xl bg-[#181210] border border-white/10 text-white hover:bg-white/5 active:scale-95 transition">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div
                    ref={scrollRef}
                    className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {recommendedTests.map((test, i) => (
                        <div key={i} className="snap-start">
                            <ShowcaseCard test={test} onStart={onStartTest} />
                        </div>
                    ))}
                    {recommendedTests.length === 0 && (
                        <div className="text-gray-500 text-sm py-10 w-full text-center border border-dashed border-gray-800 rounded-2xl">
                            Hozircha tavsiyalar yo'q.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

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

    // TestGrid bilan bir xil tekshiruvlar
    const { status, attemptsCount = 0, maxAttempts = 1, isStrict, endDate } = test;
    const canRetake = attemptsCount < maxAttempts;
    const isCompleted = status === 'completed';
    const isExpired = status === 'expired';
    const isUpcoming = status === 'upcoming';
    const canStart = canRetake && !(isExpired && isStrict) && !isUpcoming;

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

                <div className="mt-4 flex flex-col gap-1">
                    <div className={`text-[11px] font-bold uppercase tracking-wider ${attemptsCount >= maxAttempts ? 'text-red-400' : 'text-blue-400'}`}>
                        Urinishlar: {attemptsCount} / {maxAttempts}
                    </div>
                    {endDate && (
                        <div className="text-[11px] font-medium text-red-400 opacity-90 flex items-center gap-1.5">
                            <Clock size={12} />
                            Deadline: {new Date(endDate).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                </div>
            </div>

            {canStart ? (
                <button
                    onClick={() => onStart(test)}
                    className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/5 rounded-xl text-white text-xs font-bold transition flex items-center justify-center gap-2 group-hover:border-white/10"
                >
                    {isCompleted ? 'Qayta' : (hasDraft ? 'Davom' : 'Boshlash')} <ArrowRight size={14} />
                </button>
            ) : (
                <div className="mt-6 w-full py-3 bg-white/5 border border-white/5 rounded-xl text-gray-500 text-xs font-bold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed">
                    {isCompleted && !canRetake ? "Tugallangan" : (isExpired && isStrict ? "Muddati o'tgan" : (isUpcoming ? "Kutilmoqda" : "Urinishlar tugagan"))}
                </div>
            )}
        </motion.div>
    );
};



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

    return (
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

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

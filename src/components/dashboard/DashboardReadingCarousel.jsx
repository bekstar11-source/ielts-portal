import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { usePracticeScroll } from '../../hooks/usePracticeScroll';
import { useStudentData } from '../../hooks/useStudentData';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebase';
import { collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore';

export default function DashboardReadingCarousel({ onStartTest }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { assignments, loading: assignmentsLoading } = useStudentData(user);
    const { scrollRef, canLeft, canRight, handleScroll, updateScrollState } = usePracticeScroll();
    
    const [realItems, setRealItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRealTests = async () => {
            setIsLoading(true);
            try {
                // 1. First, take reading tests from assignments
                let readingTests = assignments.filter(t => (t.type || '').toLowerCase() === 'reading');
                
                // 2. If not enough (less than 6), fetch latest public reading tests from DB
                if (readingTests.length < 6) {
                    try {
                        const q = query(
                            collection(db, "tests"),
                            where("type", "==", "reading"),
                            orderBy("createdAt", "desc"),
                            limit(10)
                        );
                        const snapshot = await getDocs(q);
                        const dbTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        
                        // Merge and unique
                        const existingIds = new Set(readingTests.map(t => t.id));
                        dbTests.forEach(t => {
                            if (!existingIds.has(t.id)) {
                                readingTests.push(t);
                            }
                        });
                    } catch (err) {
                        console.warn("Could not fetch fallback reading tests due to permissions:", err);
                    }
                }

                // 3. Map to carousel format
                const mapped = readingTests.slice(0, 10).map((test, i) => {
                    // Extract a snippet for sub if content exists
                    let sub = "";
                    if (test.passages && test.passages[0] && test.passages[0].content) {
                        sub = test.passages[0].content.substring(0, 120).replace(/<[^>]*>/g, '') + "...";
                    } else if (test.tags && test.tags.length > 0) {
                        sub = `Ushbu test ${test.tags.join(', ')} mavzularini o'z ichiga oladi.`;
                    } else {
                        sub = "IELTS Reading ko'nikmalarini oshirish uchun ajoyib matn.";
                    }

                    return {
                        id: test.id,
                        title: test.title || "Reading Passage",
                        sub: sub,
                        questions: `${test.totalQuestions || test.questions?.length || 0} Questions`,
                        img: test.thumbnail || fallbackImages[i % fallbackImages.length],
                        tag: test.tags?.[0] || "Reading",
                        delay: `${(i * 0.1) + 0.1}s`,
                        type: test.type
                    };
                });

                setRealItems(mapped);
            } catch (error) {
                console.error("Error fetching dashboard tests:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!assignmentsLoading) {
            fetchRealTests();
        }
    }, [assignments, assignmentsLoading]);

    // Fallback images array for better variety
    const fallbackImages = [
        "/images/dashboard/reading_passage_yellow_card.png",
        "/images/dashboard/reading_passage_ancient_civ_1776973843121.png",
        "/images/dashboard/reading_passage_space_exp_1776973865586.png",
        "/images/dashboard/reading_passage_architecture_1776974534002.png",
        "/images/dashboard/reading_passage_renewable_energy_1776974514627.png",
        "/images/dashboard/reading_passage_neuroscience_1776973886667.png"
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
                        onClick={() => navigate('/reading')}
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
                        {isLoading ? (
                            <div className="col-span-full flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-[#0066cc]" />
                            </div>
                        ) : realItems.map((item, i) => (
                            <div 
                                key={item.id || i} 
                                className="group/apple-card relative aspect-[3/3.8] bg-[#F6F6FA] rounded-xl p-5 transition-all duration-500 cursor-default overflow-hidden animate-fade-in-up hover:shadow-lg hover:border-black/10 shadow-sm border border-black/5"
                                style={{ animationDelay: item.delay }}
                            >
                                <div className="relative z-10 space-y-2">
                                    <h3 className="text-[27px] font-extrabold text-[#1d1d1f] leading-[1.2] tracking-tight group-hover/apple-card:text-[#0066cc] transition-colors line-clamp-2">
                                        {item.title}
                                    </h3>
                                    <p className="text-[14px] text-zinc-500 font-medium leading-snug line-clamp-2">
                                        {item.sub}
                                    </p>
                                    <div className="pt-1">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-bold text-[#424245] bg-white/50 border border-black/[0.04] tracking-wide capitalize">
                                            {item.questions}
                                        </span>
                                    </div>
                                    <div className="pt-4">
                                        <button 
                                            onClick={() => onStartTest ? onStartTest(item) : navigate(`/test/${item.id}`)}
                                            className="bg-[#0071e3] text-white text-[13px] font-bold px-5 py-2 rounded-lg hover:bg-[#0077ed] transition-all relative z-20 cursor-pointer"
                                        >
                                            {item.status === 'completed' ? 'Retake' : 'Start Test'}
                                        </button>
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

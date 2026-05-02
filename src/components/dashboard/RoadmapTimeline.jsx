import React, { useState, useEffect, useMemo } from 'react';
import { 
  Headphones, BookOpen, ArrowRight, Lock, 
  PlayCircle, BarChart, PenTool, MessageCircle, 
  ChevronLeft, ChevronRight, Zap, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePracticeScroll } from '../../hooks/usePracticeScroll';
import { db } from '../../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function RoadmapTimeline({ usageStats = {}, onStartTest, assignments = [] }) {
  const navigate = useNavigate();
  const { scrollRef, canLeft, canRight, handleScroll, updateScrollState } = usePracticeScroll();
  const currentDay = usageStats?.totalDaysActive || 1;
  
  const [roadmapData, setRoadmapData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fallbackRoadmap = {
    1: [
      { id: 'd1_1', title: "Reading: Scanning", desc: "Matnlarni tezkor skanerlash texnikasi", icon: BookOpen, type: 'reading' },
      { id: 'd1_2', title: "Reading: Analysis", desc: "Xatolarni tahlil qilish va lug'at ustida ishlash", icon: PlayCircle, type: 'reading' }
    ],
    2: [
      { id: 'd2_1', title: "Listening: Keywords", desc: "Kalit so'zlarni tutib olish amaliyoti", icon: Headphones, type: 'listening' },
      { id: 'd2_2', title: "Listening: Accents", desc: "Turli aksentlar va Section 4 tahlili", icon: PlayCircle, type: 'listening' }
    ],
    3: [
      { id: 'd3_1', title: "Reading Practice", desc: "Full Reading passage amaliyoti", icon: BookOpen, type: 'reading' },
      { id: 'd3_2', title: "Writing AI", desc: "Writing Task tahlili va AI feedback", icon: PenTool, type: 'writing' }
    ],
    4: [
      { id: 'd4_1', title: "Listening Practice", desc: "Full Listening test amaliyoti", icon: Headphones, type: 'listening' },
      { id: 'd4_2', title: "Speaking AI", desc: "AI bilan Speaking simulyatsiyasi", icon: MessageCircle, type: 'speaking' }
    ],
    5: [
      { id: 'd5_1', title: "Reading Mock", desc: "Vaqtga doir Reading testi", icon: BookOpen, type: 'article' },
      { id: 'd5_2', title: "Article Analysis", desc: "Ilmiy maqolalar tahlili", icon: PlayCircle, type: 'article' }
    ],
    6: [
      { id: 'd6_1', title: "Listening Mock", desc: "Vaqtga doir Listening testi", icon: Headphones, type: 'podcast' },
      { id: 'd6_2', title: "Podcast Session", desc: "Podkastlar orqali immersion", icon: MessageCircle, type: 'podcast' }
    ],
    7: [
      { id: 'd7_1', title: "Full Mock Exam", desc: "To'liq imtihon simulyatsiyasi", icon: BarChart, type: 'mock' },
      { id: 'd7_2', title: "Final Strategy", desc: "Imtihon oldidan so'nggi ko'rsatmalar", icon: Zap, type: 'review' }
    ]
  };

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        const docRef = doc(db, "configs", "roadmap");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRoadmapData(docSnap.data().days);
        } else {
          setRoadmapData(fallbackRoadmap);
        }
      } catch (err) {
        // Silently use fallback on permission or connection errors
        setRoadmapData(fallbackRoadmap);
      } finally {
        setLoading(false);
      }
    };
    fetchRoadmap();
  }, []);

  // Bugungi vazifalarni aniqlash
  const todayTasks = useMemo(() => {
    if (!roadmapData) return [];
    return roadmapData[currentDay] || roadmapData[1] || [];
  }, [currentDay, roadmapData]);

  // Upcoming days list for carousel
  const upcomingDays = useMemo(() => {
    if (!roadmapData) return [];
    return Object.keys(roadmapData).map(day => {
      const tasks = roadmapData[day];
      return {
        day: parseInt(day),
        title: tasks[0]?.title || `Day ${day}`,
        desc: tasks[0]?.desc || "Vazifalar yuklanmoqda...",
        icon: tasks[0]?.type === 'reading' ? BookOpen : tasks[0]?.type === 'listening' ? Headphones : Zap
      };
    }).sort((a, b) => a.day - b.day).slice(0, 7);
  }, [roadmapData]);

  if (loading) return (
    <div className="w-full py-20 flex flex-col items-center justify-center gap-4 bg-[#FBFBFD]">
      <RefreshCw className="animate-spin text-blue-600" size={32} />
      <p className="text-sm font-bold text-[#86868B] uppercase tracking-widest">Marshrut yuklanmoqda...</p>
    </div>
  );

  const handleStart = (task) => {
    if (!task) return;

    // Vazifa turiga qarab yo'naltirish
    if (task.type === 'speaking') {
      navigate('/speaking-practice');
      return;
    } 
    
    if (task.type === 'article') {
      navigate('/article-reading');
      return;
    } 
    
    if (task.type === 'podcast') {
      navigate('/podcasts');
      return;
    } 
    
    if (task.type === 'mock') {
      navigate('/practice?filter=full_mock');
      return;
    }

    // Haqiqiy testni aniqlash
    let targetTestId = task.testId;

    // Agar testId yo'q bo'lsa (yangi userlar uchun), assignments ichidan mosini qidiramiz
    if (!targetTestId && assignments && assignments.length > 0) {
      const suitableTest = assignments.find(t => 
        t.type === task.type && t.status !== 'completed'
      ) || assignments.find(t => t.type === task.type);
      
      if (suitableTest) {
        targetTestId = suitableTest.id || suitableTest.testId;
      }
    }

    if (targetTestId) {
      navigate(`/test/${targetTestId}`);
    } else if (onStartTest) {
      onStartTest(task);
    } else {
      navigate(`/practice?filter=${task.type || 'all'}`);
    }
  };

  return (
    <div className="w-full py-12 px-0 relative overflow-hidden bg-[#FBFBFD] border-y border-black/[0.03]">
      
      {/* Diagonal Glow effektlari */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex justify-center items-center z-0">
        <div className="w-[150%] h-[150%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center items-center gap-12 sm:gap-40 opacity-[0.06] blur-[100px] -rotate-45">
          <div className="w-48 sm:w-80 h-[200%] bg-blue-500 rounded-[100%]"></div>
          <div className="w-64 sm:w-96 h-[200%] bg-purple-500 rounded-[100%]"></div>
          <div className="w-48 sm:w-80 h-[200%] bg-zinc-400 rounded-[100%]"></div>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto px-6 relative z-10">
        {/* Sarlavha qismi (7-day route pulsing effect) */}
        <div className="flex flex-col items-center text-center mb-10">
          <style>{`
            @keyframes breathe {
              0%, 100% {
                text-shadow: 0 0 5px rgba(0, 0, 0, 0.02), 0 0 10px rgba(0, 0, 0, 0.02);
                transform: scale(1);
                opacity: 0.7;
              }
              50% {
                text-shadow: 0 0 15px rgba(0, 0, 0, 0.15), 0 0 30px rgba(0, 0, 0, 0.1), 0 0 60px rgba(0, 0, 0, 0.05);
                transform: scale(1.02);
                opacity: 1;
              }
            }
            .pulsing-text {
              font-size: 5.5rem;
              font-weight: 200;
              color: #1d1d1f;
              letter-spacing: -0.03em;
              animation: breathe 4s ease-in-out infinite;
              font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
              user-select: none;
              cursor: default;
            }
            @media (max-width: 768px) {
              .pulsing-text { font-size: 3.5rem; }
            }
            @media (max-width: 480px) {
              .pulsing-text { font-size: 2.8rem; }
            }
          `}</style>
          
          <h1 className="pulsing-text">
            <span className="font-medium">7-day</span> route
          </h1>

          <p className="text-[#86868B] text-base font-medium max-w-2xl leading-relaxed mt-1 mb-6 mx-auto">
            7 kun ichida platformamiz imkoniyatlari bo'ylab bepul sayohat qiling.
          </p>
          <button 
            onClick={() => navigate('/roadmap')}
            className="text-[#0066CC] hover:underline text-sm font-bold flex items-center gap-1 group transition-all"
          >
            To'liq marshrutni ko'rish
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Top Kartalar (Bugungi vazifalar) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full mb-16">
          {todayTasks.map((task, idx) => (
            <div 
              key={task.id}
              onClick={() => handleStart(task)}
              className="p-5 rounded-[20px] bg-white/40 backdrop-blur-xl border border-white/40 shadow-[0_4px_24px_0_rgba(0,0,0,0.03)] hover:bg-white/60 transition-all duration-500 cursor-pointer group flex flex-col justify-between animate-fade-in-up hover:-translate-y-1"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div>
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2.5">
                    <span className={`font-bold text-[#1D1D1F] text-lg tracking-tight relative after:content-[''] after:absolute after:-bottom-0.5 after:left-0 after:w-0 after:h-[1.5px] ${idx === 0 ? 'after:bg-blue-500' : 'after:bg-purple-500'} group-hover:after:w-full after:transition-all after:duration-500`}>
                      {task.title}
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-[#86868B] uppercase tracking-wider bg-[#F5F5F7] px-2 py-0.5 rounded-full border border-black/5">Day {currentDay}</span>
                </div>
                <p className="text-[#86868B] text-[13px] leading-snug mb-4 group-hover:text-[#1D1D1F] transition-colors duration-300">
                  {task.desc}
                </p>
              </div>
              <div className="mt-auto pt-4 border-t border-black/[0.03] flex items-center justify-between">
                <span className="text-[10px] font-black text-[#A8AAAC] uppercase tracking-widest">
                  {task.type}
                </span>
                <div className="px-3.5 py-1.5 rounded-lg bg-[#161616] text-white text-[10px] font-bold shadow-md shadow-black/10 group-hover:shadow-black/20 transition-all duration-300 flex items-center gap-1.5 group-hover:scale-105 active:scale-95">
                  Boshlash 
                  <ArrowRight className="w-3 h-3 transition-transform duration-500 group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================
        Pastki qator (Day 2 - Day 10) - WIDE BUT LIMITED LAYOUT
        ======================================================== */}
      <div className="w-full mt-12 relative z-10">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-12 md:px-20 relative group/carousel">
          <div 
            ref={scrollRef}
            onScroll={(e) => updateScrollState(e.currentTarget)}
            style={{
              maskImage: 'linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)'
            }}
            className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x hide-scrollbar"
          >
            {upcomingDays.map((item) => {
              const isLocked = item.day > currentDay;
              const isToday = item.day === currentDay;
              return (
                <div 
                    key={item.day} 
                    className={`min-w-[240px] w-[240px] flex flex-col gap-4 snap-start group ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`w-full aspect-[16/10] rounded-xl bg-[#F5F5F7] border ${isToday ? 'border-[#0071E3] shadow-[0_0_0_1px_#0071E3]' : 'border-black/[0.03]'} relative overflow-hidden flex items-center justify-center transition-all duration-500 group-hover:border-[#0071E3]/20 group-hover:shadow-md group-hover:shadow-blue-500/5`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent pointer-events-none"></div>
                    
                    {/* Markazdagi Katta yozuv va ikonka */}
                    <div className={`relative z-10 flex flex-col items-center transition-all duration-500 ${isLocked ? 'opacity-30' : 'opacity-80 group-hover:opacity-100'}`}>
                      <item.icon size={28} className="mb-2 text-[#86868B] group-hover:text-[#0071E3] transition-colors" />
                      <span className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#1D1D1F] to-[#86868B]">
                        DAY {item.day}
                      </span>
                    </div>

                    {isToday && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#0071E3] text-white text-[9px] font-bold rounded-full z-20">
                        BUGUN
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-md p-1.5 rounded-lg border border-black/5 shadow-sm">
                        <Lock size={14} className="text-[#86868B]" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 mt-1 px-1">
                  <h4 className={`text-[13px] font-semibold tracking-tight transition-colors duration-300 ${isLocked ? 'text-[#86868B]' : 'text-[#1D1D1F] group-hover:text-[#0071E3]'}`}>
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-[#86868B] leading-snug line-clamp-2 font-normal">
                    {item.desc}
                  </p>
                </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Buttons at Far Right */}
          <div className="max-w-[1440px] mx-auto px-6 sm:px-12 flex justify-end gap-3 -mt-3 relative z-30 animate-fade-in-up delay-300">
            <button 
                onClick={() => handleScroll(-1)}
                disabled={!canLeft}
                className={`w-10 h-10 rounded-full flex items-center justify-center border border-black/5 bg-white transition-all shadow-sm ${canLeft ? 'hover:bg-[#F5F5F7] hover:shadow-md active:scale-90' : 'opacity-30'}`}
            >
                <ChevronLeft size={18} />
            </button>
            <button 
                onClick={() => handleScroll(1)}
                disabled={!canRight}
                className={`w-10 h-10 rounded-full flex items-center justify-center border border-black/5 bg-white transition-all shadow-sm ${canRight ? 'hover:bg-[#F5F5F7] hover:shadow-md active:scale-90' : 'opacity-30'}`}
            >
                <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-100 { animation-delay: 150ms; }
        .delay-200 { animation-delay: 300ms; }
        .delay-300 { animation-delay: 450ms; }

        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

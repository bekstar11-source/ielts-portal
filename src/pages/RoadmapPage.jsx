import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Lock, CheckCircle2, Zap, Star, 
  ArrowRight, BookOpen, Headphones, PenTool, Flame 
} from 'lucide-react';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import { useStudentData } from '../hooks/useStudentData';
import PricingModal from '../components/dashboard/PricingModal';
import SiteFooter from '../components/common/SiteFooter';
import { db } from '../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { RefreshCw } from 'lucide-react';

export default function RoadmapPage() {
    const { userData, user, logout } = useAuth();
    const navigate = useNavigate();
    const { assignments } = useStudentData(user);
    const [showPricing, setShowPricing] = useState(false);
    const [selectedDay, setSelectedDay] = useState(userData?.usageStats?.totalDaysActive || 1);

    const currentDay = userData?.usageStats?.totalDaysActive || 1;
    const isPremium = userData?.isPremium || userData?.accountType === 'premium';
    
    const [rawRoadmap, setRawRoadmap] = useState(null);
    const [loading, setLoading] = useState(true);

    const fallbackRoadmap = {
        1: [{ title: "Reading Focus", desc: "Akademik matnlarni tahlil qilish", type: 'reading' }, { title: "Error Analysis", desc: "Xatolar ustida ishlash", type: 'reading' }],
        2: [{ title: "Listening Mastery", desc: "Turli aksentlarni tushunish", type: 'listening' }, { title: "Section 4 deep dive", desc: "Murakkab qismlar", type: 'listening' }],
        3: [{ title: "Full Reading", desc: "To'liq Reading passage", type: 'reading' }, { title: "Writing AI", desc: "AI Writing feedback", type: 'writing' }],
        4: [{ title: "Full Listening", desc: "To'liq Listening test", type: 'listening' }, { title: "Speaking AI", desc: "AI Speaking partner", type: 'speaking' }],
        5: [{ title: "Reading Mock", desc: "Vaqtga doir test", type: 'reading' }, { title: "Article Analysis", desc: "Ilmiy maqolalar", type: 'article' }],
        6: [{ title: "Listening Mock", desc: "Vaqtga doir test", type: 'listening' }, { title: "Podcast Session", desc: "Podkastlar", type: 'podcast' }],
        7: [{ title: "Full Mock Test", desc: "Imtihon simulyatsiyasi", type: 'mock' }, { title: "Final Strategy", desc: "So'nggi maslahatlar", type: 'mock' }]
    };

    useEffect(() => {
        const fetchRoadmap = async () => {
            try {
                const docRef = doc(db, "configs", "roadmap");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setRawRoadmap(docSnap.data().days);
                } else {
                    setRawRoadmap(fallbackRoadmap);
                }
            } catch (err) {
                console.error("Roadmap fetch error:", err);
                setRawRoadmap(fallbackRoadmap);
                setLoading(false);
            } finally {
                setLoading(false);
            }
        };
        fetchRoadmap();
    }, []);

    const totalDays = useMemo(() => rawRoadmap ? Object.keys(rawRoadmap).length : 7, [rawRoadmap]);

    // 7-Day Route Ma'lumotlari
    const roadmapData = useMemo(() => {
        if (!rawRoadmap) return [];
        
        const completedTestIds = userResults ? userResults.map(r => r.testId) : [];

        return Object.keys(rawRoadmap).map(dayKey => {
            const dayNum = parseInt(dayKey);
            const dayData = rawRoadmap[dayKey];
            
            const tasks = dayData.map(task => {
                const isDone = task.testId ? completedTestIds.includes(task.testId) : false;
                return {
                    ...task,
                    points: 100,
                    completed: isDone || dayNum < currentDay // Fallback to days active if no results
                };
            });

            const allDone = tasks.every(t => t.completed);

            return {
                day: dayNum,
                title: dayData[0]?.title || `Day ${dayNum}`,
                description: dayData[0]?.desc || "Vazifalar yuklanmoqda...",
                status: allDone || dayNum < currentDay ? 'completed' : dayNum === currentDay ? 'active' : 'locked',
                tasks: tasks
            };
        }).sort((a, b) => a.day - b.day);
    }, [rawRoadmap, currentDay, userResults]);

    const activeDayData = useMemo(() => 
        roadmapData.find(d => d.day === selectedDay) || roadmapData[0]
    , [roadmapData, selectedDay]);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FBFBFD]">
            <RefreshCw className="animate-spin text-blue-600" size={40} />
            <p className="font-bold text-[#86868B] uppercase tracking-widest">Marshrut yuklanmoqda...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FBFBFD] font-sans text-[#1d1d1f] antialiased">
            <DashboardHeader 
                user={user} userData={userData} 
                activeTab="dashboard" 
                onLogoutClick={() => logout()}
                onPremiumClick={() => setShowPricing(true)}
            />

            <main className="max-w-[1440px] mx-auto px-6 sm:px-10 py-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <div className="space-y-4">
                        <button 
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-[#0066CC] font-semibold hover:underline group"
                        >
                            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            Dashboardga qaytish
                        </button>
                        <h1 className="text-[48px] md:text-[64px] font-bold leading-[1.1] tracking-tight">
                            7-Day Route <br />
                            <span className="text-[#86868B]">Muvaffaqiyat yo'li.</span>
                        </h1>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-black/[0.03] flex items-center gap-4 min-w-[260px]">
                        <div className="w-12 h-12 rounded-full border-[4px] border-[#F5F5F7] relative flex items-center justify-center">
                            <svg className="w-full h-full absolute -rotate-90">
                                <circle 
                                    cx="24" cy="24" r="20" 
                                    fill="none" stroke="#0071E3" strokeWidth="4" 
                                    strokeDasharray={125.6} 
                                    strokeDashoffset={125.6 * (1 - currentDay/totalDays)}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="text-sm font-black">{Math.round((currentDay/totalDays)*100)}%</span>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-[#86868B] uppercase tracking-widest">Progress</p>
                            <p className="text-lg font-bold">{currentDay} / {totalDays} kun</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Vertical Roadmap Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/[0.03]">
                            <h3 className="text-lg font-bold mb-6">Sprint Marshruti</h3>
                            <div className="relative space-y-0">
                                {/* Vertical line */}
                                <div className="absolute left-[23px] top-4 bottom-4 w-[2px] bg-[#F5F5F7]" />
                                
                                {roadmapData.map((day) => (
                                    <button
                                        key={day.day}
                                        onClick={() => setSelectedDay(day.day)}
                                        disabled={day.status === 'locked' && !isPremium}
                                        className={`
                                            w-full flex items-center gap-6 p-4 rounded-2xl transition-all relative z-10
                                            ${selectedDay === day.day ? 'bg-[#F5F5F7]' : 'hover:bg-[#F5F5F7]/50'}
                                            ${day.status === 'locked' ? 'opacity-50 grayscale' : ''}
                                        `}
                                    >
                                        <div className={`
                                            w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                                            ${day.status === 'completed' ? 'bg-[#34C759] text-white' : 
                                              day.status === 'active' ? 'bg-[#0071E3] text-white shadow-lg shadow-[#0071E3]/20' : 
                                              'bg-white border-2 border-[#F5F5F7] text-[#86868B]'}
                                        `}>
                                            {day.status === 'completed' ? <CheckCircle2 size={20} /> : 
                                             day.status === 'locked' ? <Lock size={18} /> : 
                                             <span className="font-bold">{day.day}</span>}
                                        </div>
                                        <div className="text-left">
                                            <p className={`text-[11px] font-bold uppercase tracking-widest ${day.status === 'active' ? 'text-[#0071E3]' : 'text-[#86868B]'}`}>
                                                Day {day.day}
                                            </p>
                                            <p className="text-[15px] font-bold truncate max-w-[150px]">{day.title}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Day Details Content */}
                    <div className="lg:col-span-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedDay}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                {/* Header Card */}
                                <div className="bg-white rounded-2xl p-8 shadow-sm border border-black/[0.03] overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                        <Flame size={150} />
                                    </div>
                                    
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="bg-[#0071E3] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                                Active Day
                                            </span>
                                            {selectedDay > currentDay && (
                                                <span className="bg-[#F5F5F7] text-[#86868B] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                                                    <Lock size={10} /> Premium
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-[32px] font-bold tracking-tight mb-3">{activeDayData.title}</h2>
                                        <p className="text-lg text-[#86868B] max-w-xl leading-snug">
                                            {activeDayData.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Tasks List */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {activeDayData.tasks.map((task, i) => (
                                        <div 
                                            key={i}
                                            className="bg-white p-6 rounded-2xl shadow-sm border border-black/[0.03] flex flex-col justify-between group hover:shadow-lg transition-all cursor-pointer"
                                            onClick={() => {
                                                if (task.type === 'speaking') { navigate('/speaking-practice'); return; }
                                                if (task.type === 'article') { navigate('/article-reading'); return; }
                                                if (task.type === 'podcast') { navigate('/podcasts'); return; }
                                                if (task.type === 'mock') { navigate('/practice?filter=full_mock'); return; }
                                                
                                                let targetId = task.testId;
                                                if (!targetId && assignments && assignments.length > 0) {
                                                    const match = assignments.find(a => a.type === task.type && a.status !== 'completed') 
                                                               || assignments.find(a => a.type === task.type);
                                                    if (match) targetId = match.id || match.testId;
                                                }

                                                if (targetId) navigate(`/test/${targetId}`);
                                                else navigate(`/practice?filter=${task.type || 'all'}`);
                                            }}
                                        >
                                            <div className="flex justify-between items-start mb-8">
                                                <div className={`
                                                    w-12 h-12 rounded-xl flex items-center justify-center
                                                    ${task.type === 'reading' ? 'bg-blue-50 text-blue-600' : 
                                                      task.type === 'listening' ? 'bg-purple-50 text-purple-600' : 
                                                      'bg-orange-50 text-orange-600'}
                                                `}>
                                                    {task.type === 'reading' ? <BookOpen size={24} /> : 
                                                     task.type === 'listening' ? <Headphones size={24} /> : 
                                                     task.type === 'writing' ? <PenTool size={24} /> :
                                                     task.type === 'speaking' ? <MessageCircle size={24} /> :
                                                     <Zap size={24} />}
                                                </div>
                                                {task.completed && <CheckCircle2 size={20} className="text-[#34C759]" />}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-[#86868B] uppercase tracking-widest mb-1">{task.type}</p>
                                                <h4 className="text-xl font-bold mb-3">{task.title}</h4>
                                                <div className="flex items-center justify-between border-t border-black/[0.03] pt-4 mt-auto">
                                                    <span className="text-[12px] font-bold text-[#161616] flex items-center gap-1 bg-[#F5F5F7] px-2 py-0.5 rounded-lg border border-black/5">
                                                        +{task.points} XP <Star size={10} fill="currentColor" />
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-white bg-[#161616] px-3.5 py-1.5 rounded-lg shadow-md shadow-black/10 group-hover:scale-105 transition-all">
                                                        Boshlash <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Locked Feature Preview */}
                                    <div className="bg-black text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative z-10">
                                            <Zap size={24} className="text-[#0071E3] mb-4" />
                                            <h4 className="text-xl font-bold mb-1">Sprintni tezlashtirish</h4>
                                            <p className="text-zinc-400 text-sm leading-snug">
                                                Keyingi kun vazifalarini hoziroq oching va tayyorgarlikni tezlashtiring.
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => setShowPricing(true)}
                                            className="relative z-10 mt-8 w-full py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all"
                                        >
                                            Upgrade Pro — 19,000 so'm
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </main>

            <SiteFooter />

            <PricingModal 
                isOpen={showPricing} 
                onClose={() => setShowPricing(false)} 
                userName={userData?.fullName?.split(' ')[0]} 
                source="roadmap"
            />
        </div>
    );
}

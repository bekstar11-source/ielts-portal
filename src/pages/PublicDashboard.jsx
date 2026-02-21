import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebase';
import { collection, query, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Flame, Trophy, AlertTriangle, BookOpen, ArrowRight, ArrowUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// IMPORT SHARED COMPONENTS
import DashboardHeader from "../components/dashboard/DashboardHeader";
import PlanetBackground from "../components/dashboard/PlanetBackground";
import HeroSection from "../components/dashboard/HeroSection";
import DashboardModals from "../components/dashboard/DashboardModals";
import PricingModal from "../components/dashboard/PricingModal";

export default function PublicDashboard() {
    const { userData, user, logout } = useAuth();
    const navigate = useNavigate();

    // Stats states
    const [leaderboard, setLeaderboard] = useState([]);
    const [mistakesCount, setMistakesCount] = useState(0);
    const [vocabCount, setVocabCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Modals states
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [pricingSource, setPricingSource] = useState("general");
    const [accessKeyInput, setAccessKeyInput] = useState("");
    const [checkingKey, setCheckingKey] = useState(false);
    const [keyError, setKeyError] = useState("");

    const handlePremiumFeatureClick = (source) => {
        setPricingSource(source);
        setShowPricingModal(true);
    };

    // Fetching Gamification Data
    useEffect(() => {
        if (!user) return;

        const fetchDashboardData = async () => {
            try {
                // 1. Leaderboard (Top 5 users by points)
                const usersQuery = query(collection(db, 'users'), orderBy('gamification.points', 'desc'), limit(5));
                const userSnaps = await getDocs(usersQuery);
                const leaders = userSnaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setLeaderboard(leaders);

                // 2. Mistakes Count
                const mistakesRef = collection(db, 'users', user.uid, 'mistakes');
                const mSnap = await getCountFromServer(mistakesRef);
                setMistakesCount(mSnap.data().count);

                // 3. Vocab Count
                const vocabRef = collection(db, 'users', user.uid, 'vocabulary');
                const vSnap = await getCountFromServer(vocabRef);
                setVocabCount(vSnap.data().count);

            } catch (err) {
                console.error("Dashboard datasi olishda xatolik:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [user]);

    const handleVerifyKey = async () => {
        // Here you would normally verify the key.
        // For public users, showing premium popup instead.
        setShowKeyModal(false);
        handlePremiumFeatureClick("practice");
    };

    const streak = userData?.streakCount || 0;
    const xp = userData?.gamification?.points || 0;
    const currentBand = userData?.currentBand || 0;
    const targetBand = userData?.targetBand || 7.0;

    return (
        <div className="min-h-screen bg-[#050505] font-sans text-white selection:bg-orange-500/20 pb-20">
            <style>{`
                body { 
                    font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif; 
                    background-color: #050505;
                }
                .glass-card {
                    background: rgba(15, 15, 15, 0.6);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 0 0 1px rgba(0,0,0,0.2);
                }
                .glass-card:hover {
                    border-color: rgba(255, 85, 32, 0.5);
                    box-shadow: 0 0 30px rgba(255, 85, 32, 0.15);
                    transform: translateY(-2px);
                    background: rgba(20, 20, 20, 0.8);
                }
            `}</style>

            {/* 1. HEADER */}
            <DashboardHeader
                user={user} userData={userData}
                activeTab={activeTab} setActiveTab={setActiveTab}
                onKeyClick={() => setShowKeyModal(true)} onLogoutClick={() => setShowLogoutConfirm(true)}
                onPremiumClick={handlePremiumFeatureClick}
            />

            {/* 2. BACKGROUND */}
            <PlanetBackground />

            {/* 3. MAIN CONTENT (Aligned with StudentDashboard) */}
            <main className="relative z-10 max-w-7xl mx-auto p-6 md:p-8">

                {/* HERO SECTION */}
                {activeTab === 'dashboard' ? (
                    <>
                        <HeroSection
                            userName={userData?.fullName?.split(' ')[0] || "Mehmon"}
                            targetBand={targetBand}
                            currentBand={currentBand}
                            previousBand={0}
                        />

                        {/* GAMIFICATION FEATURES GRID */}
                        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up mb-12" style={{ animationDelay: '0.4s' }}>

                            {/* Streak Card */}
                            <div className="glass-card p-6 rounded-2xl cursor-pointer group hover:bg-white/5 transition-all duration-300 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-[40px] group-hover:bg-orange-500/20 transition-all"></div>
                                <div className="flex items-center gap-4 mb-3 relative z-10">
                                    <div className={`p-2.5 rounded-xl transition-all ${streak > 0 ? 'bg-orange-500/20 text-orange-400 group-hover:bg-orange-500' : 'bg-gray-800 text-gray-500'} group-hover:text-white`}>
                                        <Flame className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-white text-lg">Daily Streak</h4>
                                </div>
                                <div className="flex items-end gap-2 relative z-10">
                                    <span className="text-3xl font-bold tracking-tighter text-white">{streak}</span>
                                    <span className="text-sm font-medium text-vetra-textMuted mb-1">kun</span>
                                </div>
                            </div>

                            {/* Total XP Card */}
                            <div className="glass-card p-6 rounded-2xl cursor-pointer group hover:bg-white/5 transition-all duration-300 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-[40px] group-hover:bg-yellow-500/20 transition-all"></div>
                                <div className="flex items-center gap-4 mb-3 relative z-10">
                                    <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 group-hover:bg-yellow-500 group-hover:text-white transition-all">
                                        <Trophy className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-white text-lg">Total XP</h4>
                                </div>
                                <div className="flex items-end gap-2 relative z-10">
                                    <span className="text-3xl font-bold tracking-tighter text-white">{xp}</span>
                                    <span className="text-sm font-medium text-vetra-textMuted mb-1 flex items-center gap-1 text-green-400"><ArrowUp size={14} /> Top reytingda</span>
                                </div>
                            </div>

                            {/* Mistakes Card */}
                            <div className="glass-card p-6 rounded-2xl cursor-pointer group hover:bg-white/5 transition-all duration-300 relative overflow-hidden" onClick={() => navigate('/practice')}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[40px] group-hover:bg-red-500/20 transition-all"></div>
                                <div className="flex items-center gap-4 mb-3 relative z-10">
                                    <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-white text-lg">My Mistakes</h4>
                                </div>
                                <div className="flex justify-between items-end relative z-10">
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-bold tracking-tighter text-white">{mistakesCount}</span>
                                        <span className="text-sm font-medium text-vetra-textMuted mb-1">xato</span>
                                    </div>
                                    <ArrowRight size={18} className="text-vetra-textMuted group-hover:text-white group-hover:translate-x-1 transition-all mb-1" />
                                </div>
                            </div>

                            {/* Vocab Card */}
                            <div className="glass-card p-6 rounded-2xl cursor-pointer group hover:bg-white/5 transition-all duration-300 relative overflow-hidden" onClick={() => navigate('/vocabulary')}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] group-hover:bg-blue-500/20 transition-all"></div>
                                <div className="flex items-center gap-4 mb-3 relative z-10">
                                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-white text-lg">Vocabulary</h4>
                                </div>
                                <div className="flex justify-between items-end relative z-10">
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-bold tracking-tighter text-white">{vocabCount}</span>
                                        <span className="text-sm font-medium text-vetra-textMuted mb-1">so'zlar</span>
                                    </div>
                                    <ArrowRight size={18} className="text-vetra-textMuted group-hover:text-white group-hover:translate-x-1 transition-all mb-1" />
                                </div>
                            </div>
                        </section>

                        {/* BOTTOM SPLIT SECTION */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                            {/* LEADERS */}
                            <div className="glass-card p-6 lg:col-span-1 border border-white/5 rounded-3xl relative overflow-hidden h-full">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Trophy size={20} className="text-yellow-500" /> Leaderboard (Top 5)
                                </h3>

                                {loading ? (
                                    <div className="text-center text-gray-500 py-4 animate-pulse">Yuklanmoqda...</div>
                                ) : (
                                    <div className="space-y-4">
                                        {leaderboard.map((ldUser, idx) => (
                                            <div key={ldUser.id} className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${ldUser.id === user?.uid ? 'bg-orange-500/20 shadow-[0_0_15px_rgba(255,85,32,0.2)] border border-orange-500/30' : 'hover:bg-white/5 border border-transparent'}`}>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-white/10 text-gray-400'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-semibold truncate text-sm ${ldUser.id === user?.uid ? 'text-orange-400' : 'text-white'}`}>
                                                        {ldUser.id === user?.uid ? 'Siz' : (ldUser.fullName || ldUser.email?.split('@')[0])}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{ldUser.gamification?.points || 0} XP</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* CALL TO ACTION */}
                            <div className="glass-card p-10 lg:col-span-2 border border-orange-500/20 rounded-3xl relative overflow-hidden bg-gradient-to-br from-orange-500/5 to-transparent h-full flex flex-col justify-center">
                                <div className="absolute right-0 top-0 w-80 h-80 bg-orange-500/10 blur-[80px] rounded-full" />
                                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider rounded-lg mb-4">
                                            Tavsiya
                                        </div>
                                        <h2 className="text-3xl font-bold text-white mb-3">Premium darajaga o'ting!</h2>
                                        <p className="text-vetra-textMuted max-w-lg leading-relaxed mb-6">
                                            Siz hozirda faqat 1-2 ta ochiq testlardan foydalana olasiz. Kunlik topshiriqlar,
                                            Speaking va Writing uchun AI yordamchini ochish uchun tizimga a'zo bo'ling.
                                        </p>
                                    </div>
                                    <button onClick={() => navigate('/practice')} className="w-full md:w-auto px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(255,85,32,0.3)] hover:shadow-[0_0_30px_rgba(255,85,32,0.5)] transition-all flex items-center justify-center gap-2 shrink-0 group">
                                        Testlar Bo'limi <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="py-20 text-center">
                        <h2 className="text-2xl font-bold text-gray-400 mb-2">Hozircha bo'sh</h2>
                        <p className="text-gray-500">Public akkaunt uchun bu bo'lim hali tayyorlanmoqda.</p>
                    </div>
                )}

                <DashboardModals
                    showKeyModal={showKeyModal} setShowKeyModal={setShowKeyModal}
                    accessKeyInput={accessKeyInput} setAccessKeyInput={setAccessKeyInput}
                    handleVerifyKey={handleVerifyKey} checkingKey={checkingKey} keyError={keyError}
                    showLogoutConfirm={showLogoutConfirm} setShowLogoutConfirm={setShowLogoutConfirm} confirmLogout={logout}
                />
            </main>

            <PricingModal
                isOpen={showPricingModal}
                onClose={() => setShowPricingModal(false)}
                userName={userData?.fullName?.split(' ')[0] || "O'quvchi"}
                source={pricingSource}
            />
        </div>
    );
}

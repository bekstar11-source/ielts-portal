import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebase';
import { collection, query, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore';
import { Flame, Trophy, AlertTriangle, BookOpen, ArrowRight, ArrowUp, Crown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// IMPORT SHARED COMPONENTS
import DashboardHeader from "../components/dashboard/DashboardHeader";
import HeroSection from "../components/dashboard/HeroSection";
import DashboardModals from "../components/dashboard/DashboardModals";
import PricingModal from "../components/dashboard/PricingModal";
import SiteFooter from "../components/common/SiteFooter";

export default function PublicDashboard() {
    const { userData, user, logout } = useAuth();
    const navigate = useNavigate();

    const [leaderboard, setLeaderboard] = useState([]);
    const [mistakesCount, setMistakesCount] = useState(0);
    const [vocabCount, setVocabCount] = useState(0);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        if (!user) return;
        const fetchDashboardData = async () => {
            try {
                const usersQuery = query(collection(db, 'users'), orderBy('gamification.points', 'desc'), limit(5));
                const userSnaps = await getDocs(usersQuery);
                const leaders = userSnaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setLeaderboard(leaders);

                const [mSnap, vSnap] = await Promise.all([
                    getCountFromServer(collection(db, 'users', user.uid, 'mistakes')),
                    getCountFromServer(collection(db, 'users', user.uid, 'vocabulary'))
                ]);
                setMistakesCount(mSnap.data().count);
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
        setShowKeyModal(false);
        handlePremiumFeatureClick("practice");
    };

    const streak = userData?.streakCount || 0;
    const xp = userData?.gamification?.points || 0;
    const currentBand = userData?.currentBand || 0;
    const targetBand = userData?.targetBand || 7.0;

    return (
        <div className="min-h-screen bg-white font-sans text-[#1a1a1a] selection:bg-[#FF5520]/10 overflow-x-hidden antialiased">
            {/* Header */}
            <DashboardHeader
                user={user} userData={userData}
                activeTab={activeTab} setActiveTab={setActiveTab}
                onKeyClick={() => setShowKeyModal(true)} onLogoutClick={() => setShowLogoutConfirm(true)}
                onPremiumClick={handlePremiumFeatureClick}
            />

            <main className="w-full">
                {activeTab === 'dashboard' ? (
                    <>
                        <HeroSection
                            userName={userData?.fullName?.split(' ')[0] || "O'quvchi"}
                            targetBand={targetBand}
                            currentBand={currentBand}
                            previousBand={0}
                            examDate={userData?.examDate}
                            streakCount={streak}
                            points={xp}
                        />

                        <div className="max-w-7xl mx-auto px-6 mt-12 mb-24">
                            {/* Stats Cards Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                                {[
                                    { label: "Daily Streak", value: streak, unit: "kun", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
                                    { label: "Total XP", value: xp, unit: "ball", icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-50" },
                                    { label: "Xatolarim", value: mistakesCount, unit: "xato", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", link: "/practice" },
                                    { label: "So'z boyligi", value: vocabCount, unit: "so'z", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50", link: "/vocabulary" }
                                ].map((stat, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => stat.link && navigate(stat.link)}
                                        className="bg-white border border-[#f0f0f0] p-6 rounded-3xl hover:shadow-2xl hover:shadow-black/5 transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                                                <stat.icon size={18} />
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-widest text-[#aaa]">{stat.label}</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-[900] text-[#1a1a1a] tracking-tight">{stat.value}</span>
                                            <span className="text-[13px] font-bold text-[#aaa]">{stat.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="py-40 text-center">
                        <div className="w-16 h-16 bg-[#f8f8f9] rounded-full flex items-center justify-center mx-auto mb-6">
                            <Sparkles size={30} className="text-[#ccc]" />
                        </div>
                        <h2 className="text-2xl font-[900] text-[#1a1a1a] tracking-tight">Bo'lim tayyorlanmoqda</h2>
                        <p className="text-[#aaa] font-bold mt-2">Bu bo'lim tez orada sizga taqdim etiladi.</p>
                    </div>
                )}
            </main>

            <SiteFooter />

            <DashboardModals
                showKeyModal={showKeyModal} setShowKeyModal={setShowKeyModal}
                accessKeyInput={accessKeyInput} setAccessKeyInput={setAccessKeyInput}
                handleVerifyKey={handleVerifyKey} checkingKey={checkingKey} keyError={keyError}
                showLogoutConfirm={showLogoutConfirm} setShowLogoutConfirm={setShowLogoutConfirm} confirmLogout={logout}
            />

            <PricingModal
                isOpen={showPricingModal}
                onClose={() => setShowPricingModal(false)}
                userName={userData?.fullName?.split(' ')[0] || "O'quvchi"}
                source={pricingSource}
            />
        </div>
    );
}

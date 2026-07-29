import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebase';
import { collection, query, where, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore';
import { Flame, Trophy, AlertTriangle, BookOpen, Headphones, PenTool, Mic, ArrowRight, ArrowUp, Crown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// IMPORT SHARED COMPONENTS
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import HeroSection from "../../components/dashboard/HeroSection";
import DashboardModals from "../../components/dashboard/DashboardModals";
import PricingModal from "../../components/dashboard/PricingModal";
import SiteFooter from "../../components/common/SiteFooter";
import { useAnalytics } from '../../hooks/useAnalytics';
import LimitReachedSheet from "../../components/dashboard/LimitReachedSheet";
import { useDailyLimit } from "../../hooks/useDailyLimit";

export default function PublicDashboard() {
    const { userData, user, logout } = useAuth();
    const navigate = useNavigate();

    const [leaderboard, setLeaderboard] = useState([]);
    const [mistakesCount, setMistakesCount] = useState(0);
    const [vocabCount, setVocabCount] = useState(0);
    const [podcastsCount, setPodcastsCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('dashboard');
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [showStartConfirm, setShowStartConfirm] = useState(false);
    const [testToStart, setTestToStart] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [pricingSource, setPricingSource] = useState("general");
    const [accessKeyInput, setAccessKeyInput] = useState("");
    const [checkingKey, setCheckingKey] = useState(false);
    const [keyError, setKeyError] = useState("");

    const [showLimitSheet, setShowLimitSheet] = useState(false);
    const [limitType, setLimitType] = useState('reading');
    const { checkLimit, incrementUsage } = useDailyLimit(userData);
    const [publicTestsFallback, setPublicTestsFallback] = useState([]);

    const [activeSkills, setActiveSkills] = useState({
        Reading: true,
        Listening: true,
        Writing: true,
        Speaking: true
    });

    const toggleSkill = (skillName) => {
        setActiveSkills(prev => {
            const activeCount = Object.values(prev).filter(Boolean).length;
            if (activeCount === 1 && prev[skillName]) return prev;
            return { ...prev, [skillName]: !prev[skillName] };
        });
    };

    const { stats: analyticsStats } = useAnalytics(user?.uid);

    const skillStats = useMemo(() => {
        const averages = analyticsStats.skillAverages || { reading: 0, listening: 0, writing: 0, speaking: 0 };
        
        const roundToIELTSBand = (score) => {
            const num = parseFloat(score);
            if (!num || isNaN(num)) return "0.0";
            return (Math.round(num * 2) / 2).toFixed(1);
        };

        const useFallback = analyticsStats.totalTests === 0;
        const fallbackValue = userData?.currentBand || 0;

        return [
            { name: "Reading", score: useFallback ? roundToIELTSBand(fallbackValue) : roundToIELTSBand(averages.reading), icon: BookOpen, color: "blue", isActive: activeSkills.Reading },
            { name: "Listening", score: useFallback ? roundToIELTSBand(fallbackValue) : roundToIELTSBand(averages.listening), icon: Headphones, color: "purple", isActive: activeSkills.Listening },
            { name: "Writing", score: useFallback ? roundToIELTSBand(fallbackValue) : roundToIELTSBand(averages.writing), icon: PenTool, color: "orange", isActive: activeSkills.Writing },
            { name: "Speaking", score: useFallback ? roundToIELTSBand(fallbackValue) : roundToIELTSBand(averages.speaking), icon: Mic, color: "emerald", isActive: activeSkills.Speaking }
        ];
    }, [analyticsStats, userData, activeSkills]);

    const calculatedOverallBand = useMemo(() => {
        if (analyticsStats.totalTests === 0) return userData?.currentBand || 0;
        
        let sum = 0;
        let count = 0;
        
        skillStats.forEach(skill => {
            if (skill.isActive) {
                sum += parseFloat(skill.score) || 0;
                count++;
            }
        });
        
        if (count === 0) return 0;
        
        const avg = sum / count;
        return Math.round(avg * 2) / 2;
    }, [skillStats, analyticsStats.totalTests, userData]);

    const handlePremiumFeatureClick = (source) => {
        setPricingSource(source);
        setShowPricingModal(true);
    };

    const handleStartTest = (test) => {
        const type = test.type?.toLowerCase() || '';
        const isReading = type.includes('reading') || test.title?.toLowerCase().includes('reading');
        const isListening = type.includes('listening') || test.title?.toLowerCase().includes('listening');
        const limitTarget = isReading ? 'reading' : isListening ? 'listening' : null;

        if (limitTarget && !checkLimit(limitTarget)) {
            setLimitType(limitTarget);
            setShowLimitSheet(true);
            return;
        }
        
        setTestToStart(test);
        setShowStartConfirm(true);
    };

    const confirmStartTest = () => {
        const test = testToStart;
        if (!test) return;
        
        setShowStartConfirm(false);
        
        const type = test.type?.toLowerCase() || '';
        const isReading = type.includes('reading') || test.title?.toLowerCase().includes('reading');
        const isListening = type.includes('listening') || test.title?.toLowerCase().includes('listening');
        const limitTarget = isReading ? 'reading' : isListening ? 'listening' : null;

        if (limitTarget) {
            incrementUsage(limitTarget).catch(err => console.error("Stats update failed:", err));
        }
        navigate(`/test/${test.id || test.testId}`);
    };

    useEffect(() => {
        if (!user) return;
        const fetchDashboardData = async () => {
            try {
                const usersQuery = query(collection(db, 'users'), orderBy('gamification.points', 'desc'), limit(5));
                const userSnaps = await getDocs(usersQuery);
                const leaders = userSnaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setLeaderboard(leaders);

                const [mSnap, vSnap, pSnap] = await Promise.all([
                    getCountFromServer(collection(db, 'users', user.uid, 'mistakes')),
                    getCountFromServer(collection(db, 'users', user.uid, 'vocabulary')),
                    getCountFromServer(query(collection(db, 'podcasts'), where('status', '==', 'published')))
                ]);
                setMistakesCount(mSnap.data().count);
                setVocabCount(vSnap.data().count);
                setPodcastsCount(pSnap.data().count);

                // Fetch fallback tests for Roadmap
                const qF = query(collection(db, "tests_metadata"), where("type", "==", "reading"), limit(5));
                const snapF = await getDocs(qF);
                setPublicTestsFallback(snapF.docs.map(d => ({ id: d.id, ...d.data() })));
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
                            currentBand={calculatedOverallBand}
                            previousBand={0}
                            examDate={userData?.examDate}
                            streakCount={streak}
                            points={xp}
                            skillStats={skillStats}
                            onToggleSkill={toggleSkill}
                            usageStats={userData?.usageStats}
                            onStartTest={handleStartTest}
                            assignments={publicTestsFallback}
                        />

                        <div className="max-w-7xl mx-auto px-6 mt-12 mb-24">
                            {/* Stats Cards Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                                {[
                                    { label: "Daily Streak", value: streak, unit: "kun", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
                                    { label: "Total XP", value: xp, unit: "ball", icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-50" },
                                    { label: "Podcastlar", value: podcastsCount, unit: "ta", icon: Headphones, color: "text-indigo-500", bg: "bg-indigo-50", link: "/podcasts" },
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
                showStartConfirm={showStartConfirm} setShowStartConfirm={setShowStartConfirm} confirmStartTest={confirmStartTest}
                showLogoutConfirm={showLogoutConfirm} setShowLogoutConfirm={setShowLogoutConfirm} confirmLogout={logout}
            />

            <PricingModal
                isOpen={showPricingModal}
                onClose={() => setShowPricingModal(false)}
                userName={userData?.fullName?.split(' ')[0] || "O'quvchi"}
                source={pricingSource}
            />

            <LimitReachedSheet 
                isOpen={showLimitSheet} 
                onClose={() => setShowLimitSheet(false)}
                onUpgrade={() => {
                    setShowLimitSheet(false);
                    setShowPricingModal(true);
                }}
                type={limitType}
            />
        </div>
    );
}

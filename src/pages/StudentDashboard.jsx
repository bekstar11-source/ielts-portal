// src/pages/StudentDashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { collection, query, where, doc, updateDoc, arrayUnion, getCountFromServer } from "firebase/firestore";
import { getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Headphones, PenTool, Mic, Flame, Trophy, AlertTriangle, ArrowRight, ArrowUp, RotateCw } from "lucide-react";
import { useStudentData } from "../hooks/useStudentData";

// COMPONENTS
import DashboardHeader from "../components/dashboard/DashboardHeader";
import QuickAnalytics from '../components/dashboard/QuickAnalytics';
import TestShowcase from '../components/dashboard/TestShowcase';
import AnnouncementsBoard from '../components/dashboard/AnnouncementsBoard';
import HeroSection from "../components/dashboard/HeroSection";
import LimitReachedSheet from "../components/dashboard/LimitReachedSheet";
import { useDailyLimit } from "../hooks/useDailyLimit";

// StatsCards removed as it is integrated into HeroSection now
// FiltersBar and TestGrid moved to Practice.jsx
import DashboardModals from "../components/dashboard/DashboardModals";
import PricingModal from "../components/dashboard/PricingModal";
import SettingsTab from "../components/dashboard/SettingsTab";
import MyResults from "../pages/MyResults";
import { useAnalytics } from "../hooks/useAnalytics";
import { getRecommendations } from "../utils/recommendations";
import Leaderboard from "../components/dashboard/Leaderboard";
import SiteFooter from "../components/common/SiteFooter";




export default function StudentDashboard() {
    const { user, logout, userData } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('dashboard');
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [mistakesCount, setMistakesCount] = useState(0);
    const [vocabCount, setVocabCount] = useState(0);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [showStartConfirm, setShowStartConfirm] = useState(false);
    const [testToStart, setTestToStart] = useState(null);
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [selectedSet, setSelectedSet] = useState(null);
    const [accessKeyInput, setAccessKeyInput] = useState("");
    const [checkingKey, setCheckingKey] = useState(false);
    const [keyError, setKeyError] = useState("");
    const [showLimitSheet, setShowLimitSheet] = useState(false);
    const [limitType, setLimitType] = useState('reading');
    const { checkLimit, incrementUsage } = useDailyLimit(userData);
    const [publicTestsFallback, setPublicTestsFallback] = useState([]);

    // 🔥 Ko'nikmalarni (skills) yoqish/o'chirish state'i
    const [activeSkills, setActiveSkills] = useState({
        Reading: true,
        Listening: true,
        Writing: true,
        Speaking: true
    });

    const toggleSkill = (skillName) => {
        setActiveSkills(prev => {
            // Kamida bitta skill faol qolishi kerak
            const activeCount = Object.values(prev).filter(Boolean).length;
            if (activeCount === 1 && prev[skillName]) return prev;
            return { ...prev, [skillName]: !prev[skillName] };
        });
    };

    // 🚀 SHARED HOOK — Practice bilan bitta cache ishlatadi (zero duplicate reads)
    const { assignments: rawAssignments, userResults, loading, error: errorMsg, refresh } = useStudentData(user);

    // 🔥 ANALYTICS HOOK (userResults ni uzatamiz — extra read bo'lmaydi)
    const { stats: analyticsStats } = useAnalytics(user?.uid, userResults);

    // 🔥 RECOMMENDATIONS
    const recommendedTests = useMemo(() => {
        const completedIds = rawAssignments.filter(t => t.status === 'completed').map(t => t.id);
        return getRecommendations(analyticsStats, rawAssignments, completedIds);
    }, [analyticsStats, rawAssignments]);

    useEffect(() => {
        // Agar foydalanuvchi ADMIN bo'lsa, uni o'z joyiga haydaymiz
        if (userData?.role === 'admin') {
            navigate('/admin', { replace: true });
            return;
        }

        // Onboarding Check
        if (userData && userData.accountType === 'public' && userData.onboardingCompleted === false) {
            navigate('/onboarding', { replace: true });
        }
    }, [userData, navigate]);

    const handleManualRefresh = async () => {
        if (!user) return;
        // gamification cache ni ham tozalaymiz
        localStorage.removeItem(`gamification_counts_${user.uid}`);
        localStorage.removeItem(`gamification_counts_time_${user.uid}`);
        sessionStorage.removeItem(`analytics_stats_${user.uid}`);
        await refresh(); // hook orqali cache invalidate + qayta fetch
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
        
        if (test.type === 'mock_full') { 
            navigate('/mock-exam', { state: { mockData: test } }); 
            return; 
        }
        navigate(`/test/${test.id || test.testId}`);
    };

    // Gamification ma'lumotlarini yuklash (Mistakes, Vocab) — 1 soatlik localStorage cache
    useEffect(() => {
        if (!user) return;
        const fetchGamificationData = async () => {
            try {
                const CACHE_KEY = `gamification_counts_${user.uid}`;
                const CACHE_TIME_KEY = `gamification_counts_time_${user.uid}`;
                const ONE_HOUR = 60 * 60 * 1000;
                const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
                const isCacheValid = cachedTime && (Date.now() - parseInt(cachedTime) < ONE_HOUR);

                if (isCacheValid) {
                    const cached = localStorage.getItem(CACHE_KEY);
                    if (cached) {
                        const { mistakes, vocab } = JSON.parse(cached);
                        setMistakesCount(mistakes || 0);
                        setVocabCount(vocab || 0);
                        return;
                    }
                }

                // Cache yo'q yoki muddati o'tgan — Firestore dan olamiz
                const [mSnap, vSnap] = await Promise.all([
                    getCountFromServer(collection(db, 'users', user.uid, 'mistakes')),
                    getCountFromServer(collection(db, 'users', user.uid, 'vocabulary'))
                ]);
                const mistakes = mSnap.data().count;
                const vocab = vSnap.data().count;

                setMistakesCount(mistakes);
                setVocabCount(vocab);

                // Cache ga saqlash
                localStorage.setItem(CACHE_KEY, JSON.stringify({ mistakes, vocab }));
                localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
            } catch (err) {
                console.error("Gamification verilarini olishda xatolik:", err);
            }
        };
        fetchGamificationData();

        // 🚀 Fetch fallback tests if needed
        const fetchFallback = async () => {
            if (rawAssignments.length === 0) {
                const q = query(collection(db, "tests"), where("type", "==", "reading"), limit(5));
                const snap = await getDocs(q);
                setPublicTestsFallback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        };
        fetchFallback();
    }, [user, rawAssignments.length]);

    // --- STATS ---
    const stats = useMemo(() => {
        const total = rawAssignments.length;
        const completed = rawAssignments.filter(t => t.status === 'completed' || (t.isSet && t.completedTests > 0)).length;
        
        // Agar analyticsStats da tayyor average bo'lsa, shuni ishlatamiz
        if (analyticsStats?.averageScore > 0) {
            return { total, completed, avg: analyticsStats.averageScore };
        }

        let totalScore = 0, scoreCount = 0;
        rawAssignments.forEach(t => {
            const bScore = parseFloat(t.result?.bandScore || t.result?.score || 0);
            if (bScore > 0) { totalScore += bScore; scoreCount++; }
            if (t.isSet) { 
                (t.subTests || []).forEach(sub => { 
                    const subBScore = parseFloat(sub.result?.bandScore || sub.result?.score || 0);
                    if (subBScore > 0) { totalScore += subBScore; scoreCount++; } 
                }); 
            }
        });
        const rawAvg = scoreCount > 0 ? (totalScore / scoreCount) : 0;
        const avg = rawAvg > 0 ? (Math.round(rawAvg * 2) / 2).toFixed(1) : 0;
        return { total, completed, avg };
    }, [rawAssignments, analyticsStats]);

    // 🔥 REAL STATISTIKA (useAnalytics dan olinadi)
    const skillStats = useMemo(() => {
        const averages = analyticsStats.skillAverages || { reading: 0, listening: 0, writing: 0, speaking: 0 };
        
        const roundToIELTSBand = (score) => {
            const num = parseFloat(score);
            if (!num || isNaN(num)) return "0.0";
            return (Math.round(num * 2) / 2).toFixed(1);
        };

        // Yangi o'quvchi uchun fallback (onboarding dagi joriy darajasini ko'rsatamiz)
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
        
        // Faqat hisobga olingan (active) skill'lar yig'indisini ularning soniga bo'lamiz
        const avg = sum / count;
        
        // IELTS yaxlitlash qoidasi: 0.25 -> 0.5, 0.75 -> 1.0 ga qadar
        return Math.round(avg * 2) / 2;
    }, [skillStats, analyticsStats.totalTests, userData]);

    const filteredTests = useMemo(() => {
        let baseList = rawAssignments;
        if (activeTab === 'archive') {
            baseList = baseList.filter(t => t.status === 'completed' || (t.isSet && t.completedTests === t.totalTests));
        }
        else if (activeTab === 'favorites') {
            baseList = [];
        }
        return baseList.filter(item => {
            const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase());
            let matchesType = true;
            if (filterType !== 'all') {
                if (filterType === 'mock') matchesType = item.isMock;
                else if (filterType === 'set') matchesType = item.isSet;
                else matchesType = item.type === filterType;
            }
            return matchesSearch && matchesType;
        });
    }, [rawAssignments, searchQuery, filterType, activeTab]);

    const handleReview = (test) => {
        const resultId = test.result?.id;
        if (!resultId) {
            alert("Natija topilmadi!");
            return;
        }
        navigate(`/review/${resultId}`);
    };

    const handleVerifyKey = async () => {
        if (!accessKeyInput.trim()) return;
        setCheckingKey(true);
        setKeyError("");
        try {
            const q = query(collection(db, "accessKeys"), where("key", "==", accessKeyInput.trim().toUpperCase()));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) throw new Error("Kalit xato!");
            const keyDoc = querySnapshot.docs[0];
            const keyData = keyDoc.data();
            if (keyData.isUsed) throw new Error("Bu kalit ishlatilgan!");

            let mockAssignment = {};
            if (keyData.type === 'mock_bundle') {
                mockAssignment = {
                    id: 'MOCK_' + keyData.key, type: 'mock_full', title: 'Full Mock Exam (L+R+W)',
                    startDate: new Date().toISOString(), endDate: null, status: 'unlocked_mock',
                    mockKey: keyData.key,
                    subTests: { reading: keyData.assignedTests.readingId, listening: keyData.assignedTests.listeningId, writing: keyData.assignedTests.writingId }
                };
            } else {
                mockAssignment = { id: keyData.targetId, type: 'test', startDate: new Date().toISOString(), endDate: null, status: 'unlocked_key', key: keyData.key };
            }
            await updateDoc(doc(db, "users", user.uid), { assignedTests: arrayUnion(mockAssignment) });
            await updateDoc(doc(db, "accessKeys", keyDoc.id), { isUsed: true, usedBy: user.uid, usedByName: userData?.fullName, usedAt: new Date().toISOString() });

            alert("Test qo'shildi! 🚀");
            // Cache Invalidation
            sessionStorage.removeItem(`student_assignments_${user.uid}`);
            sessionStorage.removeItem(`student_assignments_time_${user.uid}`);
            
            setShowKeyModal(false); setAccessKeyInput("");
            window.location.reload();
        } catch (error) { setKeyError(error.message); } finally { setCheckingKey(false); }
    };

    const renderContent = () => {
        if (activeTab === 'settings') return <SettingsTab user={user} userData={userData} />;
        if (activeTab === 'leaderboard') return <Leaderboard />;
        if (activeTab === 'results') {
            return <MyResults tests={rawAssignments} onReview={handleReview} onStartTest={handleStartTest} loading={loading} />;
        }
        if (activeTab === 'progress') return <div className="text-center py-20 text-vetra-stone"><h3 className="text-xl font-bold text-vetra-midnight mb-2">Statistika Tez Orada...</h3></div>;

        if ((activeTab === 'favorites' || activeTab === 'archive') && filteredTests.length === 0 && !loading) {
            return (
                <div className="text-center py-20 bg-vetra-grey/30 rounded-2xl border border-dashed border-vetra-grey mx-auto max-w-2xl mt-10">
                    <p className="text-vetra-stone font-medium">{activeTab === 'favorites' ? "Sevimlilar ro'yxati bo'sh" : "Arxiv bo'sh"}</p>
                </div>
            );
        }

        return (
            <>
                {activeTab === 'dashboard' && (
                    <>
                        <HeroSection
                            userName={userData?.fullName?.split(' ')[0] || "O'quvchi"}
                            targetBand={userData?.targetBand || 7.5}
                            currentBand={calculatedOverallBand}
                            previousBand={userData?.previousIELTSScore || 0}
                            examDate={userData?.examDate}
                            daysRemaining={userData?.examTimeframe ? null : undefined}
                            onUpgradeClick={() => setShowPricingModal(true)}
                            skillStats={skillStats}
                            onToggleSkill={toggleSkill}
                            streakCount={userData?.streakCount || 0}
                            points={userData?.gamification?.points || 0}
                            usageStats={userData?.usageStats}
                            onStartTest={handleStartTest}
                            assignments={rawAssignments.length > 0 ? rawAssignments : publicTestsFallback}
                        />





                        {/* GAMIFICATION FEATURES GRID REMOVED */}

                        <div className="mt-8">
                            {/* If no tests, Show WelcomeState as a section, else show Showcase */}
                            {/* Always show TestShowcase to display Banner and Recommendations */}
                            {/* TestShowcase removed as per user request */}

                            {/* If no tests, Show WelcomeState as a section for quick start actions */}
                            {/* WelcomeState removed as per user request */}

                            <div className="mt-12">
                                <AnnouncementsBoard />
                            </div>


                        </div>
                    </>
                )}
            </>
        );
    };

    return (
        <div className="min-h-screen bg-white font-sans text-[#1d1d1f] antialiased selection:bg-black selection:text-white overflow-x-hidden">
            <DashboardHeader
                user={user} userData={userData}
                activeTab={activeTab} setActiveTab={setActiveTab}
                onKeyClick={() => setShowKeyModal(true)} 
                onLogoutClick={() => setShowLogoutConfirm(true)}
                onPremiumClick={() => setShowPricingModal(true)}
                onRefreshClick={handleManualRefresh}
                loading={loading}
            />
            <main className="w-full">
                {renderContent()}
            </main>
            <SiteFooter />
            <DashboardModals
                showKeyModal={showKeyModal} setShowKeyModal={setShowKeyModal}
                accessKeyInput={accessKeyInput} setAccessKeyInput={setAccessKeyInput}
                handleVerifyKey={handleVerifyKey} checkingKey={checkingKey} keyError={keyError}
                showStartConfirm={showStartConfirm} setShowStartConfirm={setShowStartConfirm} confirmStartTest={confirmStartTest}
                showLogoutConfirm={showLogoutConfirm} setShowLogoutConfirm={setShowLogoutConfirm} confirmLogout={logout}
                selectedSet={selectedSet} setSelectedSet={setSelectedSet}
                handleStartTest={handleStartTest}
                handleReview={handleReview}
            />
            <PricingModal 
                isOpen={showPricingModal} 
                onClose={() => setShowPricingModal(false)} 
                userName={userData?.fullName?.split(' ')[0]} 
            />
        </div>
    );
}
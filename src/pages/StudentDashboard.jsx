// src/pages/StudentDashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, getCountFromServer } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Headphones, PenTool, Mic, Flame, Trophy, AlertTriangle, ArrowRight, ArrowUp } from "lucide-react";

// COMPONENTS
import DashboardHeader from "../components/dashboard/DashboardHeader";
import QuickAnalytics from '../components/dashboard/QuickAnalytics';
import TestShowcase from '../components/dashboard/TestShowcase';
import AnnouncementsBoard from '../components/dashboard/AnnouncementsBoard';
import HeroSection from "../components/dashboard/HeroSection";
// StatsCards removed as it is integrated into HeroSection now
import PlanetBackground from "../components/dashboard/PlanetBackground";
// FiltersBar and TestGrid moved to Practice.jsx
import DashboardModals from "../components/dashboard/DashboardModals";
import SettingsTab from "../components/dashboard/SettingsTab";
import MyResults from "../pages/MyResults";
import { useAnalytics } from "../hooks/useAnalytics";
import { getRecommendations } from "../utils/recommendations";
import Leaderboard from "../components/dashboard/Leaderboard";

// --- LOGIC HELPERS ---
const safeDate = (dateString) => {
    if (!dateString) return null;
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
};

// Yordamchi: ID lar bo'yicha hujjatlarni olib kelish (Xatolikdan himoyalangan)
const fetchDocumentsByIds = async (collectionName, ids) => {
    if (!ids || ids.length === 0) return {};
    const uniqueIds = [...new Set(ids)];
    const docsMap = {};

    // Har bir ID ni alohida try-catch bilan o'raymiz
    const promises = uniqueIds.map(async (id) => {
        try {
            const cleanId = String(id).trim(); // Bo'sh joylarni tozalash
            if (!cleanId) return null;
            const snap = await getDoc(doc(db, collectionName, cleanId));
            if (snap.exists()) return { id: snap.id, ...snap.data() };
        } catch (e) {
            console.warn(`Hujjat topilmadi: ${id}`, e);
        }
        return null;
    });

    const results = await Promise.all(promises);
    results.forEach(doc => {
        if (doc) docsMap[doc.id] = doc;
    });
    return docsMap;
};

// WelcomeState component removed


export default function StudentDashboard() {
    const { user, logout, userData } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('dashboard');
    const [rawAssignments, setRawAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [mistakesCount, setMistakesCount] = useState(0);
    const [vocabCount, setVocabCount] = useState(0);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [showStartConfirm, setShowStartConfirm] = useState(false);
    const [testToStart, setTestToStart] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [selectedSet, setSelectedSet] = useState(null);
    const [accessKeyInput, setAccessKeyInput] = useState("");
    const [checkingKey, setCheckingKey] = useState(false);
    const [keyError, setKeyError] = useState("");

    // 🔥 ANALYTICS HOOK
    const { stats: analyticsStats } = useAnalytics(user?.uid);

    // 🔥 RECOMMENDATIONS
    const recommendedTests = useMemo(() => {
        // Return top 5 recommended tests from rawAssignments
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
        if (userData && !userData.onboarding?.completed) {
            navigate('/onboarding');
        }
    }, [userData, navigate]);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            setErrorMsg(null);

            try {
                console.log("Firebase'dan yuklash boshlandi...");
                const [userSnap, groupsSnap, resultsSnap] = await Promise.all([
                    getDoc(doc(db, 'users', user.uid)),
                    getDocs(query(collection(db, 'groups'), where('studentIds', 'array-contains', user.uid))),
                    getDocs(query(collection(db, 'results'), where('userId', '==', user.uid)))
                ]);

                const myResults = resultsSnap.docs.map(d => d.data());

                // 🔥 MA'LUMOTLARNI TOZALASH (NORMALIZATION)
                let allAssignments = [];
                const currentUserData = userSnap.data();

                // Helper: String yoki Object bo'lishidan qat'iy nazar to'g'irlash
                const normalizeAssignment = (assign) => {
                    if (!assign) return null;
                    if (typeof assign === 'string') {
                        return { id: assign.trim(), type: 'test' };
                    }
                    if (typeof assign === 'object' && assign.id) {
                        return { ...assign, id: String(assign.id).trim() };
                    }
                    return null;
                };

                if (currentUserData?.assignedTests) {
                    allAssignments = [...allAssignments, ...currentUserData.assignedTests.map(normalizeAssignment)];
                }

                groupsSnap.docs.forEach(gDoc => {
                    const gData = gDoc.data();
                    if (gData.assignedTests) {
                        allAssignments = [...allAssignments, ...gData.assignedTests.map(normalizeAssignment)];
                    }
                });

                // Null qiymatlarni olib tashlash
                allAssignments = allAssignments.filter(Boolean);
                console.log("Jami tayinlovlar (tozalangan):", allAssignments);

                const testIdsToFetch = [];
                const setIdsToFetch = [];

                allAssignments.forEach(assign => {
                    if (assign.type === 'set') { setIdsToFetch.push(assign.id); }
                    else if (assign.id && !assign.id.startsWith('MOCK_')) { testIdsToFetch.push(assign.id); }
                });

                const setsMap = await fetchDocumentsByIds('testSets', setIdsToFetch);
                Object.values(setsMap).forEach(set => {
                    if (set.testIds) {
                        set.testIds.forEach(tid => testIdsToFetch.push(String(tid).trim()));
                    }
                });

                const testsMap = await fetchDocumentsByIds('tests', testIdsToFetch);
                console.log("Bazadan topilgan testlar:", Object.keys(testsMap));

                let processedList = [];

                allAssignments.forEach((assign) => {
                    if (!assign || !assign.id) return;

                    const findBestResult = (testId) => {
                        const attempts = myResults.filter(r => String(r.testId).trim() === String(testId).trim());
                        if (attempts.length === 0) return null;
                        return attempts.sort((a, b) => parseFloat(b.bandScore || b.score || 0) - parseFloat(a.bandScore || a.score || 0))[0];
                    };

                    if (assign.type === 'mock_full' || assign.mockKey || String(assign.id).startsWith('MOCK_')) {
                        const mockAttempts = myResults.filter(r => r.mockKey === assign.mockKey);
                        const bestMockResult = mockAttempts.length > 0
                            ? mockAttempts.sort((a, b) => parseFloat(b.bandScore || 0) - parseFloat(a.bandScore || 0))[0]
                            : null;
                        processedList.push({
                            ...assign,
                            title: assign.title || "Full Mock Exam",
                            isMock: true,
                            status: bestMockResult ? 'completed' : 'open',
                            result: bestMockResult
                        });
                    }
                    else if (assign.type === 'set') {
                        const set = setsMap[assign.id];
                        if (set) {
                            const subTests = (set.testIds || []).map(testId => {
                                const cleanId = String(testId).trim();
                                const testDetail = testsMap[cleanId];
                                if (testDetail) {
                                    const bestResult = findBestResult(cleanId);
                                    return { ...testDetail, status: bestResult ? 'completed' : 'open', result: bestResult };
                                }
                                return null;
                            }).filter(Boolean);

                            const completedCount = subTests.filter(t => t.status === 'completed').length;
                            processedList.push({
                                ...assign, isSet: true, title: set.name || assign.title || "Test Set", subTests,
                                totalTests: subTests.length, completedTests: completedCount,
                                status: completedCount === subTests.length && subTests.length > 0 ? 'completed' : 'open'
                            });
                        }
                    }
                    else {
                        const testDataFromDb = testsMap[assign.id];
                        // 🔥 FIX: Faqat bazada real mavjud testlarni chiqaramiz.
                        if (testDataFromDb) {
                            const finalTestData = {
                                ...testDataFromDb,
                                ...assign,
                                id: assign.id, // ID aniq bo'lishi kerak
                                title: testDataFromDb?.title || assign.title || "IELTS Test",
                                type: testDataFromDb?.type || assign.type || "unknown"
                            };

                            const bestResult = findBestResult(assign.id);
                            const now = new Date();
                            const start = safeDate(assign.startDate);
                            const end = safeDate(assign.endDate);

                            let status = 'open';
                            if (bestResult) status = 'completed';
                            else if (start && now < start) status = 'upcoming';
                            else if (end && now > end) status = 'expired';

                            processedList.push({ ...finalTestData, status, result: bestResult });
                        }
                    }
                });

                // Dublikatlarni olib tashlash (ID bo'yicha)
                const uniqueTests = processedList.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

                console.log("Yakuniy ro'yxat:", uniqueTests.length);
                setRawAssignments(uniqueTests);

            } catch (err) {
                console.error("DEBUG ERROR:", err);
                setErrorMsg("Ma'lumot yuklashda xatolik yuz berdi.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // Gamification ma'lumotlarini yuklash (Mistakes, Vocab)
    useEffect(() => {
        if (!user) return;
        const fetchGamificationData = async () => {
            try {
                // 1. Mistakes Count
                const mistakesRef = collection(db, 'users', user.uid, 'mistakes');
                const mSnap = await getCountFromServer(mistakesRef);
                setMistakesCount(mSnap.data().count);

                // 2. Vocab Count
                const vocabRef = collection(db, 'users', user.uid, 'vocabulary');
                const vSnap = await getCountFromServer(vocabRef);
                setVocabCount(vSnap.data().count);
            } catch (err) {
                console.error("Gamification verilarini olishda xatolik:", err);
            }
        };
        fetchGamificationData();
    }, [user]);

    // --- STATS ---
    const stats = useMemo(() => {
        const total = rawAssignments.length;
        const completed = rawAssignments.filter(t => t.status === 'completed' || (t.isSet && t.completedTests > 0)).length;
        let totalScore = 0, scoreCount = 0;
        rawAssignments.forEach(t => {
            if (t.result?.bandScore) { totalScore += parseFloat(t.result.bandScore); scoreCount++; }
            if (t.isSet) { (t.subTests || []).forEach(sub => { if (sub.result?.bandScore) { totalScore += parseFloat(sub.result.bandScore); scoreCount++; } }); }
        });
        const avg = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : 0;
        return { total, completed, avg };
    }, [rawAssignments]);

    // 🔥 REAL STATISTIKA (useAnalytics dan olinadi)
    const skillStats = useMemo(() => {
        const averages = analyticsStats.skillAverages || { reading: 0, listening: 0, writing: 0, speaking: 0 };
        return [
            { name: "Reading", score: averages.reading || 0, icon: BookOpen, color: "blue" },
            { name: "Listening", score: averages.listening || 0, icon: Headphones, color: "purple" },
            { name: "Writing", score: averages.writing || 0, icon: PenTool, color: "orange" },
            { name: "Speaking", score: averages.speaking || 0, icon: Mic, color: "emerald" }
        ];
    }, [analyticsStats]);

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

    const handleStartTest = (test) => { setTestToStart(test); setShowStartConfirm(true); };

    const confirmStartTest = () => {
        const test = testToStart; setShowStartConfirm(false);
        if (test.type === 'mock_full') { navigate('/mock-exam', { state: { mockData: test } }); return; }
        navigate(`/test/${test.id}`);
    };

    const handleReview = (test) => {
        if (test.type === 'mock_full') { navigate(`/mock-result/${test.mockKey || test.id}`); }
        else { navigate(`/test/${test.id}/review`); }
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
            sessionStorage.removeItem(`dashboard_data_${user.uid}`);
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
        if (activeTab === 'progress') return <div className="text-center py-20 text-gray-400"><h3 className="text-xl font-bold text-gray-700 mb-2">Statistika Tez Orada...</h3></div>;

        if ((activeTab === 'favorites' || activeTab === 'archive') && filteredTests.length === 0 && !loading) {
            return (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10 mx-auto max-w-2xl mt-10">
                    <p className="text-gray-500 font-medium">{activeTab === 'favorites' ? "Sevimlilar ro'yxati bo'sh" : "Arxiv bo'sh"}</p>
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
                            currentBand={userData?.currentBand || parseFloat(stats.avg) || 0}
                            previousBand={userData?.previousIELTSScore || 0}
                            examDate={userData?.examDate}
                            daysRemaining={userData?.examTimeframe ? null : undefined}
                        />

                        <QuickAnalytics stats={skillStats} />

                        {/* GAMIFICATION FEATURES GRID */}
                        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up md:mt-8 mt-6 mb-12" style={{ animationDelay: '0.4s' }}>
                            <style>{`
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

                            {/* Streak Card */}
                            <div className="glass-card p-6 rounded-2xl cursor-pointer group hover:bg-white/5 transition-all duration-300 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-[40px] group-hover:bg-orange-500/20 transition-all"></div>
                                <div className="flex items-center gap-4 mb-3 relative z-10">
                                    <div className={`p-2.5 rounded-xl transition-all ${(userData?.streakCount || 0) > 0 ? 'bg-orange-500/20 text-orange-400 group-hover:bg-orange-500' : 'bg-gray-800 text-gray-500'} group-hover:text-white`}>
                                        <Flame className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-white text-lg">Daily Streak</h4>
                                </div>
                                <div className="flex items-end gap-2 relative z-10">
                                    <span className="text-3xl font-bold tracking-tighter text-white">{userData?.streakCount || 0}</span>
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
                                    <span className="text-3xl font-bold tracking-tighter text-white">{userData?.gamification?.points || 0}</span>
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
                                    <h4 className="font-bold text-white text-lg">WordBank</h4>
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

                        <div className="mt-8">
                            {/* If no tests, Show WelcomeState as a section, else show Showcase */}
                            {/* Always show TestShowcase to display Banner and Recommendations */}
                            <TestShowcase tests={recommendedTests.length > 0 ? recommendedTests : rawAssignments} onStartTest={handleStartTest} />

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
        <div className="min-h-screen bg-[#050505] font-sans text-white selection:bg-orange-500/20">
            <style>{`
                body { 
                    font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif; 
                    background-color: #050505;
                }
            `}</style>
            <DashboardHeader
                user={user} userData={userData}
                activeTab={activeTab} setActiveTab={setActiveTab}
                onKeyClick={() => setShowKeyModal(true)} onLogoutClick={() => setShowLogoutConfirm(true)}
            />
            <PlanetBackground />
            <main className="relative z-10 max-w-7xl mx-auto p-6 md:p-8">
                {renderContent()}
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
            </main>
        </div>
    );
}
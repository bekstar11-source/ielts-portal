import { useState, useEffect, useMemo } from "react";
import { db, functions } from "../../firebase/firebase";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getCountFromServer, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useNavigate } from "react-router-dom";
import { hapticFeedback } from "../../utils/haptic";
import { getRecommendations } from "../../utils/recommendations";

export function useStudentDashboard(user, userData, rawAssignments, userResults, analyticsStats, refresh) {
    const navigate = useNavigate();

    // MODAL STATES
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
    const [publicTestsFallback, setPublicTestsFallback] = useState([]);

    // SKILLS STATE
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

    // RECOMMENDATIONS
    const recommendedTests = useMemo(() => {
        const completedIds = rawAssignments.filter(t => t.status === 'completed').map(t => t.id);
        return getRecommendations(analyticsStats, rawAssignments, completedIds);
    }, [analyticsStats, rawAssignments]);

    // GAMIFICATION DATA FETCH
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

                const [mSnap, vSnap] = await Promise.all([
                    getCountFromServer(collection(db, 'users', user.uid, 'mistakes')),
                    getCountFromServer(collection(db, 'users', user.uid, 'vocabulary'))
                ]);
                const mistakes = mSnap.data().count;
                const vocab = vSnap.data().count;

                setMistakesCount(mistakes);
                setVocabCount(vocab);

                localStorage.setItem(CACHE_KEY, JSON.stringify({ mistakes, vocab }));
                localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
            } catch (err) {
                console.error("Gamification error:", err);
            }
        };
        fetchGamificationData();

        if (rawAssignments.length === 0) {
            const fetchFallback = async () => {
                try {
                    const q = query(collection(db, "tests_metadata"), where("type", "==", "reading"), limit(5));
                    const snap = await getDocs(q);
                    setPublicTestsFallback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                } catch (err) {
                    console.warn("Could not fetch fallback tests in hook due to permissions:", err);
                }
            };
            fetchFallback();
        }
    }, [user, rawAssignments.length]);

    // HANDLERS
    const handleStartTest = (test) => {
        setTestToStart(test);
        setShowStartConfirm(true);
    };

    const confirmStartTest = (incrementUsage) => {
        const test = testToStart;
        if (!test) return;
        
        setShowStartConfirm(false);
        const type = test.type?.toLowerCase() || '';
        const isReading = type.includes('reading') || test.title?.toLowerCase().includes('reading');
        const isListening = type.includes('listening') || test.title?.toLowerCase().includes('listening');
        const limitTarget = isReading ? 'reading' : isListening ? 'listening' : null;

        if (limitTarget && incrementUsage) {
            incrementUsage(limitTarget).catch(err => console.error("Stats update failed:", err));
        }
        
        if (test.type === 'mock_full') { 
            navigate('/mock-exam', { state: { mockData: test } }); 
            return; 
        }
        navigate(`/test/${test.id || test.testId}`);
    };

    const handleVerifyKey = async () => {
        if (!accessKeyInput.trim()) return;
        setCheckingKey(true);
        setKeyError("");
        try {
            const verifyAccessKeyFn = httpsCallable(functions, 'verifyAccessKey');
            const res = await verifyAccessKeyFn({ key: accessKeyInput });

            if (res.data && res.data.success) {
                alert("Test qo'shildi! 🚀");
                sessionStorage.removeItem(`student_assignments_${user.uid}`);
                sessionStorage.removeItem(`student_assignments_time_${user.uid}`);
                
                setShowKeyModal(false); 
                setAccessKeyInput("");
                if (refresh) refresh();
                else window.location.reload();
            } else {
                throw new Error("Kalitni faollashtirishda kutilmagan xatolik yuz berdi.");
            }
        } catch (error) { 
            setKeyError(error.message || "Kalit xato yoki ishlatilgan!"); 
        } finally { 
            setCheckingKey(false); 
        }
    };

    // SKILL STATS LOGIC
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
            { name: "Reading", score: useFallback ? roundToIELTSBand(fallbackValue) : roundToIELTSBand(averages.reading), color: "blue", isActive: activeSkills.Reading },
            { name: "Listening", score: useFallback ? roundToIELTSBand(fallbackValue) : roundToIELTSBand(averages.listening), color: "purple", isActive: activeSkills.Listening },
            { name: "Writing", score: useFallback ? roundToIELTSBand(fallbackValue) : roundToIELTSBand(averages.writing), color: "orange", isActive: activeSkills.Writing },
            { name: "Speaking", score: useFallback ? roundToIELTSBand(fallbackValue) : roundToIELTSBand(averages.speaking), color: "emerald", isActive: activeSkills.Speaking }
        ];
    }, [analyticsStats, userData, activeSkills]);

    const overallBand = useMemo(() => {
        if (analyticsStats.totalTests === 0) return userData?.currentBand || 0;
        let sum = 0, count = 0;
        skillStats.forEach(skill => {
            if (skill.isActive) { sum += parseFloat(skill.score) || 0; count++; }
        });
        if (count === 0) return 0;
        return Math.round((sum / count) * 2) / 2;
    }, [skillStats, analyticsStats.totalTests, userData]);

    return {
        activeTab, setActiveTab,
        searchQuery, setSearchQuery,
        filterType, setFilterType,
        mistakesCount, vocabCount,
        showKeyModal, setShowKeyModal,
        showStartConfirm, setShowStartConfirm,
        showPricingModal, setShowPricingModal,
        showLogoutConfirm, setShowLogoutConfirm,
        selectedSet, setSelectedSet,
        accessKeyInput, setAccessKeyInput,
        checkingKey, keyError,
        publicTestsFallback,
        activeSkills, toggleSkill,
        recommendedTests,
        skillStats, overallBand,
        handleStartTest, confirmStartTest, handleVerifyKey
    };
}

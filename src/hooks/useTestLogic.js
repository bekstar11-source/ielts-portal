import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc, addDoc, collection, query, where, getDocs, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { calculateBandScore, checkAnswer } from "../utils/ieltsScoring";
import { logAction } from "../utils/logger";

export function useTestLogic() {
    const { testId } = useParams();
    const navigate = useNavigate();
    const { user, userData } = useAuth();

    // STATES
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [testMode, setTestMode] = useState(null);
    const [showModeSelection, setShowModeSelection] = useState(true);
    const [userAnswers, setUserAnswers] = useState({});
    const [writingEssay, setWritingEssay] = useState("");
    const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [saving, setSaving] = useState(false);
    const [timeLeft, setTimeLeft] = useState(3600);
    const [textSize, setTextSize] = useState('text-base');
    const [isReviewing, setIsReviewing] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [startedAt] = useState(new Date());

    // Audio States
    const [activePart, setActivePart] = useState(0);
    const [audioTime, setAudioTime] = useState(0);

    // 1. TESTNI YUKLASH
    useEffect(() => {
        if (!testId || !user) return;

        const fetchTest = async () => {
            try {
                // --- PERMISSION CHECK ---
                if (userData?.role !== 'admin') {
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    const currentUserData = userSnap.data();
                    const groupsQuery = query(collection(db, 'groups'), where('studentIds', 'array-contains', user.uid));
                    const groupsSnap = await getDocs(groupsQuery);
                    let rawAssignments = [];
                    if (currentUserData?.assignedTests) rawAssignments = [...rawAssignments, ...currentUserData.assignedTests];
                    groupsSnap.docs.forEach(doc => { const gData = doc.data(); if (gData.assignedTests) rawAssignments = [...rawAssignments, ...gData.assignedTests]; });
                    const allowedIds = rawAssignments.map(item => { if (typeof item === 'string') return item.trim(); if (item && item.id) return String(item.id).trim(); return null; }).filter(Boolean);
                    let hasPermission = allowedIds.includes(String(testId).trim());
                    if (!hasPermission) { const potentialSets = rawAssignments.filter(a => typeof a === 'object' || (typeof a === 'string' && a.startsWith('SET_'))); if (potentialSets.length > 0) hasPermission = true; }
                }

                const docRef = doc(db, "tests", testId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = { id: docSnap.id, ...docSnap.data() };
                    if (data.type) data.type = data.type.toLowerCase(); // 🔥 NORMALIZE TYPE
                    setTest(data);
                    const type = data.type;

                    // Timer logic
                    const savedTime = localStorage.getItem(`timer_${user.uid}_${data.id}`);
                    if (savedTime) {
                        setTimeLeft(parseInt(savedTime));
                    } else {
                        if (type === 'listening') setTimeLeft(2400);
                        else if (type === 'writing') setTimeLeft(3600);
                        else if (type === 'speaking') setTimeLeft(900);
                        else setTimeLeft(3600);
                    }

                    // Draft logic
                    const draftKey = `draft_${user.uid}_${data.id}`;
                    const savedDraft = localStorage.getItem(draftKey);
                    if (type === 'writing' && savedDraft) {
                        try { const parsed = JSON.parse(savedDraft); if (typeof parsed === 'object') setUserAnswers(parsed); else setWritingEssay(savedDraft); } catch { setWritingEssay(savedDraft); }
                    } else if (savedDraft) { try { setUserAnswers(JSON.parse(savedDraft)); } catch (e) { } }

                    // Mode Logic
                    if (type === 'reading' || type === 'listening') {
                        setShowModeSelection(true);
                    } else {
                        setTestMode('exam');
                        setShowModeSelection(false);
                    }
                } else {
                    alert("Test bazadan topilmadi!");
                    navigate("/dashboard");
                }
            } catch (error) { console.error("Xatolik:", error); } finally { setLoading(false); }
        };
        fetchTest();
    }, [testId, navigate, user, userData?.role]);

    // 2. TIMER LOGIC
    useEffect(() => {
        if (showResult || loading || showModeSelection || !test) return;
        if (testMode === 'exam' && timeLeft <= 0) return;

        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                let newVal = testMode === 'practice' ? prev + 1 : prev - 1;
                localStorage.setItem(`timer_${user.uid}_${testId}`, newVal);
                return newVal;
            });
        }, 1000);
        return () => clearInterval(timerId);
    }, [timeLeft, showResult, loading, user.uid, testId, showModeSelection, test, testMode]);

    // 3. AUTO SAVE
    useEffect(() => {
        if (!test || showResult) return;
        const draftKey = `draft_${user.uid}_${test.id}`;
        if (test.type === 'writing') {
            const dataToSave = test.writingTasks ? JSON.stringify(userAnswers) : writingEssay;
            localStorage.setItem(draftKey, dataToSave);
        } else if (test.type === 'reading' || test.type === 'listening') {
            localStorage.setItem(draftKey, JSON.stringify(userAnswers));
        }
        if ((test.type === 'listening' || test.type === 'reading') && testMode) {
            localStorage.setItem(`mode_${user.uid}_${test.id}`, testMode);
        }
    }, [writingEssay, userAnswers, test, user.uid, showResult, testMode]);

    // HANDLERS
    const handleSelectAnswer = (questionId, option) => {
        if (showResult && !isReviewing) return;
        if (isReviewing) return;
        setUserAnswers(prev => {
            if (prev[questionId] === option) return prev;
            return { ...prev, [questionId]: option };
        });
    };

    const toggleFlag = (questionId) => {
        setFlaggedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) newSet.delete(questionId);
            else newSet.add(questionId);
            return newSet;
        });
    };

    const handleToggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => console.error(err));
            setIsFullScreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullScreen(false);
            }
        }
    };

    const handleSubmit = async () => {
        if (!window.confirm("Testni yakunlashga ishonchingiz komilmi?")) return;
        await new Promise(resolve => setTimeout(resolve, 100)); // Small UI delay
        setSaving(true);

        try {
            // 1. Calculate Score
            let correctCount = 0;
            let totalQ = 0;
            let resultData = {
                userId: user.uid,
                userName: userData?.fullName || user.email || 'Unknown User',
                testId: test.id,
                testTitle: test.title || 'Untitled Test',
                type: test.type,
                mode: testMode || 'practice',
                date: new Date().toISOString(),
                startedAt: typeof startedAt === 'object' ? startedAt.toISOString() : new Date().toISOString(),
                userAnswers: userAnswers || {}
            };

            if ((test.type === 'reading' || test.type === 'listening') && test.questions && Array.isArray(test.questions)) {
                test.questions.forEach(q => {
                    if (q.items && Array.isArray(q.items)) {
                        q.items.forEach(item => {
                            totalQ++;
                            if (checkAnswer(item.answer || item.correct_answer, userAnswers[String(item.id)] || userAnswers[item.id])) {
                                correctCount++;
                            }
                        });
                    } else {
                        totalQ++;
                        if (checkAnswer(q.answer || q.correct_answer, userAnswers[String(q.id)] || userAnswers[q.id])) {
                            correctCount++;
                        }
                    }
                });

                const band = calculateBandScore(correctCount, test.type, totalQ);
                resultData.bandScore = band || 0;
                resultData.score = correctCount;
                resultData.totalQuestions = totalQ;
                resultData.percentage = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
                resultData.status = "graded";
            } else {
                resultData.status = "submitted";
                resultData.score = 0;
                resultData.bandScore = 0;
            }

            // 2. Calculate Time Spent
            let timeSpent = 0;
            if (testMode === 'practice') {
                // In practice mode, timeLeft counts UP from 0 or saved time
                timeSpent = timeLeft || 0;
            } else {
                // In exam mode, timeLeft counts DOWN from total duration
                let totalDuration = 3600; // Default
                if (test.type === 'listening') totalDuration = 2400;
                else if (test.type === 'speaking') totalDuration = 900;
                timeSpent = Math.max(0, totalDuration - timeLeft);
            }
            resultData.timeSpent = timeSpent;

            // 3. Sanitize Data (Remove undefined)
            Object.keys(resultData).forEach(key => {
                if (resultData[key] === undefined) delete resultData[key];
            });

            // 4. Save to Firestore
            setScore(correctCount);
            await addDoc(collection(db, "results"), resultData);

            // Log Action
            logAction(user.uid, 'TEST_SUBMIT', {
                testId: test.id,
                title: test.title || 'Untitled',
                score: correctCount,
                band: resultData.bandScore
            });

            // 5. Update User Stats safely
            if (resultData.bandScore > 0) {
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, {
                    "stats.totalTests": increment(1),
                    "stats.totalBandScore": increment(resultData.bandScore),
                    "gamification.points": increment(Math.round(resultData.bandScore * 10)),
                    "lastActiveAt": serverTimestamp()
                }).catch(err => console.warn("Stats update failed (non-critical):", err));
            }

            // 6. Cleanup LocalStorage
            localStorage.removeItem(`draft_${user.uid}_${test.id}`);
            localStorage.removeItem(`timer_${user.uid}_${test.id}`);
            localStorage.removeItem(`mode_${user.uid}_${test.id}`);

            setShowResult(true);
        } catch (error) {
            console.error("Submit Error:", error);
            alert(`Saqlashda xatolik yuz berdi: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return {
        test, loading, testMode, setTestMode, showModeSelection, setShowModeSelection,
        userAnswers, handleSelectAnswer, flaggedQuestions, toggleFlag,
        showResult, score, saving, handleSubmit, timeLeft, setTimeLeft,
        textSize, setTextSize, isReviewing, setIsReviewing, isFullScreen, handleToggleFullScreen,
        activePart, setActivePart, audioTime, setAudioTime, navigate
    };
}
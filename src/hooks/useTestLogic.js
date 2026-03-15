import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, increment, serverTimestamp, writeBatch } from "firebase/firestore";
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
    const [bandScore, setBandScore] = useState(0);
    const [saving, setSaving] = useState(false);
    const [timeLeft, setTimeLeft] = useState(3600);
    const [textSize, setTextSize] = useState('text-base');
    const [isReviewing, setIsReviewing] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [startedAt] = useState(new Date());
    const stateRef = useRef({});

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

                    // ✅ YECHIM 1 & 2: Exam modeda qayta bajarishni bloklash
                    if (userData?.role !== 'admin') {
                        // Max attemptsni assignment lardan topish
                        const setsSnap = await getDocs(collection(db, 'testSets'));
                        const setsMap = {};
                        setsSnap.docs.forEach(d => { setsMap[d.id] = d.data(); });

                        const userRef = doc(db, 'users', user.uid);
                        const userSnap = await getDoc(userRef);
                        const currentUserData = userSnap.data();
                        const groupsQuery = query(collection(db, 'groups'), where('studentIds', 'array-contains', user.uid));
                        const groupsSnap = await getDocs(groupsQuery);
                        let rawAssignments = [];
                        if (currentUserData?.assignedTests) rawAssignments = [...rawAssignments, ...currentUserData.assignedTests];
                        groupsSnap.docs.forEach(d => { const gData = d.data(); if (gData.assignedTests) rawAssignments = [...rawAssignments, ...gData.assignedTests]; });

                        let maxAttempts = 1;
                        let isBlockedByStrict = false;
                        let hasValidAssignment = false;
                        const now = new Date();

                        rawAssignments.forEach(a => {
                            const aid = typeof a === 'string' ? a.trim() : String(a.id).trim();
                            const atype = typeof a === 'string' ? 'test' : (a.type || 'test');
                            const aMax = a.maxAttempts || 1;
                            const isStrict = a.isStrict || false;
                            const end = a.endDate ? new Date(a.endDate) : null;
                            const isExpired = end && now > end;

                            let appliesToThisTest = false;

                            if (aid === String(testId).trim() && atype === 'test') {
                                appliesToThisTest = true;
                            } else if (atype === 'set') {
                                const setSchema = setsMap[aid];
                                appliesToThisTest = setSchema?.testIds?.some(tid => String(tid).trim() === String(testId).trim());
                            }

                            if (appliesToThisTest) {
                                if (aMax > maxAttempts) maxAttempts = aMax;
                                if (isStrict && isExpired) {
                                    isBlockedByStrict = true;
                                } else {
                                    hasValidAssignment = true;
                                }
                            }
                        });

                        if (isBlockedByStrict && !hasValidAssignment) {
                            alert("Ushbu testning muddati tugagan (Strict Mode)!");
                            navigate("/dashboard");
                            return;
                        }

                        // 1) Avval tez LocalStorage tekshiruvi (faqat shu test bo'yicha localStorage da saqlangan sanoqni ko'ramiz)
                        const completedKey = `completed_${user.uid}_${testId}_exam`;
                        const localAttempts = parseInt(localStorage.getItem(completedKey) || '0', 10);
                        if (localAttempts >= maxAttempts) {
                            alert(`Siz bu testni topshirish limitiga yetgansiz (${maxAttempts} marta)!`);
                            navigate("/dashboard");
                            return;
                        }

                        // 2) Keyin Firestore tekshiruvi (to'liq ishonchlilik)
                        const prevSnap = await getDocs(
                            query(
                                collection(db, 'results'),
                                where('userId', '==', user.uid),
                                where('testId', '==', testId)
                            )
                        );
                        if (prevSnap.size >= maxAttempts) {
                            // Firestore da limitga yetildi — localStorage ni ham sinxronlash
                            localStorage.setItem(completedKey, prevSnap.size.toString());
                            alert(`Siz bu testni topshirish limitiga yetgansiz (${maxAttempts} marta)!`);
                            navigate("/dashboard");
                            return;
                        }
                    }

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
                    const savedMode = localStorage.getItem(`mode_${user.uid}_${data.id}`);
                    if (savedMode && (type === 'reading' || type === 'listening')) {
                        setTestMode(savedMode);
                        setShowModeSelection(false);
                    } else if (type === 'reading' || type === 'listening') {
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
                const newVal = testMode === 'practice' ? prev + 1 : prev - 1;
                // ✅ YECHIM 4: Har 1 soniyada bir marta localStorage ga yozish
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

    // ANTI-CHEAT: TAB CLOSE DETECTION
    useEffect(() => {
        stateRef.current = { testMode, showResult, saving, submitFunc: handleSubmit };
    }, [testMode, showResult, saving]); // we don't put handleSubmit in deps to avoid constant updates if it's not memoized, but in React it's recreated. Let's just update the ref on render.

    useEffect(() => {
        stateRef.current.submitFunc = handleSubmit;
    });

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            const { testMode, showResult, saving } = stateRef.current;
            if (testMode && !showResult && !saving) {
                e.preventDefault();
                e.returnValue = "Sahifani yopsangiz, test natijangiz avtomatik yuboriladi!";
                return e.returnValue;
            }
        };

        const handlePageHide = () => {
            const { testMode, showResult, saving, submitFunc } = stateRef.current;
            if (testMode && !showResult && !saving && submitFunc) {
                submitFunc('tab_closed');
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, []);

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

    const handleSubmit = async (violationType = null) => {
        const vType = typeof violationType === 'string' ? violationType : null;
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
            
            if (vType) {
                resultData.violation = vType;
            }

            let mistakes = [];

            if ((test.type === 'reading' || test.type === 'listening') && test.questions && Array.isArray(test.questions)) {
                test.questions.forEach(q => {
                    const scoredIds = new Set(); // bir savol ikki marta hisoblanmasin

                    const scoreItem = (id, correct) => {
                        if (id == null || scoredIds.has(String(id))) return;
                        scoredIds.add(String(id));
                        totalQ++; // id bo'lgan har qanday savol hisoblanadi
                        if (!correct) return; // javob kaliti yo'q — to'g'ri hisoblanmaydi
                        const userResp = userAnswers[String(id)] || userAnswers[id] || "";
                        if (checkAnswer(correct, userResp)) {
                            correctCount++;
                        } else if (userResp) {
                            mistakes.push({
                                questionId: id,
                                testId: test.id,
                                testTitle: test.title || 'Untitled Test',
                                attemptDate: resultData.date,
                                userResponse: userResp,
                                correctAnswer: correct
                            });
                        }
                    };

                    // 1. q.items — flow_chart, matching, map_labeling, table_completion items
                    if (q.items && Array.isArray(q.items) && q.items.length > 0) {
                        q.items.forEach(item => scoreItem(item.id, item.answer || item.correct_answer));
                    }

                    // 2. q.questions — multiple_choice grouped, map_labeling, matching, selection
                    if (q.questions && Array.isArray(q.questions) && q.questions.length > 0) {
                        q.questions.forEach(item => scoreItem(item.id, item.answer || item.correct_answer));
                    }

                    // 3. q.groups — note_completion, gap_fill nested groups
                    if (q.groups && Array.isArray(q.groups) && q.groups.length > 0) {
                        q.groups.forEach(grp => {
                            const grpItems = grp.items || grp.questions || [];
                            grpItems.forEach(item => scoreItem(item.id, item.answer || item.correct_answer));
                        });
                    }

                    // 4. q.rows — table_completion fallback (faqat q.items yo'q bo'lganda)
                    if (q.rows && Array.isArray(q.rows) && q.rows.length > 0 && (!q.items || q.items.length === 0)) {
                        q.rows.forEach(row => {
                            if (row.cells && Array.isArray(row.cells)) {
                                row.cells.forEach(cell => {
                                    if (cell.isMixed && cell.parts && Array.isArray(cell.parts)) {
                                        cell.parts.forEach(part => {
                                            if (part.type === 'input') {
                                                scoreItem(part.id, part.answer || part.correct_answer);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }

                    // 5. Flat question — hech qanday sub-array yo'q
                    if (
                        (!q.items || q.items.length === 0) &&
                        (!q.questions || q.questions.length === 0) &&
                        (!q.groups || q.groups.length === 0) &&
                        (!q.rows || q.rows.length === 0)
                    ) {
                        scoreItem(q.id, q.answer || q.correct_answer);
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
            setBandScore(resultData.bandScore);

            // ✅ YECHIM 3: Faqat natijani batch orqali saqlash (ENG MUHIM)
            const batch = writeBatch(db);
            const resultRef = doc(collection(db, "results"));
            batch.set(resultRef, resultData);
            await batch.commit();

            // ✅ YECHIM 1: Exam yakunlandi — LocalStorage dagi urinishlar sonini oshirish
            if (userData?.role !== 'admin') {
                const completedKey = `completed_${user.uid}_${test.id}_exam`;
                const currCount = parseInt(localStorage.getItem(completedKey) || '0', 10);
                localStorage.setItem(completedKey, (currCount + 1).toString());
            }

            // Log Action
            logAction(user.uid, 'TEST_SUBMIT', {
                testId: test.id,
                title: test.title || 'Untitled',
                score: correctCount,
                band: resultData.bandScore
            });

            // NON-CRITICAL: Mistakes — xato bo'lsa natijaga ta'sir qilmaydi
            if (mistakes.length > 0) {
                try {
                    const mistakeSessionRef = doc(collection(db, "users", user.uid, "mistakeSessions"));
                    await setDoc(mistakeSessionRef, {
                        mistakes,
                        date: resultData.date,
                        testId: test.id,
                        testTitle: test.title || 'Untitled Test'
                    });
                } catch (mErr) {
                    console.warn("Mistakes session log failed (non-critical):", mErr);
                }
            }

            // 4c. User stats va gamification — NON-CRITICAL (xato bo'lsa natija saqlanadi)
            if (resultData.bandScore > 0 || correctCount > 0) {
                try {
                    const userRef = doc(db, "users", user.uid);

                    // GAMIFICATION: Streak Calculation
                    let newStreak = userData?.streakCount || 0;
                    const lastActive = userData?.lastActiveAt?.toDate() || new Date(0);
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);

                    if (
                        lastActive.getFullYear() === yesterday.getFullYear() &&
                        lastActive.getMonth() === yesterday.getMonth() &&
                        lastActive.getDate() === yesterday.getDate()
                    ) {
                        newStreak += 1;
                    } else if (
                        lastActive.getFullYear() !== today.getFullYear() ||
                        lastActive.getMonth() !== today.getMonth() ||
                        lastActive.getDate() !== today.getDate()
                    ) {
                        newStreak = 1;
                    }

                    const gainedXP = Math.round(resultData.bandScore * 10) || (correctCount * 5);

                    await updateDoc(userRef, {
                        "stats.totalTests": increment(1),
                        "stats.totalBandScore": increment(resultData.bandScore),
                        "gamification.points": increment(gainedXP),
                        streakCount: newStreak,
                        "lastActiveAt": serverTimestamp()
                    });
                } catch (statsErr) {
                    console.warn("Stats update failed (non-critical):", statsErr);
                }
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
        showResult, score, bandScore, saving, handleSubmit, timeLeft, setTimeLeft,
        textSize, setTextSize, isReviewing, setIsReviewing, isFullScreen, handleToggleFullScreen,
        activePart, setActivePart, audioTime, setAudioTime, navigate
    };
}
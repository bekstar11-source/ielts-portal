import { useState, useEffect, useRef, useCallback } from "react";
import { db, functions } from "../firebase/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { calculateSectionScore, calculateBandScore, calculateOverallBand } from "../utils/ieltsScoring";
import { syncServerTime, getCurrentServerTime } from "../utils/timeSync";

const STORAGE_KEY = 'ielts_mock_session';

function saveSession(mockId, data) {
    try {
        localStorage.setItem(`${STORAGE_KEY}_${mockId}`, JSON.stringify(data));
    } catch (e) { console.warn('Failed to save mock session:', e); }
}

function loadSession(mockId) {
    try {
        const raw = localStorage.getItem(`${STORAGE_KEY}_${mockId}`);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function clearSession(mockId) {
    try { localStorage.removeItem(`${STORAGE_KEY}_${mockId}`); } catch (e) {}
}

export function getListeningDuration(listeningTest) {
    if (!listeningTest?.passages) return 30 * 60;
    let total = 0;
    for (let i = 0; i < listeningTest.passages.length; i++) {
        const passage = listeningTest.passages[i];
        const partKey = `part${i + 1}`;
        const partMeta = listeningTest.parts?.[partKey];
        const defaultStart = passage.audio ? 0 : (i * 450);
        const defaultEnd = passage.audio ? 0 : ((i + 1) * 450);
        const startTime = (partMeta?.startSec !== undefined && partMeta?.startSec !== null)
            ? Number(partMeta.startSec)
            : (passage.startTime || defaultStart);
        const endTime = (partMeta?.endSec !== undefined && partMeta?.endSec !== null)
            ? Number(partMeta.endSec)
            : (passage.endTime || defaultEnd);
        
        if (endTime && endTime > startTime) {
            total += (endTime - startTime) + (Number(passage.extraSilentTime) || 0);
        } else {
            return 30 * 60;
        }
    }
    return total > 0 ? total : 30 * 60;
}

export function useMockExam(mockData, user, userData, navigate) {
    const [stage, setStage] = useState('loading');
    const [tests, setTests] = useState({ listening: null, reading: null, writing: null });
    const [answers, setAnswers] = useState({ listening: {}, reading: {}, writing: {} });
    const [timeLeft, setTimeLeft] = useState(0);
    const [cheatWarning, setCheatWarning] = useState({ isOpen: false, count: 0, msg: '' });
    const [finalResults, setFinalResults] = useState(null);
    const [completedModules, setCompletedModules] = useState([]);
    const [autoStartDeadline, setAutoStartDeadline] = useState(null);
    const [listeningStartTime, setListeningStartTime] = useState(null);
    const [listeningDuration, setListeningDuration] = useState(0);
    
    const listeningStartTimeRef = useRef(null);
    useEffect(() => {
        listeningStartTimeRef.current = listeningStartTime;
    }, [listeningStartTime]);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    
    // Auto-set deadline for test_ended stage only (intro is managed by MockExamIntro)
    useEffect(() => {
        if (stage === 'test_ended' && !autoStartDeadline) {
            setAutoStartDeadline(Date.now() + 20 * 1000);
        }
    }, [stage, autoStartDeadline]);

    const stageRef = useRef(stage);
    const answersRef = useRef(answers);
    const timeLeftRef = useRef(timeLeft);
    const completedRef = useRef(completedModules);
    const tabSwitchCountRef = useRef(tabSwitchCount);
    const audioTimeRef = useRef(0);
    const activePartRef = useRef(0);
    const mockId = mockData?.mockKey || mockData?.id || 'default';

    // Restored values for audio resume
    const [resumeAudioTime, setResumeAudioTime] = useState(0);
    const [resumeActivePart, setResumeActivePart] = useState(0);

    useEffect(() => { stageRef.current = stage; }, [stage]);
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
    useEffect(() => { completedRef.current = completedModules; }, [completedModules]);
    useEffect(() => { tabSwitchCountRef.current = tabSwitchCount; }, [tabSwitchCount]);

    // ─── Persist state to Firestore and localStorage on stage transitions ───
    useEffect(() => {
        const activeStages = ['listening', 'reading', 'writing', 'listening_volume_check', 'intro', 'test_ended', 'saving', 'result'];
        if (!activeStages.includes(stage) || stage === 'loading' || !user?.uid) return;

        const deadlineVal = ['listening', 'reading', 'writing'].includes(stage) && timeLeft > 0
            ? getCurrentServerTime() + timeLeft * 1000
            : null;

        saveSession(mockId, {
            stage,
            answers,
            timeLeft,
            completedModules,
            tabSwitchCount: tabSwitchCountRef.current,
            audioTime: audioTimeRef.current,
            activePart: activePartRef.current,
            autoStartDeadline,
            deadline: deadlineVal,
            listeningStartTime,
            listeningDuration,
            savedAt: getCurrentServerTime()
        });

        const updateStageFirestore = async () => {
            try {
                const sessionRef = doc(db, "users", user.uid, "mockSessions", mockId);
                const sessionSnap = await getDoc(sessionRef);
                const existingData = sessionSnap.exists() ? sessionSnap.data() : {};

                const updateData = {
                    stage,
                    completedModules,
                    tabSwitchCount: tabSwitchCountRef.current,
                    audioTime: audioTimeRef.current,
                    activePart: activePartRef.current,
                    updatedAt: serverTimestamp()
                };

                if (autoStartDeadline) {
                    updateData.autoStartDeadline = new Date(autoStartDeadline);
                }

                if (stage === 'listening' && !existingData.listeningStartTime) {
                    const now = getCurrentServerTime();
                    updateData.listeningStartTime = serverTimestamp();
                    setListeningStartTime(now);
                } else if (stage === 'reading' && !existingData.readingStartTime) {
                    updateData.readingStartTime = serverTimestamp();
                } else if (stage === 'writing' && !existingData.writingStartTime) {
                    updateData.writingStartTime = serverTimestamp();
                }

                await setDoc(sessionRef, updateData, { merge: true });
            } catch (err) {
                console.warn("Failed to save stage/metadata to Firestore:", err);
            }
        };

        updateStageFirestore();
    }, [stage, completedModules, user?.uid, mockId, autoStartDeadline]);

    // ─── Debounced Save for Answers & time/audio progress to Firestore ───
    useEffect(() => {
        const activeStages = ['listening', 'reading', 'writing', 'listening_volume_check', 'intro', 'test_ended', 'saving', 'result'];
        if (!activeStages.includes(stage) || stage === 'loading' || !user?.uid) return;

        const deadlineVal = ['listening', 'reading', 'writing'].includes(stage) && timeLeft > 0
            ? getCurrentServerTime() + timeLeft * 1000
            : null;

        saveSession(mockId, {
            stage,
            answers,
            timeLeft,
            completedModules,
            tabSwitchCount: tabSwitchCountRef.current,
            audioTime: audioTimeRef.current,
            activePart: activePartRef.current,
            autoStartDeadline,
            deadline: deadlineVal,
            listeningStartTime,
            listeningDuration,
            savedAt: getCurrentServerTime()
        });

        const timeoutId = setTimeout(async () => {
            try {
                const sessionRef = doc(db, "users", user.uid, "mockSessions", mockId);
                await setDoc(sessionRef, {
                    answers,
                    timeLeft,
                    audioTime: audioTimeRef.current,
                    activePart: activePartRef.current,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            } catch (err) {
                console.warn("Failed to sync answers to Firestore:", err);
            }
        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [answers, timeLeft, stage, user?.uid, mockId]);

    // ─── Warn before page unload & Auto-submit logic ───
    useEffect(() => {
        const activeStages = ['listening', 'reading', 'writing', 'listening_volume_check', 'intro'];
        
        const handleBeforeUnload = (e) => {
            if (activeStages.includes(stageRef.current)) {
                const msg = "Ogohlantirish! Agar sahifani yopsangiz yoki yangilasangiz (refresh), imtihon yakunlanadi va urinishingiz kuyadi.";
                e.preventDefault();
                e.returnValue = msg;
                return msg;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // ─── Tab Switch Detection (visibilitychange) ───
    useEffect(() => {
        const activeTestStages = ['listening', 'reading', 'writing', 'listening_volume_check'];
        
        const handleVisibilityChange = () => {
            if (document.hidden && activeTestStages.includes(stageRef.current)) {
                setTabSwitchCount(prev => prev + 1);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Fetch Tests & Restore/Auto-submit Session
    useEffect(() => {
        if (!mockData) return;
        const fetchTests = async () => {
            try {
                let loadedTests = null;
                const isStaff = userData?.role === 'admin' || userData?.role === 'teacher';

                if (isStaff) {
                    const [lSnap, rSnap, wSnap] = await Promise.all([
                        getDoc(doc(db, "tests", mockData.subTests.listening)),
                        getDoc(doc(db, "tests", mockData.subTests.reading)),
                        getDoc(doc(db, "tests", mockData.subTests.writing))
                    ]);
                    loadedTests = {
                        listening: { id: lSnap.id, ...lSnap.data() },
                        reading: { id: rSnap.id, ...rSnap.data() },
                        writing: { id: wSnap.id, ...wSnap.data() }
                    };
                } else {
                    const getSanitizedTestFn = httpsCallable(functions, 'getSanitizedTest');
                    const [lRes, rRes, wRes] = await Promise.all([
                        getSanitizedTestFn({ testId: mockData.subTests.listening }),
                        getSanitizedTestFn({ testId: mockData.subTests.reading }),
                        getSanitizedTestFn({ testId: mockData.subTests.writing })
                    ]);
                    loadedTests = {
                        listening: lRes.data,
                        reading: rRes.data,
                        writing: wRes.data
                    };
                }
                setTests(loadedTests);

                // ─── Sync Server Time ───
                await syncServerTime();
                const currentServerTime = getCurrentServerTime();

                // ─── Restore session from Firestore ───
                let saved = null;
                if (user?.uid) {
                    try {
                        const sessionSnap = await getDoc(doc(db, "users", user.uid, "mockSessions", mockId));
                        if (sessionSnap.exists()) {
                            saved = sessionSnap.data();
                            
                            // Convert firestore timestamps back to ms
                            if (saved.listeningStartTime && typeof saved.listeningStartTime.toDate === 'function') {
                                saved.listeningStartTime = saved.listeningStartTime.toDate().getTime();
                            }
                            if (saved.listeningDuration) {
                                saved.listeningDuration = Number(saved.listeningDuration);
                            }
                            if (saved.readingStartTime && typeof saved.readingStartTime.toDate === 'function') {
                                saved.readingStartTime = saved.readingStartTime.toDate().getTime();
                            }
                            if (saved.writingStartTime && typeof saved.writingStartTime.toDate === 'function') {
                                saved.writingStartTime = saved.writingStartTime.toDate().getTime();
                            }
                            if (saved.autoStartDeadline && typeof saved.autoStartDeadline.toDate === 'function') {
                                saved.autoStartDeadline = saved.autoStartDeadline.toDate().getTime();
                            }
                            if (saved.updatedAt && typeof saved.updatedAt.toDate === 'function') {
                                saved.updatedAt = saved.updatedAt.toDate().getTime();
                            }
                        }
                    } catch (fsErr) {
                        console.warn("Failed to load mock session from Firestore, checking localStorage:", fsErr);
                    }
                }

                // Fallback to local storage if no server session
                if (!saved) {
                    saved = loadSession(mockId);
                }

                if (saved && saved.stage && saved.stage !== 'loading') {
                    // Restore answers, modules, and cheat counts
                    setAnswers(saved.answers || { listening: {}, reading: {}, writing: {} });
                    setCompletedModules(saved.completedModules || []);
                    setTabSwitchCount(saved.tabSwitchCount || 0);
                    setAutoStartDeadline(saved.autoStartDeadline || null);
                    
                    // Audio resume state
                    if (saved.audioTime) setResumeAudioTime(saved.audioTime);
                    if (saved.activePart) setResumeActivePart(saved.activePart);
                    if (saved.listeningStartTime) setListeningStartTime(saved.listeningStartTime);
                    if (saved.listeningDuration) setListeningDuration(saved.listeningDuration);

                    let currentStage = saved.stage;
                    let calculatedTimeLeft = 0;

                    // Calculate remaining time based on start times saved on the server
                    if (currentStage === 'listening') {
                        const startTime = saved.listeningStartTime || currentServerTime;
                        const elapsed = Math.floor((currentServerTime - startTime) / 1000);
                        const duration = saved.listeningDuration || getListeningDuration(loadedTests.listening);
                        calculatedTimeLeft = Math.max(0, duration - elapsed);
                    } else if (currentStage === 'reading') {
                        const startTime = saved.readingStartTime || currentServerTime;
                        const elapsed = Math.floor((currentServerTime - startTime) / 1000);
                        calculatedTimeLeft = Math.max(0, 60 * 60 - elapsed);
                    } else if (currentStage === 'writing') {
                        const startTime = saved.writingStartTime || currentServerTime;
                        const elapsed = Math.floor((currentServerTime - startTime) / 1000);
                        calculatedTimeLeft = Math.max(0, 60 * 60 - elapsed);
                    } else if (saved.deadline) {
                        calculatedTimeLeft = Math.max(0, Math.floor((saved.deadline - currentServerTime) / 1000));
                    } else if (saved.timeLeft) {
                        calculatedTimeLeft = saved.timeLeft;
                    }

                    setTimeLeft(calculatedTimeLeft);

                    // Auto-advance if remaining time <= 0
                    if (['listening', 'reading', 'writing'].includes(currentStage) && calculatedTimeLeft <= 0) {
                        const nextCompleted = [...new Set([...(saved.completedModules || []), currentStage])];
                        setCompletedModules(nextCompleted);
                        currentStage = 'test_ended';
                    }

                    // Finally set the stage to resume the test
                    if (stageRef.current === 'loading') {
                        setStage(currentStage);
                    }
                } else {
                    if (stageRef.current === 'loading') {
                        setStage('intro');
                    }
                }
            } catch (err) {
                console.error(err);
                navigate('/mock');
            }
        };
        fetchTests();
    }, [mockData]);

    // Global Timer
    useEffect(() => {
        const activeStages = ['listening', 'reading', 'writing'];
        if (timeLeft <= 0 || !activeStages.includes(stage)) return;
        
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleNextStage();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, stage]);

    const handleNextStage = () => {
        const currentStage = stageRef.current;
        if (currentStage === 'listening_volume_check') {
            setStage('listening');
            const duration = getListeningDuration(tests.listening);
            setTimeLeft(duration);
            setListeningDuration(duration);
            const now = getCurrentServerTime();
            setListeningStartTime(now);
            if (user?.uid && mockId) {
                const sessionRef = doc(db, "users", user.uid, "mockSessions", mockId);
                setDoc(sessionRef, {
                    listeningStartTime: serverTimestamp(),
                    listeningDuration: duration,
                    updatedAt: serverTimestamp()
                }, { merge: true }).catch(err => console.warn(err));
            }
        }
        else if (currentStage === 'listening') {
            setCompletedModules(prev => [...new Set([...prev, 'listening'])]);
            setStage('test_ended');
        }
        else if (currentStage === 'reading_intro') { 
            setStage('reading'); 
            setTimeLeft(3600); 
        }
        else if (currentStage === 'reading') {
            setCompletedModules(prev => [...new Set([...prev, 'reading'])]);
            setStage('test_ended');
        }
        else if (currentStage === 'writing_intro') { 
            setStage('writing'); 
            setTimeLeft(3600); 
        }
        else if (currentStage === 'writing') {
            setCompletedModules(prev => [...new Set([...prev, 'writing'])]);
            setStage('test_ended');
        }
    };

    const handleAnswer = (qId, val) => {
        setAnswers(prev => ({
            ...prev,
            [stageRef.current]: { ...prev[stageRef.current], [qId]: val }
        }));
    };

    const finishExam = async (forcedAnswers, forcedTests, forcedCompleted) => {
        if (stageRef.current === 'saving' || stageRef.current === 'result') return;
        
        setStage('saving');
        stageRef.current = 'saving'; 

        try {
            const currentAnswers = forcedAnswers || answersRef.current;
            
            const submitMockExamFn = httpsCallable(functions, 'submitMockExam');
            const res = await submitMockExamFn({
                mockKey: mockData.mockKey,
                mockData: mockData,
                answers: currentAnswers
            });

            if (res.data && res.data.success) {
                setFinalResults({
                    listening: { 
                        correct: res.data.scores.listening, 
                        total: 40, 
                        band: res.data.scores.listeningBand 
                    },
                    reading: { 
                        correct: res.data.scores.reading, 
                        total: 40, 
                        band: res.data.scores.readingBand 
                    }
                });
            } else {
                throw new Error("Imtihon topshirishda backend xatoligi yuz berdi.");
            }

        } catch (err) {
            console.error('CRITICAL: finishExam failed:', err);
            alert("Natijalarni saqlashda xatolik yuz berdi. Iltimos administratorga murojaat qiling.");
        } finally {
            setStage('result');
        }
    };

    const clearExamSession = useCallback(async () => {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('ielts_mock_session_') || 
                    key.startsWith('ielts_writing_session_') || 
                    key.startsWith('ielts_reading_session_') || 
                    key === 'ielts_mock_active_data') {
                    localStorage.removeItem(key);
                }
            });

            if (user?.uid && mockId) {
                await deleteDoc(doc(db, "users", user.uid, "mockSessions", mockId));
            }
        } catch(e) {
            console.warn("Failed to delete Firestore mock session:", e);
        }
    }, [user?.uid, mockId]);

    // Callback for parent to report audioTime and activePart
    const updateAudioProgress = useCallback((time, part) => {
        audioTimeRef.current = time;
        if (part !== undefined) activePartRef.current = part;
    }, []);

    const updateListeningDuration = useCallback(async (duration) => {
        if (stageRef.current !== 'listening') return;

        setListeningDuration(duration);

        // Adjust timeLeft based on elapsed time since listeningStartTime
        const startTime = listeningStartTimeRef.current || getCurrentServerTime();
        const elapsed = Math.floor((getCurrentServerTime() - startTime) / 1000);
        const newTimeLeft = Math.max(0, duration - elapsed);
        setTimeLeft(newTimeLeft);

        if (user?.uid && mockId) {
            try {
                const sessionRef = doc(db, "users", user.uid, "mockSessions", mockId);
                await setDoc(sessionRef, {
                    listeningDuration: duration,
                    timeLeft: newTimeLeft,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            } catch (e) {
                console.warn("Failed to sync listeningDuration to Firestore:", e);
            }
        }
    }, [mockId, user?.uid]);

    return {
        stage, setStage, tests, answers, handleAnswer, 
        timeLeft, setTimeLeft, handleNextStage, finishExam,
        cheatWarning, setCheatWarning, finalResults,
        completedModules, autoStartDeadline, setAutoStartDeadline,
        resumeAudioTime, resumeActivePart, updateAudioProgress,
        tabSwitchCount,
        mockId,
        clearExamSession,
        updateListeningDuration
    };
}

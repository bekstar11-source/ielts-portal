import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc } from "firebase/firestore";
import { calculateSectionScore, calculateBandScore, calculateOverallBand } from "../utils/ieltsScoring";

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

export function useMockExam(mockData, user, userData, navigate) {
    const [stage, setStage] = useState('loading');
    const [tests, setTests] = useState({ listening: null, reading: null, writing: null });
    const [answers, setAnswers] = useState({ listening: {}, reading: {}, writing: {} });
    const [timeLeft, setTimeLeft] = useState(0);
    const [cheatWarning, setCheatWarning] = useState({ isOpen: false, count: 0, msg: '' });
    const [finalResults, setFinalResults] = useState(null);
    const [completedModules, setCompletedModules] = useState([]);
    const [autoStartDeadline, setAutoStartDeadline] = useState(null);
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

    // ─── Persist state to localStorage on every meaningful change ───
    useEffect(() => {
        const activeStages = ['listening', 'reading', 'writing', 'listening_volume_check', 'intro', 'test_ended', 'saving', 'result'];
        if (!activeStages.includes(stage) || stage === 'loading') return;

        saveSession(mockId, {
            stage,
            answers,
            timeLeft,
            completedModules,
            tabSwitchCount: tabSwitchCountRef.current,
            audioTime: audioTimeRef.current,
            activePart: activePartRef.current,
            autoStartDeadline,
            // Store the deadline so we can calculate remaining time after refresh
            deadline: ['listening', 'reading', 'writing'].includes(stage) && timeLeft > 0
                ? Date.now() + timeLeft * 1000
                : null,
            savedAt: Date.now()
        });
    }, [stage, answers, timeLeft, completedModules, mockId, autoStartDeadline, tabSwitchCount]);

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
                const [lSnap, rSnap, wSnap] = await Promise.all([
                    getDoc(doc(db, "tests", mockData.subTests.listening)),
                    getDoc(doc(db, "tests", mockData.subTests.reading)),
                    getDoc(doc(db, "tests", mockData.subTests.writing))
                ]);
                
                const loadedTests = {
                    listening: { id: lSnap.id, ...lSnap.data() },
                    reading: { id: rSnap.id, ...rSnap.data() },
                    writing: { id: wSnap.id, ...wSnap.data() }
                };
                setTests(loadedTests);

                // ─── Restore session if available ───
                const saved = loadSession(mockId);
                const activeStages = ['listening', 'reading', 'writing', 'listening_volume_check'];

                if (saved && saved.stage && saved.stage !== 'loading') {
                    // Restore answers, modules, and cheat counts
                    setAnswers(saved.answers || { listening: {}, reading: {}, writing: {} });
                    setCompletedModules(saved.completedModules || []);
                    setTabSwitchCount(saved.tabSwitchCount || 0);
                    setAutoStartDeadline(saved.autoStartDeadline || null);
                    
                    // Audio resume state
                    if (saved.audioTime) setResumeAudioTime(saved.audioTime);
                    if (saved.activePart) setResumeActivePart(saved.activePart);

                    // Calculate remaining time based on the deadline stored before refresh
                    if (saved.deadline) {
                        const remaining = Math.max(0, Math.floor((saved.deadline - Date.now()) / 1000));
                        setTimeLeft(remaining);
                    } else if (saved.timeLeft) {
                        setTimeLeft(saved.timeLeft);
                    }

                    // Finally set the stage to resume the test
                    if (stageRef.current === 'loading') {
                        setStage(saved.stage);
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
            setTimeLeft(30 * 60);
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
        stageRef.current = 'saving'; // Immediate update for the guard

        try {
            const currentAnswers = forcedAnswers || answersRef.current;
            const currentTests = forcedTests || tests;
            
            const lResults = calculateSectionScore(currentTests.listening, currentAnswers.listening);
            const rResults = calculateSectionScore(currentTests.reading, currentAnswers.reading);
            const lBand = calculateBandScore(lResults.correct, 'listening', lResults.total) || 0;
            const rBand = calculateBandScore(rResults.correct, 'reading', rResults.total) || 0;

            setFinalResults({
                listening: { ...lResults, band: lBand },
                reading: { ...rResults, band: rBand }
            });

            const interimOverall = calculateOverallBand([lBand, rBand].filter(b => b > 0));

            const resRef = await addDoc(collection(db, "results"), {
                userId: user.uid,
                userName: userData?.fullName || "User",
                testTitle: "FULL MOCK EXAM",
                type: "mock_full",
                mockKey: mockData.mockKey,
                subTests: mockData.subTests, 
                date: new Date().toISOString(),
                createdAt: serverTimestamp(),
                scores: { 
                    listening: lResults.correct, 
                    reading: rResults.correct, 
                    listeningBand: lBand, 
                    readingBand: rBand,
                    overallBand: interimOverall
                },
                bandScore: interimOverall,
                overallBand: interimOverall,
                details: { listeningAnswers: currentAnswers.listening, readingAnswers: currentAnswers.reading, writingAnswers: currentAnswers.writing },
                status: 'pending_review'
            });

            // Update user's mockTests status
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const mocks = userSnap.data().mockTests || [];
                const updated = mocks.map(m => {
                    if (m.id === mockData.id || m.mockKey === mockData.mockKey) {
                        return { ...m, status: 'completed', resultId: resRef.id };
                    }
                    return m;
                });
                await updateDoc(userRef, { mockTests: updated });
            }
        } catch (err) {
            console.error('finishExam error:', err);
        } finally {
            setStage('result');
        }
    };

    const clearExamSession = useCallback(() => {
        clearSession(mockId);
        try { localStorage.removeItem('ielts_mock_active_data'); } catch(e) {}
    }, [mockId]);

    // Callback for parent to report audioTime and activePart
    const updateAudioProgress = useCallback((time, part) => {
        audioTimeRef.current = time;
        if (part !== undefined) activePartRef.current = part;
    }, []);

    return {
        stage, setStage, tests, answers, handleAnswer, 
        timeLeft, setTimeLeft, handleNextStage, finishExam,
        cheatWarning, setCheatWarning, finalResults,
        completedModules, autoStartDeadline, setAutoStartDeadline,
        resumeAudioTime, resumeActivePart, updateAudioProgress,
        tabSwitchCount,
        mockId,
        clearExamSession
    };
}

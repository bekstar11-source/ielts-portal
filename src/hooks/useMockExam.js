import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { calculateSectionScore, calculateBandScore } from "../utils/ieltsScoring";

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
    
    // Auto-set deadline for intro (3m) and test_ended (1m)
    useEffect(() => {
        if (stage === 'intro' && !autoStartDeadline && !finalResults) {
            setAutoStartDeadline(Date.now() + 180 * 1000);
        } else if (stage === 'test_ended' && !autoStartDeadline) {
            setAutoStartDeadline(Date.now() + 60 * 1000);
        }
    }, [stage, autoStartDeadline, finalResults]);

    const stageRef = useRef(stage);
    const answersRef = useRef(answers);
    const timeLeftRef = useRef(timeLeft);
    const completedRef = useRef(completedModules);
    const audioTimeRef = useRef(0);
    const activePartRef = useRef(0);
    const mockId = mockData?.id || mockData?.mockKey || 'default';

    // Restored values for audio resume
    const [resumeAudioTime, setResumeAudioTime] = useState(0);
    const [resumeActivePart, setResumeActivePart] = useState(0);

    useEffect(() => { stageRef.current = stage; }, [stage]);
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
    useEffect(() => { completedRef.current = completedModules; }, [completedModules]);

    // ─── Persist state to localStorage on every meaningful change ───
    useEffect(() => {
        const activeStages = ['listening', 'reading', 'writing', 'listening_volume_check', 'intro', 'test_ended', 'reading_intro', 'writing_intro'];
        if (!activeStages.includes(stage) || stage === 'loading') return;

        saveSession(mockId, {
            stage,
            answers,
            timeLeft,
            completedModules,
            mockData, // Store mockData so it survives refresh if location.state is lost
            audioTime: audioTimeRef.current,
            activePart: activePartRef.current,
            autoStartDeadline,
            deadline: ['listening', 'reading', 'writing'].includes(stage) && timeLeft > 0
                ? Date.now() + timeLeft * 1000
                : null,
            savedAt: Date.now()
        });
    }, [stage, answers, timeLeft, completedModules, mockId, autoStartDeadline, mockData]);

    // ─── Warn before page unload & Auto-submit logic ───
    useEffect(() => {
        const activeStages = ['listening', 'reading', 'writing', 'listening_volume_check'];
        
        const handleBeforeUnload = (e) => {
            if (activeStages.includes(stageRef.current)) {
                const msg = "Ogohlantirish! Agar sahifani yopsangiz, imtihon yakunlanadi, natijangiz saqlanadi va urinish kodingiz (key) kuydi deb hisoblanadi.";
                e.preventDefault();
                e.returnValue = msg;
                return msg;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // Fetch Tests & Restore/Auto-submit Session
    useEffect(() => {
        const fetchTests = async () => {
            try {
                // Try to recover mockData from localStorage if state was lost on refresh
                let effectiveMockData = mockData;
                if (!effectiveMockData) {
                    const saved = loadSession('default'); // Try default first, or we need a better way to find the last session
                    // Note: This 'default' fallback is a bit weak, but without URL params it's the best we can do.
                    // Better: find any key starting with STORAGE_KEY
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key?.startsWith(STORAGE_KEY)) {
                            const data = JSON.parse(localStorage.getItem(key));
                            if (data?.mockData) {
                                effectiveMockData = data.mockData;
                                break;
                            }
                        }
                    }
                }

                if (!effectiveMockData) {
                    console.warn("No mock data found in state or storage.");
                    navigate('/');
                    return;
                }

                const [lSnap, rSnap, wSnap] = await Promise.all([
                    getDoc(doc(db, "tests", effectiveMockData.subTests.listening)),
                    getDoc(doc(db, "tests", effectiveMockData.subTests.reading)),
                    getDoc(doc(db, "tests", effectiveMockData.subTests.writing))
                ]);
                
                const loadedTests = {
                    listening: { id: lSnap.id, ...lSnap.data() },
                    reading: { id: rSnap.id, ...rSnap.data() },
                    writing: { id: wSnap.id, ...wSnap.data() }
                };
                setTests(loadedTests);

                // ─── Restore session if available ───
                const currentMockId = effectiveMockData.id || effectiveMockData.mockKey || 'default';
                const saved = loadSession(currentMockId);
                const activeStages = ['listening', 'reading', 'writing', 'listening_volume_check'];

                if (saved && saved.stage && saved.stage !== 'loading') {
                    // Check if it's an abandoned active session
                    if (activeStages.includes(saved.stage)) {
                        console.log("Abandoned session detected. Auto-submitting...");
                        setAnswers(saved.answers || { listening: {}, reading: {}, writing: {} });
                        setCompletedModules(saved.completedModules || []);
                        
                        setTimeout(() => {
                            finishExam(saved.answers, loadedTests, saved.completedModules);
                        }, 500);
                        return;
                    }

                    // Otherwise, just restore non-active stages
                    setAnswers(saved.answers || { listening: {}, reading: {}, writing: {} });
                    setCompletedModules(saved.completedModules || []);
                    setAutoStartDeadline(saved.autoStartDeadline || null);
                    setStage(saved.stage);
                } else {
                    setStage('intro');
                }
            } catch (err) {
                console.error(err);
                navigate('/');
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
        setStage('saving');
        const currentAnswers = forcedAnswers || answersRef.current;
        const currentTests = forcedTests || tests;
        
        const lResults = calculateSectionScore(currentTests.listening, currentAnswers.listening);
        const rResults = calculateSectionScore(currentTests.reading, currentAnswers.reading);
        const lBand = calculateBandScore(lResults.correct, 'listening', lResults.total);
        const rBand = calculateBandScore(rResults.correct, 'reading', rResults.total);

        setFinalResults({
            listening: { ...lResults, band: lBand },
            reading: { ...rResults, band: rBand }
        });

        const resRef = await addDoc(collection(db, "results"), {
            userId: user.uid,
            userName: userData?.fullName || "User",
            testTitle: "FULL MOCK EXAM",
            type: "mock_full",
            mockKey: mockData.mockKey,
            subTests: mockData.subTests, 
            date: new Date().toISOString(),
            createdAt: serverTimestamp(),
            scores: { listening: lResults.correct, reading: rResults.correct, listeningBand: lBand, readingBand: rBand },
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
            const { updateDoc } = await import("firebase/firestore");
            await updateDoc(userRef, { mockTests: updated });
        }

        // Clear saved session after successful submission
        clearSession(mockId);
        setStage('result');
    };

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
        resumeAudioTime, resumeActivePart, updateAudioProgress
    };
}

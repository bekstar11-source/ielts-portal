import { useState, useEffect, useRef } from "react";
import { db } from "../firebase/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { calculateSectionScore, calculateBandScore } from "../utils/ieltsScoring";

export function useMockExam(mockData, user, userData, navigate) {
    const [stage, setStage] = useState('loading');
    const [tests, setTests] = useState({ listening: null, reading: null, writing: null });
    const [answers, setAnswers] = useState({ listening: {}, reading: {}, writing: {} });
    const [timeLeft, setTimeLeft] = useState(0);
    const [cheatWarning, setCheatWarning] = useState({ isOpen: false, count: 0, msg: '' });
    const [finalResults, setFinalResults] = useState(null);

    const stageRef = useRef(stage);
    const answersRef = useRef(answers);

    useEffect(() => { stageRef.current = stage; }, [stage]);
    useEffect(() => { answersRef.current = answers; }, [answers]);

    // Fetch Tests
    useEffect(() => {
        if (!mockData) return;
        const fetchTests = async () => {
            try {
                const [lSnap, rSnap, wSnap] = await Promise.all([
                    getDoc(doc(db, "tests", mockData.subTests.listening)),
                    getDoc(doc(db, "tests", mockData.subTests.reading)),
                    getDoc(doc(db, "tests", mockData.subTests.writing))
                ]);
                setTests({
                    listening: { id: lSnap.id, ...lSnap.data() },
                    reading: { id: rSnap.id, ...rSnap.data() },
                    writing: { id: wSnap.id, ...wSnap.data() }
                });
                setStage('intro');
            } catch (err) {
                console.error(err);
                navigate('/');
            }
        };
        fetchTests();
    }, [mockData]);

    // Global Timer
    useEffect(() => {
        if (timeLeft <= 0) return;
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
    }, [timeLeft]);

    const handleNextStage = () => {
        const currentStage = stageRef.current;
        if (currentStage === 'listening') setStage('reading_intro');
        else if (currentStage === 'reading_intro') { setStage('reading'); setTimeLeft(3600); }
        else if (currentStage === 'reading') setStage('writing_intro');
        else if (currentStage === 'writing_intro') { setStage('writing'); setTimeLeft(3600); }
        else if (currentStage === 'writing') finishExam();
    };

    const handleAnswer = (qId, val) => {
        setAnswers(prev => ({
            ...prev,
            [stageRef.current]: { ...prev[stageRef.current], [qId]: val }
        }));
    };

    const finishExam = async () => {
        setStage('saving');
        const currentAnswers = answersRef.current;
        
        const lResults = calculateSectionScore(tests.listening, currentAnswers.listening);
        const rResults = calculateSectionScore(tests.reading, currentAnswers.reading);
        const lBand = calculateBandScore(lResults.correct, 'listening', lResults.total);
        const rBand = calculateBandScore(rResults.correct, 'reading', rResults.total);

        setFinalResults({
            listening: { ...lResults, band: lBand },
            reading: { ...rResults, band: rBand }
        });

        await addDoc(collection(db, "results"), {
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

        setStage('result');
    };

    return {
        stage, setStage, tests, answers, handleAnswer, 
        timeLeft, setTimeLeft, handleNextStage, finishExam,
        cheatWarning, setCheatWarning, finalResults
    };
}

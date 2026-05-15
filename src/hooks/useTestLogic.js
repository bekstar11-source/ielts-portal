import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Modular Hooks
import { useTestFetch } from "./test/useTestFetch";
import { useTestTimer } from "./test/useTestTimer";
import { useTestAnswers } from "./test/useTestAnswers";
import { useTestScoring } from "./test/useTestScoring";
import { useTestSubmission } from "./test/useTestSubmission";
import { useGamification } from "./useGamification";

export function useTestLogic() {
    const { testId } = useParams();
    const navigate = useNavigate();
    const { user, userData } = useAuth();
    const stateRef = useRef({});
    const { awardXP } = useGamification();

    // UI & Navigation States
    const [testMode, setTestMode] = useState(null);
    const [showModeSelection, setShowModeSelection] = useState(true);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [bandScore, setBandScore] = useState(0);
    const [textSize, setTextSize] = useState('text-base');
    const [isReviewing, setIsReviewing] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [startedAt] = useState(new Date());

    // Audio States
    const [activePart, setActivePart] = useState(0);
    const [audioTime, setAudioTime] = useState(0);

    // Modularized Logic
    const { test, loading } = useTestFetch(testId, user, userData, navigate);
    const { userAnswers, setUserAnswers, writingEssay, setWritingEssay, flaggedQuestions, handleSelectAnswer, toggleFlag } = useTestAnswers();
    const initialDuration = useMemo(() => {
        if (test?.duration) return Number(test.duration) * 60;
        
        const type = test?.type?.toLowerCase();
        const difficulty = test?.difficulty?.toLowerCase() || '';
        
        // Reading defaults
        if (type === 'reading') {
            // If difficulty is easy/medium/hard it's usually a single passage (20 mins)
            if (['easy', 'medium', 'hard'].includes(difficulty)) return 20 * 60;
            // Full reading tests usually have 3 passages
            if (test.passages?.length === 1) return 20 * 60;
            return 60 * 60;
        }
        
        // Listening defaults
        if (type === 'listening') {
            // Single parts are ~10 mins
            if (difficulty.includes('part')) return 10 * 60;
            return 30 * 60;
        }

        return 60 * 60;
    }, [test]);

    const { timeLeft, setTimeLeft } = useTestTimer(testId, user?.uid, testMode, initialDuration, !!test && !showModeSelection && !showResult);
    const { calculateScore } = useTestScoring();
    const { saving, submitTest } = useTestSubmission(user, userData);

    // Initialize Mode & Settings
    useEffect(() => {
        if (!test) return;
        const type = test.type?.toLowerCase();
        const draftKey = `draft_${user.uid}_${test.id}`;
        const savedDraft = localStorage.getItem(draftKey);
        const savedMode = localStorage.getItem(`mode_${user.uid}_${test.id}`);

        if (savedDraft) {
            try { setUserAnswers(JSON.parse(savedDraft)); } catch { setWritingEssay(savedDraft); }
        }

        if (['reading', 'listening', 'writing'].includes(type)) {
            if (savedMode && savedDraft) {
                setTestMode(savedMode);
                setShowModeSelection(false);
            }
        } else {
            setTestMode('exam');
            setShowModeSelection(false);
        }
    }, [test]);

    // Auto Save
    useEffect(() => {
        if (!test || showResult) return;
        const draftKey = `draft_${user.uid}_${test.id}`;
        localStorage.setItem(draftKey, JSON.stringify(userAnswers));
        if (testMode) localStorage.setItem(`mode_${user.uid}_${test.id}`, testMode);
    }, [userAnswers, test, testMode, showResult]);

    // Anti-Cheat
    useEffect(() => {
        stateRef.current = { testMode, showResult, saving, handleSubmit };
    });

    const handleSubmit = async (violationType = null) => {
        if (!test) return;
        const { correctCount, totalQ, band, mistakes } = calculateScore(test, userAnswers);
        
        const totalTime = initialDuration;
        const timeSpent = testMode === 'practice' ? timeLeft : Math.max(0, totalTime - timeLeft);
        const resultData = {
            testId: test.id,
            testTitle: test.title,
            type: test.type,
            mode: testMode,
            date: new Date().toISOString(),
            score: correctCount,
            bandScore: band,
            totalQuestions: totalQ,
            violation: typeof violationType === 'string' ? violationType : null,
            timeSpent,
            userAnswers
        };

        const success = await submitTest(test, resultData, mistakes);
        if (success) {
            const xpAmount = Math.max(10, Math.round(band * 10));
            await awardXP('test', test.id, test.title, xpAmount);
            setScore(correctCount);
            setBandScore(band);
            setShowResult(true);
            localStorage.removeItem(`draft_${user.uid}_${test.id}`);
            sessionStorage.removeItem(`timer_${user.uid}_${test.id}`);
            // Note: We don't remove reading highlights here so they are available in Review mode.
            // They will be cleared if the user explicitly restarts the test.
        }
    };

    const handleToggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullScreen(true);
        } else {
            document.exitFullscreen();
            setIsFullScreen(false);
        }
    };

    return {
        test, loading, testMode, setTestMode, showModeSelection, setShowModeSelection,
        userAnswers, handleSelectAnswer, flaggedQuestions, toggleFlag,
        showResult, score, bandScore, saving, handleSubmit, timeLeft, setTimeLeft,
        textSize, setTextSize, isReviewing, setIsReviewing, isFullScreen, handleToggleFullScreen,
        activePart, setActivePart, audioTime, setAudioTime, navigate,
        initialDuration
    };
}
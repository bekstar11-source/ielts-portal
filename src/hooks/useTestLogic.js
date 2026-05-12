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
    const { timeLeft, setTimeLeft } = useTestTimer(testId, user?.uid, testMode, 3600, !!test && !showModeSelection && !showResult);
    const { calculateScore } = useTestScoring();
    const { saving, submitTest } = useTestSubmission(user, userData);

    // Initialize Mode & Settings
    useEffect(() => {
        if (!test) return;
        const type = test.type?.toLowerCase();
        const draftKey = `draft_${user.uid}_${test.id}`;
        const savedDraft = sessionStorage.getItem(draftKey);
        const savedMode = sessionStorage.getItem(`mode_${user.uid}_${test.id}`);

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
        sessionStorage.setItem(draftKey, JSON.stringify(userAnswers));
        if (testMode) sessionStorage.setItem(`mode_${user.uid}_${test.id}`, testMode);
    }, [userAnswers, test, testMode, showResult]);

    // Anti-Cheat
    useEffect(() => {
        stateRef.current = { testMode, showResult, saving, handleSubmit };
    });

    const handleSubmit = async (violationType = null) => {
        if (!test) return;
        const { correctCount, totalQ, band, mistakes } = calculateScore(test, userAnswers);
        
        const totalTime = (test.duration || 60) * 60;
        const timeSpent = totalTime - timeLeft;
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
            sessionStorage.removeItem(`draft_${user.uid}_${test.id}`);
            sessionStorage.removeItem(`timer_${user.uid}_${test.id}`);
            sessionStorage.removeItem(`ielts_reading_session_${test.id}`);
            sessionStorage.removeItem(`ielts_listening_session_${test.id}`);
            sessionStorage.removeItem(`ielts_writing_session_${test.id}`);
            sessionStorage.removeItem(`ielts_speaking_session_${test.id}`);
            sessionStorage.removeItem(`ielts_hl_${test.id}`);
            sessionStorage.removeItem(`ielts_listening_hl_${test.id}`);
            for (let i = 0; i < 5; i++) {
                sessionStorage.removeItem(`reading_session_${test.id}_passage_${i}`);
            }
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
        activePart, setActivePart, audioTime, setAudioTime, navigate
    };
}
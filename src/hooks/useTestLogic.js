import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { clearTestStorage } from "../utils/TestUtils";

// Modular Hooks
import { useTestFetch } from "./test/useTestFetch";
import { useTestTimer } from "./test/useTestTimer";
import { useTestAnswers } from "./test/useTestAnswers";
import { useTestScoring } from "./test/useTestScoring";
import { useTestSubmission } from "./test/useTestSubmission";
import { useGamification } from "./useGamification";

export function useTestLogic() {
    const { testId } = useParams();
    const cleanTestId = useMemo(() => {
        if (!testId) return "";
        return testId.split('_part_')[0];
    }, [testId]);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, userData } = useAuth();
    const stateRef = useRef({});
    const { awardXP } = useGamification();

    // Extract partNumber from query param (e.g. ?part=2 or ?passage=2)
    const partNumber = useMemo(() => {
        const queryParams = new URLSearchParams(location.search);
        const p = queryParams.get('part') || queryParams.get('passage') || queryParams.get('section');
        if (p) return parseInt(p, 10);
        if (testId && testId.includes('_part_')) {
            const match = testId.match(/_part_(\d+)/);
            if (match) return parseInt(match[1], 10);
        }
        return null;
    }, [location.search, testId]);

    // UI & Navigation States
    const [testMode, setTestMode] = useState(null);
    const [showModeSelection, setShowModeSelection] = useState(true);
    const [showResult, setShowResult] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [score, setScore] = useState(0);
    const [bandScore, setBandScore] = useState(0);
    const [resultId, setResultId] = useState(null);
    const [textSize, setTextSize] = useState('text-base');
    const [isReviewing, setIsReviewing] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [startedAt] = useState(new Date());

    // Audio States
    const [activePartState, setActivePartState] = useState(0);
    const activePart = partNumber ? (partNumber - 1) : activePartState;
    const setActivePart = partNumber ? () => {} : setActivePartState;
    const [audioTime, setAudioTime] = useState(0);

    // Modularized Logic
    const { test, loading } = useTestFetch(cleanTestId, user, userData, navigate);
    const { userAnswers, setUserAnswers, writingEssay, setWritingEssay, flaggedQuestions, handleSelectAnswer, toggleFlag } = useTestAnswers();
    const initialDuration = useMemo(() => {
        if (partNumber) return 10 * 60; // 10 minutes per part practice
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
    }, [test, partNumber]);

    const { timeLeft, setTimeLeft } = useTestTimer(cleanTestId, user?.uid, testMode, initialDuration, !!test && !showModeSelection && !showResult, partNumber);
    const { saving, submitTest } = useTestSubmission(user, userData);

    // Initialize Mode & Settings
    useEffect(() => {
        if (!test) return;
        const type = test.type?.toLowerCase();
        const draftKey = `draft_${user.uid}_${test.id}${partNumber ? `_part_${partNumber}` : ''}`;
        const savedDraft = localStorage.getItem(draftKey);
        const savedMode = localStorage.getItem(`mode_${user.uid}_${test.id}${partNumber ? `_part_${partNumber}` : ''}`);

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
    }, [test, partNumber]);

    // Auto Save
    useEffect(() => {
        if (!test || showResult) return;
        const draftKey = `draft_${user.uid}_${test.id}${partNumber ? `_part_${partNumber}` : ''}`;
        localStorage.setItem(draftKey, JSON.stringify(userAnswers));
        if (testMode) localStorage.setItem(`mode_${user.uid}_${test.id}${partNumber ? `_part_${partNumber}` : ''}`, testMode);
    }, [userAnswers, test, testMode, showResult, partNumber]);

    // Anti-Cheat
    useEffect(() => {
        stateRef.current = { testMode, showResult, saving, handleSubmit };
    });

    const handleSubmit = async (violationType = null) => {
        if (!test) return;
        setIsSubmitting(true);
        try {
            const totalTime = initialDuration;
            const timeSpent = testMode === 'practice' ? timeLeft : Math.max(0, totalTime - timeLeft);
            const resultData = {
                mode: testMode,
                violation: typeof violationType === 'string' ? violationType : null,
                timeSpent,
                userAnswers,
                partNumber: partNumber || null
            };

            const res = await submitTest(test, resultData);
            if (res && res.success) {
                const xpAmount = Math.max(10, Math.round(res.bandScore * 10));
                await awardXP('test', test.id, test.title, xpAmount);
                setScore(res.score);
                setBandScore(res.bandScore);
                setResultId(res.resultId);
                setShowResult(true);
                clearTestStorage(user.uid, test.id, partNumber);
                // Note: We don't remove reading highlights here so they are available in Review mode.
                // They will be cleared if the user explicitly restarts the test.
            }
        } catch (error) {
            console.error("Error submitting test:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const audioRefs = useRef([]);

    const handleSeekTo = (partIndex, timestamp) => {
        if (!timestamp && timestamp !== 0) return;
        setActivePart(partIndex);
        const playerRef = audioRefs.current[partIndex] || audioRefs.current[0];
        if (playerRef) playerRef.seekTo(timestamp);
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
        initialDuration, audioRefs, handleSeekTo, partNumber, resultId, isSubmitting
    };
}
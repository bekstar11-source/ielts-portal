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
import toast from 'react-hot-toast';

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
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [draftData, setDraftData] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [score, setScore] = useState(0);
    const [bandScore, setBandScore] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [partBreakdown, setPartBreakdown] = useState([]);
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
    const { test, loading, locked, lockedMeta } = useTestFetch(cleanTestId, user, userData, navigate, partNumber);
    // Testda o'tgan soniyalar. `useTestAnswers` taymerdan OLDIN chaqiriladi,
    // shuning uchun qiymat ref orqali uzatiladi va quyida taymer bilan birga
    // yangilanadi. Bundan javob berilgan daqiqalar yozib boriladi (vaqt tahlili).
    const elapsedRef = useRef(0);

    const {
        userAnswers, setUserAnswers, writingEssay, setWritingEssay, flaggedQuestions,
        handleSelectAnswer, toggleFlag, getAnswerTimes, resetAnswerTimes
    } = useTestAnswers(elapsedRef);
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

    // Listening testlarda haqiqiy davomiylik audio uzunligidan kelib chiqadi.
    // Uni alohida state'da saqlaymiz — shunda taymerni yuklash/reset qilish
    // mantiqi ham ayni shu qiymatdan foydalanadi (ilgari ular bir-birini bosardi).
    const [audioDuration, setAudioDuration] = useState(null);
    const effectiveDuration = useMemo(() => {
        if (test?.type?.toLowerCase() === 'listening' && audioDuration > 0) return audioDuration;
        return initialDuration;
    }, [test, audioDuration, initialDuration]);

    // Taymer resume modal ochiq turganda ishlamasligi/yuklanmasligi kerak —
    // aks holda o'quvchi hali "Continue/Start Fresh" ni tanlamasidan vaqt oqib ketardi.
    const isTimerActive = !!test && !showModeSelection && !showResult && !showResumeModal;
    const { timeLeft, setTimeLeft, resetTimer } = useTestTimer(cleanTestId, user?.uid, testMode, effectiveDuration, isTimerActive, partNumber);
    const { saving, submitTest } = useTestSubmission(user, userData);

    // Practice rejimida taymer yuqoriga, exam rejimida pastga sanaydi — o'tgan
    // vaqt formulasi topshirishdagi `timeSpent` bilan aynan bir xil bo'lishi kerak,
    // aks holda javob vaqtlari test davomiyligiga to'g'ri kelmasdi.
    useEffect(() => {
        elapsedRef.current = testMode === 'practice'
            ? timeLeft
            : Math.max(0, effectiveDuration - timeLeft);
    }, [timeLeft, testMode, effectiveDuration]);

    // Initialize Mode & Settings
    useEffect(() => {
        if (!test) return;
        const type = test.type?.toLowerCase();
        const draftKey = `draft_${user.uid}_${test.id}${partNumber ? `_part_${partNumber}` : ''}`;
        const savedDraft = localStorage.getItem(draftKey);
        const savedMode = localStorage.getItem(`mode_${user.uid}_${test.id}${partNumber ? `_part_${partNumber}` : ''}`);

        // Bo'sh draft ("{}") ham avtosaqlash tufayli yozilib qoladi — bunday holatda
        // resume modalni ko'rsatishning ma'nosi yo'q (va u taymerni ushlab turadi).
        const hasDraftContent = (() => {
            if (!savedDraft) return false;
            try {
                const parsed = JSON.parse(savedDraft);
                if (parsed && typeof parsed === 'object') return Object.keys(parsed).length > 0;
                return String(parsed ?? '').trim().length > 0;
            } catch {
                return savedDraft.trim().length > 0;
            }
        })();

        if (hasDraftContent) {
            setDraftData({ draft: savedDraft, mode: savedMode });
            setShowResumeModal(true);
            setShowModeSelection(false); // Hide mode selection while resume modal is up
        } else {
            // No draft, normal flow
            if (['reading', 'listening', 'writing'].includes(type)) {
                setShowModeSelection(true);
            } else {
                setTestMode('exam');
                setShowModeSelection(false);
            }
        }
    }, [test, partNumber]);

    const handleResumeContinue = () => {
        if (draftData) {
            try { setUserAnswers(JSON.parse(draftData.draft)); } catch { setWritingEssay(draftData.draft); }
            if (draftData.mode && ['reading', 'listening', 'writing'].includes(test.type?.toLowerCase())) {
                setTestMode(draftData.mode);
                setShowModeSelection(false);
            } else if (['reading', 'listening', 'writing'].includes(test.type?.toLowerCase())) {
                setShowModeSelection(true);
            } else {
                setTestMode('exam');
                setShowModeSelection(false);
            }
        }
        setShowResumeModal(false);
    };

    const handleResumeFresh = () => {
        clearTestStorage(user.uid, test.id, partNumber, false);
        setUserAnswers({});
        setWritingEssay("");
        setDraftData(null);
        resetAnswerTimes();
        // Storage tozalash o'zi yetarli emas: taymer state'i eski qiymatda qolib ketardi.
        resetTimer(null);
        if (['reading', 'listening', 'writing'].includes(test.type?.toLowerCase())) {
            setShowModeSelection(true);
        } else {
            setTestMode('exam');
            setShowModeSelection(false);
        }
        setShowResumeModal(false);
    };

    // Auto Save
    useEffect(() => {
        // Resume modal ochiq ekan saqlamaymiz: aks holda hali tiklanmagan javoblar
        // ustidan bo'sh "{}" yozilib, o'quvchining draft'i yo'qolardi.
        if (!test || showResult || showResumeModal) return;
        const draftKey = `draft_${user.uid}_${test.id}${partNumber ? `_part_${partNumber}` : ''}`;
        localStorage.setItem(draftKey, JSON.stringify(userAnswers));
        if (testMode) localStorage.setItem(`mode_${user.uid}_${test.id}${partNumber ? `_part_${partNumber}` : ''}`, testMode);
    }, [userAnswers, test, testMode, showResult, showResumeModal, partNumber]);

    // Anti-Cheat
    useEffect(() => {
        stateRef.current = { testMode, showResult, saving, handleSubmit };
    });

    const handleSubmit = async (violationType = null) => {
        if (!test) return;
        setIsSubmitting(true);
        try {
            const totalTime = effectiveDuration;
            const timeSpent = testMode === 'practice' ? timeLeft : Math.max(0, totalTime - timeLeft);
            const resultData = {
                mode: testMode,
                violation: typeof violationType === 'string' ? violationType : null,
                timeSpent,
                userAnswers,
                partNumber: partNumber || null,
                answerTimes: getAnswerTimes()
            };

            const res = await submitTest(test, resultData);
            if (res && res.success) {
                const xpAmount = Math.max(10, Math.round(res.bandScore * 10));
                await awardXP('test', test.id, test.title, xpAmount);
                setScore(res.score);
                setBandScore(res.bandScore);
                setTotalQuestions(res.totalQuestions || 0);
                setPartBreakdown(res.partBreakdown || []);
                setResultId(res.resultId);
                setShowResult(true);
                clearTestStorage(user.uid, test.id, partNumber, true);
                // Note: We don't remove reading highlights here so they are available in Review mode.
                // They will be cleared if the user explicitly restarts the test.
            }
        } catch (error) {
            console.error("Error submitting test:", error);
            toast.error(error.message || "Testni yakunlashda xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
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
        test, loading, locked, lockedMeta, testMode, setTestMode, showModeSelection, setShowModeSelection,
        userAnswers, handleSelectAnswer, flaggedQuestions, toggleFlag,
        showResult, score, bandScore, totalQuestions, partBreakdown, saving, handleSubmit, timeLeft, setTimeLeft,
        textSize, setTextSize, isReviewing, setIsReviewing, isFullScreen, handleToggleFullScreen,
        activePart, setActivePart, audioTime, setAudioTime, navigate, initialDuration: effectiveDuration,
        audioRefs, handleSeekTo, partNumber, resultId, isSubmitting,
        showResumeModal, handleResumeContinue, handleResumeFresh, setAudioDuration
    };
}
import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
const ReadingInterface = lazy(() => import("../../components/ReadingInterface/ReadingInterface"));
const ListeningInterface = lazy(() => import("../../components/ListeningInterface/ListeningInterface"));
const WritingInterface = lazy(() => import("../../components/WritingInterface/WritingInterface"));
const SpeakingInterface = lazy(() => import("../../components/SpeakingInterface/SpeakingInterface"));

import TestHeader from "../../components/TestSolving/TestHeader";
import { ModeSelectionModal, ResultModal } from "../../components/TestSolving/TestModals";
import ResultsCalculatingScreen from "../../components/TestSolving/ResultsCalculatingScreen";
import { useTestLogic } from "../../hooks/useTestLogic";
import { useAuth } from "../../context/AuthContext";
import { clearTestStorage } from "../../utils/TestUtils";

export default function TestSolving() {
    const { user } = useAuth();
    // Logic hookdan barcha kerakli state va funksiyalarni olamiz
    const {
        test, loading, testMode, setTestMode, showModeSelection, setShowModeSelection,
        userAnswers, handleSelectAnswer, flaggedQuestions, toggleFlag,
        showResult, score, bandScore, saving, handleSubmit, timeLeft, setTimeLeft,
        textSize, setTextSize, isReviewing, setIsReviewing, isFullScreen, handleToggleFullScreen,
        activePart, setActivePart, audioTime, setAudioTime, navigate, initialDuration,
        audioRefs, handleSeekTo, partNumber, resultId
    } = useTestLogic();

    // Exam modeda intro countdown tugagach audio play bo'lishi uchun trigger
    const [triggerPlay, setTriggerPlay] = useState(false);

    // Finish bosilganda yoki Back/Chiqish qilinganda warning modal statelari
    const [showFinishWarning, setShowFinishWarning] = useState(false);
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [isNotesVisible, setIsNotesVisible] = useState(false);
    const isExitingRef = useRef(false);

    // Reading yoki Listening testda testni boshlaganida (showModeSelection=false) va tugamagan bo'lsa bloklash
    const isReadingOrListening = test?.type?.toLowerCase() === 'reading' || test?.type?.toLowerCase() === 'listening';
    const shouldBlock = isReadingOrListening && !showModeSelection && !showResult && !isReviewing;

    // Popstate (browser back button) orqali chiqishni ushlab olish
    useEffect(() => {
        if (!shouldBlock) return;

        // Dummy state pushlaymiz — back bosilsa popstate shu statega qaytadi
        window.history.pushState({ readingTestGuard: true }, '');

        const handlePopState = (e) => {
            if (isExitingRef.current) return;
            // Back bosildi — exit modalni ko'rsat va yana dummy state push qil
            window.history.pushState({ readingTestGuard: true }, '');
            setShowExitWarning(true);
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [shouldBlock]);

    // Oyna yopilayotganda/reload qilinayotganda ogohlantirish
    useEffect(() => {
        if (!shouldBlock) return;

        const handleBeforeUnload = (e) => {
            if (isExitingRef.current) return;
            e.preventDefault();
            e.returnValue = 'Siz haqiqatan ham testdan chiqmoqchimisiz? Natijangiz saqlanmaydi.';
            return e.returnValue;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [shouldBlock]);

    // Header "Finish" tugmasi bosilganda — modal ko'rsat
    const handleFinishClick = () => {
        if (!showResult) {
            setShowFinishWarning(true);
        } else {
            navigate('/my-results');
        }
    };

    // "Yes, Finish Test" bosilganda — testni finish qilib, saqlash
    const handleConfirmFinish = async () => {
        setShowFinishWarning(false);
        await handleSubmit();
    };

    // "No, Continue" bosilganda — finish modalini yopish
    const handleCancelFinish = () => {
        setShowFinishWarning(false);
    };

    // Header Back tugmasi bosilganda
    const handleBackClick = () => {
        if (shouldBlock) {
            setShowExitWarning(true);
        } else {
            navigate(-1);
        }
    };

    // "Yes, Exit" bosilganda — testdan chiqish (natijalarni saqlamasdan, draftlarni o'chirish)
    const handleConfirmExit = () => {
        isExitingRef.current = true;
        setShowExitWarning(false);
        if (user && test) {
            clearTestStorage(user.uid, test.id, partNumber);
        }
        // Hard redirect to break all history traps
        window.location.href = '/practice';
    };

    // "No, Continue" bosilganda — chiqish modalini yopish
    const handleCancelExit = () => {
        setShowExitWarning(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-[#f9fafb] font-sans select-none">
                <div className="relative flex flex-col items-center max-w-sm px-6 text-center animate-in">
                    {/* Ring Loader */}
                    <div className="relative w-24 h-24 mb-8">
                        {/* Outer rotating track */}
                        <div className="absolute inset-0 rounded-full border-4 border-zinc-200/60"></div>
                        {/* Inner spinning gradient indicator */}
                        <div className="absolute inset-0 rounded-full border-4 border-t-[#0066cc] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                        {/* Center icon container */}
                        <div className="absolute inset-2 bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex items-center justify-center">
                            {/* Pulsing book icon */}
                            <svg className="w-8 h-8 text-[#0066cc] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                    </div>

                    {/* Loading Texts */}
                    <h3 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">Test yuklanmoqda</h3>
                    <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
                        Iltimos, biroz kutib turing. Test materiallari va savollari tayyorlanmoqda...
                    </p>

                    {/* Bouncing progress dots */}
                    <div className="flex gap-2 mt-7 justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0066cc]/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0066cc]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0066cc] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            </div>
        );
    }
    if (!test) return <div className="flex h-screen items-center justify-center font-bold text-red-500">Test topilmadi.</div>;

    const testType = test?.type?.toLowerCase();
    const isListening = testType === 'listening';
    const isWriting = testType === 'writing';
    const isSpeaking = testType === 'speaking';

    return (
        <div className={`flex flex-col h-screen bg-gray-50 font-sans select-none ${textSize}`}>

            {saving && <ResultsCalculatingScreen />}

            {/* FINISH WARNING MODAL */}
            {showFinishWarning && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-7 text-center animate-fade-in">
                        {/* Icon */}
                        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            Finish Test
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed mb-6">
                            Are you sure you want to finish the test? Your answers will be submitted and your score will be calculated.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelFinish}
                                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors"
                            >
                                No, Continue
                            </button>
                            <button
                                onClick={handleConfirmFinish}
                                disabled={saving}
                                className="flex-1 px-4 py-2.5 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                        Saving...
                                    </span>
                                ) : "Yes, Finish"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXIT WARNING MODAL */}
            {showExitWarning && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-7 text-center animate-fade-in">
                        {/* Icon */}
                        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-[#0066cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            Exit Test
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed mb-6">
                            Are you sure you want to exit? If you leave, your progress will not be saved and the test will not be submitted.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelExit}
                                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors"
                            >
                                No, Continue
                            </button>
                            <button
                                onClick={handleConfirmExit}
                                className="flex-1 px-4 py-2.5 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-xl font-semibold text-sm transition-colors"
                            >
                                Yes, Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <TestHeader
                test={test}
                timeLeft={timeLeft}
                saving={saving}
                testMode={testMode}
                onFinish={handleFinishClick}
                onBack={handleBackClick}
                textSize={textSize}
                setTextSize={setTextSize}
                showResult={showResult}
                showModeSelection={showModeSelection}
                activePart={activePart}
                setActivePart={setActivePart}
                isReviewing={isReviewing}
                setAudioTime={setAudioTime}
                triggerPlay={triggerPlay}
                isFullScreen={isFullScreen}
                onToggleFullScreen={handleToggleFullScreen}
                onOpenNotes={() => setIsNotesVisible(true)}
                audioRefs={audioRefs}
                partNumber={partNumber}
            />

            {/* CONTENT AREA */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* MODALS */}
                <ModeSelectionModal
                    show={showModeSelection}
                    setTestMode={setTestMode}
                    setTimeLeft={setTimeLeft}
                    setShowModeSelection={setShowModeSelection}
                    test={test}
                />

                <ResultModal
                    show={showResult}
                    test={test}
                    testMode={testMode}
                    score={score}
                    bandScore={bandScore}
                    timeLeft={timeLeft}
                    initialDuration={initialDuration}
                    isReviewing={isReviewing}
                    setIsReviewing={setIsReviewing}
                    onExit={() => navigate('/my-results')}
                    userAnswers={userAnswers}
                    partNumber={partNumber}
                    resultId={resultId}
                    navigate={navigate}
                />

                {/* INTERFACE RENDERING */}
                {!showModeSelection && (
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-400">Loading interface...</div>}>
                        {test.type === 'reading' ? (
                            <div className="w-full h-full">
                                <ReadingInterface
                                    testData={test}
                                    userAnswers={userAnswers}
                                    onAnswerChange={handleSelectAnswer}
                                    onFlag={toggleFlag}
                                    flaggedQuestions={flaggedQuestions}
                                    isReviewMode={isReviewing}
                                    textSize={textSize}
                                    isNotesVisible={isNotesVisible}
                                    setIsNotesVisible={setIsNotesVisible}
                                    activePart={activePart}
                                    setActivePart={setActivePart}
                                    partNumber={partNumber}
                                />
                            </div>
                        ) : isListening ? (
                            <div className="w-full h-full">
                                <ListeningInterface
                                    testData={test}
                                    userAnswers={userAnswers}
                                    onAnswerChange={handleSelectAnswer}
                                    onFlag={toggleFlag}
                                    flaggedQuestions={flaggedQuestions}
                                    isReviewMode={isReviewing}
                                    textSize={textSize}
                                    testMode={testMode}
                                    onToggleFullScreen={handleToggleFullScreen}
                                    isFullScreen={isFullScreen}
                                    activePart={activePart}
                                    setActivePart={setActivePart}
                                    audioCurrentTime={audioTime}
                                    onIntroEnd={() => setTriggerPlay(true)}
                                    onSeekTo={handleSeekTo}
                                    partNumber={partNumber}
                                />
                            </div>
                        ) : isWriting ? (
                            <div className="w-full h-full">
                                <WritingInterface
                                    testData={test}
                                    userAnswers={userAnswers}
                                    onAnswerChange={handleSelectAnswer}
                                    isReviewMode={isReviewing}
                                    textSize={textSize}
                                />
                            </div>
                        ) : isSpeaking ? (
                            <div className="w-full h-full">
                                <SpeakingInterface
                                    testData={test}
                                    userAnswers={userAnswers}
                                    onAnswerChange={handleSelectAnswer}
                                    isReviewMode={isReviewing}
                                    textSize={textSize}
                                />
                            </div>
                        ) : (
                            <div className="p-10 text-center text-gray-400">Test turi aniqlanmadi</div>
                        )}
                    </Suspense>
                )}
            </div>
        </div>
    );
}
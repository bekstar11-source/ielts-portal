import React, { useState, useEffect, useRef } from "react";
import ReadingInterface from "../components/ReadingInterface/ReadingInterface";
import ListeningInterface from "../components/ListeningInterface/ListeningInterface";
import WritingInterface from "../components/WritingInterface/WritingInterface";
import SpeakingInterface from "../components/SpeakingInterface/SpeakingInterface";
import TestHeader from "../components/TestSolving/TestHeader";
import { ModeSelectionModal, ResultModal } from "../components/TestSolving/TestModals";
import { useTestLogic } from "../hooks/useTestLogic";

export default function TestSolving() {
    // Logic hookdan barcha kerakli state va funksiyalarni olamiz
    const {
        test, loading, testMode, setTestMode, showModeSelection, setShowModeSelection,
        userAnswers, handleSelectAnswer, flaggedQuestions, toggleFlag,
        showResult, score, saving, handleSubmit, timeLeft, setTimeLeft,
        textSize, setTextSize, isReviewing, setIsReviewing, isFullScreen, handleToggleFullScreen,
        activePart, setActivePart, audioTime, setAudioTime, navigate
    } = useTestLogic();

    // Exam modeda intro countdown tugagach audio play bo'lishi uchun trigger
    const [triggerPlay, setTriggerPlay] = useState(false);

    // Back qilinganda yoki Finish bosilganda warning modal state
    const [showFinishWarning, setShowFinishWarning] = useState(false);
    const backBlockedRef = useRef(false);

    // Reading testda testni boshlaganida (showModeSelection=false) va tugamagan bo'lsa bloklash
    const isReadingTest = test?.type?.toLowerCase() === 'reading';
    const shouldBlock = isReadingTest && !showModeSelection && !showResult;

    // Popstate orqali back tugmasini ushlab olish
    useEffect(() => {
        if (!shouldBlock) return;

        // Dummy state pushlaymiz — back bosilsa popstate shu statega qaytadi
        window.history.pushState({ readingTestGuard: true }, '');

        const handlePopState = (e) => {
            // Back bosildi — modalni ko'rsat va yana dummy state push qil
            window.history.pushState({ readingTestGuard: true }, '');
            backBlockedRef.current = true;
            setShowFinishWarning(true);
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
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

    // "Yes, Finish Test" bosilganda — testni finish qilib, navigate qiling
    const handleConfirmFinish = async () => {
        const wasBackTriggered = backBlockedRef.current;
        setShowFinishWarning(false);
        backBlockedRef.current = false;
        await handleSubmit();
        // Faqat back bosilganda navigate qilamiz (ResultModal o'tkazib yuboriladi)
        // Finish tugmasi bosilganda - handleSubmit showResult=true qiladi va ResultModal ochiladi
        if (wasBackTriggered) {
            navigate('/my-results');
        }
    };

    // "No, Continue" bosilganda — testga qaytish
    const handleCancelFinish = () => {
        setShowFinishWarning(false);
        backBlockedRef.current = false;
    };

    if (loading) return <div className="flex h-screen items-center justify-center font-bold text-xl text-gray-500">Test yuklanmoqda...</div>;
    if (!test) return <div className="flex h-screen items-center justify-center font-bold text-red-500">Test topilmadi.</div>;

    const testType = test?.type?.toLowerCase();
    const isListening = testType === 'listening';
    const isWriting = testType === 'writing';
    const isSpeaking = testType === 'speaking';

    return (
        <div className="flex flex-col h-screen bg-gray-50 font-sans select-none">

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
                            You are finishing the test
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed mb-6">
                            If you go back now, your answers will be saved and the test will be submitted. Are you sure you want to finish?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelFinish}
                                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors"
                            >
                                No, Continue Test
                            </button>
                            <button
                                onClick={handleConfirmFinish}
                                disabled={saving}
                                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                        Saving...
                                    </span>
                                ) : "Yes, Finish Test"}
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
                textSize={textSize}
                setTextSize={setTextSize}
                showResult={showResult}
                showModeSelection={showModeSelection}
                activePart={activePart}
                setActivePart={setActivePart}
                setAudioTime={setAudioTime}
                triggerPlay={triggerPlay}
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
                    timeLeft={timeLeft}
                    isReviewing={isReviewing}
                    setIsReviewing={setIsReviewing}
                    onExit={() => navigate('/my-results')}
                />

                {/* INTERFACE RENDERING */}
                {!showModeSelection && (
                    test.type === 'reading' ? (
                        <div className="w-full h-full">
                            <ReadingInterface
                                testData={test}
                                userAnswers={userAnswers}
                                onAnswerChange={handleSelectAnswer}
                                onFlag={toggleFlag}
                                flaggedQuestions={flaggedQuestions}
                                isReviewMode={isReviewing}
                                textSize={textSize}
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
                    )
                )}
            </div>
        </div>
    );
}
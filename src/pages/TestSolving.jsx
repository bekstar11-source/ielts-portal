import React from "react";
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

    if (loading) return <div className="flex h-screen items-center justify-center font-bold text-xl text-gray-500">Test yuklanmoqda...</div>;
    if (!test) return <div className="flex h-screen items-center justify-center font-bold text-red-500">Test topilmadi.</div>;

    const testType = test?.type?.toLowerCase();
    const isListening = testType === 'listening';
    const isWriting = testType === 'writing';
    const isSpeaking = testType === 'speaking';

    return (
        <div className="flex flex-col h-screen bg-gray-50 font-sans select-none">
            {/* HEADER */}
            <TestHeader
                test={test}
                timeLeft={timeLeft}
                saving={saving}
                testMode={testMode}
                onFinish={showResult ? () => navigate('/my-results') : handleSubmit}
                textSize={textSize}
                setTextSize={setTextSize}
                showResult={showResult}
                showModeSelection={showModeSelection}
                activePart={activePart}
                setAudioTime={setAudioTime}
            />

            {/* CONTENT AREA */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* MODALS */}
                <ModeSelectionModal
                    show={showModeSelection}
                    setTestMode={setTestMode}
                    setTimeLeft={setTimeLeft}
                    setShowModeSelection={setShowModeSelection}
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
import React from 'react';
import TestHeader from "../TestSolving/TestHeader";
import ReadingInterface from "../ReadingInterface/ReadingInterface";
import ListeningInterface from "../ListeningInterface/ListeningInterface";
import WritingInterface from "../WritingInterface/WritingInterface";

export const TestSolvingView = ({
    stage, tests, answers, handleAnswer, timeLeft, handleNextStage,
    textSize, setTextSize, activePart, setActivePart, setAudioTime,
    setIsAudioReady, isFullScreen, audioTime
}) => {
    const logicalStage = stage === 'listening_volume_check' ? 'listening' : stage;

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
            <TestHeader
                test={tests[logicalStage]}
                timeLeft={timeLeft}
                saving={stage === 'saving'}
                testMode="exam"
                onFinish={handleNextStage}
                textSize={textSize}
                setTextSize={setTextSize}
                showResult={false}
                showModeSelection={false}
                activePart={activePart}
                setActivePart={setActivePart}
                setAudioTime={setAudioTime}
                triggerPlay={stage === 'listening' || stage === 'listening_volume_check'}
                onBufferingDone={() => setIsAudioReady(true)}
                isFullScreen={isFullScreen}
                onToggleFullScreen={() => {}} 
                buttonText={stage === 'listening' ? 'Move to Reading' : stage === 'reading' ? 'Move to Writing' : 'Finish'}
            />

            <div className="flex-1 overflow-hidden relative">
                {stage === 'listening' && (
                    <ListeningInterface 
                        testData={tests.listening} 
                        userAnswers={answers.listening} 
                        onAnswerChange={handleAnswer}
                        activePart={activePart} 
                        setActivePart={setActivePart} 
                        audioCurrentTime={audioTime} 
                        hideSecondaryIntro={true}
                    />
                )}
                {stage === 'reading' && (
                    <ReadingInterface 
                        testData={tests.reading} 
                        userAnswers={answers.reading} 
                        onAnswerChange={handleAnswer}
                    />
                )}
                {stage === 'writing' && (
                    <WritingInterface 
                        testData={tests.writing} 
                        userAnswers={answers.writing} 
                        onAnswerChange={handleAnswer}
                    />
                )}
            </div>
        </div>
    );
};

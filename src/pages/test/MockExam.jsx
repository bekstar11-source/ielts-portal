import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Hooks & Components
import { useMockExam } from "../../hooks/useMockExam";
import MockExamIntro from "../../components/MockExam/MockExamIntro";
import MockExamResult from "../../components/MockExam/MockExamResult";
import MockExamSectionIntro from "../../components/MockExam/MockExamSectionIntro";
import TestHeader from "../../components/TestSolving/TestHeader";
import ReadingInterface from "../../components/ReadingInterface/ReadingInterface";
import ListeningInterface from "../../components/ListeningInterface/ListeningInterface";
import WritingInterface from "../../components/WritingInterface/WritingInterface";

export default function MockExam() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, userData } = useAuth();
    const mockData = location.state?.mockData;

    const {
        stage, setStage, tests, answers, handleAnswer, 
        timeLeft, setTimeLeft, handleNextStage, finishExam,
        cheatWarning, setCheatWarning, finalResults
    } = useMockExam(mockData, user, userData, navigate);

    // Audio & UI States
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [activePart, setActivePart] = useState(0);
    const [audioTime, setAudioTime] = useState(0);
    const [textSize, setTextSize] = useState('text-base');
    const [isFullScreen, setIsFullScreen] = useState(!!document.fullscreenElement);

    const startExam = async () => {
        try {
            await document.documentElement.requestFullscreen();
            const waitTime = Number(tests.listening?.introDuration || 0);
            if (waitTime > 0) {
                setStage('listening_volume_check');
            } else {
                setStage('listening');
            }
            setTimeLeft(30 * 60);
        } catch (err) { console.error(err); }
    };

    if (stage === 'loading' || stage === 'saving') return <div className="h-screen flex items-center justify-center text-xl font-bold">Yuklanmoqda...</div>;

    if (stage === 'intro') return <MockExamIntro onStart={startExam} />;
    if (stage === 'result') return <MockExamResult results={finalResults} onDashboard={() => navigate('/')} onResults={() => navigate('/my-results')} />;
    
    if (stage === 'reading_intro') return <MockExamSectionIntro title="Reading" duration="60 min" format="3 passages" questions="40" onStart={handleNextStage} />;
    if (stage === 'writing_intro') return <MockExamSectionIntro title="Writing" duration="60 min" format="2 tasks" onStart={handleNextStage} color="purple" />;

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
                onToggleFullScreen={() => {}} // TODO
                buttonText={stage === 'listening' ? 'Move to Reading' : stage === 'reading' ? 'Move to Writing' : 'Finish'}
            />

            <div className="flex-1 overflow-hidden relative">
                {stage === 'listening' && (
                    <ListeningInterface 
                        testData={tests.listening} userAnswers={answers.listening} onAnswerChange={handleAnswer}
                        activePart={activePart} setActivePart={setActivePart} audioCurrentTime={audioTime} hideSecondaryIntro={true}
                    />
                )}
                {stage === 'reading' && (
                    <ReadingInterface 
                        testData={tests.reading} userAnswers={answers.reading} onAnswerChange={handleAnswer}
                    />
                )}
                {stage === 'writing' && (
                    <WritingInterface 
                        testData={tests.writing} userAnswers={answers.writing} onAnswerChange={handleAnswer}
                    />
                )}
            </div>
        </div>
    );
}
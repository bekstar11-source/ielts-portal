import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Hooks & Components
import { useMockExam } from "../../hooks/useMockExam";
import MockExamIntro from "../../components/MockExam/MockExamIntro";
import MockExamResult from "../../components/MockExam/MockExamResult";
import MockExamSectionIntro from "../../components/MockExam/MockExamSectionIntro";
import { TestSolvingView } from "../../components/MockExam/TestSolvingView";

export default function MockExam() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, userData } = useAuth();
    const mockData = location.state?.mockData;

    const {
        stage, setStage, tests, answers, handleAnswer, 
        timeLeft, setTimeLeft, handleNextStage, 
        finalResults
    } = useMockExam(mockData, user, userData, navigate);

    // UI States
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [activePart, setActivePart] = useState(0);
    const [audioTime, setAudioTime] = useState(0);
    const [textSize, setTextSize] = useState('text-base');
    const [isFullScreen, setIsFullScreen] = useState(!!document.fullscreenElement);

    const startExam = async () => {
        try {
            await document.documentElement.requestFullscreen();
            const waitTime = Number(tests.listening?.introDuration || 0);
            if (waitTime > 0) setStage('listening_volume_check');
            else setStage('listening');
            setTimeLeft(30 * 60);
        } catch (err) { console.error(err); }
    };

    if (stage === 'loading' || stage === 'saving') {
        return <div className="h-screen flex items-center justify-center text-xl font-bold bg-[#050505] text-white">Yuklanmoqda...</div>;
    }

    if (stage === 'intro') return <MockExamIntro onStart={startExam} />;
    
    if (stage === 'result') {
        return <MockExamResult 
            results={finalResults} 
            onDashboard={() => navigate('/')} 
            onResults={() => navigate('/my-results')} 
        />;
    }
    
    if (stage === 'reading_intro') {
        return <MockExamSectionIntro title="Reading" duration="60 min" format="3 passages" questions="40" onStart={handleNextStage} />;
    }
    
    if (stage === 'writing_intro') {
        return <MockExamSectionIntro title="Writing" duration="60 min" format="2 tasks" onStart={handleNextStage} color="purple" />;
    }

    return (
        <TestSolvingView 
            stage={stage}
            tests={tests}
            answers={answers}
            handleAnswer={handleAnswer}
            timeLeft={timeLeft}
            handleNextStage={handleNextStage}
            textSize={textSize}
            setTextSize={setTextSize}
            activePart={activePart}
            setActivePart={setActivePart}
            setAudioTime={setAudioTime}
            setIsAudioReady={setIsAudioReady}
            isFullScreen={isFullScreen}
            audioTime={audioTime}
        />
    );
}
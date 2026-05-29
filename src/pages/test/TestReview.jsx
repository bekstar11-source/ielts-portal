import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Hooks
import { useTestReview } from "../../hooks/useTestReview";

// Components
import ReadingInterface from "../../components/ReadingInterface/ReadingInterface";
import ListeningInterface from '../../components/ListeningInterface/ListeningInterface';
import TestCommentSection from "../../components/TestReview/TestCommentSection";

// Refactored Components
import ReviewHeader from "../../components/TestReview/ReviewHeader";
import ReviewQuestionStrip from "../../components/TestReview/ReviewQuestionStrip";
import WritingReview from "../../components/TestReview/WritingReview";
import SpeakingReview from "../../components/TestReview/SpeakingReview";

export default function TestReview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, userData } = useAuth();
    const isPremium = userData?.isPremium || userData?.accountType === 'premium' || userData?.role === 'admin' || userData?.role === 'teacher';

    const [textSize, setTextSize] = useState('text-medium');
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [flaggedQuestions] = useState(new Set());

    const {
        loading, testData, resultData,
        activeMockPart, setActiveMockPart,
        currentAnswers,
        adminScore, setAdminScore,
        task1Band, setTask1Band,
        task2Band, setTask2Band,
        adminFeedback, setAdminFeedback,
        isSaving,
        handleSaveGrade,
        listeningActivePart, setListeningActivePart,
        audioTime, setAudioTime,
        volume, setVolume,
        audioRefs,
        handleSeekTo,
        handleAICheck,
        isAiLoading
    } = useTestReview(id, user, userData, navigate);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('openComments') === 'true') setIsCommentsOpen(true);
    }, []);

    if (loading) return <div className="flex h-screen items-center justify-center font-bold text-gray-500">Yuklanmoqda...</div>;
    if (!resultData || !testData) return <div className="p-10 text-center">Ma'lumot topilmadi</div>;

    return (
        <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans">
            <ReviewHeader 
                testData={testData}
                resultData={resultData}
                userData={userData}
                activeMockPart={activeMockPart}
                setActiveMockPart={setActiveMockPart}
                audioRefs={audioRefs}
                listeningActivePart={listeningActivePart}
                setAudioTime={setAudioTime}
                volume={volume}
                setVolume={setVolume}
                isCommentsOpen={isCommentsOpen}
                setIsCommentsOpen={setIsCommentsOpen}
                onSaveGrade={handleSaveGrade}
                isSaving={isSaving}
                navigate={navigate}
                fromNewsfeed={!!location.state?.fromNewsfeed}
            />

            <div className="flex flex-col flex-1 overflow-hidden relative">
                <div className="flex-1 overflow-y-auto no-scrollbar relative bg-gray-50/30">
                    {testData.type?.toLowerCase() === 'reading' ? (
                        <ReadingInterface
                            testData={testData}
                            userAnswers={currentAnswers}
                            onAnswerChange={() => {}}
                            onFlag={() => {}}
                            flaggedQuestions={flaggedQuestions}
                            isReviewMode={true}
                            textSize={textSize}
                            testId={testData.id}
                            testName={testData.title}
                            userId={user?.uid}
                            isPremium={isPremium}
                            partNumber={resultData.partNumber}
                        />
                    ) : testData.type?.toLowerCase() === 'listening' ? (
                        <div className="flex flex-col w-full h-full bg-gray-50">
                            <ListeningInterface
                                key={testData.id}
                                testData={testData}
                                userAnswers={currentAnswers}
                                onAnswerChange={() => {}}
                                onFlag={() => {}}
                                flaggedQuestions={flaggedQuestions}
                                isReviewMode={true}
                                textSize={textSize}
                                testMode="practice"
                                activePart={listeningActivePart}
                                setActivePart={setListeningActivePart}
                                audioCurrentTime={audioTime}
                                isPremium={isPremium}
                                onSeekTo={handleSeekTo}
                                partNumber={resultData.partNumber}
                            />
                        </div>
                    ) : testData.type?.toLowerCase() === 'writing' ? (
                        <WritingReview 
                            testData={testData}
                            currentAnswers={currentAnswers}
                            resultData={resultData}
                            isPremium={isPremium}
                            onAICheck={handleAICheck}
                            isAiLoading={isAiLoading}
                        />
                    ) : testData.type?.toLowerCase() === 'speaking' ? (
                        <SpeakingReview 
                            testData={testData}
                            currentAnswers={currentAnswers}
                            resultData={resultData}
                            isPremium={isPremium}
                        />
                    ) : (
                        <div className="p-10 text-center opacity-30">Test turi aniqlanmadi</div>
                    )}
                </div>
            </div>

            {/* DISCUSSION SIDEBAR */}
            {isCommentsOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCommentsOpen(false)} />
                    <div className="relative w-full max-w-md h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300">
                        <TestCommentSection 
                            testId={testData.id} 
                            testTitle={testData.title}
                            onClose={() => setIsCommentsOpen(false)} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
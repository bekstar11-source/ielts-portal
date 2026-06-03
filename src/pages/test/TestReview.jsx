import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Hooks
import { useTestReview } from "../../hooks/useTestReview";
import { LoadingScreen } from "../../components/common/RouteGuards";

// Components
import ReadingInterface from "../../components/ReadingInterface/ReadingInterface";
import ListeningInterface from '../../components/ListeningInterface/ListeningInterface';
import TestCommentSection from "../../components/TestReview/TestCommentSection";

// Refactored Components
import ReviewHeader from "../../components/TestReview/ReviewHeader";
import ReviewQuestionStrip from "../../components/TestReview/ReviewQuestionStrip";
import WritingReview from "../../components/TestReview/WritingReview";
import SpeakingReview from "../../components/TestReview/SpeakingReview";
import DetailedAnswersModal from "../../components/TestReview/DetailedAnswersModal";
import PremiumLockedReview from "../../components/TestReview/PremiumLockedReview";

export default function TestReview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, userData } = useAuth();
    const isPremium = userData?.isPremium || 
                      userData?.isPro || 
                      ['premium', 'pro', 'standard'].includes(userData?.accountType) || 
                      ['admin', 'teacher'].includes(userData?.role);

    const [textSize, setTextSize] = useState('text-medium');
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [isAnswersListOpen, setIsAnswersListOpen] = useState(false);
    const [flaggedQuestions] = useState(new Set());

    const [readingActivePart, setReadingActivePart] = useState(0);

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

    const effectiveIsPremium = isPremium || !!testData?.isFree;

    // Redirect non-premium users if the test is not free (wait for testData to load)
    useEffect(() => {
        if (userData !== null && userData !== undefined && !loading) {
            if (!isPremium && testData && !testData.isFree) {
                localStorage.setItem('show_pricing_on_load', 'true');
                navigate('/dashboard', { replace: true });
            }
        }
    }, [userData, isPremium, loading, testData, navigate]);

    useEffect(() => {
        if (resultData?.partNumber) {
            setReadingActivePart(resultData.partNumber - 1);
        }
    }, [resultData]);

    const handleJumpToQuestion = (q) => {
        if (testData?.passages && q.passageId) {
            const passageIndex = testData.passages.findIndex(p => String(p.id) === String(q.passageId));
            if (passageIndex !== -1) {
                if (testData.type?.toLowerCase() === 'reading') {
                    setReadingActivePart(passageIndex);
                } else if (testData.type?.toLowerCase() === 'listening') {
                    setListeningActivePart(passageIndex);
                }
            }
        }

        setTimeout(() => {
            const element = document.getElementById(`q-${q.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('bg-blue-50/60', 'ring-2', 'ring-blue-500/20');
                setTimeout(() => {
                    element.classList.remove('bg-blue-50/60', 'ring-2', 'ring-blue-500/20');
                }, 2000);
            }
        }, 150);
    };

    const getSectionScoreAndBand = () => {
        if (!resultData) return { score: 0, bandScore: 0 };
        if (resultData.type === 'mock_full') {
            const part = activeMockPart?.toLowerCase();
            if (part === 'reading') {
                return {
                    score: resultData.scores?.reading ?? 0,
                    bandScore: resultData.scores?.readingBand ?? 0
                };
            } else if (part === 'listening') {
                return {
                    score: resultData.scores?.listening ?? 0,
                    bandScore: resultData.scores?.listeningBand ?? 0
                };
            }
        }
        return {
            score: resultData.score ?? 0,
            bandScore: resultData.bandScore ?? 0
        };
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('openComments') === 'true') setIsCommentsOpen(true);
    }, []);

    if (loading) return <LoadingScreen />;
    if (!resultData || !testData) return <div className="p-10 text-center">Ma'lumot topilmadi</div>;

    // Block render entirely for non-premium users for paid tests (prevents content flash before redirect)
    if (userData !== null && userData !== undefined && !effectiveIsPremium && !testData.isFree) return null;

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
                isAnswersListOpen={isAnswersListOpen}
                setIsAnswersListOpen={setIsAnswersListOpen}
                isPremium={effectiveIsPremium}
            />

            <div className="flex flex-col flex-1 overflow-hidden relative">
                <div className="flex-1 overflow-y-auto no-scrollbar relative bg-gray-50/30">
                    {!effectiveIsPremium && (testData.type?.toLowerCase() === 'reading' || testData.type?.toLowerCase() === 'listening') ? (
                        <PremiumLockedReview
                            testData={testData}
                            userAnswers={currentAnswers}
                            score={getSectionScoreAndBand().score}
                            bandScore={getSectionScoreAndBand().bandScore}
                        />
                    ) : testData.type?.toLowerCase() === 'reading' ? (
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
                            isPremium={effectiveIsPremium}
                            partNumber={resultData.partNumber}
                            activePart={readingActivePart}
                            setActivePart={setReadingActivePart}
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
                                isPremium={effectiveIsPremium}
                                onSeekTo={handleSeekTo}
                                partNumber={resultData.partNumber}
                            />
                        </div>
                    ) : testData.type?.toLowerCase() === 'writing' ? (
                        <WritingReview 
                            testData={testData}
                            currentAnswers={currentAnswers}
                            resultData={resultData}
                            isPremium={effectiveIsPremium}
                            onAICheck={handleAICheck}
                            isAiLoading={isAiLoading}
                        />
                    ) : testData.type?.toLowerCase() === 'speaking' ? (
                        <SpeakingReview 
                            testData={testData}
                            currentAnswers={currentAnswers}
                            resultData={resultData}
                            isPremium={effectiveIsPremium}
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

            {/* DETAILED ANSWERS MODAL */}
            {isAnswersListOpen && (
                <DetailedAnswersModal
                    isOpen={isAnswersListOpen}
                    onClose={() => setIsAnswersListOpen(false)}
                    testData={testData}
                    userAnswers={currentAnswers}
                    score={resultData?.score || 0}
                    bandScore={resultData?.bandScore || 0}
                    onJumpToQuestion={handleJumpToQuestion}
                />
            )}
        </div>
    );
}
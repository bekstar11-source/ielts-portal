import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Hooks
import { useTestReview } from "../../hooks/useTestReview";
import { LoadingScreen } from "../../components/common/RouteGuards";

// Components
import ReadingInterface from "../../components/ReadingInterface/ReadingInterface";
import ListeningInterface from '../../components/ListeningInterface/ListeningInterface';

// Refactored Components
import ReviewHeader from "../../components/TestReview/ReviewHeader";
import ReviewQuestionStrip from "../../components/TestReview/ReviewQuestionStrip";
import WritingReview from "../../components/TestReview/WritingReview";
import SpeakingReview from "../../components/TestReview/SpeakingReview";
import DetailedAnswersModal from "../../components/TestReview/DetailedAnswersModal";
import PremiumLockedReview from "../../components/TestReview/PremiumLockedReview";
import ReportIssueModal from "../../components/TestReview/ReportIssueModal";

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
    const [isAnswersListOpen, setIsAnswersListOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [flaggedQuestions] = useState(new Set());

    const [readingActivePart, setReadingActivePart] = useState(0);

    // --- WORDBANK / KEYWORD CAPTURE ---
    const [captureData, setCaptureData] = useState(null);
    const handleAddToWordBank = useCallback((word, source, context) => {
        setCaptureData({ word, source, context, timestamp: Date.now() });
    }, []);
    const handleClearCapture = useCallback(() => {
        setCaptureData(null);
    }, []);

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

    // Ball/band/umumiy savollar soni — HAR DOIM bitta manbadan (serverda saqlangan
    // natijadan). Uchtasi aralashtirilsa (masalan ball serverdan, total klientdan)
    // review sahifasi bilan "Batafsil javoblar" oynasi har xil band ko'rsatardi.
    // `moduleType` mock uchun muhim: sub-test hujjatining `type` maydoni noto'g'ri
    // bo'lsa, band Reading jadvali bo'yicha hisoblanib ketardi.
    const getSectionScoreAndBand = () => {
        const empty = { score: 0, bandScore: 0, totalQuestions: null, partNumber: null, moduleType: null };
        if (!resultData) return empty;

        if (resultData.type === 'mock_full') {
            const part = activeMockPart?.toLowerCase();
            if (part === 'reading' || part === 'listening') {
                return {
                    score: resultData.scores?.[part] ?? 0,
                    bandScore: resultData.scores?.[`${part}Band`] ?? 0,
                    totalQuestions: resultData.scores?.[`${part}Total`] ?? null,
                    partNumber: null,
                    moduleType: part
                };
            }
            return { ...empty, moduleType: part || null };
        }

        return {
            score: resultData.score ?? 0,
            bandScore: resultData.bandScore ?? 0,
            totalQuestions: resultData.totalQuestions ?? null,
            // Part practice: natija faqat shu part savollari bo'yicha hisoblangan.
            partNumber: resultData.partNumber ?? null,
            moduleType: (testData?.type || resultData.type || '').toLowerCase() || null
        };
    };

    if (loading) return <LoadingScreen />;
    if (!resultData || !testData) return <div className="p-10 text-center">Ma'lumot topilmadi</div>;

    // Block render entirely for non-premium users for paid tests (prevents content flash before redirect)
    if (userData !== null && userData !== undefined && !effectiveIsPremium && !testData.isFree) return null;

    return (
        <div className="flex flex-col h-[100dvh] bg-gray-100 overflow-hidden font-sans">
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
                onSaveGrade={handleSaveGrade}
                isSaving={isSaving}
                navigate={navigate}
                fromNewsfeed={!!location.state?.fromNewsfeed}
                from={location.state?.from}
                isAnswersListOpen={isAnswersListOpen}
                setIsAnswersListOpen={setIsAnswersListOpen}
                isPremium={effectiveIsPremium}
                onReportIssue={() => setIsReportOpen(true)}
            />

            <div className="flex flex-col flex-1 overflow-hidden relative">
                <div className="flex-1 overflow-hidden relative bg-gray-50/30">
                    {!effectiveIsPremium && (testData.type?.toLowerCase() === 'reading' || testData.type?.toLowerCase() === 'listening') ? (
                        <PremiumLockedReview
                            testData={testData}
                            userAnswers={currentAnswers}
                            {...getSectionScoreAndBand()}
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
                            onAddToWordBank={handleAddToWordBank}
                            captureData={captureData}
                            onClearCapture={handleClearCapture}
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
                            isAdminOrTeacher={userData?.role === 'admin' || userData?.role === 'teacher'}
                            resultId={id}
                            userData={userData}
                            navigate={navigate}
                        />
                    ) : testData.type?.toLowerCase() === 'speaking' ? (
                        <SpeakingReview 
                            testData={testData}
                            currentAnswers={currentAnswers}
                            resultData={resultData}
                            isPremium={effectiveIsPremium}
                            isAdminOrTeacher={userData?.role === 'admin' || userData?.role === 'teacher'}
                            adminScore={adminScore}
                            setAdminScore={setAdminScore}
                            adminFeedback={adminFeedback}
                            setAdminFeedback={setAdminFeedback}
                            onSaveGrade={handleSaveGrade}
                            isSaving={isSaving}
                        />
                    ) : (
                        <div className="p-10 text-center opacity-30">Test turi aniqlanmadi</div>
                    )}
                </div>
            </div>

            {/* REPORT AN ISSUE MODAL */}
            <ReportIssueModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                testData={testData}
                resultId={id}
                partNumber={resultData.partNumber ?? null}
                moduleType={getSectionScoreAndBand().moduleType}
            />

            {/* DETAILED ANSWERS MODAL */}
            {isAnswersListOpen && (
                <DetailedAnswersModal
                    isOpen={isAnswersListOpen}
                    onClose={() => setIsAnswersListOpen(false)}
                    testData={testData}
                    resultId={id}
                    userAnswers={currentAnswers}
                    {...getSectionScoreAndBand()}
                    onJumpToQuestion={handleJumpToQuestion}
                />
            )}
        </div>
    );
}
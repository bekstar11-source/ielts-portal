import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useLocation } from "react-router-dom";
const ReadingInterface = lazy(() => import("../../components/ReadingInterface/ReadingInterface"));
const ListeningInterface = lazy(() => import("../../components/ListeningInterface/ListeningInterface"));
const WritingInterface = lazy(() => import("../../components/WritingInterface/WritingInterface"));
const SpeakingInterface = lazy(() => import("../../components/SpeakingInterface/SpeakingInterface"));

import TestHeader from "../../components/TestSolving/TestHeader";
import { ModeSelectionModal, ResultModal } from "../../components/TestSolving/TestModals";
import ResultsCalculatingScreen from "../../components/TestSolving/ResultsCalculatingScreen";
import { useTestLogic } from "../../hooks/useTestLogic";
import { useAuth } from "../../context/AuthContext";
import { clearTestStorage, deriveQuestionTypesForCard, getActualQuestionCount } from "../../utils/TestUtils";
import { BookOpen, Headphones, Clock, Sparkles, ArrowLeft, ArrowRight, Award, Zap } from "lucide-react";

export default function TestSolving() {
    const { user, userData } = useAuth();
    const location = useLocation();
    const [isConfirmed, setIsConfirmed] = useState(!location.state?.fromNewsfeed);
    
    // Logic hookdan barcha kerakli state va funksiyalarni olamiz
    const {
        test, loading, testMode, setTestMode, showModeSelection, setShowModeSelection,
        userAnswers, handleSelectAnswer, flaggedQuestions, toggleFlag,
        showResult, score, bandScore, saving, handleSubmit, timeLeft, setTimeLeft,
        textSize, setTextSize, isReviewing, setIsReviewing, isFullScreen, handleToggleFullScreen,
        activePart, setActivePart, audioTime, setAudioTime, navigate, initialDuration,
        audioRefs, handleSeekTo, partNumber, resultId
    } = useTestLogic();

    // Dynamically determine the originating/return path
    const returnPath = React.useMemo(() => {
        if (userData?.role === 'admin') {
            return location.state?.from || "/admin/tests";
        }
        if (userData?.role === 'teacher') {
            return location.state?.from || "/teacher/tests";
        }
        if (location.state?.fromNewsfeed) return "/dashboard";
        if (location.state?.from) return location.state.from;
        if (!test) return "/practice";

        const type = test.type?.toLowerCase();
        if (type === 'reading') {
            return partNumber ? '/reading/parts' : '/reading/full';
        }
        if (type === 'listening') {
            return partNumber ? '/listening/parts' : '/listening/full';
        }
        if (type === 'writing') {
            return '/practice?tab=writing';
        }
        if (type === 'speaking') {
            return '/speaking-practice';
        }
        return '/practice';
    }, [location.state, test, partNumber, userData]);

    // Exam modeda intro countdown tugagach audio play bo'lishi uchun trigger
    const [triggerPlay, setTriggerPlay] = useState(false);

    // Finish bosilganda yoki Back/Chiqish qilinganda warning modal statelari
    const [showFinishWarning, setShowFinishWarning] = useState(false);
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [isNotesVisible, setIsNotesVisible] = useState(false);
    const isExitingRef = useRef(false);

    // Reading yoki Listening testda testni boshlaganida (showModeSelection=false) va tugamagan bo'lsa bloklash
    const isReadingOrListening = test?.type?.toLowerCase() === 'reading' || test?.type?.toLowerCase() === 'listening';
    const shouldBlock = isReadingOrListening && isConfirmed && !showModeSelection && !showResult && !isReviewing;

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
            navigate(returnPath);
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
            navigate(returnPath);
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
        window.location.href = returnPath;
    };

    // "No, Continue" bosilganda — chiqish modalini yopish
    const handleCancelExit = () => {
        setShowExitWarning(false);
    };
    const derivedQuestionTypes = React.useMemo(() => {
        if (!test) return [];
        return deriveQuestionTypesForCard(test);
    }, [test]);

    const cardImage = React.useMemo(() => {
        if (!test) return "";
        if (test?.type === 'listening') return '/images/dashboard/listening_orange_headphones.jpg';
        return test?.thumbnail || (
            test?.type === 'reading' ? '/images/dashboard/reading_passage_yellow_card.png' :
            test?.type === 'writing' ? 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800' :
            test?.type === 'speaking' ? 'https://images.unsplash.com/photo-1506784926709-22f1ec395907?q=80&w=800' :
            'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800'
        );
    }, [test]);

    const duration = React.useMemo(() => {
        if (initialDuration) return Math.round(initialDuration / 60);
        if (!test) return 60;
        if (test.duration) return Number(test.duration);
        const titleLower = test.title?.toLowerCase() || "";
        const type = test.type?.toLowerCase() || "";
        const isFull = partNumber == null && (titleLower.includes('full') || titleLower.includes('/') || (test.passages && test.passages.length > 1));
        if (type === 'reading') return isFull ? 60 : 20;
        if (type === 'listening') return isFull ? 40 : 10;
        return 60;
    }, [test, initialDuration, partNumber]);

    const questionCount = React.useMemo(() => {
        if (!test) return 0;
        return getActualQuestionCount(test, partNumber);
    }, [test, partNumber]);

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

    if (!isConfirmed) {
        return (
            <div className="min-h-screen bg-gradient-to-tr from-gray-50 via-white to-gray-100 text-gray-800 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none selection:bg-[#e31b23]/10 selection:text-[#e31b23]">
                {/* Spotlight background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-[#e31b23]/5 via-[#e31b23]/2 to-transparent blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-gradient-to-t from-gray-200/40 to-transparent blur-[80px] pointer-events-none" />
                
                {/* Thin Linear line decor */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-50" />

                {/* Back button */}
                <button 
                    onClick={handleBackClick}
                    className="absolute top-6 left-6 flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-all bg-white/80 border border-gray-200 px-3.5 py-2 rounded-lg backdrop-blur-sm shadow-sm hover:shadow active:scale-95 duration-200 group"
                >
                    <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
                    Orqaga Qaytish
                </button>

                {/* Container */}
                <div className="max-w-[420px] w-full z-10 animate-fade-in-up">
                    {/* Compact Card */}
                    <div className="bg-white/90 border border-gray-200/80 rounded-2xl p-6 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] flex flex-col gap-5">
                        
                        {/* Image section */}
                        <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 border border-gray-200/50 group">
                            <img 
                                src={cardImage} 
                                alt={test.title} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102" 
                            />
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
                            
                            {/* Type Badge */}
                            <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest text-white">
                                {test.type}
                            </span>
                        </div>

                        {/* Title section */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                <Award size={11} className="text-[#e31b23]" />
                                IELTS Practice Exam
                            </div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-snug">
                                {test.title}
                            </h1>
                        </div>

                        {/* Specs grid */}
                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100">
                            <div className="flex flex-col gap-0.5 items-start">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Muddati</span>
                                <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
                                    <Clock size={13} className="text-gray-400" />
                                    {duration} min
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5 items-start border-l border-gray-100 pl-3">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Savollar</span>
                                <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
                                    <BookOpen size={13} className="text-gray-400" />
                                    {questionCount} ta
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5 items-start border-l border-gray-100 pl-3">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Daraja</span>
                                <div className="flex items-center gap-1 text-sm font-bold text-gray-800 capitalize">
                                    <Sparkles size={13} className="text-gray-400" />
                                    {test.difficulty || "Medium"}
                                </div>
                            </div>
                        </div>

                        {/* Question Types */}
                        {derivedQuestionTypes.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Savol Turlari</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {derivedQuestionTypes.map((type, i) => (
                                        <span 
                                            key={i} 
                                            className="px-2 py-0.5 bg-gray-50 border border-gray-200/60 rounded text-[10px] font-bold text-gray-600 tracking-tight"
                                        >
                                            {type}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Warning box */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex gap-2.5 items-start text-left">
                            <Zap size={14} className="text-[#0071e3] shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[11.5px] font-bold text-blue-900">Diqqat qiling</span>
                                <p className="text-[11px] text-blue-700/90 leading-normal">
                                    Testni boshlaganingizdan so'ng, sizning kunlik testingiz hisobga olinadi va muddatli vaqt hisoblana boshlaydi.
                                </p>
                            </div>
                        </div>

                        {/* Prompt and Action Button */}
                        <div className="flex flex-col gap-3 pt-1">
                            <span className="text-center text-[12px] font-medium text-gray-500">
                                Ushbu testni topshirishni istaysizmi?
                            </span>
                            <button
                                onClick={() => setIsConfirmed(true)}
                                className="w-full bg-[#e31b23] hover:bg-[#c4151c] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-[0_4px_16px_rgba(227,27,35,0.2)] hover:shadow-[0_4px_20px_rgba(227,27,35,0.3)] active:scale-[0.98] duration-200 flex items-center justify-center gap-1.5"
                            >
                                Testni Boshlash
                                <ArrowRight size={14} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }



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
                    onExit={() => navigate(returnPath)}
                    userAnswers={userAnswers}
                    partNumber={partNumber}
                    resultId={resultId}
                    navigate={navigate}
                    fromNewsfeed={!!location.state?.fromNewsfeed}
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
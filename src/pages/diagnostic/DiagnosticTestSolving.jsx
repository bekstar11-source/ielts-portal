import React from "react";
import ReadingInterface from "../../components/ReadingInterface/ReadingInterface";
import ListeningInterface from "../../components/ListeningInterface/ListeningInterface";
import { useDiagnosticLogic } from "../../hooks/useDiagnosticLogic";
import ResultsCalculatingScreen from "../../components/TestSolving/ResultsCalculatingScreen";
import { Clock, Loader2, Maximize, MinusCircle, PlusCircle, CheckCircle } from 'lucide-react';

export default function DiagnosticTestSolving() {
    const {
        test, loading, userAnswers, handleSelectAnswer, flaggedQuestions, toggleFlag,
        saving, handleSubmit, timeLeft, textSize, setTextSize, isFullScreen, handleToggleFullScreen,
        activePart, setActivePart, audioTime, setAudioTime
    } = useDiagnosticLogic();

    if (loading) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-[#050505] text-white font-sans select-none">
                <div className="relative flex flex-col items-center max-w-sm px-6 text-center animate-in">
                    {/* Ring Loader */}
                    <div className="relative w-24 h-24 mb-8">
                        {/* Outer rotating track */}
                        <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                        {/* Inner spinning gradient indicator */}
                        <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                        {/* Center icon container */}
                        <div className="absolute inset-2 bg-[#0a0a0a] border border-white/10 rounded-full shadow-2xl flex items-center justify-center">
                            {/* Pulsing diagnostic shield icon */}
                            <svg className="w-8 h-8 text-orange-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                    </div>

                    {/* Loading Texts */}
                    <h3 className="text-xl font-bold text-white mb-2 tracking-tight bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Diagnostika yuklanmoqda</h3>
                    <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">
                        Iltimos biroz kutib turing. Darajangizni aniqlash testi yuklanmoqda...
                    </p>

                    {/* Bouncing progress dots */}
                    <div className="flex gap-2 mt-7 justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            </div>
        );
    }
    if (!test) return <div className="flex h-screen items-center justify-center font-bold text-red-500 bg-[#050505]">Test topilmadi.</div>;

    const testType = test?.type?.toLowerCase();
    const isListening = testType === 'listening';
    const isReading = testType === 'reading';

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-screen bg-[#050505] text-white font-sans select-none">
            {saving && <ResultsCalculatingScreen accent="#f97316" />}

            {/* DIAGNOSTIC HEADER (Restricted) */}
            <header className="h-[72px] bg-[#0a0a0a] border-b border-white/10 flex items-center justify-between px-6 shrink-0 relative z-50 shadow-md">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent truncate max-w-[300px]">
                            Diagnostic: {test.title || 'Test'}
                        </h1>
                        <span className="text-xs text-blue-400 font-medium tracking-wider uppercase">Darajani Aniqlash</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                        <Clock size={18} className="text-orange-400" />
                        <span className="font-mono text-lg font-bold text-orange-400 w-[60px] text-center">
                            {formatTime(timeLeft)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-1.5 rounded-xl">
                        <button onClick={() => setTextSize(prev => prev === 'text-sm' ? 'text-sm' : prev === 'text-base' ? 'text-sm' : 'text-base')} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <MinusCircle size={18} />
                        </button>
                        <span className="text-sm font-medium w-8 text-center text-gray-300">Aa</span>
                        <button onClick={() => setTextSize(prev => prev === 'text-lg' ? 'text-lg' : prev === 'text-base' ? 'text-lg' : 'text-base')} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <PlusCircle size={18} />
                        </button>
                    </div>

                    {isListening && (
                        <button onClick={handleToggleFullScreen} className="p-2.5 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all hidden md:flex">
                            <Maximize size={18} />
                        </button>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <><CheckCircle size={18} /> Yakunlash</>}
                    </button>
                </div>
            </header>

            {/* CONTENT AREA */}
            <div className="flex flex-1 overflow-hidden relative">
                <style>{`
                    /* Dark Mode Overrides for Interfaces */
                    .bg-white { background-color: #0a0a0a !important; color: #f3f4f6 !important; }
                    .text-gray-900, .text-gray-800, .text-gray-700 { color: #f3f4f6 !important; }
                    .border-gray-200, .border-gray-300 { border-color: rgba(255,255,255,0.1) !important; }
                    .bg-gray-50, .bg-gray-100 { background-color: #050505 !important; }
                    .text-blue-600 { color: #f97316 !important; }
                    .bg-blue-50 { background-color: rgba(249, 115, 22, 0.1) !important; }
                    .border-blue-200, .border-blue-500 { border-color: rgba(249, 115, 22, 0.5) !important; }
                    input[type="text"] { background-color: rgba(255,255,255,0.05) !important; color: white !important; border-color: rgba(255,255,255,0.2) !important; }
                `}</style>

                {isReading ? (
                    <div className="w-full h-full">
                        <ReadingInterface
                            testData={test}
                            userAnswers={userAnswers}
                            onAnswerChange={handleSelectAnswer}
                            onFlag={toggleFlag}
                            flaggedQuestions={flaggedQuestions}
                            isReviewMode={false}
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
                            isReviewMode={false}
                            textSize={textSize}
                            testMode="exam"
                            onToggleFullScreen={handleToggleFullScreen}
                            isFullScreen={isFullScreen}
                            activePart={activePart}
                            setActivePart={setActivePart}
                            audioCurrentTime={audioTime}
                        />
                    </div>
                ) : (
                    <div className="p-10 text-center text-gray-400 w-full flex items-center justify-center">
                        Diagnostic faqat Reading yoki Listening testlardan iborat bo'lishi kerak.
                    </div>
                )}
            </div>
        </div>
    );
}

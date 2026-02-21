import React from "react";
import ReadingInterface from "../components/ReadingInterface/ReadingInterface";
import ListeningInterface from "../components/ListeningInterface/ListeningInterface";
import { useDiagnosticLogic } from "../hooks/useDiagnosticLogic";
import { Clock, Loader2, Maximize, MinusCircle, PlusCircle, CheckCircle } from 'lucide-react';

export default function DiagnosticTestSolving() {
    const {
        test, loading, userAnswers, handleSelectAnswer, flaggedQuestions, toggleFlag,
        saving, handleSubmit, timeLeft, textSize, setTextSize, isFullScreen, handleToggleFullScreen,
        activePart, setActivePart, audioTime, setAudioTime
    } = useDiagnosticLogic();

    if (loading) return <div className="flex h-screen items-center justify-center font-bold text-xl text-orange-500 bg-[#050505]">Diagnosticyuklanmoqda...</div>;
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

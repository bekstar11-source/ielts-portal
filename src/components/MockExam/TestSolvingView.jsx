import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TestHeader from "../TestSolving/TestHeader";
import ReadingInterface from "../ReadingInterface/ReadingInterface";
import ListeningInterface from "../ListeningInterface/ListeningInterface";
import WritingInterface from "../WritingInterface/WritingInterface";

import { Volume2, Menu, X } from 'lucide-react';

import CompactAudioPreloader from './CompactAudioPreloader';
import VolumeCheckScreen from './VolumeCheckScreen';


// ─── Main TestSolvingView ─────────────────────────────────────────────────────
export const TestSolvingView = ({
    stage, tests, answers, handleAnswer, timeLeft, handleNextStage,
    textSize, setTextSize, activePart, setActivePart, setAudioTime,
    setIsAudioReady, isFullScreen, audioTime, userName, resumeAudioTime, mockId,
    onTotalDurationCalculated, onAudioEnded
}) => {
    const logicalStage = stage === 'listening_volume_check' ? 'listening' : stage;
    const [volume, setVolume] = useState(0.7);
    const [isVolumeOpen, setIsVolumeOpen] = useState(false);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [contrastMode, setContrastMode] = useState('default');
    const [showFinishConfirm, setShowFinishConfirm] = useState(false);
    const [showResumeOverlay, setShowResumeOverlay] = useState(resumeAudioTime > 0 && logicalStage === 'listening');

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        return `${m} minute${m !== 1 ? 's' : ''} remaining`;
    };

    const handleContrastChange = (mode) => {
        setContrastMode(mode);
        const root = document.documentElement;
        root.classList.remove('white-on-black', 'yellow-on-black');
        if (mode !== 'default') {
            root.classList.add(mode);
        }
        // Don't close immediately so user sees the change
    };

    return (
        <div className={`flex flex-col h-[100dvh] bg-gray-50 overflow-hidden font-sans ${textSize}`}>
            {/* Resume Test Overlay for Autoplay Unlock */}
            <AnimatePresence>
                {showResumeOverlay && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] flex items-center justify-center bg-zinc-900/40 backdrop-blur-md px-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white p-7 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-zinc-100 text-center max-w-[340px] w-full"
                        >
                            <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-5 rotate-3">
                                <Volume2 className="text-zinc-900" size={28} />
                            </div>
                            
                            <h2 className="text-xl font-bold text-zinc-900 tracking-tight mb-2">
                                Test Resumed
                            </h2>
                            
                            <p className="text-[13px] text-zinc-500 leading-relaxed mb-7 px-2">
                                Your progress was saved. Click below to reconnect your audio and continue.
                            </p>
                            
                            <button
                                onClick={async () => {
                                    try {
                                        if (document.documentElement.requestFullscreen) {
                                            await document.documentElement.requestFullscreen();
                                        }
                                    } catch (err) {
                                        console.warn("Fullscreen restoration failed:", err);
                                    }
                                    setShowResumeOverlay(false);
                                }}
                                className="w-full py-3 bg-zinc-900 text-white rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-all active:scale-[0.98] shadow-md shadow-zinc-900/10"
                            >
                                Continue Test
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Mock Exam Header */}
            <header className="w-full bg-white border-b border-gray-300 px-6 py-2 flex items-center justify-between z-50 shrink-0">
                {/* Left: Student name + time */}
                <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-black text-zinc-900 leading-tight">{userName || 'Candidate'}</span>
                    <span className={`text-[11px] font-bold leading-none ${timeLeft <= 120 ? 'text-[#e31b23]' : 'text-zinc-900'}`}>{formatTime(timeLeft)}</span>
                </div>

                {/* Center: Audio status (only for listening) */}
                <div className="flex items-center gap-8">
                    {stage === 'listening' && (
                        <div className="flex items-center gap-2 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.788V15.21a.5.5 0 00.252.434l4.5 2.614a.5.5 0 00.748-.434V6.176a.5.5 0 00-.748-.434l-4.5 2.614a.5.5 0 00-.252.434z" />
                            </svg>
                            <span className="text-xs font-medium">Audio is playing</span>
                        </div>
                    )}
                </div>

                {/* Right: Controls + Finish button */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowFinishConfirm(true)}
                        className="px-4 py-1.5 border border-gray-300 rounded text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
                    >
                        Finish section
                    </button>

                    {/* Volume Control - Only for Listening */}
                    {logicalStage === 'listening' && (
                        <div className="relative">
                            <button 
                                onClick={() => setIsVolumeOpen(!isVolumeOpen)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
                                title="Volume"
                            >
                                <Volume2 size={20} />
                            </button>
                            
                            {isVolumeOpen && (
                                <div className="absolute top-full right-0 mt-2 p-2 bg-white border border-gray-200 shadow-xl rounded-lg z-[60] w-40">
                                    <div className="flex flex-col">
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="1" 
                                            step="0.01" 
                                            value={volume}
                                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                                            className="w-full accent-zinc-900 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Menu Button */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
                            title="Settings"
                        >
                            <Menu size={20} />
                        </button>
                        
                        {isOptionsOpen && (
                            <>
                                {/* Backdrop to close on outside click */}
                                <div 
                                    className="fixed inset-0 z-50 cursor-default" 
                                    onClick={() => setIsOptionsOpen(false)}
                                />
                                <div className="absolute top-full right-0 mt-2 p-4 bg-white border border-gray-200 shadow-xl rounded-lg z-[60] w-64 text-sm">
                                    <div className="space-y-4 text-zinc-900">
                                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Settings</span>
                                            <button onClick={() => setIsOptionsOpen(false)} className="text-gray-400 hover:text-gray-600">
                                                <X size={14} />
                                            </button>
                                        </div>
                                        
                                        {/* Text Size */}
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Text Size</span>
                                            <div className="flex gap-1">
                                                {[
                                                    { id: 'text-sm', label: 'A' },
                                                    { id: 'text-base', label: 'A+' },
                                                    { id: 'text-xl', label: 'A++' }
                                                ].map(size => (
                                                    <button 
                                                        key={size.id}
                                                        onClick={() => setTextSize(size.id)}
                                                        className={`flex-1 py-2 text-sm font-bold rounded border transition-all ${textSize === size.id ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                                    >
                                                        {size.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Contrast */}
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Contrast</span>
                                            <div className="flex flex-col gap-0.5">
                                                {[
                                                    { id: 'default', label: 'Standard' },
                                                    { id: 'white-on-black', label: 'White on Black' },
                                                    { id: 'yellow-on-black', label: 'Yellow on Black' }
                                                ].map(opt => (
                                                    <button 
                                                        key={opt.id}
                                                        onClick={() => handleContrastChange(opt.id)}
                                                        className={`w-full text-left px-2 py-1.5 text-xs font-bold transition-all ${contrastMode === opt.id ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hidden TestHeader for audio playback control */}
            <div className="hidden">
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
                    triggerPlay={stage === 'listening'}
                    onBufferingDone={() => setIsAudioReady(true)}
                    isFullScreen={isFullScreen}
                    onToggleFullScreen={() => {}}
                    hidePlayer={true}
                    skipBufferingOverlay={true}
                    buttonText="Finish"
                    volume={volume}
                    resumeAudioTime={resumeAudioTime}
                    onTotalDurationCalculated={onTotalDurationCalculated}
                    onAudioEnded={onAudioEnded}
                />
            </div>

            <div className="flex-1 overflow-hidden relative">
                {/* Listening Stage — including volume check blur */}
                {(stage === 'listening' || stage === 'listening_volume_check') && (
                    <>
                        <div className={`w-full h-full transition-all duration-700 ${stage === 'listening_volume_check' ? 'blur-[5px] pointer-events-none opacity-70' : ''}`}>
                            <ListeningInterface
                                testData={tests.listening}
                                userAnswers={answers.listening}
                                onAnswerChange={handleAnswer}
                                activePart={activePart}
                                setActivePart={setActivePart}
                                audioCurrentTime={audioTime}
                                hideSecondaryIntro={true}
                                textSize={textSize}
                            />
                        </div>

                        {stage === 'listening_volume_check' && (
                            <VolumeCheckScreen
                                test={tests.listening}
                                onStart={() => {
                                    setIsAudioReady(true);
                                    handleNextStage(); // transitions to 'listening' → blur disappears
                                }}
                            />
                        )}
                    </>
                )}

                {stage === 'reading' && (
                    <ReadingInterface
                        testData={tests.reading}
                        userAnswers={answers.reading}
                        onAnswerChange={handleAnswer}
                        textSize={textSize}
                        testId={mockId}
                    />
                )}

                {stage === 'writing' && (
                    <div className="h-full w-full" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                    <WritingInterface
                        testData={tests.writing}
                        userAnswers={answers.writing}
                        onAnswerChange={handleAnswer}
                        textSize={textSize}
                        testId={mockId}
                        disableInternalSession={true}
                        isMockExam={true}
                    />
                    </div>
                )}
            </div>
            {/* Finish Test Confirmation Modal */}
            {showFinishConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowFinishConfirm(false)} />
                    <div className="relative bg-white rounded border border-gray-200 shadow-xl w-full max-w-[360px] mx-4 p-8 text-center">
                        <h3 className="text-lg font-bold text-zinc-900 mb-2">Finish this section?</h3>
                        <p className="text-sm text-gray-500 mb-6">Are you sure you want to finish this part? You will not be able to return to it.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowFinishConfirm(false)}
                                className="flex-1 py-2.5 border border-gray-300 rounded text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { setShowFinishConfirm(false); handleNextStage(); }}
                                className="flex-1 py-2.5 bg-zinc-900 text-white rounded text-sm font-bold hover:bg-black transition-all active:scale-[0.98]"
                            >
                                Yes, finish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

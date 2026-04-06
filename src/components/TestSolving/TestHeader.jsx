import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTime } from '../../utils/ieltsScoring';
import CustomAudioPlayer from './CustomAudioPlayer';

// ─── Audio Preloader (buffering screen) ─────────────────────────────────────
// Polls each CustomAudioPlayer's <audio> DOM element until readyState >= 3
function AudioPreloader({ passages, test, onReady }) {
    const [loadedCount, setLoadedCount] = useState(0);
    const totalCount = passages?.filter(p => p.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file).length || 0;
    const hasCalledReady = useRef(false);

    useEffect(() => {
        if (!passages || passages.length === 0 || totalCount === 0) {
            onReady?.();
            return;
        }

        let loaded = 0;
        const pollIntervals = [];

        const checkAllLoaded = () => {
            loaded++;
            setLoadedCount(loaded);
            if (loaded >= totalCount && !hasCalledReady.current) {
                hasCalledReady.current = true;
                pollIntervals.forEach(id => clearInterval(id));
                onReady?.();
            }
        };

        passages.forEach((passage, idx) => {
            const src = passage.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file;
            if (!src) { checkAllLoaded(); return; }

            const pollId = setInterval(() => {
                const audioEl = document.getElementById(`audio-part-${idx}`);
                if (!audioEl) return;
                if (audioEl.readyState >= 3 || audioEl.error) {
                    clearInterval(pollId);
                    checkAllLoaded();
                }
            }, 200);

            pollIntervals.push(pollId);
        });

        // Hard timeout: 20 seconds
        const timeout = setTimeout(() => {
            if (!hasCalledReady.current) {
                hasCalledReady.current = true;
                pollIntervals.forEach(id => clearInterval(id));
                onReady?.();
            }
        }, 20000);

        return () => {
            clearTimeout(timeout);
            pollIntervals.forEach(id => clearInterval(id));
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pct = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 100;
    const isDone = loadedCount === totalCount && totalCount > 0;

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center p-4">
            <AnimatePresence mode="wait">
                {!isDone ? (
                    <motion.div 
                        key="loading"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="text-center max-w-md w-full"
                    >
                        <div className="w-24 h-24 mx-auto mb-8 relative">
                            <svg className="animate-spin w-full h-full text-blue-500" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-white text-base font-bold tabular-nums">{pct}%</span>
                        </div>
                        
                        <h2 className="text-white text-3xl font-black mb-4 tracking-tight uppercase italic underline underline-offset-8 decoration-blue-500/50">Audio keshlanmoqda</h2>
                        <p className="text-slate-400 text-lg mb-10 leading-relaxed font-medium">
                            Internet qotishlarini oldini olish uchun audio keshlanmoqda. Iltimos kuting...
                        </p>
                        
                        <div className="w-full bg-slate-800/50 rounded-full h-4 overflow-hidden mb-5 border border-white/5 backdrop-blur-md">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                            />
                        </div>
                        
                        <div className="flex justify-between items-center text-slate-500 text-sm font-bold uppercase tracking-widest px-1">
                            <span>Status: Yuklanmoqda</span>
                            <span>{loadedCount} / {totalCount}</span>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="done"
                        initial={{ opacity: 0, translateY: 20, scale: 0.9 }}
                        animate={{ opacity: 1, translateY: 0, scale: 1 }}
                        className="text-center max-w-md w-full"
                    >
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                            <motion.svg 
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="w-12 h-12 text-emerald-500" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </motion.svg>
                        </div>
                        
                        <h2 className="text-white text-4xl font-black mb-4 tracking-tight uppercase">Tayyor!</h2>
                        <p className="text-slate-300 text-xl mb-12 font-medium">
                            Audio fayllar muvaffaqiyatli yuklandi. <br/>Testni boshlashga ruxsat berasizmi?
                        </p>
                        
                        <button
                            onClick={onReady}
                            className="group relative w-full inline-flex items-center justify-center px-10 py-6 overflow-hidden font-black text-white transition-all duration-300 bg-blue-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-600/50 hover:bg-blue-500 hover:shadow-[0_0_40px_rgba(37,99,235,0.4)] active:scale-[0.98] active:bg-blue-700"
                        >
                            <span className="relative z-10 text-xl tracking-widest">IMTIHONNI BOSHLASH</span>
                            <svg className="relative z-10 w-7 h-7 ml-3 transition-transform duration-300 group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                            <div className="absolute inset-0 z-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


// ─── Main TestHeader ─────────────────────────────────────────────────────────
const TestHeader = ({
    test,
    timeLeft,
    saving,
    testMode,
    onFinish,
    textSize,
    setTextSize,
    showResult,
    showModeSelection,
    activePart,
    setActivePart,
    isReviewing,
    setAudioTime,
    triggerPlay,      // When true, show buffering + play audio (exam mode)
    onPartChange,
    onAudioReady,
    onBufferingDone,  // Called when buffering completes (parent can then play audio)
    buttonText = 'Finish'
}) => {
    const isListening = test?.type?.toLowerCase() === 'listening';
    const hasTriggered = useRef(false);
    const [isBuffering, setIsBuffering] = useState(false);

    // Exam mode: when triggerPlay fires, show buffering screen once
    useEffect(() => {
        if (!triggerPlay || testMode !== 'exam' || hasTriggered.current) return;
        if (!isListening) return;
        hasTriggered.current = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsBuffering(true);
    }, [triggerPlay, testMode, isListening]);

    useEffect(() => {
        if (isListening) onAudioReady?.();
    }, [isListening, onAudioReady]);

    const finishedParts = useRef(new Set());
    
    const handleEnded = (index) => {
        if (finishedParts.current.has(index)) return;
        finishedParts.current.add(index);

        if (test?.passages?.length && index < test.passages.length - 1) {
            const currentPassage = test.passages[index];
            const extraTimeMs = (Number(currentPassage?.extraSilentTime) || 0) * 1000;
            const delay = extraTimeMs > 0 ? extraTimeMs : 500; // Small default delay

            setTimeout(() => {
                const nextIdx = index + 1;
                if (setActivePart) setActivePart(nextIdx);
                if (onPartChange) onPartChange(nextIdx);
                // Keyingi partga o'tgandan sal keyin audio'ni play qilamiz
                setTimeout(() => {
                    const nextAudio = document.getElementById(`audio-part-${nextIdx}`);
                    if (nextAudio) {
                        nextAudio.play().catch(err => {
                            console.warn('Auto-play next blocked:', err);
                            // If blocked, allow the user to play manually if needed, 
                            // but in exam mode it should be ready.
                        });
                    }
                }, 400); // Slightly longer delay to ensure DOM is ready
            }, delay);
        }
    };

    return (
        <>
            {/* BUFFERING SCREEN */}
            {isBuffering && (
                <AudioPreloader
                    passages={test?.passages}
                    test={test}
                    onReady={() => {
                        setIsBuffering(false);
                        onBufferingDone?.();
                    }}
                />
            )}

            <header className="h-16 bg-white/95 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-50 relative">

                {/* LEFT: Logo + Title */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2 cursor-default shrink-0">
                        <img src="/englev-logo-dark.png" alt="ENGLEV" className="h-8 w-auto object-contain" />
                        <span
                            style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.13em' }}
                            className="font-black text-[15px] bg-[linear-gradient(90deg,#f97316,#fb923c,#ea580c)] bg-clip-text text-transparent"
                        >
                            ENGLEV
                        </span>
                    </div>
                    <div className="h-5 w-px bg-gray-300 hidden sm:block shrink-0" />
                    <h1 className="hidden sm:block text-sm font-medium text-gray-700 leading-tight truncate max-w-[180px]">
                        {test.title}
                    </h1>
                </div>

                {/* CENTER: Audio Player */}
                {isListening && !showModeSelection && (!showResult || isReviewing) && (
                    <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] z-[100] ${(testMode === 'exam' && !isReviewing) ? 'pointer-events-none select-none opacity-80' : ''}`}>
                        {test?.passages?.map((passage, index) => {
                            const src = passage.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file;
                            if (!src) return null;
                            return (
                                <CustomAudioPlayer
                                    key={index}
                                    src={src}
                                    index={index}
                                    activePart={activePart}
                                    testMode={isReviewing ? 'practice' : testMode} // Review mode da practice kabi ishlasin (play/pause ochiq)
                                    setAudioTime={setAudioTime}
                                    onEnded={() => handleEnded(index)}
                                    startTime={passage.startTime || 0}
                                    endTime={passage.endTime || 0}
                                />
                            );
                        })}
                    </div>
                )}

                {/* RIGHT: Controls */}
                <div className="flex items-center gap-4 justify-end flex-1 z-20">
                    {testMode && !showResult && (
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border hidden md:inline-block
                        ${testMode === 'exam'
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : 'bg-green-50 text-green-600 border-green-200'
                            }`}>
                            {testMode}
                        </span>
                    )}

                    {/* Font Size */}
                    <div className="hidden md:flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                        <button onClick={() => setTextSize('text-sm')} className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${textSize === 'text-sm' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>A</button>
                        <button onClick={() => setTextSize('text-base')} className={`px-2 py-1 text-sm font-bold rounded-md transition-all ${textSize === 'text-base' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>A</button>
                        <button onClick={() => setTextSize('text-xl')} className={`px-2 py-1 text-base font-bold rounded-md transition-all ${textSize === 'text-xl' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>A</button>
                    </div>

                    {/* Timer */}
                    {!showResult && !showModeSelection && (
                        <div className={`font-mono text-xl font-bold tabular-nums tracking-tight ${testMode === 'exam' && timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-gray-900'}`}>
                            {testMode === 'practice' ? '⏱️ ' : ''}{formatTime(timeLeft)}
                        </div>
                    )}

                    {/* Finish / Exit */}
                    {!showResult && !showModeSelection && (
                        <button
                            onClick={onFinish}
                            disabled={saving}
                            className="bg-gray-900 hover:bg-black text-white font-medium text-sm px-5 py-2 rounded-full shadow-sm transition-all active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {saving ? 'Saving...' : buttonText}
                        </button>
                    )}
                    {(showResult || isReviewing) && (
                        <button onClick={onFinish} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-full shadow-sm transition-all">
                            Exit
                        </button>
                    )}
                </div>
            </header>
        </>
    );
};

export default TestHeader;
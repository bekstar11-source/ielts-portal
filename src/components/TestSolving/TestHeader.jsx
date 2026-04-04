import React, { useEffect, useRef, useState, useCallback } from 'react';
import { formatTime } from '../../utils/ieltsScoring';
import CustomAudioPlayer from './CustomAudioPlayer';

// ─── Audio Preloader (buffering screen) ─────────────────────────────────────
function AudioPreloader({ passages, test, onReady }) {
    const [loadedCount, setLoadedCount] = useState(0);
    const totalCount = passages?.filter(p => p.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file).length || 0;
    const audioRefs = useRef([]);
    const hasCalledReady = useRef(false);

    useEffect(() => {
        if (!passages || passages.length === 0) {
            onReady?.();
            return;
        }

        let loaded = 0;
        const checkAllLoaded = () => {
            loaded++;
            setLoadedCount(loaded);
            if (loaded >= totalCount && !hasCalledReady.current) {
                hasCalledReady.current = true;
                onReady?.();
            }
        };

        passages.forEach((passage, idx) => {
            const src = passage.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file;
            if (!src) { checkAllLoaded(); return; }

            const audio = new Audio();
            audio.preload = 'auto';
            audioRefs.current[idx] = audio;

            const onCanPlayThrough = () => {
                audio.removeEventListener('canplaythrough', onCanPlayThrough);
                audio.removeEventListener('error', onError);
                checkAllLoaded();
            };
            const onError = () => {
                audio.removeEventListener('canplaythrough', onCanPlayThrough);
                audio.removeEventListener('error', onError);
                checkAllLoaded(); // error bo'lsa ham davom etamiz
            };

            audio.addEventListener('canplaythrough', onCanPlayThrough);
            audio.addEventListener('error', onError);
            audio.src = src;
            audio.load();
        });

        // 30 soniyadan keyin majburiy o'tkazamiz (timeout fallback)
        const timeout = setTimeout(() => {
            if (!hasCalledReady.current) {
                hasCalledReady.current = true;
                onReady?.();
            }
        }, 30000);

        return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pct = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 0;

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center gap-6">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                    <svg className="animate-spin w-16 h-16 text-blue-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">{pct}%</span>
                </div>
                <h2 className="text-white text-xl font-bold mb-2">Audio yuklanmoqda...</h2>
                <p className="text-slate-400 text-sm">Iltimos kuting. Audio to'liq yuklanganidan so'ng test boshlanadi.</p>
            </div>

            {/* Progress bar */}
            <div className="w-72 bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                />
            </div>

            <p className="text-slate-500 text-xs">
                {loadedCount} / {totalCount} audio fayl yuklandi
            </p>
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
    isReviewing, // Yangi prop
    setAudioTime,
    triggerPlay,
    onPartChange,
    onAudioReady,
    buttonText = 'Finish'
}) => {
    const isListening = test?.type?.toLowerCase() === 'listening';
    const hasTriggered = useRef(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [audioReady, setAudioReady] = useState(false);
    const hasTriggeredPlay = useRef(false);

    // Exam mode: when triggerPlay fires, first show buffering screen
    useEffect(() => {
        if (!triggerPlay || testMode !== 'exam' || hasTriggered.current) return;
        if (!isListening) return;
        hasTriggered.current = true;
        setIsBuffering(true); // Buffering ekranini ko'rsat
    }, [triggerPlay, testMode, isListening]);

    useEffect(() => {
        if (triggerPlay && isListening && !hasTriggeredPlay.current) {
            const audio = document.getElementById(`audio-part-0`);
            if (audio) {
                hasTriggeredPlay.current = true;
                audio.play().catch(err => {
                    console.warn('Auto-play blocked:', err);
                    hasTriggeredPlay.current = false; // Allow retry if blocked
                });
            }
        }
    }, [triggerPlay, isListening]);

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
                    onReady={() => setAudioReady(true)}
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
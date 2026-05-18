import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTime } from '../../utils/ieltsScoring';
import CustomAudioPlayer from './CustomAudioPlayer';
import { useAuth } from '../../context/AuthContext';
import { Volume2, Volume1, VolumeX, Bell, Menu, PenLine, HelpCircle, EyeOff, X, ChevronRight, Contrast as ContrastIcon, Type, Info, Check as CheckIcon, Maximize, Minimize, ArrowLeft } from 'lucide-react';

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
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 backdrop-blur-xl bg-zinc-900/90">
            <AnimatePresence mode="wait">
                {!isDone ? (
                    <motion.div 
                        key="loading"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        className="text-center max-w-md w-full space-y-8"
                    >
                        {/* Elegant Circular Loader */}
                        <div className="relative w-32 h-32 mx-auto">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle 
                                    className="text-white/10" 
                                    strokeWidth="6" 
                                    stroke="currentColor" 
                                    fill="transparent" 
                                    r="40" 
                                    cx="50" 
                                    cy="50" 
                                />
                                <motion.circle 
                                    className="text-[#e31837]" 
                                    strokeWidth="6" 
                                    strokeDasharray={2 * Math.PI * 40}
                                    initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                                    animate={{ strokeDashoffset: (2 * Math.PI * 40) * (1 - pct / 100) }}
                                    strokeLinecap="round" 
                                    stroke="currentColor" 
                                    fill="transparent" 
                                    r="40" 
                                    cx="50" 
                                    cy="50" 
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-black text-white tabular-nums tracking-tighter">{pct}%</span>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <h2 className="text-white text-3xl font-black tracking-tight uppercase leading-none">Audio Loading</h2>
                            <p className="text-white/60 text-[15px] font-medium max-w-[280px] mx-auto leading-relaxed">
                                To ensure a smooth experience, we are preparing your audio files.
                            </p>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    className="h-full bg-[#e31837] rounded-full"
                                />
                            </div>
                            
                            <div className="flex justify-between items-center text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">
                                <span>Status: Buffering</span>
                                <span>Part {loadedCount} of {totalCount}</span>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="done"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center max-w-sm w-full bg-white p-10 rounded-[32px] shadow-2xl shadow-black/50 border border-white/10"
                    >
                        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
                            <CheckIcon size={40} strokeWidth={3} />
                        </div>
                        
                        <h2 className="text-zinc-900 text-3xl font-black mb-3 tracking-tight uppercase leading-none">Ready!</h2>
                        <p className="text-zinc-500 text-base mb-10 font-medium leading-relaxed">
                            Audio files have been loaded successfully. You can start the exam now.
                        </p>
                        
                        <button
                            onClick={onReady}
                            className="w-full py-5 bg-[#e31837] text-white rounded-2xl font-black text-lg hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 active:scale-[0.98] tracking-widest uppercase"
                        >
                            Start Now
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const IELTSLogo = () => (
    <div className="flex items-start select-none relative pt-0.5 shrink-0">
        <span className="text-[20px] md:text-[34px] font-[850] text-[#E31837] tracking-[-0.05em] leading-[0.8]" style={{ fontFamily: 'Inter, sans-serif' }}>
            IELTS
        </span>
        <span className="text-[#E31837] text-[7px] md:text-[10px] font-black absolute -top-0.5 -right-1 md:-top-1 md:-right-1.5">®</span>
    </div>
);



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
    isFullScreen,
    onToggleFullScreen,
    onOpenNotes,
    hidePlayer = false,
    skipBufferingOverlay = false,
    buttonText = 'Finish',
    volume: externalVolume,
    resumeAudioTime = 0,
    audioRefs
}) => {
    const { userData } = useAuth();
    const localAudioRefs = useRef([]);
    const finalAudioRefs = audioRefs || localAudioRefs;
    const isListening = test?.type?.toLowerCase() === 'listening';
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [currentView, setCurrentView] = useState('menu'); // 'menu' | 'contrast' | 'text-size' | 'instructions'
    const [contrastMode, setContrastMode] = useState('default'); // 'default' | 'white-on-black' | 'yellow-on-black'
    
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [volume, setVolume] = useState(externalVolume !== undefined ? externalVolume : 1);
    const [playingPart, setPlayingPart] = useState(0);

    // Sync external volume if provided
    useEffect(() => {
        if (externalVolume !== undefined) {
            setVolume(externalVolume);
        }
    }, [externalVolume]);
    
    // RESTORED BUFFERING LOGIC
    const hasTriggered = useRef(false);
    const [isBuffering, setIsBuffering] = useState(false);

    // Exam mode: when triggerPlay fires, show buffering screen once
    useEffect(() => {
        if (!triggerPlay || testMode !== 'exam' || hasTriggered.current) return;
        if (!isListening) return;
        if (skipBufferingOverlay) return; // Audio already preloaded externally
        hasTriggered.current = true;
        setIsBuffering(true);
    }, [triggerPlay, testMode, isListening, skipBufferingOverlay]);

    useEffect(() => {
        if (isListening) onAudioReady?.();
    }, [isListening, onAudioReady]);

    // Contrast toggle logic
    const handleContrastChange = (mode) => {
        setContrastMode(mode);
        const root = document.documentElement;
        root.classList.remove('white-on-black', 'yellow-on-black');
        if (mode !== 'default') {
            root.classList.add(mode);
        }
    };

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
                setPlayingPart(nextIdx);
                // In exam mode, we don't force move the UI to the next part automatically 
                // unless we want to, but usually in IELTS, navigation is free.
                // However, the existing logic moves the UI:
                if (testMode !== 'exam') {
                    if (setActivePart) setActivePart(nextIdx);
                    if (onPartChange) onPartChange(nextIdx);
                }
                
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

    const toggleFullScreen = () => {
        if (onToggleFullScreen) {
            onToggleFullScreen();
            return;
        }
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
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

            <header className="h-[52px] md:h-[58px] bg-white border-b border-gray-200 flex items-center justify-between px-3 md:px-6 shrink-0 z-50 relative">

                {/* LEFT: Logo + Test ID + Time */}
                <div className="flex items-center gap-2 md:gap-10 flex-1 min-w-0 z-10">
                    <IELTSLogo />
                    <div className="flex flex-col justify-center min-w-0">
                        <span className="text-[12px] md:text-[15px] font-bold text-black leading-tight truncate max-w-[80px] sm:max-w-[120px] md:max-w-[400px]" title={test?.title || test?.name}>
                            {test?.title || test?.name || "IELTS Official Test"}
                        </span>
                        {!showResult && !showModeSelection && (
                            <span className="text-[9px] md:text-[11px] font-medium text-gray-500 leading-none mt-0.5 tabular-nums whitespace-nowrap">
                                {testMode === 'practice' 
                                    ? <span className="flex gap-1"><span>{Math.floor(timeLeft / 60)}</span><span className="hidden sm:inline">minutes past</span><span className="sm:hidden">min</span></span>
                                    : <span className="flex gap-1"><span>{Math.ceil(timeLeft / 60)}</span><span className="hidden sm:inline">minutes remaining</span><span className="sm:hidden">min left</span></span>
                                }
                            </span>
                        )}
                        {(showResult || isReviewing) && (
                            <span className="text-[7px] md:text-[9px] font-bold text-blue-600 bg-blue-50 px-1 md:px-1.5 py-0.5 rounded-sm uppercase tracking-wider self-start mt-0.5">
                                Review
                            </span>
                        )}
                    </div>
                </div>

                {/* CENTER: Audio Player */}
                {isListening && !showModeSelection && (!showResult || isReviewing) && (
                    <div className={`
                        absolute left-0 md:left-1/2 top-full md:top-1/2 
                        md:-translate-x-1/2 md:-translate-y-1/2 
                        w-full md:w-[600px] 
                        px-2 md:px-0 py-1 md:py-0
                        z-[100] bg-white md:bg-transparent border-b md:border-b-0 border-gray-100
                        ${(testMode === 'exam' && !isReviewing) ? 'pointer-events-none select-none opacity-90' : ''}
                        ${hidePlayer ? 'opacity-0 pointer-events-none invisible' : ''}
                    `}>
                        {test?.passages?.map((passage, index) => {
                            const src = passage.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file;
                            if (!src) return null;
                            return (
                                <CustomAudioPlayer
                                    key={index}
                                    ref={el => finalAudioRefs.current[index] = el}
                                    src={src}
                                    index={index}
                                    activePart={activePart}
                                    isPlayingPart={testMode === 'exam' ? playingPart === index : activePart === index}
                                    testMode={isReviewing ? 'practice' : testMode}
                                    isBuffering={isBuffering}
                                    shouldAutoPlay={triggerPlay && !isBuffering}
                                    setAudioTime={setAudioTime}
                                    volume={volume}
                                    onEnded={() => handleEnded(index)}
                                    startTime={passage.startTime || 0}
                                    endTime={passage.endTime || 0}
                                    resumeTime={resumeAudioTime}
                                />
                            );
                        })}
                    </div>
                )}

                {/* RIGHT: Official IELTS Controls */}
                <div className="flex items-center gap-1.5 md:gap-6 justify-end flex-1 z-20">
                    
                    <div className="flex items-center gap-1.5 md:gap-6 text-gray-700">
                        <button 
                            onClick={toggleFullScreen}
                            className="hover:text-black transition-colors hidden sm:block" 
                            title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                        >
                            {isFullScreen ? (
                                <Minimize size={20} strokeWidth={1.5} />
                            ) : (
                                <Maximize size={20} strokeWidth={1.5} />
                            )}
                        </button>
                        {isListening && (
                            <div className="relative">
                                <button 
                                    className={`hover:text-black transition-colors tooltip flex items-center justify-center p-1.5 rounded-lg border transition-all ${showVolumeSlider ? 'text-white bg-black border-black shadow-md' : 'text-gray-600 bg-white border-gray-200'}`} 
                                    data-tip="Volume"
                                    onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                                >
                                    {volume === 0 ? <VolumeX size={18} strokeWidth={2} /> : 
                                     volume < 0.5 ? <Volume1 size={18} strokeWidth={2} /> : 
                                     <Volume2 size={18} strokeWidth={2} />}
                                </button>
                                
                                <AnimatePresence>
                                    {showVolumeSlider && (
                                        <>
                                            <div 
                                                className="fixed inset-0 z-[100]" 
                                                onClick={() => setShowVolumeSlider(false)}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                className="absolute top-full right-0 mt-2 bg-white border border-black rounded-lg shadow-xl p-2 z-[101] flex flex-col items-center gap-2 w-10"
                                            >
                                                <div className="flex flex-col items-center gap-2 h-32 w-full py-1">
                                                    <span className="text-[9px] font-bold text-black tabular-nums text-center">
                                                        {Math.round(volume * 100)}%
                                                    </span>
                                                    
                                                    <div className="relative flex-1 w-full flex items-center justify-center group">
                                                        {/* Track */}
                                                        <div className="absolute w-1 h-full bg-gray-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className="absolute bottom-0 w-full bg-black"
                                                                style={{ height: `${volume * 100}%` }}
                                                            />
                                                        </div>
                                                        
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="1"
                                                            step="0.01"
                                                            value={volume}
                                                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                            style={{ 
                                                                WebkitAppearance: 'slider-vertical',
                                                                appearance: 'slider-vertical'
                                                            }}
                                                        />
                                                        
                                                        {/* Visual Knob */}
                                                        <div 
                                                            className="absolute w-3 h-3 bg-white border border-black rounded-full shadow-sm pointer-events-none z-0"
                                                            style={{ bottom: `calc(${volume * 100}% - 6px)` }}
                                                        />
                                                    </div>

                                                    <button 
                                                        onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
                                                        className="p-1 hover:bg-gray-100 rounded transition-all active:scale-90"
                                                        title={volume === 0 ? "Unmute" : "Mute"}
                                                    >
                                                        {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                                    </button>
                                                </div>
                                                {/* Arrow */}
                                                <div className="absolute -top-[5px] right-[10px] w-2.5 h-2.5 bg-white border-t border-l border-black rotate-45" />
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                        <button 
                            className="hover:text-black transition-colors" 
                            title="Menu"
                            onClick={() => {
                                setCurrentView('menu');
                                setIsOptionsOpen(true);
                            }}
                        >
                            <Menu size={20} strokeWidth={1.5} />
                        </button>
                        <button 
                            className="hover:text-black transition-colors hidden sm:block" 
                            title="Notes"
                            onClick={onOpenNotes}
                        >
                            <PenLine size={20} strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Finish / Exit Button */}
                    {!showResult && !showModeSelection && (
                        <button
                            onClick={onFinish}
                            disabled={saving}
                            className={`ml-1 md:ml-4 px-3 md:px-5 py-1 md:py-1.5 rounded font-bold text-[11px] md:text-sm transition-all shadow-sm whitespace-nowrap ${
                                saving ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-95'
                            }`}
                        >
                            {saving ? 'Saving...' : buttonText}
                        </button>
                    )}
                    {(showResult || isReviewing) && (
                        <button 
                            onClick={onFinish} 
                            className="ml-1 md:ml-4 px-3 md:px-5 py-1 md:py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-[10px] md:text-xs font-black rounded uppercase tracking-widest border border-red-100 transition-colors"
                        >
                            Exit
                        </button>
                    )}
                </div>
            </header>


            {/* OPTIONS MODAL (Refactored to Centered Modal) */}
            <AnimatePresence>
                {isOptionsOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOptionsOpen(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                        />

                        {/* Modal Content */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            className="relative bg-white/90 backdrop-blur-2xl w-full max-w-[340px] rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/20 overflow-hidden flex flex-col"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/50">
                                <h2 className="text-[15px] font-semibold text-gray-900">Exam Settings</h2>
                                <button 
                                    onClick={() => setIsOptionsOpen(false)}
                                    className="w-7 h-7 flex items-center justify-center bg-gray-200/50 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                    <X size={14} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-4 space-y-6">
                                {/* THEME SECTION */}
                                <div className="space-y-2">
                                    <span className="px-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Appearance</span>
                                    <div className="bg-gray-100/50 rounded-xl overflow-hidden border border-gray-200/30">
                                        {[
                                            { id: 'default', label: 'Light', icon: <Volume2 size={16} /> }, 
                                            { id: 'white-on-black', label: 'Dark', icon: <Volume1 size={16} /> },
                                            { id: 'yellow-on-black', label: 'System', icon: <Maximize size={16} /> }
                                        ].map((option, idx) => (
                                            <button
                                                key={option.id}
                                                onClick={() => handleContrastChange(option.id)}
                                                className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                                                    idx !== 0 ? 'border-t border-gray-200/50' : ''
                                                } ${
                                                    contrastMode === option.id 
                                                    ? 'bg-blue-600 text-white' 
                                                    : 'hover:bg-gray-200/50 text-gray-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={contrastMode === option.id ? 'text-white' : 'text-blue-500'}>
                                                        {option.id === 'default' ? <Volume2 size={16} /> : option.id === 'white-on-black' ? <Volume1 size={16} /> : <Maximize size={16} />}
                                                    </span>
                                                    <span className="text-[13.5px] font-medium">{option.label}</span>
                                                </div>
                                                {contrastMode === option.id && <CheckIcon size={14} strokeWidth={3} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* TEXT SIZE SECTION */}
                                <div className="space-y-2">
                                    <span className="px-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Text Display</span>
                                    <div className="bg-gray-100/50 rounded-xl overflow-hidden border border-gray-200/30">
                                        {[
                                            { id: 'text-sm', label: 'Standard', size: 'text-[11px]' },
                                            { id: 'text-base', label: 'Large', size: 'text-[13px]' },
                                            { id: 'text-xl', label: 'Extra Large', size: 'text-[15px]' }
                                        ].map((size, idx) => (
                                            <button
                                                key={size.id}
                                                onClick={() => setTextSize(size.id)}
                                                className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                                                    idx !== 0 ? 'border-t border-gray-200/50' : ''
                                                } ${
                                                    textSize === size.id 
                                                    ? 'bg-blue-600 text-white' 
                                                    : 'hover:bg-gray-200/50 text-gray-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`font-serif ${size.size} ${textSize === size.id ? 'text-white' : 'text-gray-400'}`}>Aa</span>
                                                    <span className="text-[13.5px] font-medium">{size.label}</span>
                                                </div>
                                                {textSize === size.id && <CheckIcon size={14} strokeWidth={3} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* LEAVE SECTION */}
                                <button
                                    onClick={onFinish}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 bg-red-50/50 hover:bg-red-50 text-red-600 rounded-xl border border-red-100/50 transition-all group"
                                >
                                    <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                        <ArrowLeft size={16} strokeWidth={2.5} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[13px] font-bold leading-none mb-1">Exit Test</div>
                                        <div className="text-[11px] text-red-500/70">Progress will not be saved</div>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default TestHeader;
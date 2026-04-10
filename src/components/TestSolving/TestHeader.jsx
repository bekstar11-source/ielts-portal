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

const IELTSLogo = () => (
    <div className="flex items-start select-none relative pt-0.5">
        <span className="text-[38px] font-[900] text-[#E31837] tracking-[-0.05em] leading-[0.8]" style={{ fontFamily: 'Arial Black, sans-serif' }}>
            IELTS
        </span>
        <span className="text-[#E31837] text-[10px] font-black absolute -top-1 -right-1.5">®</span>
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
    buttonText = 'Finish'
}) => {
    const { userData } = useAuth();
    const isListening = test?.type?.toLowerCase() === 'listening';
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [currentView, setCurrentView] = useState('menu'); // 'menu' | 'contrast' | 'text-size' | 'instructions'
    const [contrastMode, setContrastMode] = useState('default'); // 'default' | 'white-on-black' | 'yellow-on-black'
    
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [volume, setVolume] = useState(1);
    
    // RESTORED BUFFERING LOGIC
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

            <header className="h-[65px] bg-white border-b border-gray-200 flex items-center justify-between pl-4 pr-6 shrink-0 z-50 relative">

                {/* LEFT: Logo + Test ID + Time */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <IELTSLogo />
                    <div className="flex flex-col justify-center min-w-0">
                        <span className="text-[15px] font-bold text-black leading-tight truncate max-w-[400px]" title={test?.title || test?.name}>
                            {test?.title || test?.name || "IELTS Official Test"}
                        </span>
                        {!showResult && !showModeSelection && (
                            <span className="text-[11px] font-medium text-gray-500 leading-none mt-0.5 tabular-nums">
                                {testMode === 'practice' 
                                    ? `${Math.floor(timeLeft / 60)} minutes past` 
                                    : `${Math.ceil(timeLeft / 60)} minutes remaining`
                                }
                            </span>
                        )}
                        {(showResult || isReviewing) && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider self-start mt-1">
                                Review Mode
                            </span>
                        )}
                    </div>
                </div>

                {/* CENTER: Audio Player */}
                {isListening && !showModeSelection && (!showResult || isReviewing) && (
                    <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] z-[100] ${(testMode === 'exam' && !isReviewing) ? 'pointer-events-none select-none opacity-90' : ''}`}>
                        {test?.passages?.map((passage, index) => {
                            const src = passage.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file;
                            if (!src) return null;
                            return (
                                <CustomAudioPlayer
                                    key={index}
                                    src={src}
                                    index={index}
                                    activePart={activePart}
                                    testMode={isReviewing ? 'practice' : testMode} 
                                    setAudioTime={setAudioTime}
                                    volume={volume}
                                    onEnded={() => handleEnded(index)}
                                    startTime={passage.startTime || 0}
                                    endTime={passage.endTime || 0}
                                />
                            );
                        })}
                    </div>
                )}

                {/* RIGHT: Official IELTS Controls */}
                <div className="flex items-center gap-6 justify-end flex-1 z-20">
                    


                    <div className="flex items-center gap-6 text-gray-700">
                        <button 
                            onClick={toggleFullScreen}
                            className="hover:text-black transition-colors" 
                            title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                        >
                            {isFullScreen ? (
                                <Minimize size={22} strokeWidth={1.5} />
                            ) : (
                                <Maximize size={22} strokeWidth={1.5} />
                            )}
                        </button>
                        {isListening && (
                            <div className="relative">
                                <button 
                                    className={`hover:text-black transition-colors tooltip flex items-center justify-center p-1.5 rounded-lg border transition-all ${showVolumeSlider ? 'text-white bg-black border-black shadow-md' : 'text-gray-600 bg-white border-gray-200'}`} 
                                    data-tip="Volume"
                                    onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                                >
                                    {volume === 0 ? <VolumeX size={22} strokeWidth={2} /> : 
                                     volume < 0.5 ? <Volume1 size={22} strokeWidth={2} /> : 
                                     <Volume2 size={22} strokeWidth={2} />}
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
                        <button className="hover:text-black transition-colors" title="Notifications">
                            <Bell size={24} strokeWidth={1.5} />
                        </button>
                        <button 
                            className="hover:text-black transition-colors" 
                            title="Menu"
                            onClick={() => {
                                setCurrentView('menu');
                                setIsOptionsOpen(true);
                            }}
                        >
                            <Menu size={24} strokeWidth={1.5} />
                        </button>
                        <button 
                            className="hover:text-black transition-colors" 
                            title="Notes"
                            onClick={onOpenNotes}
                        >
                            <PenLine size={24} strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Finish / Exit Button */}
                    {!showResult && !showModeSelection && (
                        <button
                            onClick={onFinish}
                            disabled={saving}
                            className={`ml-4 px-5 py-2 rounded font-bold text-sm transition-all shadow-sm ${
                                saving ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-95'
                            }`}
                        >
                            {saving ? 'Saving...' : buttonText}
                        </button>
                    )}
                    {(showResult || isReviewing) && (
                        <button 
                            onClick={onFinish} 
                            className="ml-4 px-5 py-2 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-black rounded uppercase tracking-widest border border-red-100 transition-colors"
                        >
                            Exit
                        </button>
                    )}
                </div>
            </header>


            {/* OPTIONS MODAL */}
            <AnimatePresence>
                {isOptionsOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-white flex flex-col items-center pt-24"
                    >
                        <div className="absolute top-0 left-0 right-0 h-[70px] border-b border-gray-100 flex items-center px-6">
                            {/* Centered Title */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <h2 className="text-[18px] font-bold text-gray-900 capitalize">
                                    {currentView === 'menu' ? 'Options' : currentView.replace('-', ' ')}
                                </h2>
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex items-center justify-between w-full relative z-10">
                                {currentView !== 'menu' ? (
                                    <button 
                                        onClick={() => setCurrentView('menu')}
                                        className="flex items-center gap-1.5 text-gray-600 font-bold hover:text-black transition-colors py-2"
                                    >
                                        <ArrowLeft size={20} strokeWidth={2.5} />
                                        <span className="text-sm uppercase tracking-wider">Options</span>
                                    </button>
                                ) : <div />}

                                <button 
                                    onClick={() => setIsOptionsOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={24} className="text-gray-900" />
                                </button>
                            </div>
                        </div>

                        {/* CONTENT CONTAINER */}
                        <div className="w-full max-w-2xl bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                            
                            {currentView === 'menu' && (
                                <div className="divide-y divide-gray-100">
                                    {/* CONTRAST */}
                                    <button 
                                        onClick={() => setCurrentView('contrast')}
                                        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <ContrastIcon size={24} className="text-gray-400 group-hover:text-black" strokeWidth={1.5} />
                                            <span className="text-[17px] font-medium text-gray-700">Contrast</span>
                                        </div>
                                        <ChevronRight size={20} className="text-gray-300" />
                                    </button>

                                    {/* TEXT SIZE */}
                                    <button 
                                        onClick={() => setCurrentView('text-size')}
                                        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <Type size={24} className="text-gray-400 group-hover:text-black" strokeWidth={1.5} />
                                            <span className="text-[17px] font-medium text-gray-700">Text size</span>
                                        </div>
                                        <ChevronRight size={20} className="text-gray-300" />
                                    </button>

                                    {/* TEST INSTRUCTIONS */}
                                    <button 
                                        onClick={() => setCurrentView('instructions')}
                                        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <Info size={24} className="text-gray-400 group-hover:text-black" strokeWidth={1.5} />
                                            <span className="text-[17px] font-medium text-gray-700">Test Instructions</span>
                                        </div>
                                        <ChevronRight size={20} className="text-gray-300" />
                                    </button>
                                </div>
                            )}

                            {/* CONTRAST VIEW */}
                            {currentView === 'contrast' && (
                                <div className="animate-in fade-in slide-in-from-right-4">
                                    <div className="p-8 pt-12">
                                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                            {[
                                                { id: 'default', label: 'Black on white' },
                                                { id: 'white-on-black', label: 'White on black' },
                                                { id: 'yellow-on-black', label: 'Yellow on black' }
                                            ].map((option) => (
                                                <button
                                                    key={option.id}
                                                    onClick={() => handleContrastChange(option.id)}
                                                    className={`w-full flex items-center gap-4 p-5 text-left border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${contrastMode === option.id ? 'bg-gray-50' : ''}`}
                                                >
                                                    <div className="w-5 flex justify-center">
                                                        {contrastMode === option.id && <div className="w-4 h-4 text-black"><CheckIcon size={16} strokeWidth={3} /></div>}
                                                    </div>
                                                    <span className={`text-[17px] ${contrastMode === option.id ? 'font-medium text-black' : 'text-gray-700'}`}>
                                                        {option.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TEXT SIZE VIEW */}
                            {currentView === 'text-size' && (
                                <div className="p-8 text-center">
                                    <h3 className="text-[18px] font-bold text-gray-900 mb-8 mt-4 uppercase tracking-tight">Select Text Size</h3>
                                    <div className="flex border border-gray-200 rounded-2xl overflow-hidden divide-x divide-gray-200">
                                        {['text-sm', 'text-base', 'text-xl'].map((size, idx) => (
                                            <button
                                                key={size}
                                                onClick={() => setTextSize(size)}
                                                className={`flex-1 py-8 transition-all ${textSize === size ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                                            >
                                                <div className={size === 'text-sm' ? 'text-[9px]' : size === 'text-base' ? 'text-[12px]' : 'text-[15px]'}>
                                                    Aa
                                                </div>
                                                <div className="mt-1 text-[9px] uppercase tracking-widest font-bold opacity-60">
                                                    {idx === 0 ? 'Standard' : idx === 1 ? 'Large' : 'Extra Large'}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* INSTRUCTIONS VIEW */}
                            {currentView === 'instructions' && (
                                <div className="p-8">
                                    <h3 className="text-xl font-black mb-4 mt-2">Test Instructions</h3>
                                    <div className="prose prose-sm max-h-[400px] overflow-y-auto pr-2 custom-scrollbar text-left">
                                        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {test?.instructions || (
                                                <div className="p-6 bg-blue-50 rounded-xl text-blue-800 border border-blue-100 flex items-start gap-4">
                                                    <Info size={24} className="shrink-0" />
                                                    <div className="text-sm">
                                                        <p className="font-bold mb-1">How to navigate the test:</p>
                                                        <ul className="list-disc list-inside space-y-1">
                                                            <li>Answer all questions in the allotted time.</li>
                                                            <li>You can flag questions to review them later using the bookmark icon.</li>
                                                            <li>Use the "Finish" button once you have completed all parts of the test.</li>
                                                            <li>Navigation through questions is available at the bottom of the screen.</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default TestHeader;
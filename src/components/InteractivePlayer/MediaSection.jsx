import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize, Minimize, FileText, Play, Pause, Eye, EyeOff, Headphones } from "lucide-react";

export default function MediaSection({ 
    isDark, 
    podcast, 
    isFullscreen, 
    combinedTimeline, 
    activeTimelineIdx, 
    isPlaying,
    setIsPlaying,
    currentTime,
    duration,
    handleSeek: globalHandleSeek,
    setMuteGlobalAudio,
    youtubePlayerRef,
    cyclePlaybackRate,
    playbackRate = 1,
    keyboardShortcutsEnabled = false,
}) {
    const videoRef = React.useRef(null);
    const [isBuffering, setIsBuffering] = React.useState(false);
    const [showScript, setShowScript] = React.useState(true);
    const mediaType = podcast?.mediaType;

    // Sync local video with global state
    React.useEffect(() => {
        if (podcast.mediaType !== 'video' || !videoRef.current) return;
        
        if (isPlaying) {
            videoRef.current.play().catch(() => {});
        } else {
            videoRef.current.pause();
        }
    }, [isPlaying, podcast.mediaType]);

    React.useEffect(() => {
        if (podcast.mediaType !== 'video' || !videoRef.current) return;
        
        // Only sync if difference is significant to avoid loops
        if (Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
            videoRef.current.currentTime = currentTime;
        }
    }, [currentTime, podcast.mediaType]);

    // PREVENT ECHO: Mute the background global audio element when video is visible.
    // Avval element `muted` xossasi to'g'ridan-to'g'ri o'zgartirilardi — context ovoz
    // sozlamalarini qayta qo'llaganda ovoz tiklanib, ikki manba bir vaqtda eshitilardi.
    React.useEffect(() => {
        if (podcast.mediaType !== 'video') return;
        setMuteGlobalAudio?.(true);
        return () => setMuteGlobalAudio?.(false);
    }, [podcast.mediaType, setMuteGlobalAudio]);

    // Mahalliy video tezligi ham global playbackRate bilan sinxron bo'lsin
    React.useEffect(() => {
        if (podcast.mediaType !== 'video' || !videoRef.current) return;
        videoRef.current.playbackRate = playbackRate;
    }, [playbackRate, podcast.mediaType]);

    // Klaviatura yorliqlari — faqat podcast sahifalarida
    const togglePlayback = React.useCallback(() => {
        // YouTube uchun ijro to'g'ridan-to'g'ri iframe API orqali boshlanishi kerak,
        // aks holda brauzer "user gesture" ni yo'qotib, ijro boshlanmay qolardi.
        if (mediaType === 'youtube' && youtubePlayerRef?.current) {
            const yt = youtubePlayerRef.current;
            if (isPlaying) yt.pauseVideo?.();
            else yt.playVideo?.();
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying, setIsPlaying, mediaType, youtubePlayerRef]);

    React.useEffect(() => {
        if (!keyboardShortcutsEnabled) return;

        const handleKeyDown = (e) => {
            const tag = e.target?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            let handled = true;
            switch (e.code) {
                case "Space":
                case "KeyK":
                    togglePlayback();
                    break;
                case "ArrowRight":
                    globalHandleSeek(Math.min(duration || Infinity, currentTime + 5));
                    break;
                case "ArrowLeft":
                    globalHandleSeek(Math.max(0, currentTime - 5));
                    break;
                case "KeyL":
                    globalHandleSeek(Math.min(duration || Infinity, currentTime + 10));
                    break;
                case "KeyJ":
                    globalHandleSeek(Math.max(0, currentTime - 10));
                    break;
                case "KeyS":
                    setShowScript((v) => !v);
                    break;
                case "KeyX":
                    cyclePlaybackRate?.();
                    break;
                default:
                    handled = false;
            }

            if (!handled) return;
            e.preventDefault();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [keyboardShortcutsEnabled, togglePlayback, currentTime, duration, globalHandleSeek, cyclePlaybackRate]);

    const isVideoMode = (podcast.mediaType === 'youtube' || podcast.mediaType === 'video') && podcast.showVideo !== false && String(podcast.showVideo) !== 'false';

    return (
        <section className={`
            lg:h-full lg:w-full border-r relative flex flex-col
            overflow-hidden transition-all duration-500
            ${isDark ? 'border-neutral-800 bg-[#0a0a0c]' : 'border-zinc-100 bg-zinc-50'}
        `}>
            {/* Toggle Script Button */}
            {!isVideoMode && (
                <button
                    onClick={() => setShowScript(!showScript)}
                    className={`absolute top-3 right-3 md:top-4 md:right-4 z-30 p-1.5 md:p-2.5 rounded-full border shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center justify-center gap-1 md:gap-1.5 hover:scale-105 group
                        ${isDark 
                            ? 'bg-neutral-900/80 border-white/10 text-neutral-400 hover:text-white hover:bg-neutral-800/90 shadow-black/25' 
                            : 'bg-white/80 border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/90 shadow-zinc-200/30'
                        }`}
                    title={showScript ? "Hide Script" : "Show Script"}
                >
                    {showScript ? (
                        <>
                            <EyeOff size={14} className="transition-transform group-hover:rotate-6 text-emerald-500 md:w-[16px] md:h-[16px]" />
                            <span className="hidden md:inline text-[10px] font-bold tracking-wider uppercase pr-0.5 select-none">Hide Script</span>
                        </>
                    ) : (
                        <>
                            <Eye size={14} className="transition-transform group-hover:scale-110 text-emerald-500 md:w-[16px] md:h-[16px]" />
                            <span className="hidden md:inline text-[10px] font-bold tracking-wider uppercase pr-0.5 select-none">Show Script</span>
                        </>
                    )}
                </button>
            )}
            {/* STABLE YOUTUBE PLAYER CONTAINER */}
            {podcast.mediaType === 'youtube' && (
                <div 
                    className={`transition-all duration-500 overflow-hidden ${isVideoMode ? 'flex-1 relative flex flex-col items-center justify-center p-0 md:p-4' : 'absolute top-0 left-0 w-[300px] h-[200px] pointer-events-none opacity-[0.001] z-0'}`}
                >
                    <div className={`
                        w-full aspect-video md:rounded-lg overflow-hidden transition-all duration-500 group relative
                        ${isVideoMode && isFullscreen ? 'border-none shadow-none md:rounded-none' : (isDark ? 'border-white/5 md:shadow-2xl' : 'border-zinc-100 md:shadow-lg')}
                    `}>
                        <div 
                            id="youtube-player-iframe"
                            className="w-full h-full"
                        ></div>

                        {/* Interactive Overlays (Only in video mode) */}
                        {isVideoMode && (
                            <>
                                <div className="absolute inset-0 z-20 flex group/shield">
                                    <div 
                                        className="flex-1 cursor-pointer active:bg-white/5 transition-colors"
                                        onDoubleClick={(e) => { e.stopPropagation(); globalHandleSeek(Math.max(0, currentTime - 5)); }}
                                        onClick={() => setIsPlaying(!isPlaying)}
                                    />
                                    <div 
                                        className="flex-1 cursor-pointer active:bg-white/5 transition-colors"
                                        onDoubleClick={(e) => { e.stopPropagation(); globalHandleSeek(Math.min(duration, currentTime + 5)); }}
                                        onClick={() => setIsPlaying(!isPlaying)}
                                    />
                                    {!isPlaying && (
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                            <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] border-2 border-emerald-400/30 group-hover/shield:scale-110 transition-all duration-300">
                                                <Play fill="white" size={24} className="ml-1 text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    {isVideoMode && !isFullscreen && (
                        <div className="hidden md:block mt-8 text-center px-4">
                            <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{podcast.title}</h2>
                            <p className={`${isDark ? 'text-neutral-500' : 'text-zinc-500'} text-sm max-w-md mx-auto`}>Watch the video and complete the tasks on the right side.</p>
                        </div>
                    )}
                </div>
            )}

            {/* LOCAL VIDEO PLAYER CONTAINER */}
            {podcast.mediaType === 'video' && isVideoMode && (
                <div className={`flex-1 relative flex flex-col items-center justify-center p-0 md:p-4 ${isDark ? 'bg-black' : (isFullscreen ? 'bg-black' : 'bg-zinc-50')}`}>
                    <div className={`w-full aspect-video md:rounded-lg overflow-hidden transition-all duration-500 group relative ${isFullscreen ? 'border-none shadow-none md:rounded-none' : (isDark ? 'border-white/5 md:shadow-2xl' : 'border-zinc-100 md:shadow-lg')}`}>
                        <video 
                            ref={videoRef}
                            className="w-full h-full object-contain"
                            src={podcast.audioUrl}
                            onWaiting={() => setIsBuffering(true)}
                            onPlaying={() => setIsBuffering(false)}
                            onClick={() => setIsPlaying(!isPlaying)}
                        />
                        {isBuffering && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-30 pointer-events-none">
                                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TRANSCRIPT VIEW (Only if NOT isVideoMode) */}
            {!isVideoMode && (
                <div className="flex-1 relative overflow-hidden flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        {showScript ? (
                            <motion.div
                                key="transcript"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2 }}
                                className="h-full w-full flex flex-col justify-center items-center relative overflow-hidden"
                            >
                                <div className={`absolute top-0 left-0 w-full h-24 z-10 pointer-events-none ${isDark ? 'bg-gradient-to-b from-[#0a0a0c] to-transparent' : 'bg-gradient-to-b from-zinc-50 to-transparent'}`}></div>
                                <div className={`absolute bottom-0 left-0 w-full h-24 z-10 pointer-events-none ${isDark ? 'bg-gradient-to-t from-[#0a0a0c] to-transparent' : 'bg-gradient-to-t from-zinc-50 to-transparent'}`}></div>

                                <div className="flex-1 flex flex-col-reverse justify-start items-center gap-2 pb-4 overflow-hidden opacity-40">
                                    {[-1, -2, -3, -4, -5].map(offset => {
                                        const item = combinedTimeline[activeTimelineIdx + offset];
                                        if (!item) return null;
                                        return (
                                            <div key={`${item.time}-${item.text}`} className="text-center w-full px-12 cursor-pointer transition-all hover:opacity-100" onClick={() => globalHandleSeek(item.time)}>
                                                <p className={`font-medium text-sm leading-relaxed italic ${isDark ? 'text-neutral-400' : 'text-zinc-500'}`}>{item.text}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex-none py-4 z-10 min-h-[60px] flex items-center">
                                    <motion.div 
                                        key={activeTimelineIdx === -1 ? 'intro' : `${combinedTimeline[activeTimelineIdx]?.time}-${combinedTimeline[activeTimelineIdx]?.text}`}
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1.05, y: 0 }}
                                        className="text-center px-12 max-w-2xl cursor-pointer"
                                        onClick={() => activeTimelineIdx !== -1 && globalHandleSeek(combinedTimeline[activeTimelineIdx]?.time)}
                                    >
                                        <p className={`font-bold text-lg leading-snug tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                            {activeTimelineIdx === -1 ? 'Podcast beginning...' : combinedTimeline[activeTimelineIdx]?.text}
                                        </p>
                                    </motion.div>
                                </div>

                                <div className="flex-1 flex flex-col justify-start items-center gap-2 pt-4 overflow-hidden opacity-40">
                                    {[1, 2, 3, 4, 5].map(offset => {
                                        const item = combinedTimeline[activeTimelineIdx + offset];
                                        if (!item) return null;
                                        return (
                                            <div key={`${item.time}-${item.text}`} className="text-center w-full px-12 cursor-pointer transition-all hover:opacity-100" onClick={() => globalHandleSeek(item.time)}>
                                                <p className={`font-medium text-sm leading-relaxed italic ${isDark ? 'text-neutral-400' : 'text-zinc-500'}`}>{item.text}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="visualizer"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2 }}
                                className="flex-1 flex flex-col items-center justify-center p-8 relative animate-in"
                            >
                                <div className={`
                                    relative w-40 h-40 md:w-44 md:h-44 rounded-3xl overflow-hidden flex flex-col items-center justify-center border shadow-2xl transition-all duration-500 group
                                    ${isDark ? 'bg-gradient-to-b from-neutral-900 to-[#121214] border-white/5 shadow-black/45' : 'bg-gradient-to-b from-white to-zinc-50 border-zinc-100 shadow-zinc-200/40'}
                                `}>
                                    {podcast.thumbnail ? (
                                        <img 
                                            src={podcast.thumbnail} 
                                            alt={podcast.title} 
                                            className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`} 
                                        />
                                    ) : (
                                        <div className={`w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br ${isDark ? 'from-neutral-800 to-neutral-900' : 'from-zinc-100 to-zinc-200'}`}>
                                            <div className="absolute w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl animate-pulse" />
                                            <Headphones size={44} className="text-emerald-500 mb-2 z-10 animate-bounce" />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-6 text-center max-w-xs px-4">
                                    <h2 className={`text-base md:text-lg font-bold mb-1.5 tracking-tight line-clamp-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{podcast.title}</h2>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${isDark ? 'bg-neutral-800 text-neutral-400 border border-white/5' : 'bg-zinc-100 text-zinc-600 border border-zinc-250'}`}>
                                        LEVEL {podcast.level || "B2"}
                                    </span>
                                </div>

                                {/* Dynamic Visualizer */}
                                <div className="flex items-end justify-center gap-1.5 mt-6 h-8">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
                                        <div 
                                            key={bar} 
                                            className="w-1 rounded-full bg-emerald-500 transition-all duration-300"
                                            style={{
                                                height: isPlaying ? '100%' : '15%',
                                                animation: isPlaying ? `bounce 1.${bar}s ease-in-out infinite alternate` : 'none',
                                                animationDelay: `${bar * 0.12}s`
                                            }}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </section>
    );
}

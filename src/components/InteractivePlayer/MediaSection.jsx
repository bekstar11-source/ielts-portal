import React from "react";
import { motion } from "framer-motion";
import { Maximize, Minimize, FileText, Play, Pause } from "lucide-react";

export default function MediaSection({ 
    isDark, 
    podcast, 
    isFullscreen, 
    toggleFullscreen, 
    isTasksVisible, 
    setIsTasksVisible, 
    combinedTimeline, 
    activeTimelineIdx, 
    isPlaying,
    setIsPlaying,
    currentTime,
    duration,
    handleSeek: globalHandleSeek,
    audioRef
}) {
    const videoRef = React.useRef(null);
    const [isBuffering, setIsBuffering] = React.useState(false);
    const [showControls, setShowControls] = React.useState(false);
    const controlsTimeoutRef = React.useRef(null);

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

    // PREVENT ECHO: Mute the background global audio element when video is visible
    React.useEffect(() => {
        if (podcast.mediaType === 'video' && audioRef.current) {
            const originalMuted = audioRef.current.muted;
            audioRef.current.muted = true; // Mute the hidden global player
            return () => {
                if (audioRef.current) audioRef.current.muted = originalMuted; // Restore on unmount
            };
        }
    }, [podcast.mediaType, audioRef]);

    // Handle Controls Visibility on Play/Pause
    React.useEffect(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 2000);
    }, [isPlaying]);

    // Keyboard Shortcuts (Space for Play/Pause, Arrows for Seeking)
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

            if (e.code === "Space") {
                e.preventDefault();
                if (!isPlaying && podcast?.mediaType === 'youtube' && globalHandleSeek /* we can't easily access youtubePlayerRef here unless we pass it */) {
                    // We need to pass youtubePlayerRef from InteractivePlayer to MediaSection to do this synchronously
                }
                setIsPlaying(!isPlaying);
                setShowControls(true);
            } else if (e.code === "ArrowRight") {
                e.preventDefault();
                globalHandleSeek(Math.min(duration, currentTime + 5));
                setShowControls(true);
            } else if (e.code === "ArrowLeft") {
                e.preventDefault();
                globalHandleSeek(Math.max(0, currentTime - 5));
                setShowControls(true);
            }

            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2000);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPlaying, setIsPlaying, currentTime, duration, globalHandleSeek]);

    const isVideoMode = (podcast.mediaType === 'youtube' || podcast.mediaType === 'video') && podcast.showVideo !== false && String(podcast.showVideo) !== 'false';

    return (
        <section className={`
            lg:col-span-6 border-r relative flex flex-col
            overflow-hidden transition-all duration-500
            ${isDark ? 'border-neutral-800 bg-[#0a0a0c]' : 'border-zinc-100 bg-zinc-50'}
        `}>
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
                    <div className={`absolute top-0 left-0 w-full h-32 z-10 pointer-events-none ${isDark ? 'bg-gradient-to-b from-[#0a0a0c] to-transparent' : 'bg-gradient-to-b from-zinc-50 to-transparent'}`}></div>
                    <div className={`absolute bottom-0 left-0 w-full h-32 z-10 pointer-events-none ${isDark ? 'bg-gradient-to-t from-[#0a0a0c] to-transparent' : 'bg-gradient-to-t from-zinc-50 to-transparent'}`}></div>

                    <div className="h-full flex flex-col justify-center items-center relative overflow-hidden">
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
                    </div>
                </div>
            )}
        </section>
    );
}

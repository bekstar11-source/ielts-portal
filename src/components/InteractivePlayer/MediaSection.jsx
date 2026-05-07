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

    return (
        <section className={`
            lg:col-span-6 border-r relative flex flex-col
            overflow-hidden transition-all duration-500
            ${isDark ? 'border-neutral-800 bg-[#0a0a0c]' : 'border-zinc-100 bg-zinc-50'}
        `}>
            {(!isFullscreen || (podcast.mediaType !== 'youtube' && podcast.mediaType !== 'video')) && (
                <div className={`h-12 md:h-16 shrink-0 px-4 md:px-8 flex items-center border-b ${isDark ? 'border-neutral-800' : 'border-zinc-100'}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-neutral-500' : 'text-zinc-400'}`}>
                        {podcast.mediaType === 'youtube' || podcast.mediaType === 'video' ? 'Video Lesson' : 'Audio Transcript'}
                    </h3>
                </div>
            )}
            
            {podcast.mediaType === 'youtube' || podcast.mediaType === 'video' ? (
                <div className={`flex-1 relative flex flex-col items-center justify-center p-0 md:p-4 ${!isDark && !isFullscreen ? 'bg-zinc-100/50' : 'bg-black'}`}>
                    <div className={`
                        w-full aspect-video md:rounded-lg shadow-2xl border 
                        bg-black overflow-hidden transition-all duration-500 group relative
                        ${isDark ? 'border-white/5' : 'border-zinc-200'}
                    `}>
                        {podcast.mediaType === 'youtube' ? (
                            <iframe 
                                id="youtube-player-iframe"
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${podcast.youtubeId}?autoplay=0&modestbranding=1&rel=0&controls=0&enablejsapi=1&iv_load_policy=3&disablekb=1&origin=${window.location.origin}`}
                                title="YouTube video player" 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                referrerPolicy="strict-origin-when-cross-origin" 
                            ></iframe>
                        ) : (
                            <div className="w-full h-full relative">
                                <video 
                                    ref={videoRef}
                                    className="w-full h-full object-contain"
                                    src={podcast.audioUrl}
                                    onWaiting={() => setIsBuffering(true)}
                                    onPlaying={() => setIsBuffering(false)}
                                    onCanPlay={() => setIsBuffering(false)}
                                    onLoadStart={() => setIsBuffering(true)}
                                    onClick={() => setIsPlaying(!isPlaying)}
                                />
                                
                                {isBuffering && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-30 pointer-events-none">
                                        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Hover Shield & Custom Play Button */}
                        <div 
                            className="absolute inset-0 z-20 cursor-pointer bg-black/10 hover:bg-black/20 transition-all flex items-center justify-center group/shield" 
                            onClick={() => setIsPlaying(!isPlaying)}
                        >
                            {!isPlaying && (
                                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)] border-4 border-emerald-400/30 group-hover/shield:scale-110 transition-all duration-300">
                                    <Play fill="white" size={32} className="ml-1.5 text-white" />
                                </div>
                            )}
                        </div>

                        {/* Corner Fullscreen Toggle (Right) */}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFullscreen();
                            }}
                            className={`absolute bottom-4 right-4 md:bottom-6 md:right-6 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full ${isFullscreen ? 'bg-white/20 hover:bg-white/30 backdrop-blur-md' : 'bg-emerald-600 hover:bg-emerald-500'} text-white transition-all shadow-lg border border-white/20 flex items-center justify-center group/btn active:scale-90`}
                            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                        >
                            {isFullscreen ? (
                                <Minimize size={20} className="group-hover/btn:scale-110 transition-transform" />
                            ) : (
                                <Maximize size={22} className="group-hover/btn:scale-110 transition-transform" />
                            )}
                        </button>
                    </div>

                    {!isFullscreen && (
                        <div className="mt-4 md:mt-8 text-center px-4">
                            <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{podcast.title}</h2>
                            <p className={`${isDark ? 'text-neutral-500' : 'text-zinc-500'} text-sm max-w-md mx-auto`}>Watch the video and complete the tasks on the right side.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 relative overflow-hidden flex flex-col justify-center">
                    <div className={`absolute top-0 left-0 w-full h-32 z-10 pointer-events-none ${isDark ? 'bg-gradient-to-b from-[#0a0a0c] to-transparent' : 'bg-gradient-to-b from-zinc-50 to-transparent'}`}></div>
                    <div className={`absolute bottom-0 left-0 w-full h-32 z-10 pointer-events-none ${isDark ? 'bg-gradient-to-t from-[#0a0a0c] to-transparent' : 'bg-gradient-to-t from-zinc-50 to-transparent'}`}></div>

                    <div className="h-full flex flex-col justify-center items-center relative overflow-hidden">
                        <div className="flex-1 flex flex-col-reverse justify-start items-center gap-8 pb-8 overflow-hidden opacity-40">
                            {[-1, -2, -3].map(offset => {
                                const item = combinedTimeline[activeTimelineIdx + offset];
                                if (!item) return null;
                                return (
                                    <div key={item.time} className="text-center w-full px-12 cursor-pointer transition-all hover:opacity-100" onClick={() => handleSeek(item.time)}>
                                        <p className={`font-medium text-lg leading-relaxed italic ${isDark ? 'text-neutral-400' : 'text-zinc-500'}`}>{item.text}</p>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex-none py-8 z-10">
                            <motion.div 
                                key={combinedTimeline[activeTimelineIdx]?.time}
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1.05, y: 0 }}
                                className="text-center px-12 max-w-2xl cursor-pointer"
                                onClick={() => handleSeek(combinedTimeline[activeTimelineIdx]?.time)}
                            >
                                <p className={`font-bold text-3xl leading-snug tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                    {combinedTimeline[activeTimelineIdx]?.text}
                                </p>
                            </motion.div>
                        </div>

                        <div className="flex-1 flex flex-col justify-start items-center gap-8 pt-8 overflow-hidden opacity-40">
                            {[1, 2, 3].map(offset => {
                                const item = combinedTimeline[activeTimelineIdx + offset];
                                if (!item) return null;
                                return (
                                    <div key={item.time} className="text-center w-full px-12 cursor-pointer transition-all hover:opacity-100" onClick={() => handleSeek(item.time)}>
                                        <p className={`font-medium text-lg leading-relaxed italic ${isDark ? 'text-neutral-400' : 'text-zinc-500'}`}>{item.text}</p>
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

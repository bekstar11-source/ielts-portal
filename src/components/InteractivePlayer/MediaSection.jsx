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

    // Keyboard Shortcuts (Space for Play/Pause)
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
                e.preventDefault();
                setIsPlaying(!isPlaying);
                // Show controls when space is pressed
                setShowControls(true);
                if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
                controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2000);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPlaying, setIsPlaying]);

    return (
        <section className={`
            ${isFullscreen && (podcast.mediaType === 'youtube' || podcast.mediaType === 'video')
                ? 'absolute inset-0 z-0' 
                : 'lg:col-span-6 border-r relative flex flex-col'} 
            overflow-hidden transition-all duration-500
            ${isDark ? 'border-neutral-800 bg-[#0a0a0c]' : 'border-zinc-100 bg-zinc-50'}
        `}>
            {(!isFullscreen || (podcast.mediaType !== 'youtube' && podcast.mediaType !== 'video')) && (
                <div className={`h-12 shrink-0 px-8 flex items-center border-b ${isDark ? 'border-neutral-800' : 'border-zinc-100'}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-neutral-500' : 'text-zinc-400'}`}>
                        {podcast.mediaType === 'youtube' || podcast.mediaType === 'video' ? 'Video Lesson' : 'Audio Transcript'}
                    </h3>
                </div>
            )}
            
            {podcast.mediaType === 'youtube' || podcast.mediaType === 'video' ? (
                <div className={`flex-1 relative ${isFullscreen ? 'w-full h-full' : 'flex flex-col items-center justify-center p-4'} ${!isDark && !isFullscreen ? 'bg-zinc-100/50' : ''}`}>
                    <div className={`
                        ${isFullscreen ? 'absolute inset-0' : 'w-full aspect-video rounded-lg shadow-2xl border'} 
                        bg-black overflow-hidden transition-all duration-500 group
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
                        {!isFullscreen && (
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
                        )}

                        {/* Corner Fullscreen Toggle (Right) - Only show when NOT in fullscreen */}
                        {!isFullscreen && (
                            <button 
                                onClick={toggleFullscreen}
                                className="absolute bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/30 flex items-center justify-center group/btn active:scale-90"
                                title="Enter Fullscreen"
                            >
                                <Maximize size={22} className="group-hover/btn:scale-110 transition-transform" />
                            </button>
                        )}
                    </div>

                    {isFullscreen && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-8 py-2.5 rounded-full bg-black/10 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-4 flex items-center justify-center">
                            <h2 className="text-white text-xs font-bold tracking-wide whitespace-nowrap opacity-90">{podcast.title}</h2>
                        </div>
                    )}

                    {!isFullscreen && (
                        <div className="mt-8 text-center px-4">
                            <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{podcast.title}</h2>
                            <p className={`${isDark ? 'text-neutral-500' : 'text-zinc-500'} text-sm max-w-md mx-auto`}>Watch the video and complete the tasks on the right side.</p>
                        </div>
                    )}
                    
                    {isFullscreen && (
                        <div className="absolute top-4 left-6 z-40 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                            <div className="hidden xl:flex px-4 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-white text-[8px] font-black uppercase tracking-[0.1em]">Cinema Mode Active</p>
                            </div>
                        </div>
                    )}

                    {/* Pinned Task Toggle (Right Edge) */}
                    {isFullscreen && (
                        <motion.button 
                            initial={{ x: 20 }}
                            animate={{ x: isTasksVisible ? 100 : 0 }}
                            whileHover={{ x: -5 }}
                            onClick={() => setIsTasksVisible(!isTasksVisible)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-50 w-12 h-20 bg-emerald-600/80 backdrop-blur-md border-y border-l border-emerald-500/30 rounded-l-2xl flex items-center justify-center text-white shadow-[-10px_0_20px_rgba(0,0,0,0.3)] transition-all group"
                        >
                            <div className="flex flex-col items-center gap-1">
                                <FileText size={20} className="group-hover:scale-110 transition-transform" />
                                <span className="text-[7px] font-black uppercase vertical-text tracking-tighter">Tasks</span>
                            </div>
                        </motion.button>
                    )}

                    {/* Fullscreen Floating Progress Bar & Controls */}
                    {isFullscreen && (
                        <div 
                            className={`absolute bottom-0 left-0 right-0 z-50 p-8 pt-20 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 group/fs-controls
                                ${showControls ? 'opacity-100' : 'opacity-0 hover:opacity-100'}
                            `}
                        >
                            <div className="w-full px-4 lg:px-4 space-y-4">
                                {/* Progress Bar */}
                                <div 
                                    className="h-1.5 w-full bg-white/20 rounded-full cursor-pointer relative group/progress overflow-hidden"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const percent = (e.clientX - rect.left) / rect.width;
                                        globalHandleSeek(percent * (duration || 1));
                                    }}
                                >
                                    <div 
                                        className="h-full bg-emerald-500 relative"
                                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                                    >
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-xl scale-0 group-hover/progress:scale-100 transition-transform" />
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <button 
                                            onClick={() => setIsPlaying(!isPlaying)}
                                            className="text-white hover:text-emerald-400 transition-colors"
                                        >
                                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                                        </button>
                                        <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-white/70">
                                            <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}</span>
                                            <span className="opacity-30">/</span>
                                            <span>{Math.floor((duration || 0) / 60)}:{(Math.floor((duration || 0) % 60)).toString().padStart(2, '0')}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Corner Fullscreen Toggle (Right) */}
                                        <button 
                                            onClick={toggleFullscreen}
                                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all flex items-center justify-center group/btn active:scale-90"
                                            title="Exit Fullscreen"
                                        >
                                            <Minimize size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Video Click Overlay */}
                    {isFullscreen && isTasksVisible && (
                        <div 
                            onClick={() => setIsTasksVisible(false)}
                            className="absolute inset-0 z-20 cursor-pointer"
                            title="Click to hide tasks"
                        />
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

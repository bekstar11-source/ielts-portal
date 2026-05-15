import React, { useRef, useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';

/**
 * CustomAudioPlayer Component
 * 
 * Multi-part listening tests uchun maxsus audio player.
 * Har bir 'part' uchun alohida audio element bo'ladi, lekin faqat active part UI ko'rinadi.
 */
const CustomAudioPlayer = forwardRef(({ 
    src, 
    index, 
    activePart, 
    testMode, 
    setAudioTime, 
    onEnded, 
    startTime = 0, 
    endTime = 0,
    variant = 'light', // 'light' (default) or 'dark' (for dark headers)
    isPlayingPart,
    isBuffering = false,
    shouldAutoPlay = false, // Only true when exam is fully ready to play
    volume = 1,
    resumeTime = 0,
}, ref) => {
    const audioRef = useRef(null);
    const hasResumed = useRef(false);

    // Allow parent to seek
    useImperativeHandle(ref, () => ({
        seekTo: (time) => {
            console.log("[CustomAudioPlayer] seekTo called with time:", time);
            if (audioRef.current) {
                let targetTime = 0;
                
                // Parse time if it's a string like "1:30" or "01:30"
                if (typeof time === 'string' && time.includes(':')) {
                    const parts = time.split(':').map(Number);
                    if (parts.length === 2) {
                        targetTime = parts[0] * 60 + parts[1];
                    } else if (parts.length === 3) {
                        targetTime = parts[0] * 3600 + parts[1] * 60 + parts[2];
                    }
                } else {
                    targetTime = Number(time);
                }

                if (isNaN(targetTime)) targetTime = 0;

                console.log("[CustomAudioPlayer] Parsed targetTime:", targetTime, "startTime:", startTime);

                // Set time relative to the passage's startTime
                audioRef.current.currentTime = startTime + targetTime;
                
                // Pause all other audio elements to prevent overlapping audio
                document.querySelectorAll('audio[id^="audio-part-"]').forEach(a => {
                    if (a !== audioRef.current && !a.paused) {
                        console.log("[CustomAudioPlayer] Pausing other audio:", a.id);
                        a.pause();
                    }
                });

                // Play audio
                console.log("[CustomAudioPlayer] Playing audio from:", audioRef.current.currentTime);
                audioRef.current.play().catch(err => {
                    console.error("[CustomAudioPlayer] Play error after seek:", err);
                });
            } else {
                console.error("[CustomAudioPlayer] audioRef.current is null!");
            }
        }
    }));
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const progressRef = useRef(null);
    const isVisible = index === activePart;
    const isExam = testMode === 'exam';

    const speeds = [1, 1.2, 1.5, 0.8];

    // Theme values
    const isDark = variant === 'dark';
    const containerClass = isDark 
        ? "w-full flex items-center gap-2 md:gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/5 px-2 md:px-3 py-0.5 md:py-1 shadow-sm backdrop-blur-sm" 
        : "w-full flex items-center gap-2 md:gap-3 overflow-hidden rounded-lg md:rounded-xl border border-gray-200 bg-white px-2 md:px-3 py-1 md:py-1.5 shadow-sm";
    
    const timeClass = isDark ? "text-[9px] md:text-[10px] font-mono text-gray-400 shrink-0 tabular-nums" : "text-[10px] md:text-[11px] font-mono text-gray-400 shrink-0 tabular-nums";
    const railClass = isDark ? "flex-1 h-1 bg-white/10 cursor-pointer relative rounded-full group touch-none" : "flex-1 h-1 md:h-1.5 bg-gray-100 cursor-pointer relative rounded-full group touch-none";
    const fillClass = isDark ? "absolute top-0 left-0 h-full bg-white rounded-full opacity-80" : "absolute top-0 left-0 h-full bg-black rounded-full";
    const thumbClass = isDark ? "absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" : "absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-black rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity";
    const btnClass = isDark 
        ? `flex-shrink-0 w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full transition-colors focus:outline-none ${isExam ? 'text-white/20' : 'bg-white/10 hover:bg-white/20 text-white'}` 
        : `flex-shrink-0 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full transition-colors focus:outline-none ${isExam ? 'bg-gray-100 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-black'}`;

    // Wire up audio events
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded_ = () => { setIsPlaying(false); onEnded?.(); };
        
        const onLoaded = () => {
            if (endTime && endTime > startTime) {
                setDuration(endTime - startTime);
            } else {
                setDuration(audio.duration || 0);
            }
            // Apply current playback rate on load
            audio.playbackRate = playbackRate;
            // Apply current volume on load
            audio.volume = volume;
        };

        const onTimeUpdate = () => {
            const relTime = audio.currentTime - startTime;
            if (!isDragging) {
                setCurrentTime(Math.max(0, relTime));
            }
            if (isPlayingPart) setAudioTime?.(audio.currentTime);

            if (endTime && endTime > startTime && audio.currentTime >= endTime) {
                audio.pause();
                onEnded_();
            }
        };

        const onPauseExam = (e) => {
            // Only force-resume on the ACTIVE (playing) part
            if (isExam && isPlayingPart && !e.target.ended) e.target.play().catch(() => {});
        };

        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('pause', onPauseExam);
        audio.addEventListener('ended', onEnded_);
        audio.addEventListener('loadedmetadata', onLoaded);
        audio.addEventListener('timeupdate', onTimeUpdate);

        // Sync volume and playback rate immediately
        audio.playbackRate = playbackRate;
        audio.volume = volume;

        // Ensure we start at startTime
        if (audio.currentTime < startTime) {
            audio.currentTime = startTime;
        }

        return () => {
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('pause', onPauseExam);
            audio.removeEventListener('ended', onEnded_);
            audio.removeEventListener('loadedmetadata', onLoaded);
            audio.removeEventListener('timeupdate', onTimeUpdate);
        };
    }, [isVisible, isDragging, isExam, setAudioTime, onEnded, startTime, endTime, playbackRate, volume, isPlayingPart]);

    // Resume logic: Seek to saved time once on init
    useEffect(() => {
        if (!hasResumed.current && resumeTime > 0 && audioRef.current && isPlayingPart) {
            console.log("[CustomAudioPlayer] Resuming audio to:", resumeTime);
            audioRef.current.currentTime = resumeTime;
            hasResumed.current = true;
        }
    }, [resumeTime, isPlayingPart]);

    // Exam auto-play logic
    useEffect(() => {
        if (!isExam) return;
        
        const audio = audioRef.current;
        if (!audio) return;

        if (!isPlayingPart || isBuffering || !shouldAutoPlay) {
            // Pause if: wrong part, buffering, or not yet permitted to play
            if (!audio.paused) {
                audio.pause();
            }
            return;
        }

        const attemptPlay = () => {
            if (audio && audio.paused && !audio.ended && audio.readyState >= 2) {
                audio.play()
                    .then(() => {
                        console.log(`[CustomAudioPlayer] Part ${index} successfully started auto-play.`);
                    })
                    .catch(err => {
                        console.warn(`[CustomAudioPlayer] Part ${index} play attempt failed:`, err.name);
                    });
            }
        };

        attemptPlay();
        const interval = setInterval(attemptPlay, 1000);
        
        const unlock = () => { 
            console.log("[CustomAudioPlayer] Interaction detected, attempting to unlock audio...");
            attemptPlay(); 
        };

        const events = ['click', 'keydown', 'mousedown', 'pointerdown', 'touchstart'];
        events.forEach(event => document.addEventListener(event, unlock));

        return () => {
            clearInterval(interval);
            events.forEach(event => document.removeEventListener(event, unlock));
        };
    }, [isExam, isPlayingPart, isBuffering, shouldAutoPlay, index, src]);

    const togglePlay = () => {
        if (isExam) return;
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            // To'xtatish kerak bo'lgan boshqa barcha audio elementlarni to'xtatamiz
            document.querySelectorAll('audio[id^="audio-part-"]').forEach(a => {
                if (a !== audio && !a.paused) a.pause();
            });
            audio.play().catch(() => { });
        } else {
            audio.pause();
        }
    };

    const calculateTime = useCallback((e) => {
        const rect = progressRef.current?.getBoundingClientRect();
        if (!rect || !duration) return null;
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        return pct * duration;
    }, [duration]);

    const handlePointerDown = (e) => {
        if (isExam) return;
        setIsDragging(true);
        const newTime = calculateTime(e);
        if (newTime !== null) setCurrentTime(newTime);
    };

    const handlePointerMove = (e) => {
        if (!isDragging || isExam) return;
        const newTime = calculateTime(e);
        if (newTime !== null) setCurrentTime(newTime);
    };

    const handlePointerUp = (e) => {
        if (!isDragging || isExam) return;
        setIsDragging(false);
        const newTime = calculateTime(e);
        if (newTime !== null) {
            setCurrentTime(newTime);
            if (audioRef.current) {
                audioRef.current.currentTime = startTime + newTime;
            }
        }
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const fmtTime = (s) => {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const handleSpeedToggle = () => {
        if (isExam) return;
        const currentIndex = speeds.indexOf(playbackRate);
        const nextIndex = (currentIndex + 1) % speeds.length;
        setPlaybackRate(speeds[nextIndex]);
    };

    // Pause audio on unmount (but do NOT clear src — that causes NotSupportedError on re-render)
    useEffect(() => {
        const audio = audioRef.current;
        return () => {
            if (audio) {
                audio.pause();
            }
        };
    }, []);

    // Memoize the audio element to keep it stable and prevent re-creation
    const audioElement = useMemo(() => (
        <audio
            ref={audioRef}
            id={`audio-part-${index}`}
            src={src}
            preload="auto"
            style={{ display: 'none' }}
        />
    ), [src, index]);

    return (
        <div className={isVisible ? "" : "hidden"} style={{ display: isVisible ? 'block' : 'none' }}>
            {audioElement}
            {isVisible && (
                <div className={containerClass}>
                    {/* Play / Pause */}
                    <button
                        onClick={togglePlay}
                        disabled={isExam}
                        className={btnClass}
                        title={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <rect x="6" y="4" width="4" height="16" rx="1" />
                                <rect x="14" y="4" width="4" height="16" rx="1" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>

                    {/* Progress Bar & Time */}
                    <div className="flex-1 flex items-center gap-2">
                        <span className={timeClass}>
                            {fmtTime(currentTime)}
                        </span>
                        <div
                            ref={progressRef}
                            className={railClass}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                        >
                            {/* Progress Fill */}
                            <div
                                className={fillClass}
                                style={{ width: `${progress}%` }}
                            />
                            {/* Thumb */}
                            <div
                                className={thumbClass}
                                style={{ left: `calc(${progress}% - 4px)` }}
                            />
                        </div>
                        <span className={timeClass}>
                            {fmtTime(duration)}
                        </span>
                    </div>

                    {/* Speed Toggle */}
                    <button
                        onClick={handleSpeedToggle}
                        disabled={isExam}
                        title="Playback Speed"
                        className={`shrink-0 min-w-[32px] h-6 flex items-center justify-center rounded-md text-[10px] font-bold border transition-all ${
                            isExam ? 'opacity-20 cursor-not-allowed' : 'hover:scale-105 active:scale-95 cursor-pointer'
                        } ${
                            isDark 
                            ? 'border-white/10 text-gray-400 bg-white/5 hover:bg-white/10 hover:text-white' 
                            : 'border-gray-200 text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-black'
                        }`}
                    >
                        {playbackRate}x
                    </button>
                </div>
            )}
        </div>
    );
});

export default CustomAudioPlayer;

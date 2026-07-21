import React, { useRef, useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { getCdnUrl } from '../../utils/cdnUtils';

const processTimeStr = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'string' && val.includes(':')) {
        const parts = val.split(':').map(Number);
        if (parts.length === 2) {
            return (parts[0] || 0) * 60 + (parts[1] || 0);
        } else if (parts.length === 3) {
            return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
        }
    }
    return Number(val) || 0;
};

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
    extraSilentTime = 0,
    onDurationCalculated,
}, ref) => {
    const audioRef = useRef(null);
    const hasResumed = useRef(false);
    const hasPlayed = useRef(false);
    const isSystemPausedRef = useRef(false);
    const silentElapsedRef = useRef(0);
    const silentTimerRef = useRef(null);
    const [isSilentPeriod, setIsSilentPeriod] = useState(false);
    const isSilentRef = useRef(false);

    const parsedStartTime = useMemo(() => processTimeStr(startTime), [startTime]);
    const parsedEndTime = useMemo(() => processTimeStr(endTime), [endTime]);

    // Allow parent to seek
    useImperativeHandle(ref, () => ({
        seekTo: (time) => {
            console.log("[CustomAudioPlayer] seekTo called with time:", time);
            if (audioRef.current) {
                let targetTime = processTimeStr(time);

                if (isNaN(targetTime)) targetTime = 0;

                console.log("[CustomAudioPlayer] Parsed targetTime:", targetTime, "startTime:", parsedStartTime);

                // Smart absolute/relative detection:
                // If targetTime is less than parsedStartTime, the admin likely provided a relative timestamp.
                // If targetTime is greater than or equal to parsedStartTime, they likely provided an absolute timestamp.
                let finalTime = targetTime;
                if (parsedStartTime > 0 && targetTime < parsedStartTime) {
                    finalTime = parsedStartTime + targetTime;
                }

                // Set time safely
                audioRef.current.currentTime = finalTime;
                
                // Pause all other audio elements to prevent overlapping audio
                document.querySelectorAll('audio[id^="audio-part-"]').forEach(a => {
                    if (a !== audioRef.current && !a.paused) {
                        console.log("[CustomAudioPlayer] Pausing other audio:", a.id);
                        a.pause();
                    }
                });

                // Reset silent period if any
                isSilentRef.current = false;
                setIsSilentPeriod(false);
                if (silentTimerRef.current) {
                    clearInterval(silentTimerRef.current);
                    silentTimerRef.current = null;
                }

                // Play audio
                console.log("[CustomAudioPlayer] Playing audio from:", audioRef.current.currentTime);
                isSystemPausedRef.current = false;
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

    const resumeSilentPeriod = useCallback((segmentDur) => {
        if (silentTimerRef.current) clearInterval(silentTimerRef.current);

        const totalSilence = Number(extraSilentTime) || 0;

        silentTimerRef.current = setInterval(() => {
            silentElapsedRef.current += 0.1;
            if (silentElapsedRef.current >= totalSilence) {
                clearInterval(silentTimerRef.current);
                silentTimerRef.current = null;
                isSilentRef.current = false;
                setIsSilentPeriod(false);
                setCurrentTime(segmentDur + totalSilence);
                onEnded?.();
            } else {
                setCurrentTime(segmentDur + silentElapsedRef.current);
            }
        }, 100);
    }, [extraSilentTime, onEnded]);

    const startSilentPeriod = useCallback((segmentDur) => {
        if (isSilentRef.current) return;
        isSilentRef.current = true;
        setIsSilentPeriod(true);
        silentElapsedRef.current = 0;

        resumeSilentPeriod(segmentDur);
    }, [resumeSilentPeriod]);

    // Separate useEffect to handle duration calculation dynamically
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        
        const updateDuration = () => {
            let segDur = 0;
            if (parsedEndTime && parsedEndTime > parsedStartTime) {
                segDur = parsedEndTime - parsedStartTime;
            } else {
                segDur = audio.duration || 0;
            }
            if (!isNaN(segDur) && segDur > 0) {
                const calculatedDur = segDur + (Number(extraSilentTime) || 0);
                setDuration(calculatedDur);
                onDurationCalculated?.(calculatedDur);
            }
        };

        updateDuration();
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('durationchange', updateDuration);
        return () => {
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('durationchange', updateDuration);
        };
    }, [parsedStartTime, parsedEndTime, extraSilentTime, src, onDurationCalculated]);

    // Wire up audio events
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onPlay = () => {
            setIsPlaying(true);
            hasPlayed.current = true;
            isSystemPausedRef.current = false;
            setIsSilentPeriod(false);
            isSilentRef.current = false;
            if (silentTimerRef.current) {
                clearInterval(silentTimerRef.current);
                silentTimerRef.current = null;
            }
        };
        const onPause = () => setIsPlaying(false);
        const onEnded_ = () => {
            setIsPlaying(false);
            const segmentDur = (parsedEndTime && parsedEndTime > parsedStartTime) ? (parsedEndTime - parsedStartTime) : (audio.duration || 0);
            if (hasPlayed.current) {
                if (isSilentRef.current) return; // Silent period is handling the end

                const totalSilence = Number(extraSilentTime) || 0;
                if (totalSilence > 0) {
                    startSilentPeriod(segmentDur);
                } else {
                    onEnded?.();
                }
            }
        };
        
        const onLoaded = () => {
            // Ensure we start at startTime safely when metadata loads
            if (audio.currentTime < parsedStartTime) {
                audio.currentTime = parsedStartTime;
            }
            // Apply current playback rate on load
            audio.playbackRate = playbackRate;
            // Apply current volume on load
            audio.volume = volume;
        };

        const onTimeUpdate = () => {
            const relTime = audio.currentTime - parsedStartTime;
            const segmentDur = (parsedEndTime && parsedEndTime > parsedStartTime) ? (parsedEndTime - parsedStartTime) : (audio.duration || 0);

            if (!isDragging && !isSilentRef.current) {
                setCurrentTime(Math.max(0, relTime));
            }
            if (isPlayingPart) {
                if (isSilentRef.current) {
                    setAudioTime?.(parsedStartTime + segmentDur + silentElapsedRef.current);
                } else {
                    setAudioTime?.(audio.currentTime);
                }
            }

            if (parsedEndTime && parsedEndTime > parsedStartTime && audio.currentTime >= parsedEndTime) {
                if (isSilentRef.current) return; // Already entered silent period

                const wasPlaying = isPlaying || !audio.paused;
                isSystemPausedRef.current = true;
                audio.pause();
                if (wasPlaying) {
                    const totalSilence = Number(extraSilentTime) || 0;
                    if (totalSilence > 0 && !isSilentRef.current) {
                        startSilentPeriod(segmentDur);
                    } else {
                        onEnded_();
                    }
                }
            }
        };

        const onPauseExam = (e) => {
            // Only force-resume on the ACTIVE (playing) part if not paused by the system and not in silent period
            if (isExam && isPlayingPart && !e.target.ended && !isSystemPausedRef.current && !isSilentRef.current) {
                e.target.play().catch(() => {});
            }
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

        // Ensure we start at startTime safely if metadata is already loaded
        if (audio.readyState >= 1) {
            if (audio.currentTime < parsedStartTime) {
                audio.currentTime = parsedStartTime;
            }
        }

        return () => {
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('pause', onPauseExam);
            audio.removeEventListener('ended', onEnded_);
            audio.removeEventListener('loadedmetadata', onLoaded);
            audio.removeEventListener('timeupdate', onTimeUpdate);
        };
    }, [isVisible, isDragging, isExam, setAudioTime, onEnded, parsedStartTime, parsedEndTime, playbackRate, volume, isPlayingPart, src, index, extraSilentTime, startSilentPeriod]);

    useEffect(() => {
        if (!hasResumed.current && resumeTime > 0 && audioRef.current && isPlayingPart) {
            console.log("[CustomAudioPlayer] Resuming audio to:", resumeTime);
            const segmentDur = (parsedEndTime && parsedEndTime > parsedStartTime) ? (parsedEndTime - parsedStartTime) : (audioRef.current.duration || 0);
            const actualEndTime = parsedStartTime + segmentDur;
            if (actualEndTime > parsedStartTime && resumeTime >= actualEndTime) {
                audioRef.current.currentTime = actualEndTime;
                isSilentRef.current = true;
                setIsSilentPeriod(true);
                const elapsedSilence = resumeTime - actualEndTime;
                silentElapsedRef.current = elapsedSilence;
            } else {
                audioRef.current.currentTime = resumeTime;
            }
            hasResumed.current = true;
        }
    }, [resumeTime, isPlayingPart, parsedStartTime, parsedEndTime]);

    // Exam auto-play logic
    useEffect(() => {
        if (!isExam) return;
        
        const audio = audioRef.current;
        if (!audio) return;

        if (!isPlayingPart || isBuffering || !shouldAutoPlay) {
            // Pause if: wrong part, buffering, or not yet permitted to play
            if (!audio.paused) {
                isSystemPausedRef.current = true;
                audio.pause();
            }
            // Pause silent timer
            if (silentTimerRef.current) {
                clearInterval(silentTimerRef.current);
                silentTimerRef.current = null;
            }
            return;
        }

        // If we are in silent period, resume it
        if (isSilentRef.current) {
            const segmentDur = (parsedEndTime && parsedEndTime > parsedStartTime) ? (parsedEndTime - parsedStartTime) : (audio.duration || 0);
            resumeSilentPeriod(segmentDur);
            return;
        }

        const attemptPlay = () => {
            if (isSilentRef.current) return; // Do not auto-play during silent period
            if (audio && audio.paused && !audio.ended && audio.readyState >= 2) {
                isSystemPausedRef.current = false;
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
    }, [isExam, isPlayingPart, isBuffering, shouldAutoPlay, index, src, resumeSilentPeriod, parsedStartTime, parsedEndTime]);

    const togglePlay = () => {
        if (isExam) return;
        const audio = audioRef.current;
        if (!audio) return;

        // Reset silent period if any
        isSilentRef.current = false;
        setIsSilentPeriod(false);
        if (silentTimerRef.current) {
            clearInterval(silentTimerRef.current);
            silentTimerRef.current = null;
        }

        if (audio.paused) {
            // To'xtatish kerak bo'lgan boshqa barcha audio elementlarni to'xtatamiz
            document.querySelectorAll('audio[id^="audio-part-"]').forEach(a => {
                if (a !== audio && !a.paused) a.pause();
            });
            isSystemPausedRef.current = false;
            audio.play().catch(() => { });
        } else {
            isSystemPausedRef.current = true;
            audio.pause();
        }
    };

    const skipBackward = () => {
        if (isExam || !audioRef.current) return;

        // Reset silent period if any
        isSilentRef.current = false;
        setIsSilentPeriod(false);
        if (silentTimerRef.current) {
            clearInterval(silentTimerRef.current);
            silentTimerRef.current = null;
        }

        const targetTime = Math.max(parsedStartTime, audioRef.current.currentTime - 5);
        audioRef.current.currentTime = targetTime;
    };

    const skipForward = () => {
        if (isExam || !audioRef.current) return;

        // Reset silent period if any
        isSilentRef.current = false;
        setIsSilentPeriod(false);
        if (silentTimerRef.current) {
            clearInterval(silentTimerRef.current);
            silentTimerRef.current = null;
        }

        const maxTime = (parsedEndTime && parsedEndTime > parsedStartTime) ? parsedEndTime : (audioRef.current.duration || Infinity);
        const targetTime = Math.min(maxTime, audioRef.current.currentTime + 5);
        audioRef.current.currentTime = targetTime;
    };

    const calculateTime = useCallback((e) => {
        const rect = progressRef.current?.getBoundingClientRect();
        if (!rect || !duration) return null;
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        return pct * duration;
    }, [duration]);

    const handlePointerDown = (e) => {
        if (isExam) return;

        // Reset silent period if any
        isSilentRef.current = false;
        setIsSilentPeriod(false);
        if (silentTimerRef.current) {
            clearInterval(silentTimerRef.current);
            silentTimerRef.current = null;
        }

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
                audioRef.current.currentTime = parsedStartTime + newTime;
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
            if (silentTimerRef.current) {
                clearInterval(silentTimerRef.current);
            }
        };
    }, []);

    // Memoize the audio element to keep it stable and prevent re-creation
    // In practice mode for non-active parts, use preload="none" to avoid loading audio data
    // that the user hasn't navigated to yet, saving significant bandwidth.
    const effectivePreload = isExam ? "metadata" : (isVisible ? "metadata" : "none");
    const audioElement = useMemo(() => (
        <audio
            ref={audioRef}
            id={`audio-part-${index}`}
            src={getCdnUrl(src)}
            preload={effectivePreload}
            style={{ display: 'none' }}
        />
    ), [src, index, effectivePreload]);

    return (
        <div className={isVisible ? "" : "hidden"} style={{ display: isVisible ? 'block' : 'none' }}>
            {audioElement}
            {isVisible && (
                <div className={containerClass}>
                    {/* Skip Backward (5s) */}
                    {!isExam && (
                        <button
                            type="button"
                            onClick={skipBackward}
                            className={btnClass}
                            title="Rewind 5s"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                                <text x="12" y="15.5" fontSize="9" fontFamily="sans-serif" fontWeight="900" textAnchor="middle" fill="currentColor" stroke="none">5</text>
                            </svg>
                        </button>
                    )}

                    {/* Play / Pause */}
                    <button
                        type="button"
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

                    {/* Skip Forward (5s) */}
                    {!isExam && (
                        <button
                            type="button"
                            onClick={skipForward}
                            className={btnClass}
                            title="Forward 5s"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                <path d="M21 3v5h-5" />
                                <text x="12" y="15.5" fontSize="9" fontFamily="sans-serif" fontWeight="900" textAnchor="middle" fill="currentColor" stroke="none">5</text>
                            </svg>
                        </button>
                    )}

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

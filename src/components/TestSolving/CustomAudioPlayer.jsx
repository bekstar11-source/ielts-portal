import React, { useRef, useState, useEffect, useCallback } from 'react';

/**
 * CustomAudioPlayer Component
 * 
 * Multi-part listening tests uchun maxsus audio player.
 * Har bir 'part' uchun alohida audio element bo'ladi, lekin faqat active part UI ko'rinadi.
 */
export default function CustomAudioPlayer({ 
    src, 
    index, 
    activePart, 
    testMode, 
    setAudioTime, 
    onEnded, 
    startTime = 0, 
    endTime = 0,
    variant = 'light' // 'light' (default) or 'dark' (for dark headers)
}) {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [volume, setVolume] = useState(1);
    const progressRef = useRef(null);
    const isVisible = index === activePart;
    const isExam = testMode === 'exam';

    // Theme values
    const isDark = variant === 'dark';
    const containerClass = isDark 
        ? "w-full flex items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/5 px-3 py-1 shadow-sm backdrop-blur-sm" 
        : "w-full flex items-center gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white px-3 py-1.5 shadow-sm";
    
    const timeClass = isDark ? "text-[10px] font-mono text-gray-400 shrink-0 tabular-nums" : "text-[11px] font-mono text-gray-400 shrink-0 tabular-nums";
    const railClass = isDark ? "flex-1 h-1 bg-white/10 cursor-pointer relative rounded-full group touch-none" : "flex-1 h-1.5 bg-gray-100 cursor-pointer relative rounded-full group touch-none";
    const fillClass = isDark ? "absolute top-0 left-0 h-full bg-blue-500 rounded-full group-hover:bg-blue-400" : "absolute top-0 left-0 h-full bg-blue-500 rounded-full group-hover:bg-blue-600";
    const thumbClass = isDark ? "absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" : "absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-600 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity";
    const btnClass = isDark 
        ? `flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors focus:outline-none ${isExam ? 'text-white/20' : 'bg-white/10 hover:bg-white/20 text-white'}` 
        : `flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors focus:outline-none ${isExam ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`;

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
        };

        const onTimeUpdate = () => {
            const relTime = audio.currentTime - startTime;
            if (!isDragging) {
                setCurrentTime(Math.max(0, relTime));
            }
            if (isVisible) setAudioTime?.(audio.currentTime);

            if (endTime && endTime > startTime && audio.currentTime >= endTime) {
                audio.pause();
                onEnded_();
            }
        };

        const onPauseExam = (e) => {
            if (isExam && !e.target.ended) e.target.play();
        };

        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('pause', onPauseExam);
        audio.addEventListener('ended', onEnded_);
        audio.addEventListener('loadedmetadata', onLoaded);
        audio.addEventListener('timeupdate', onTimeUpdate);

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
    }, [isVisible, isDragging, isExam, setAudioTime, onEnded, startTime, endTime]);

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

    const handleVolumeChange = (e) => {
        const v = parseFloat(e.target.value);
        setVolume(v);
        if (audioRef.current) audioRef.current.volume = v;
    };

    const VolumeIcon = () => {
        const baseClass = `w-4 h-4 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`;
        
        if (volume === 0) return (
            <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
        );
        if (volume < 0.5) return (
            <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
        );
        return (
            <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
        );
    };

    // Hidden audio for non-visible parts
    if (!isVisible) {
        return (
            <audio
                ref={audioRef}
                id={`audio-part-${index}`}
                src={src}
                preload="auto"
                style={{ display: 'none' }}
            />
        );
    }

    return (
        <>
            {/* Real audio element (hidden) */}
            <audio
                ref={audioRef}
                id={`audio-part-${index}`}
                src={src}
                preload="auto"
                style={{ display: 'none' }}
            />

            {/* Player UI */}
            <div className={containerClass}>

                {/* Play / Pause */}
                <button
                    onClick={togglePlay}
                    disabled={isExam}
                    className={btnClass}
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

                {/* Volume Inline */}
                <div className="flex items-center gap-2 shrink-0 group">
                    <button
                        className="transition-colors"
                        onClick={() => {
                            if (audioRef.current) audioRef.current.muted = !audioRef.current.muted;
                        }}
                    >
                        <VolumeIcon />
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={volume}
                        onChange={handleVolumeChange}
                        className={`w-12 sm:w-16 h-1 rounded-lg appearance-none cursor-pointer accent-blue-500 transition-all opacity-40 group-hover:opacity-100 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}
                        style={{ outline: "none" }}
                    />
                </div>
            </div>
        </>
    );
}

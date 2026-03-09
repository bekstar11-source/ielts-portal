// src/components/TestSolving/TestHeader.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { formatTime } from '../../utils/ieltsScoring';

// ─── Custom Audio Player ────────────────────────────────────────────────────
function CustomAudioPlayer({ src, index, activePart, testMode, setAudioTime, onEnded, startTime = 0, endTime = 0 }) {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [volume, setVolume] = useState(1);
    const progressRef = useRef(null);
    const isVisible = index === activePart;
    const isExam = testMode === 'exam';

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
    }, [isVisible, isDragging, isExam, setAudioTime, onEnded]);

    const togglePlay = () => {
        if (isExam) return;
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
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

    const handleVolumeChange = (e) => {
        const v = parseFloat(e.target.value);
        setVolume(v);
        if (audioRef.current) audioRef.current.volume = v;
    };

    const VolumeIcon = () => {
        if (volume === 0) return (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
        );
        if (volume < 0.5) return (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
        );
        return (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
        );
    };

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
            <div className="w-full flex items-center gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white px-3 py-1.5 shadow-sm">

                {/* Play / Pause */}
                <button
                    onClick={togglePlay}
                    disabled={isExam}
                    className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors focus:outline-none
                        ${isExam
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer'
                        }`}
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
                    <span className="text-[11px] font-mono text-gray-400 shrink-0 tabular-nums">
                        {fmtTime(currentTime)}
                    </span>
                    <div
                        ref={progressRef}
                        className="flex-1 h-1.5 bg-gray-100 cursor-pointer relative rounded-full group touch-none"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    >
                        {/* Progress Fill */}
                        <div
                            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full group-hover:bg-blue-600"
                            style={{ width: `${progress}%` }}
                        />
                        {/* Thumb */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-600 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ left: `calc(${progress}% - 5px)` }}
                        />
                    </div>
                    <span className="text-[11px] font-mono text-gray-400 shrink-0 tabular-nums">
                        {fmtTime(duration)}
                    </span>
                </div>

                {/* Volume Inline */}
                <div className="flex items-center gap-2 shrink-0 group">
                    <button
                        className="text-gray-400 hover:text-gray-700 transition-colors"
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
                        className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 transition-all opacity-70 group-hover:opacity-100"
                        style={{ outline: "none" }}
                    />
                </div>
            </div>
        </>
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
    setAudioTime,
    triggerPlay,
    onPartChange
}) => {
    const isListening = test?.type?.toLowerCase() === 'listening';
    const hasTriggered = useRef(false);

    // Exam mode: auto-play part 0 when intro ends
    useEffect(() => {
        if (!triggerPlay || testMode !== 'exam' || hasTriggered.current) return;
        hasTriggered.current = true;
        const audio = document.getElementById(`audio-part-0`);
        if (audio) audio.play().catch(err => console.warn('Auto-play blocked:', err));
    }, [triggerPlay, testMode]);

    const handleEnded = (index) => {
        if (test?.passages?.length && index < test.passages.length - 1) {
            const nextIdx = index + 1;
            setActivePart(nextIdx);
            if (onPartChange) onPartChange(nextIdx);
            setTimeout(() => {
                const nextAudio = document.getElementById(`audio-part-${nextIdx}`);
                if (nextAudio) nextAudio.play().catch(() => { });
            }, 150);
        }
    };

    return (
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
            {isListening && !showModeSelection && !showResult && (
                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] z-[100] ${testMode === 'exam' ? 'pointer-events-none select-none opacity-80' : ''}`}>
                    {test?.passages?.map((passage, index) => {
                        const src = passage.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file;
                        if (!src) return null;
                        return (
                            <CustomAudioPlayer
                                key={index}
                                src={src}
                                index={index}
                                activePart={activePart}
                                testMode={testMode}
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
                        {saving ? 'Saving...' : 'Finish'}
                    </button>
                )}
                {showResult && (
                    <button onClick={onFinish} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-full shadow-sm transition-all">
                        Exit
                    </button>
                )}
            </div>
        </header>
    );
};

export default TestHeader;
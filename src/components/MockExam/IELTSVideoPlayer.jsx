import React, { useState, useRef, useEffect } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/firebase';

const IELTSVideoPlayer = ({ storagePath, onWatched }) => {
    const videoRef = useRef(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState('0:00');
    const [duration, setDuration] = useState('0:00');
    const [volume, setVolume] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch download URL from Firebase Storage
    useEffect(() => {
        const fetchUrl = async () => {
            try {
                setLoading(true);
                setError(null);
                const storageRef = ref(storage, storagePath);
                const url = await getDownloadURL(storageRef);
                setVideoUrl(url + '#t=0.5');
            } catch (err) {
                console.error('Video fetch error:', err);
                setError('Video yuklanmadi. Iltimos, qayta urinib ko\'ring.');
            } finally {
                setLoading(false);
            }
        };
        fetchUrl();
    }, [storagePath]);

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handlePlayPause = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const cur = videoRef.current.currentTime;
        const dur = videoRef.current.duration;
        setProgress(dur ? (cur / dur) * 100 : 0);
        setCurrentTime(formatTime(cur));
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(formatTime(videoRef.current.duration));
        }
    };

    const handleProgressClick = (e) => {
        if (!videoRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        videoRef.current.currentTime = pct * videoRef.current.duration;
    };

    const handleVolumeChange = (e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (videoRef.current) videoRef.current.volume = val;
    };

    const handleEnded = () => {
        setIsPlaying(false);
        if (onWatched) onWatched();
    };

    if (loading) {
        return (
            <div className="w-full aspect-video bg-zinc-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-white/60 text-sm font-medium">Loading video...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full aspect-video bg-zinc-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center px-6">
                    <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-white/70 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-zinc-900 rounded-sm overflow-hidden">
            {/* Video Area */}
            <div className="relative w-full aspect-video cursor-pointer" onClick={handlePlayPause}>
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    preload="auto"
                />
                {/* Play overlay when paused */}
                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <svg className="w-7 h-7 text-zinc-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Controls Bar */}
            <div className="px-4 py-2.5 bg-zinc-800 flex items-center gap-3">
                {/* Play/Pause */}
                <button onClick={handlePlayPause} className="text-white hover:text-white/80 transition-colors shrink-0">
                    {isPlaying ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                </button>

                {/* Time */}
                <span className="text-white/70 text-xs font-mono shrink-0 min-w-[70px]">
                    {currentTime} / {duration}
                </span>

                {/* Progress Bar */}
                <div
                    className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer group relative"
                    onClick={handleProgressClick}
                >
                    <div
                        className="h-full bg-white rounded-full transition-all duration-100 relative"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
                    </div>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.788V15.21a.5.5 0 00.252.434l4.5 2.614a.5.5 0 00.748-.434V6.176a.5.5 0 00-.748-.434l-4.5 2.614a.5.5 0 00-.252.434z" />
                    </svg>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-16 accent-white cursor-pointer"
                    />
                </div>
            </div>
        </div>
    );
};

export default IELTSVideoPlayer;

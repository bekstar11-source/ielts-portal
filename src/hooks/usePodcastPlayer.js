// src/hooks/usePodcastPlayer.js
// Audio segment-by-segment playback va keyboard shortcut logikasi

import { useState, useRef, useCallback, useEffect } from "react";

export function usePodcastPlayer(segments = []) {
    const audioRef = useRef(null);
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const currentSegment = segments[currentSegmentIndex] || null;

    // Audio elementni boshqarish
    const playSegment = useCallback(
        (segIndex, audioUrl) => {
            if (!audioRef.current || !currentSegment) return;
            audioRef.current.src = audioUrl;
            audioRef.current.currentTime = currentSegment.startTime;
            audioRef.current.play().catch(console.error);
            setIsPlaying(true);
        },
        [currentSegment]
    );

    const pauseAudio = useCallback(() => {
        audioRef.current?.pause();
        setIsPlaying(false);
    }, []);

    const togglePlay = useCallback(() => {
        if (!audioRef.current) return;
        if (isPlaying) {
            pauseAudio();
        } else {
            audioRef.current.play().catch(console.error);
            setIsPlaying(true);
        }
    }, [isPlaying, pauseAudio]);

    const rewind = useCallback((seconds = 3) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = Math.max(
            (currentSegment?.startTime || 0),
            audioRef.current.currentTime - seconds
        );
    }, [currentSegment]);

    const replay = useCallback(() => {
        if (!audioRef.current || !currentSegment) return;
        audioRef.current.currentTime = currentSegment.startTime;
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
    }, [currentSegment]);

    // Audio segment chegarasiga yetganda to'xtatish
    const handleTimeUpdate = useCallback(() => {
        if (!audioRef.current || !currentSegment) return;
        if (audioRef.current.currentTime >= currentSegment.endTime - 0.1) {
            pauseAudio();
        }
    }, [currentSegment, pauseAudio]);

    // Hint playback — aynan o'sha vaqtdan boshlash
    const playFromTime = useCallback((time, audioUrl) => {
        if (!audioRef.current) return;
        audioRef.current.src = audioUrl;
        audioRef.current.currentTime = time;
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = e.target.tagName;
            // Input ichida bo'lsa Spaceni prevent qilmaslik (Space → type)
            if (tag === "TEXTAREA") return;

            if (e.code === "Space" && tag !== "INPUT") {
                e.preventDefault();
                togglePlay();
            } else if (e.code === "KeyR" && !e.shiftKey) {
                e.preventDefault();
                rewind(3);
            } else if (e.code === "KeyR" && e.shiftKey) {
                e.preventDefault();
                replay();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [togglePlay, rewind, replay]);

    return {
        audioRef,
        currentSegmentIndex,
        setCurrentSegmentIndex,
        currentSegment,
        isPlaying,
        isLoaded,
        setIsLoaded,
        togglePlay,
        pauseAudio,
        rewind,
        replay,
        playFromTime,
        handleTimeUpdate,
        playSegment,
    };
}

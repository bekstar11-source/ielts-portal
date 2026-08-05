// src/hooks/usePodcastPlayer.js
// Audio segment-by-segment playback va keyboard shortcut logikasi

import { useState, useRef, useCallback, useEffect } from "react";

export function usePodcastPlayer(segments = []) {
    const audioRef = useRef(null);
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const currentSegment = segments[currentSegmentIndex] || null;

    // (Sinxronlashtirish uchun DictationStage dagi <audio> tag native onPlay/onPause eventlarini chaqiradi)

    // Audio elementni boshqarish
    // Yuklangan audio manzili — har safar src ni qayta o'rnatib yubormaslik uchun
    const loadedUrlRef = useRef(null);

    /** Audio manbasini tayyorlab, berilgan vaqtdan o'ynatadi */
    const startAt = useCallback((time, audioUrl) => {
        const audio = audioRef.current;
        if (!audio) return;

        const seek = () => {
            audio.currentTime = time || 0;
            audio.play().catch(console.error);
            setIsPlaying(true);
        };

        if (audioUrl && loadedUrlRef.current !== audioUrl) {
            loadedUrlRef.current = audioUrl;
            audio.src = audioUrl;
            // src yangi o'rnatilganda metadata kelmaguncha currentTime e'tiborsiz qoladi
            audio.addEventListener("loadedmetadata", seek, { once: true });
            audio.load();
        } else {
            seek();
        }
    }, []);

    const playSegment = useCallback(
        (segIndex, audioUrl) => {
            // segIndex bo'yicha segmentni olamiz — avval currentSegment ishlatilgani sababli
            // state yangilanishidan oldin chaqirilsa noto'g'ri segment o'ynardi
            const seg = segments[segIndex] ?? currentSegment;
            if (!seg) return;
            startAt(seg.startTime, audioUrl);
        },
        [segments, currentSegment, startAt]
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
        startAt(time, audioUrl);
    }, [startAt]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const target = e.target;
            const tag = target?.tagName;
            // Matn kiritilayotgan joyda hech qanday shortcut ishlamasin.
            // Avval faqat TEXTAREA tekshirilardi, natijada INPUT ichida "r" harfini
            // yozib bo'lmasdi (KeyR → rewind + preventDefault).
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
            // Modifikator bilan bosilgan tugmalar brauzer shortcut'lari
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            if (e.code === "Space") {
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

    const [playbackRate, setPlaybackRate] = useState(1.0);

    // Audio element playbackRate ni sinxronlash
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    return {
        audioRef,
        currentSegmentIndex,
        setCurrentSegmentIndex,
        currentSegment,
        isPlaying,
        setIsPlaying,
        isLoaded,
        setIsLoaded,
        togglePlay,
        pauseAudio,
        rewind,
        replay,
        playFromTime,
        handleTimeUpdate,
        playSegment,
        playbackRate,
        setPlaybackRate,
    };
}

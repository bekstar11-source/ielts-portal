// src/context/PodcastContext.jsx
import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { db } from "../firebase/firebase";
import { collection, deleteDoc, doc, query, where, onSnapshot, updateDoc, increment, setDoc } from "firebase/firestore";
import { getCdnUrl } from "../utils/cdnUtils";
import { useAuth } from "./AuthContext";
import { getResumeTime, saveProgress, markCompleted, getProgress } from "../utils/podcastProgress";

const PodcastContext = createContext();

export const usePodcast = () => useContext(PodcastContext);

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
const REPEAT_MODES = ["off", "all", "one"];

// Ovoz balandligi sessiyalar orasida saqlanadi
const VOLUME_KEY = "podcast_volume_v1";
const RATE_KEY = "podcast_rate_v1";

const readStoredNumber = (key, fallback, min, max) => {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        const value = parseFloat(raw);
        if (!Number.isFinite(value) || value < min || value > max) return fallback;
        return value;
    } catch {
        return fallback;
    }
};

export const PodcastProvider = ({ children }) => {
    const audioRef = useRef(null);
    const [currentTrack, setCurrentTrackState] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(() => readStoredNumber(VOLUME_KEY, 0.7, 0, 1));
    const [playbackRate, setPlaybackRate] = useState(() => readStoredNumber(RATE_KEY, 1, 0.25, 4));
    const [isMuted, setIsMuted] = useState(false);
    const [repeat, setRepeat] = useState("off"); // 'off' | 'all' | 'one'
    const [shuffle, setShuffle] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // Global player expansion state
    const [likedPodcasts, setLikedPodcasts] = useState([]); // Array of podcast IDs
    const [queue, setQueue] = useState([]); // Navbatdagi epizodlar (next/prev uchun)
    const [playbackError, setPlaybackError] = useState(null);
    const [autoplayBlocked, setAutoplayBlocked] = useState(false);
    // Video ko'rinishi ochilganda global audio element ovozi o'chiriladi (echo bo'lmasligi uchun)
    const [muteGlobalAudio, setMuteGlobalAudio] = useState(false);
    const youtubePlayerRef = useRef(null); // Global ref for YouTube player

    const { user } = useAuth();

    // Faqat metadata yuklangandan keyin qo'llaniladigan seek (resume yoki qo'lda tanlangan vaqt)
    const pendingSeekRef = useRef(null);
    const resumedTrackIdRef = useRef(null);
    const currentTrackRef = useRef(null);
    const durationRef = useRef(0);
    const currentTimeRef = useRef(0);
    const shuffleHistoryRef = useRef([]);

    useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
    useEffect(() => { durationRef.current = duration; }, [duration]);
    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

    // ---------------------------------------------------------------- Likes

    // Likelar butun ilova bo'ylab bitta joyda kuzatiladi — avval faqat Podcasts
    // sahifasi obuna bo'lgani uchun album/episode sahifalarida yurak holati noto'g'ri edi.
    useEffect(() => {
        if (!user?.uid) {
            setLikedPodcasts([]);
            return;
        }
        const q = query(collection(db, "podcastLikes"), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => setLikedPodcasts(snapshot.docs.map(d => d.data().podcastId)),
            (err) => console.error("Error listening to likes:", err)
        );
        return () => unsubscribe();
    }, [user?.uid]);

    // Eskicha API (sahifalardan chaqiriladi) — endi obuna provider darajasida
    const fetchUserLikes = () => undefined;

    const toggleLike = useCallback(async (userId, podcastId) => {
        if (!userId || !podcastId) return;

        const isLiked = likedPodcasts.includes(podcastId);
        const likeDocId = `${userId}_${podcastId}`;
        const likeRef = doc(db, "podcastLikes", likeDocId);
        const podcastRef = doc(db, "podcasts", podcastId);

        // Optimistik yangilash — onSnapshot javobini kutmasdan UI darhol o'zgaradi
        setLikedPodcasts(prev =>
            isLiked ? prev.filter(id => id !== podcastId) : [...prev, podcastId]
        );

        try {
            if (isLiked) {
                await deleteDoc(likeRef);
                await updateDoc(podcastRef, { likesCount: increment(-1) }).catch(() => {});
            } else {
                await setDoc(likeRef, { userId, podcastId, createdAt: new Date() });
                await updateDoc(podcastRef, { likesCount: increment(1) }).catch(() => {});
            }
        } catch (e) {
            console.error("Error toggling like:", e);
            // Rollback
            setLikedPodcasts(prev =>
                isLiked ? [...prev, podcastId] : prev.filter(id => id !== podcastId)
            );
        }
    }, [likedPodcasts]);

    // ------------------------------------------------------- Track tanlash

    // Trek almashganda vaqt/davomiylik darhol nolga tushadi — avval yangi epizod
    // ustida eski epizodning vaqti va progress bari ko'rinib turardi.
    const setCurrentTrack = useCallback((track) => {
        const prev = currentTrackRef.current;
        const next = typeof track === "function" ? track(prev) : track;

        if (next?.id && next.id === prev?.id) {
            // Bir xil epizod — ma'lumot yangilangan bo'lsa ham vaqtni nolga tushirmaymiz
            if (next !== prev) {
                currentTrackRef.current = next;
                setCurrentTrackState(next);
            }
            return;
        }

        if (prev?.id) {
            saveProgress(prev.id, currentTimeRef.current, durationRef.current);
        }

        currentTrackRef.current = next;
        pendingSeekRef.current = null;
        resumedTrackIdRef.current = null;
        setCurrentTime(0);
        setDuration(0);
        setPlaybackError(null);
        setCurrentTrackState(next);
    }, []);

    // ------------------------------------------------- Progressni saqlash

    // currentTime har ~250ms da o'zgaradi — har o'zgarishda localStorage'ga
    // yozmaslik uchun 5 soniyalik interval bilan throttle qilamiz.
    useEffect(() => {
        if (!currentTrack?.id) return;

        const persist = () => {
            const time = currentTimeRef.current;
            if (!Number.isFinite(time) || time <= 0) return;
            saveProgress(currentTrack.id, time, durationRef.current);
        };

        const interval = setInterval(persist, 5000);
        const onHide = () => persist();
        window.addEventListener("pagehide", onHide);
        document.addEventListener("visibilitychange", onHide);

        return () => {
            clearInterval(interval);
            window.removeEventListener("pagehide", onHide);
            document.removeEventListener("visibilitychange", onHide);
            persist();
        };
    }, [currentTrack?.id]);

    // Oxirgi tinglangan trek (sahifa yangilanganda tiklash uchun)
    useEffect(() => {
        try {
            const saved = localStorage.getItem("last_played_podcast");
            if (!saved) return;
            const data = JSON.parse(saved);
            if (data?.track?.id) setCurrentTrackState(data.track);
        } catch (e) {
            console.warn("Could not restore last podcast", e);
        }
    }, []);

    useEffect(() => {
        if (!currentTrack) return;
        try {
            localStorage.setItem("last_played_podcast", JSON.stringify({
                track: currentTrack,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn("Could not persist podcast state", e);
        }
    }, [currentTrack]);

    // ------------------------------------------------------ Navbat (queue)

    const queueIndex = useMemo(
        () => queue.findIndex(t => t?.id === currentTrack?.id),
        [queue, currentTrack?.id]
    );

    const pickNextIndex = useCallback(() => {
        if (queue.length === 0) return -1;
        if (queue.length === 1) return -1;

        if (shuffle) {
            // Yaqinda o'ynatilganlarni takrorlamaslikka harakat qilamiz
            const recent = shuffleHistoryRef.current;
            const candidates = queue
                .map((_, i) => i)
                .filter(i => i !== queueIndex && !recent.includes(queue[i]?.id));
            const pool = candidates.length > 0
                ? candidates
                : queue.map((_, i) => i).filter(i => i !== queueIndex);
            return pool[Math.floor(Math.random() * pool.length)];
        }

        if (queueIndex === -1) return 0;
        const next = queueIndex + 1;
        if (next < queue.length) return next;
        return repeat === "all" ? 0 : -1;
    }, [queue, queueIndex, shuffle, repeat]);

    const hasNext = queue.length > 1 && (shuffle || repeat === "all" || (queueIndex > -1 && queueIndex < queue.length - 1));
    const hasPrev = queue.length > 1 && (shuffle || repeat === "all" || queueIndex > 0);

    const playNext = useCallback(() => {
        const idx = pickNextIndex();
        if (idx === -1) return false;
        const track = queue[idx];
        if (!track) return false;
        shuffleHistoryRef.current = [...shuffleHistoryRef.current, currentTrackRef.current?.id].filter(Boolean).slice(-10);
        setCurrentTrack(track);
        setIsPlaying(true);
        return true;
    }, [pickNextIndex, queue, setCurrentTrack]);

    const playPrev = useCallback(() => {
        // Trek 5 soniyadan ko'p o'ynagan bo'lsa — avval boshiga qaytadi (odatiy player xatti-harakati)
        if (currentTimeRef.current > 5) {
            if (audioRef.current) audioRef.current.currentTime = 0;
            setCurrentTime(0);
            return true;
        }
        if (queue.length === 0) return false;
        const idx = queueIndex <= 0
            ? (repeat === "all" ? queue.length - 1 : -1)
            : queueIndex - 1;
        if (idx === -1) return false;
        setCurrentTrack(queue[idx]);
        setIsPlaying(true);
        return true;
    }, [queue, queueIndex, repeat, setCurrentTrack]);

    // --------------------------------------------------- Audio bilan sinxron

    // Ovoz balandligi/tezligi har doim elementga qo'llanadi — avval faqat state'da
    // turgani uchun podcast doim 100% ovozda va 1x tezlikda ijro etilardi.
    useEffect(() => {
        const el = audioRef.current;
        if (!el) return;
        el.volume = volume;
        el.muted = isMuted || muteGlobalAudio;
        el.playbackRate = playbackRate;
    }, [volume, isMuted, muteGlobalAudio, playbackRate, currentTrack?.id]);

    useEffect(() => {
        try {
            localStorage.setItem(VOLUME_KEY, String(volume));
            localStorage.setItem(RATE_KEY, String(playbackRate));
        } catch { /* ignore */ }
    }, [volume, playbackRate]);

    // Play/pause sinxronizatsiyasi. play() rad etilsa (autoplay bloklangan bo'lsa)
    // UI "o'ynayapti" deb yolg'on ko'rsatmasligi uchun holatni qaytaramiz.
    useEffect(() => {
        const el = audioRef.current;
        if (!el || !currentTrack) return;
        if (currentTrack.mediaType === "youtube") return; // YouTube ko'prigi alohida boshqaradi

        if (isPlaying) {
            const p = el.play();
            if (p && typeof p.catch === "function") {
                p.then(() => setAutoplayBlocked(false)).catch((err) => {
                    if (err?.name === "NotAllowedError") {
                        setAutoplayBlocked(true);
                        setIsPlaying(false);
                    }
                });
            }
        } else {
            el.pause();
        }
    }, [isPlaying, currentTrack]);

    const playTrack = useCallback((track) => {
        if (!track) return;
        if (currentTrackRef.current?.id === track.id) {
            setIsPlaying(p => !p);
        } else {
            setCurrentTrack(track);
            setIsPlaying(true);
        }
    }, [setCurrentTrack]);

    const handleTimeUpdate = useCallback(() => {
        if (audioRef.current && currentTrackRef.current?.mediaType !== "youtube") {
            setCurrentTime(audioRef.current.currentTime);
        }
    }, []);

    const handleLoadedMetadata = useCallback(() => {
        const el = audioRef.current;
        if (!el) return;

        const dur = Number.isFinite(el.duration) ? el.duration : 0;
        setDuration(dur);
        el.playbackRate = playbackRate;
        el.volume = volume;
        el.muted = isMuted || muteGlobalAudio;

        const trackId = currentTrackRef.current?.id;

        // Qo'lda so'ralgan seek (masalan, transkriptdan bosilgan) ustunlikka ega
        if (pendingSeekRef.current != null) {
            el.currentTime = pendingSeekRef.current;
            setCurrentTime(pendingSeekRef.current);
            pendingSeekRef.current = null;
            return;
        }

        // Aks holda — saqlangan joydan davom ettiramiz
        if (trackId && resumedTrackIdRef.current !== trackId) {
            resumedTrackIdRef.current = trackId;
            const resumeAt = getResumeTime(trackId, dur);
            if (resumeAt != null) {
                el.currentTime = resumeAt;
                setCurrentTime(resumeAt);
                return;
            }
        }

        el.currentTime = 0;
        setCurrentTime(0);
    }, [playbackRate, volume, isMuted, muteGlobalAudio]);

    const handleEnded = useCallback(() => {
        const track = currentTrackRef.current;
        if (track?.id) markCompleted(track.id, durationRef.current);

        if (repeat === "one") {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => {});
            }
            setCurrentTime(0);
            setIsPlaying(true);
            return;
        }

        if (playNext()) return;

        setIsPlaying(false);
        setCurrentTime(0);
    }, [repeat, playNext]);

    const handleError = useCallback(() => {
        const el = audioRef.current;
        const code = el?.error?.code;
        setIsPlaying(false);
        setIsLoading(false);
        setPlaybackError(
            code === 4
                ? "Audio fayl ochilmadi yoki formati qo'llab-quvvatlanmaydi."
                : "Audioni yuklashda xatolik. Internetni tekshirib, qayta urinib ko'ring."
        );
    }, []);

    const retryPlayback = useCallback(() => {
        const el = audioRef.current;
        if (!el) return;
        setPlaybackError(null);
        el.load();
        setIsPlaying(true);
    }, []);

    const handleSeek = useCallback((time) => {
        const target = Math.max(0, Number.isFinite(time) ? time : 0);

        if (currentTrackRef.current?.mediaType === "youtube" && youtubePlayerRef.current?.seekTo) {
            youtubePlayerRef.current.seekTo(target, true);
            setCurrentTime(target);
            return;
        }

        const el = audioRef.current;
        if (el) {
            if (el.readyState === 0) {
                // Metadata hali yuklanmagan — seek e'tiborsiz qolardi
                pendingSeekRef.current = target;
            } else {
                el.currentTime = target;
            }
        }
        setCurrentTime(target);
    }, []);

    const skipBy = useCallback((amount) => {
        const target = Math.max(0, Math.min(durationRef.current || Infinity, currentTimeRef.current + amount));
        handleSeek(target);
    }, [handleSeek]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const next = !prev;
            if (audioRef.current) audioRef.current.muted = next;
            return next;
        });
    }, []);

    const updateVolume = useCallback((newVolume) => {
        const clamped = Math.max(0, Math.min(1, newVolume));
        setVolume(clamped);
        if (audioRef.current) {
            audioRef.current.volume = clamped;
            audioRef.current.muted = clamped === 0;
        }
        setIsMuted(clamped === 0);
    }, []);

    const updatePlaybackRate = useCallback((rate) => {
        const clamped = Math.max(0.25, Math.min(4, rate));
        setPlaybackRate(clamped);
        if (audioRef.current) audioRef.current.playbackRate = clamped;
        if (youtubePlayerRef.current?.setPlaybackRate) {
            try { youtubePlayerRef.current.setPlaybackRate(clamped); } catch { /* ignore */ }
        }
    }, []);

    const cyclePlaybackRate = useCallback(() => {
        const idx = PLAYBACK_RATES.indexOf(playbackRate);
        const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length] ?? 1;
        updatePlaybackRate(next);
    }, [playbackRate, updatePlaybackRate]);

    const cycleRepeat = useCallback(() => {
        setRepeat(prev => REPEAT_MODES[(REPEAT_MODES.indexOf(prev) + 1) % REPEAT_MODES.length]);
    }, []);

    // ------------------------------------------------ Media Session (OS UI)

    useEffect(() => {
        if (!("mediaSession" in navigator) || !currentTrack) return;

        try {
            navigator.mediaSession.metadata = new window.MediaMetadata({
                title: currentTrack.title || "Podcast",
                artist: currentTrack.level ? `IELTS • ${currentTrack.level}` : "IELTS Portal",
                album: "IELTS Portal Podcasts",
                artwork: currentTrack.thumbnail
                    ? [{ src: currentTrack.thumbnail, sizes: "512x512", type: "image/jpeg" }]
                    : [],
            });
        } catch { /* MediaMetadata mavjud bo'lmasligi mumkin */ }

        const handlers = {
            play: () => setIsPlaying(true),
            pause: () => setIsPlaying(false),
            seekbackward: (d) => skipBy(-(d?.seekOffset || 10)),
            seekforward: (d) => skipBy(d?.seekOffset || 10),
            seekto: (d) => { if (d?.seekTime != null) handleSeek(d.seekTime); },
            previoustrack: () => playPrev(),
            nexttrack: () => playNext(),
        };

        Object.entries(handlers).forEach(([action, handler]) => {
            try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* qo'llab-quvvatlanmaydi */ }
        });

        return () => {
            Object.keys(handlers).forEach((action) => {
                try { navigator.mediaSession.setActionHandler(action, null); } catch { /* ignore */ }
            });
        };
    }, [currentTrack, skipBy, handleSeek, playNext, playPrev]);

    useEffect(() => {
        if (!("mediaSession" in navigator)) return;
        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }, [isPlaying]);

    useEffect(() => {
        if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
        if (!duration || !Number.isFinite(duration)) return;
        try {
            navigator.mediaSession.setPositionState({
                duration,
                playbackRate,
                position: Math.min(currentTime, duration),
            });
        } catch { /* ignore */ }
    }, [duration, playbackRate, currentTime]);

    // --------------------------------------------------------------- Render

    const mediaProps = {
        ref: audioRef,
        src: getCdnUrl(currentTrack?.audioUrl),
        onTimeUpdate: handleTimeUpdate,
        onLoadedMetadata: handleLoadedMetadata,
        onDurationChange: () => {
            const d = audioRef.current?.duration;
            if (Number.isFinite(d) && d > 0) setDuration(d);
        },
        onEnded: handleEnded,
        onError: handleError,
        onWaiting: () => setIsLoading(true),
        onPlaying: () => { setIsLoading(false); setPlaybackError(null); },
        onCanPlay: () => setIsLoading(false),
        onSeeking: () => setIsLoading(true),
        onSeeked: () => setIsLoading(false),
        onLoadStart: () => setIsLoading(true),
        onLoadedData: () => setIsLoading(false),
        onPause: () => setIsPlaying(false),
        onPlay: () => setIsPlaying(true),
        preload: "metadata",
        style: { display: "none" },
    };

    return (
        <PodcastContext.Provider value={{
            currentTrack, setCurrentTrack,
            isPlaying, setIsPlaying,
            isLoading, setIsLoading,
            currentTime, setCurrentTime,
            duration, setDuration,
            volume, setVolume,
            isMuted, setIsMuted,
            repeat, setRepeat, cycleRepeat,
            shuffle, setShuffle,
            isExpanded, setIsExpanded,
            likedPodcasts, fetchUserLikes, toggleLike,
            youtubePlayerRef,
            playbackRate, updatePlaybackRate, cyclePlaybackRate, playbackRates: PLAYBACK_RATES,
            queue, setQueue, playNext, playPrev, hasNext, hasPrev, queueIndex,
            playbackError, retryPlayback, autoplayBlocked,
            muteGlobalAudio, setMuteGlobalAudio,
            getProgress,
            playTrack,
            handleSeek,
            skipBy,
            toggleMute,
            updateVolume,
            audioRef
        }}>
            {children}
            {currentTrack && (currentTrack.mediaType !== 'youtube' || currentTrack.audioUrl) && (
                currentTrack.isVideo
                    ? <video {...mediaProps} />
                    : <audio {...mediaProps} />
            )}
        </PodcastContext.Provider>
    );
};

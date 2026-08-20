// src/pages/SpotifyPodcast.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, useNavigationType } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
    Play, Pause, Volume2, Volume1, VolumeX, ArrowLeft,
    List as ListIcon, Heart, X, Shuffle, Repeat, Repeat1, Share2,
    RotateCcw, RotateCw, Gauge, AlertTriangle
} from "lucide-react";
import { usePodcast } from "../../context/PodcastContext";
import LazyImage from "../../components/common/LazyImage";
import { useGamification } from "../../hooks/useGamification";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/LanguageContext";
import ShareModal from "../../components/common/ShareModal";

const SKIP_SECONDS = 10;

const formatTime = (time) => {
    if (!Number.isFinite(time) || time < 0) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function SpotifyPodcast() {
    const { podcastId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const navigationType = useNavigationType(); // "POP" = sahifa yangilandi / orqaga-oldinga
    const {
        setCurrentTrack, isPlaying, setIsPlaying,
        currentTime, duration, volume, isMuted, repeat, cycleRepeat,
        shuffle, setShuffle, handleSeek, skipBy, toggleMute, updateVolume,
        playbackRate, cyclePlaybackRate, likedPodcasts, toggleLike,
        isLoading, playbackError, retryPlayback, autoplayBlocked,
    } = usePodcast();

    const [podcast, setPodcast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const { awardXP } = useGamification();
    const { user } = useAuth();
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [showFullTranscript, setShowFullTranscript] = useState(false);
    const xpAwardedRef = useRef(null);
    const activeLineRef = useRef(null);
    const startedRef = useRef(null);

    const isLiked = likedPodcasts.includes(podcastId);

    // ------------------------------------------------------------ Transcript

    const combinedTimeline = useMemo(() => {
        if (!podcast?.transcript) return [];

        const raw = Array.isArray(podcast.transcript) ? [...podcast.transcript] : [];

        return raw
            .filter(t => t && typeof t.text === 'string' && t.text.trim())
            .map(t => ({ ...t, time: Number(t.time) || 0, type: 'text' }))
            .sort((a, b) => a.time - b.time)
            // Filter out exact duplicates (same time and text) to avoid UI glitches
            .filter((item, index, self) =>
                index === 0 || !(item.time === self[index - 1].time && item.text === self[index - 1].text)
            );
    }, [podcast]);

    const activeTimelineIdx = useMemo(() => {
        if (combinedTimeline.length === 0) return -1;
        if (currentTime < combinedTimeline[0].time) return -1;

        // Vaqtlar tartiblangani uchun binar qidiruv — har bir tick'da butun
        // ro'yxatni aylanib chiqish uzun podcastlarda sezilarli sekinlashtirardi.
        let lo = 0, hi = combinedTimeline.length - 1, found = 0;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (combinedTimeline[mid].time <= currentTime) {
                found = mid;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        return found;
    }, [combinedTimeline, currentTime]);

    // ------------------------------------------------------------ Ma'lumot

    // Avval effekt `currentTrack` ga bog'liq edi va o'zi uni o'zgartirardi —
    // natijada har bir trek o'zgarishida Firestore'dan qayta o'qilardi (cheksiz sikl).
    useEffect(() => {
        if (!podcastId) return;
        let cancelled = false;

        setLoading(true);
        setNotFound(false);

        getDoc(doc(db, "podcasts", podcastId))
            .then((snap) => {
                if (cancelled) return;
                if (!snap.exists()) {
                    setNotFound(true);
                    setPodcast(null);
                    return;
                }
                const data = { id: snap.id, ...snap.data() };
                setPodcast(data);
                setCurrentTrack(data);
                // Ilova ichida yangi epizod ochilganda ijroni boshlashga urinamiz; brauzer
                // to'ssa context `autoplayBlocked` ni ko'taradi va foydalanuvchiga xabar beriladi.
                // Sahifa yangilanganda yoki saytga qaytib kirilganda (POP) avtomatik
                // boshlamaymiz — foydalanuvchi pauza qilgan epizod o'z-o'zidan qayta ijro
                // etilib ketardi.
                if (navigationType !== "POP" && startedRef.current !== data.id) {
                    startedRef.current = data.id;
                    setIsPlaying(true);
                }
            })
            .catch((err) => {
                console.error("Error fetching podcast:", err);
                if (!cancelled) setNotFound(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [podcastId, setCurrentTrack, setIsPlaying, navigationType]);

    // XP faqat bir marta va har bir epizod uchun alohida beriladi
    useEffect(() => {
        if (!podcast?.id || !user || duration <= 0 || currentTime <= 0) return;
        if (xpAwardedRef.current === podcast.id) return;
        if (currentTime / duration < 0.9) return;

        xpAwardedRef.current = podcast.id;
        awardXP('podcast', podcast.id, podcast.title).then(res => {
            if (res?.success) {
                toast.success(`Tabriklaymiz! Podcastni tinglaganingiz uchun +${res.amount} XP`, { duration: 4000 });
            }
        }).catch(err => console.error("XP award failed:", err));
    }, [currentTime, duration, podcast, user, awardXP]);

    // Sahifadan chiqilganda ijro to'xtaydi
    useEffect(() => () => setIsPlaying(false), [setIsPlaying]);

    // To'liq transkript ochiq bo'lsa — faol qatorni ko'rinishda ushlab turamiz
    useEffect(() => {
        if (!showFullTranscript) return;
        activeLineRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [activeTimelineIdx, showFullTranscript]);

    // -------------------------------------------------------- Klaviatura

    useEffect(() => {
        const onKey = (e) => {
            const tag = e.target?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            switch (e.code) {
                case "Space": case "KeyK": e.preventDefault(); setIsPlaying(p => !p); break;
                case "ArrowRight": e.preventDefault(); skipBy(5); break;
                case "ArrowLeft": e.preventDefault(); skipBy(-5); break;
                case "KeyL": e.preventDefault(); skipBy(SKIP_SECONDS); break;
                case "KeyJ": e.preventDefault(); skipBy(-SKIP_SECONDS); break;
                case "KeyM": e.preventDefault(); toggleMute(); break;
                case "KeyX": e.preventDefault(); cyclePlaybackRate(); break;
                default: break;
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [setIsPlaying, skipBy, toggleMute, cyclePlaybackRate]);

    // ----------------------------------------------------- Progress drag

    const progressRef = useRef(null);
    const [scrubTime, setScrubTime] = useState(null);
    const displayTime = scrubTime != null ? scrubTime : currentTime;

    const timeFromPointer = useCallback((clientX) => {
        const el = progressRef.current;
        if (!el || !duration) return 0;
        const rect = el.getBoundingClientRect();
        return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration;
    }, [duration]);

    const progressPct = duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;

    const handleLike = () => {
        if (!user?.uid) {
            navigate('/auth/login');
            return;
        }
        toggleLike(user.uid, podcastId);
    };

    if (loading) return (
        <div className="h-[100dvh] bg-warm-dark flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-12 h-12 border-4 border-white/5 border-t-warm-primary rounded-full" />
        </div>
    );

    if (!podcast || notFound) return (
        <div className="h-[100dvh] bg-warm-dark flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-warm-on-dark font-bold text-lg">{t('podcastPage.episodeNotFound')}</p>
            <button
                onClick={() => navigate('/podcasts')}
                className="px-5 py-2 rounded-full bg-warm-primary hover:bg-warm-primary-active text-warm-on-primary font-semibold text-sm transition-colors"
            >
                {t('podcastPage.backToPodcasts')}
            </button>
        </div>
    );

    const iconMuted = isMuted || volume === 0;
    const VolumeIcon = iconMuted ? VolumeX : (volume < 0.5 ? Volume1 : Volume2);
    const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

    return (
        <div className="h-[100dvh] w-full bg-warm-dark text-warm-on-dark flex flex-col font-sans relative overflow-hidden">
            {/* Header */}
            <header className="relative z-20 px-4 md:px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] flex items-center justify-between bg-warm-dark/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-4 min-w-0">
                    <button
                        onClick={() => navigate(-1)}
                        aria-label={t('podcastPage.back')}
                        title={t('podcastPage.back')}
                        className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-warm-on-dark-soft" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-sm font-bold truncate max-w-[200px] md:max-w-[380px] leading-tight text-warm-on-dark">{podcast.title}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] bg-warm-primary text-warm-on-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">{podcast.level || "B2"}</span>
                            <span className="text-[9px] text-warm-on-dark-soft font-bold uppercase tracking-widest hidden sm:inline">Interactive Session</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <button
                        onClick={() => setShowFullTranscript(v => !v)}
                        aria-pressed={showFullTranscript}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border border-white/5 ${showFullTranscript ? 'bg-warm-primary/20 text-warm-primary' : 'bg-white/5 hover:bg-white/10 text-warm-on-dark-soft'}`}
                        title={t('podcastPage.fullTranscript')}
                    >
                        <ListIcon size={18} />
                    </button>
                    <button
                        onClick={() => setIsShareOpen(true)}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5 text-warm-on-dark-soft"
                        title={t('podcastPage.share')}
                        aria-label={t('podcastPage.share')}
                    >
                        <Share2 size={18} />
                    </button>
                    <button
                        onClick={() => navigate('/podcasts')}
                        aria-label={t('podcastPage.close')}
                        title={t('podcastPage.close')}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5 text-warm-on-dark-soft"
                    >
                        <X size={18} />
                    </button>
                </div>
            </header>

            {(playbackError || autoplayBlocked) && (
                <div className={`z-30 px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 text-[12px] font-semibold ${playbackError ? 'bg-warm-error text-white' : 'bg-warm-warning text-warm-ink'}`}>
                    <span className="flex items-center gap-2 min-w-0">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span className="truncate">
                            {playbackError || "Brauzer avtomatik ijroni to'sdi — boshlash uchun Play tugmasini bosing."}
                        </span>
                    </span>
                    {playbackError && (
                        <button onClick={retryPlayback} className="shrink-0 px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors">
                            Qayta urinish
                        </button>
                    )}
                </div>
            )}

            <main className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-hidden bg-gradient-to-b from-warm-dark-elevated to-warm-dark min-h-0">
                {/* Left Side: Visuals */}
                <div className="hidden lg:flex lg:w-[40%] flex-col items-center justify-center p-8 lg:p-12">
                    <motion.div animate={{ rotate: isPlaying ? 360 : 0 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} className="relative w-full max-w-[380px] aspect-square">
                        <div className="absolute inset-0 rounded-full border-[10px] border-white/5 shadow-2xl overflow-hidden bg-warm-dark-soft">
                            <LazyImage src={podcast.thumbnail} alt="" className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-500" />
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-warm-dark rounded-full border-4 border-white/5 flex items-center justify-center shadow-inner">
                            <div className="w-3 h-3 bg-white/10 rounded-full" />
                        </div>
                    </motion.div>
                </div>

                {/* Right Side: Script */}
                <div className="flex-1 flex flex-col overflow-hidden bg-black/20 lg:border-l border-white/5 min-h-0">
                    {combinedTimeline.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center px-8 text-center">
                            <p className="text-warm-on-dark-soft font-semibold text-sm">{t('podcastPage.noTranscript')}</p>
                        </div>
                    ) : showFullTranscript ? (
                        /* To'liq transkript — avval faqat 3 qator ko'rinardi va oldinga/orqaga
                           qarab o'qish imkoni yo'q edi */
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-10 py-8 space-y-1">
                            {combinedTimeline.map((item, idx) => {
                                const isActive = idx === activeTimelineIdx;
                                return (
                                    <button
                                        key={`${item.time}-${idx}`}
                                        ref={isActive ? activeLineRef : null}
                                        onClick={() => handleSeek(item.time)}
                                        className={`w-full text-left flex gap-4 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-warm-primary/12' : 'hover:bg-white/5'}`}
                                    >
                                        <span className={`text-[11px] font-mono pt-1 w-11 shrink-0 tabular-nums ${isActive ? 'text-warm-primary' : 'text-warm-on-dark-soft/60'}`}>
                                            {formatTime(item.time)}
                                        </span>
                                        <span className={`text-[15px] leading-relaxed ${isActive ? 'text-warm-primary font-semibold' : 'text-warm-on-dark-soft'}`}>
                                            {item.text}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-16 space-y-8 md:space-y-12">
                            {[-1, 0, 1].map(offset => {
                                const originalIdx = activeTimelineIdx + offset;
                                const item = originalIdx >= 0 ? combinedTimeline[originalIdx] : null;
                                if (!item) return <div key={`empty-${offset}`} className="h-20 opacity-0" />;
                                const isActive = offset === 0;
                                return (
                                    <motion.button
                                        key={`${originalIdx}-${item.type}`}
                                        onClick={() => handleSeek(item.time)}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: isActive ? 1 : 0.25, scale: isActive ? 1 : 0.92, y: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="text-center w-full px-2 md:px-4 cursor-pointer"
                                    >
                                        <p className={`text-lg md:text-3xl font-bold leading-tight tracking-tight transition-colors ${isActive ? "text-warm-primary" : "text-warm-on-dark-soft/60"}`}>{item.text}</p>
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Player Bar */}
            <div className="min-h-[95px] bg-warm-dark-soft border-t border-white/5 px-4 md:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] flex flex-col md:flex-row items-center gap-3 md:gap-0 md:justify-between z-50 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {/* Track info */}
                <div className="flex items-center gap-4 w-full md:w-[28%] md:min-w-[200px]">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white/5 rounded-lg flex-shrink-0 overflow-hidden shadow-2xl">
                        <LazyImage src={podcast.thumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="truncate pr-4 flex-1 min-w-0">
                        <p className="text-[14px] font-bold truncate text-warm-on-dark leading-tight">{podcast.title}</p>
                        <p className="text-[11px] text-warm-on-dark-soft font-semibold uppercase tracking-wider">{podcast.level || "B2"} Podcast</p>
                    </div>
                    <button
                        onClick={handleLike}
                        aria-label={isLiked ? t('podcastPage.unlike') : t('podcastPage.like')}
                        aria-pressed={isLiked}
                        className={`shrink-0 p-1 transition-all active:scale-125 ${isLiked ? 'text-warm-primary' : 'text-warm-on-dark-soft hover:text-warm-on-dark'}`}
                    >
                        <Heart size={20} fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 0 : 2} />
                    </button>
                </div>

                {/* Controls */}
                <div className="flex flex-col items-center max-w-[650px] w-full px-0 md:px-4">
                    <div className="flex items-center gap-5 md:gap-7 mb-3">
                        <button
                            onClick={() => setShuffle(!shuffle)}
                            aria-pressed={shuffle}
                            title="Aralashtirib ijro etish"
                            className={`transition-colors ${shuffle ? 'text-warm-primary' : 'text-warm-on-dark-soft hover:text-warm-on-dark'}`}
                        >
                            <Shuffle size={18} />
                        </button>
                        <button
                            onClick={() => skipBy(-SKIP_SECONDS)}
                            title={`${SKIP_SECONDS}s orqaga (J)`}
                            aria-label={`${SKIP_SECONDS} soniya orqaga`}
                            className="relative text-warm-on-dark-soft hover:text-warm-on-dark transition-transform active:scale-90"
                        >
                            <RotateCcw size={24} strokeWidth={2.2} />
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold pt-[1px]">{SKIP_SECONDS}</span>
                        </button>
                        <button
                            className="w-11 h-11 rounded-full bg-warm-primary hover:bg-warm-primary-active text-warm-on-primary flex items-center justify-center hover:scale-105 transition-all shadow-lg active:scale-95"
                            onClick={() => setIsPlaying(!isPlaying)}
                            aria-label={isPlaying ? "Pauza" : "Ijro etish"}
                            title={isPlaying ? "Pauza (Space)" : "Ijro etish (Space)"}
                        >
                            {isLoading
                                ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                : isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                        </button>
                        <button
                            onClick={() => skipBy(SKIP_SECONDS)}
                            title={`${SKIP_SECONDS}s oldinga (L)`}
                            aria-label={`${SKIP_SECONDS} soniya oldinga`}
                            className="relative text-warm-on-dark-soft hover:text-warm-on-dark transition-transform active:scale-90"
                        >
                            <RotateCw size={24} strokeWidth={2.2} />
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold pt-[1px]">{SKIP_SECONDS}</span>
                        </button>
                        <button
                            onClick={cycleRepeat}
                            title={repeat === 'one' ? "Bitta epizodni takrorlash" : repeat === 'all' ? "Ro'yxatni takrorlash" : "Takrorlash o'chiq"}
                            className={`transition-colors ${repeat !== 'off' ? 'text-warm-primary' : 'text-warm-on-dark-soft hover:text-warm-on-dark'}`}
                        >
                            <RepeatIcon size={18} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3 w-full">
                        <span className="text-[11px] text-warm-on-dark-soft font-semibold w-9 text-right tabular-nums">{formatTime(displayTime)}</span>
                        <div
                            ref={progressRef}
                            role="slider"
                            tabIndex={0}
                            aria-label="Ijro pozitsiyasi"
                            aria-valuemin={0}
                            aria-valuemax={Math.round(duration) || 0}
                            aria-valuenow={Math.round(displayTime) || 0}
                            aria-valuetext={`${formatTime(displayTime)} / ${formatTime(duration)}`}
                            onPointerDown={(e) => {
                                if (!duration) return;
                                e.currentTarget.setPointerCapture?.(e.pointerId);
                                setScrubTime(timeFromPointer(e.clientX));
                            }}
                            onPointerMove={(e) => { if (scrubTime != null) setScrubTime(timeFromPointer(e.clientX)); }}
                            onPointerUp={(e) => {
                                if (scrubTime == null) return;
                                handleSeek(timeFromPointer(e.clientX));
                                setScrubTime(null);
                            }}
                            onPointerCancel={() => setScrubTime(null)}
                            onKeyDown={(e) => {
                                if (e.key === "ArrowRight") { e.preventDefault(); skipBy(5); }
                                else if (e.key === "ArrowLeft") { e.preventDefault(); skipBy(-5); }
                            }}
                            className="flex-1 h-[4px] bg-white/15 rounded-full group cursor-pointer flex items-center touch-none"
                        >
                            <div className="h-full bg-warm-on-dark group-hover:bg-warm-primary rounded-full relative transition-colors" style={{ width: `${progressPct}%` }}>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-xl" />
                            </div>
                        </div>
                        <span className="text-[11px] text-warm-on-dark-soft font-semibold w-9 tabular-nums">{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Speed + volume */}
                <div className="hidden md:flex items-center justify-end gap-4 w-[28%] min-w-[200px] text-warm-on-dark-soft">
                    <button
                        onClick={cyclePlaybackRate}
                        title="Ijro tezligi (X)"
                        aria-label={`Ijro tezligi: ${playbackRate}x`}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold tabular-nums border transition-colors ${
                            playbackRate === 1 ? 'border-white/10 hover:text-warm-on-dark' : 'border-warm-primary/50 text-warm-primary'
                        }`}
                    >
                        <Gauge size={13} /> {playbackRate}x
                    </button>
                    <div className="flex items-center gap-2 w-[120px]">
                        <button
                            className={`transition-colors ${iconMuted ? 'text-warm-error' : 'hover:text-warm-on-dark'}`}
                            onClick={toggleMute}
                            aria-label={iconMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
                            title="Ovoz (M)"
                        >
                            <VolumeIcon size={18} />
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={iconMuted ? 0 : volume}
                            onChange={(e) => updateVolume(parseFloat(e.target.value))}
                            aria-label="Ovoz balandligi"
                            className="flex-1 h-1 accent-warm-primary cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            <ShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                testId={podcastId}
                testTitle={podcast.title}
                testType="podcast"
            />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.12); border-radius: 9999px; }
            `}} />
        </div>
    );
}

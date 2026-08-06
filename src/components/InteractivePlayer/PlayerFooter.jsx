import React from "react";
import {
    RotateCcw, Pause, Play, RotateCw, Target, Heart, AlertTriangle,
    SkipBack, SkipForward, Volume2, Volume1, VolumeX, Gauge
} from "lucide-react";
import { usePodcast } from "../../context/PodcastContext";
import { useAuth } from "../../context/AuthContext";

const SKIP_SECONDS = 10;

const pct = (value, total) => (total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0);

export default function PlayerFooter({
    isDark,
    podcast,
    isPlaying,
    setIsPlaying,
    currentTime,
    duration,
    handleMediaSkip,
    handleMediaSeek,
    formatTime,
    onExpand, // Added prop to open player
    isFixed = false, // Added prop to control positioning
    hasBottomNav = false // Added prop to adjust for bottom navigation bar
}) {
    const {
        likedPodcasts, toggleLike, youtubePlayerRef, isLoading,
        volume, isMuted, toggleMute, updateVolume,
        playbackRate, cyclePlaybackRate,
        playNext, playPrev, hasNext, hasPrev,
        playbackError, retryPlayback,
    } = usePodcast();
    const { user } = useAuth();
    const isLiked = likedPodcasts.includes(podcast?.id);

    const progress = pct(currentTime, duration);
    const remaining = duration > 0 ? Math.max(0, duration - currentTime) : 0;

    const progressRef = React.useRef(null);
    const [isScrubbing, setIsScrubbing] = React.useState(false);
    const [scrubTime, setScrubTime] = React.useState(null);
    const displayTime = scrubTime != null ? scrubTime : currentTime;

    // --------------------------------------------------- Progress bar drag

    const timeFromPointer = (clientX) => {
        const el = progressRef.current;
        if (!el || !duration) return 0;
        const rect = el.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return ratio * duration;
    };

    const startScrub = (e) => {
        if (!duration) return;
        e.preventDefault();
        const el = progressRef.current;
        el?.setPointerCapture?.(e.pointerId);
        setIsScrubbing(true);
        setScrubTime(timeFromPointer(e.clientX));
    };

    const moveScrub = (e) => {
        if (!isScrubbing) return;
        setScrubTime(timeFromPointer(e.clientX));
    };

    const endScrub = (e) => {
        if (!isScrubbing) return;
        const target = timeFromPointer(e.clientX);
        setIsScrubbing(false);
        setScrubTime(null);
        handleMediaSeek(target);
    };

    const onProgressKeyDown = (e) => {
        if (!duration) return;
        if (e.key === "ArrowRight") { e.preventDefault(); handleMediaSeek(Math.min(duration, currentTime + 5)); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); handleMediaSeek(Math.max(0, currentTime - 5)); }
        else if (e.key === "Home") { e.preventDefault(); handleMediaSeek(0); }
        else if (e.key === "End") { e.preventDefault(); handleMediaSeek(duration); }
    };

    // -------------------------------------------- Mobil: sudrab seek qilish
    // Avval sudrash tugagach onClick ham ishlab, pleyer kutilmaganda ochilib ketardi.
    const dragStateRef = React.useRef({ active: false, moved: false, startX: 0, startTime: 0, width: 1 });

    const beginTitleDrag = (clientX, width) => {
        dragStateRef.current = {
            active: true, moved: false, startX: clientX, startTime: currentTime, width: width || 1
        };
    };

    const moveTitleDrag = (clientX) => {
        const st = dragStateRef.current;
        if (!st.active || !duration) return;
        const deltaX = clientX - st.startX;
        if (Math.abs(deltaX) < 6) return;
        st.moved = true;
        const newTime = Math.max(0, Math.min(duration, st.startTime + duration * (deltaX / st.width)));
        handleMediaSeek(newTime);
    };

    const handleTitleClick = () => {
        if (dragStateRef.current.moved) {
            dragStateRef.current.moved = false;
            return;
        }
        onExpand?.();
    };

    const togglePlay = (e) => {
        e.stopPropagation();
        if (podcast?.mediaType === 'youtube' && youtubePlayerRef?.current) {
            if (isPlaying) youtubePlayerRef.current.pauseVideo?.();
            else youtubePlayerRef.current.playVideo?.();
        }
        setIsPlaying(!isPlaying);
    };

    const skip = (amount) => {
        if (handleMediaSkip) handleMediaSkip(amount);
        else handleMediaSeek(Math.max(0, Math.min(duration || Infinity, currentTime + amount)));
    };

    const iconMuted = isMuted || volume === 0;
    const VolumeIcon = iconMuted ? VolumeX : (volume < 0.5 ? Volume1 : Volume2);

    const subtleText = isDark ? 'text-neutral-500' : 'text-zinc-400';
    const hoverText = isDark ? 'hover:text-white' : 'hover:text-zinc-900';

    return (
        <footer className={`shrink-0 border-t z-50 transition-all duration-300
            ${isFixed ? `fixed ${hasBottomNav ? 'bottom-[56px]' : 'bottom-0'} md:bottom-0 left-0 right-0 md:w-full rounded-none shadow-[0_-4px_12px_rgba(0,0,0,0.1)] md:shadow-none` : 'relative'}
            ${isDark ? 'border-neutral-800 bg-[#121212]/98 backdrop-blur-xl text-white' : 'border-zinc-100 bg-white/98 backdrop-blur-xl text-zinc-900'}
            h-[56px] md:h-20 px-3 md:px-6 flex items-center justify-between`}>

            {/* Xatolik banneri — avval buzuq audio jimgina ishlamay qolardi */}
            {playbackError && (
                <div className="absolute -top-11 left-0 right-0 mx-3 md:mx-6 rounded-lg bg-rose-600 text-white text-[12px] font-semibold px-3 py-2 flex items-center justify-between gap-3 shadow-lg">
                    <span className="flex items-center gap-2 min-w-0">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span className="truncate">{playbackError}</span>
                    </span>
                    <button
                        onClick={retryPlayback}
                        className="shrink-0 px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors"
                    >
                        Qayta urinish
                    </button>
                </div>
            )}

            {/* Left: Info & Mini Preview (Mobile Friendly) */}
            <div className="flex items-center gap-2 flex-1 min-w-0 md:flex-none md:w-[26%] h-full">
                <div
                    role={onExpand ? "button" : undefined}
                    tabIndex={onExpand ? 0 : undefined}
                    aria-label={onExpand ? "Pleyerni ochish" : undefined}
                    onClick={handleTitleClick}
                    onKeyDown={(e) => { if (onExpand && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onExpand(); } }}
                    className={`flex items-center gap-3 h-full relative overflow-hidden flex-1 min-w-0 group/seek ${onExpand ? 'cursor-pointer' : ''}`}
                    onMouseDown={(e) => {
                        if (window.innerWidth >= 768) return; // Faqat mobil uchun sudrab seek
                        beginTitleDrag(e.clientX, e.currentTarget.getBoundingClientRect().width);
                        const onMove = (ev) => moveTitleDrag(ev.clientX);
                        const onUp = () => {
                            dragStateRef.current.active = false;
                            document.removeEventListener('mousemove', onMove);
                            document.removeEventListener('mouseup', onUp);
                        };
                        document.addEventListener('mousemove', onMove);
                        document.addEventListener('mouseup', onUp);
                    }}
                    onTouchStart={(e) => {
                        beginTitleDrag(e.touches[0].clientX, e.currentTarget.getBoundingClientRect().width);
                        const onMove = (ev) => moveTitleDrag(ev.touches[0].clientX);
                        const onEnd = () => {
                            dragStateRef.current.active = false;
                            document.removeEventListener('touchmove', onMove);
                            document.removeEventListener('touchend', onEnd);
                        };
                        document.addEventListener('touchmove', onMove, { passive: true });
                        document.addEventListener('touchend', onEnd);
                    }}
                >
                    {/* Progress Overlay (Dark shadow moving over the title) */}
                    <div
                        className="absolute inset-0 z-0 bg-black/20 pointer-events-none transition-all duration-500 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                    <div className="absolute bottom-0 left-0 h-[3px] bg-emerald-500 z-10 transition-all duration-500 ease-linear"
                        style={{ width: `${progress}%` }}
                    />

                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded overflow-hidden flex items-center justify-center border shadow-md shrink-0 z-10 ml-1 ${isDark ? 'bg-neutral-800 border-white/5' : 'bg-zinc-100 border-zinc-200'}`}>
                        {podcast.thumbnail ? (
                            <img src={podcast.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Target size={18} className="text-emerald-500" />
                        )}
                    </div>

                    <div className="flex flex-col overflow-hidden flex-1 z-10">
                        <span className={`text-[13px] md:text-sm font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>{podcast.title}</span>
                        {/* Mobilda ham vaqt ko'rinadi — avval faqat ingichka chiziq bor edi */}
                        <span className={`text-[11px] truncate tabular-nums ${subtleText}`}>
                            <span className="md:hidden">{formatTime(displayTime)} / {formatTime(duration)}</span>
                            <span className="hidden md:inline">{podcast.level ? `Level ${podcast.level}` : "Podcast"}</span>
                        </span>
                    </div>
                </div>

                {/* Like Button - Outside the progress container */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(user?.uid, podcast?.id);
                    }}
                    aria-label={isLiked ? "Saralanganlardan olib tashlash" : "Saralanganlarga qo'shish"}
                    aria-pressed={isLiked}
                    title={isLiked ? "Saralanganlardan olib tashlash" : "Saralanganlarga qo'shish"}
                    className={`shrink-0 p-2 transition-all active:scale-125 z-20 ${isLiked ? 'text-emerald-500' : `${subtleText} ${hoverText}`}`}
                >
                    <Heart size={20} fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 0 : 2} />
                </button>
            </div>

            {/* Center: Controls + desktop progress */}
            <div className="flex flex-col items-center justify-center shrink-0 md:flex-1 md:max-w-2xl md:px-6 gap-1">
                <div className="flex items-center gap-1.5 md:gap-5">
                    {hasPrev && (
                        <button
                            onClick={(e) => { e.stopPropagation(); playPrev(); }}
                            aria-label="Oldingi epizod"
                            title="Oldingi epizod"
                            className={`hidden md:block p-1.5 transition-all active:scale-75 ${subtleText} ${hoverText}`}
                        >
                            <SkipBack size={18} fill="currentColor" />
                        </button>
                    )}

                    <button
                        onClick={(e) => { e.stopPropagation(); skip(-SKIP_SECONDS); }}
                        aria-label={`${SKIP_SECONDS} soniya orqaga`}
                        title={`${SKIP_SECONDS}s orqaga (J)`}
                        className={`relative p-1.5 transition-all active:scale-75 ${subtleText} ${hoverText}`}
                    >
                        <RotateCcw size={20} strokeWidth={2.5} />
                        <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black pt-[1px]">{SKIP_SECONDS}</span>
                    </button>

                    <button
                        onClick={togglePlay}
                        aria-label={isPlaying ? "Pauza" : "Ijro etish"}
                        title={isPlaying ? "Pauza (Space)" : "Ijro etish (Space)"}
                        className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full hover:scale-105 active:scale-90 transition-all shadow-lg ${isDark ? 'bg-white text-black' : 'bg-zinc-900 text-white'}`}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        ) : isPlaying ? (
                            <Pause size={18} fill="currentColor" />
                        ) : (
                            <Play size={18} fill="currentColor" className="ml-0.5" />
                        )}
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); skip(SKIP_SECONDS); }}
                        aria-label={`${SKIP_SECONDS} soniya oldinga`}
                        title={`${SKIP_SECONDS}s oldinga (L)`}
                        className={`relative p-1.5 transition-all active:scale-75 ${subtleText} ${hoverText}`}
                    >
                        <RotateCw size={20} strokeWidth={2.5} />
                        <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black pt-[1px]">{SKIP_SECONDS}</span>
                    </button>

                    {hasNext && (
                        <button
                            onClick={(e) => { e.stopPropagation(); playNext(); }}
                            aria-label="Keyingi epizod"
                            title="Keyingi epizod"
                            className={`hidden md:block p-1.5 transition-all active:scale-75 ${subtleText} ${hoverText}`}
                        >
                            <SkipForward size={18} fill="currentColor" />
                        </button>
                    )}
                </div>

                {/* Desktop progress bar */}
                <div className="hidden md:flex w-full items-center gap-3">
                    <span className={`text-[10px] font-mono tabular-nums w-10 text-right ${subtleText}`}>{formatTime(displayTime)}</span>
                    <div
                        ref={progressRef}
                        role="slider"
                        tabIndex={0}
                        aria-label="Ijro pozitsiyasi"
                        aria-valuemin={0}
                        aria-valuemax={Math.round(duration) || 0}
                        aria-valuenow={Math.round(displayTime) || 0}
                        aria-valuetext={`${formatTime(displayTime)} / ${formatTime(duration)}`}
                        onPointerDown={startScrub}
                        onPointerMove={moveScrub}
                        onPointerUp={endScrub}
                        onPointerCancel={endScrub}
                        onKeyDown={onProgressKeyDown}
                        className={`flex-1 h-1.5 rounded-full cursor-pointer relative group touch-none ${isDark ? 'bg-neutral-800' : 'bg-zinc-200'}`}
                    >
                        <div
                            className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full"
                            style={{ width: `${pct(displayTime, duration)}%` }}
                        >
                            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-transform ${isScrubbing ? 'scale-100' : 'scale-0 group-hover:scale-100'}`} />
                        </div>
                    </div>
                    {/* Qolgan vaqt — o'quvchi uchun umumiy davomiylikdan foydaliroq */}
                    <span className={`text-[10px] font-mono tabular-nums w-12 ${subtleText}`} title="Qolgan vaqt">
                        -{formatTime(remaining)}
                    </span>
                </div>
            </div>

            {/* Right: speed + volume (desktop) */}
            <div className="hidden md:flex items-center justify-end gap-3 w-[20%] min-w-[170px]">
                <button
                    onClick={cyclePlaybackRate}
                    aria-label={`Ijro tezligi: ${playbackRate}x`}
                    title="Ijro tezligi (X)"
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-black tabular-nums border transition-colors ${
                        playbackRate === 1
                            ? `${isDark ? 'border-neutral-800 text-neutral-400' : 'border-zinc-200 text-zinc-500'} ${hoverText}`
                            : 'border-emerald-500/40 text-emerald-500'
                    }`}
                >
                    <Gauge size={13} />
                    {playbackRate}x
                </button>

                <div className="flex items-center gap-2 w-[110px] group">
                    <button
                        onClick={toggleMute}
                        aria-label={iconMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
                        title={iconMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
                        className={`${iconMuted ? 'text-rose-500' : subtleText} ${hoverText} transition-colors`}
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
                        className="flex-1 h-1 accent-emerald-500 cursor-pointer"
                    />
                </div>
            </div>

            {/* Mobile-only Progress Line (Bottom of pill) */}
            <div className="md:hidden absolute bottom-0 left-3 right-3 h-0.5 bg-neutral-800/30 rounded-full overflow-hidden">
                <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </footer>
    );
}

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Play, Pause, Download, Heart, RotateCcw, ChevronLeft, Share2, CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import { usePodcast } from "../../context/PodcastContext";
import { useAuth } from "../../context/AuthContext";
import { useEpisodeDetails } from "../../hooks/usePodcastData";
import { formatTime, getPodcastDuration, getPodcastDate } from "../../utils/podcastUtils";
import { getProgress, clearProgress } from "../../utils/podcastProgress";
import PlayerFooter from "../../components/InteractivePlayer/PlayerFooter";
import ShareModal from "../../components/common/ShareModal";

// Sub-components
import { EpisodeSkeleton } from "../../components/podcasts/PodcastSkeletons";
import PodcastError from "../../components/podcasts/PodcastError";
import EpisodeHero from "../../components/podcasts/EpisodeHero";
import ExerciseAccordion from "../../components/podcasts/ExerciseAccordion";
import TranscriptAccordion from "../../components/podcasts/TranscriptAccordion";
import PodcastBottomNav from "../../components/podcasts/PodcastBottomNav";

export default function SpotifyEpisodeDetails() {
    const { podcastId } = useParams();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const {
        currentTrack, setCurrentTrack, isPlaying, setIsPlaying,
        currentTime, duration, handleSeek, isExpanded, setIsExpanded,
        likedPodcasts, toggleLike,
    } = usePodcast();
    const { user } = useAuth();

    // Data Hook
    const { podcast, album, loading, error, retry } = useEpisodeDetails(podcastId);
    
    const [showMoreDesc, setShowMoreDesc] = useState(false);
    const [scrollOpacity, setScrollOpacity] = useState(0);
    const [openSection, setOpenSection] = useState(null); // 'exercises' or 'transcript'
    const [isShareOpen, setIsShareOpen] = useState(false);
    const containerRef = useRef(null);
    const scrollAreaRef = useRef(null);

    // Scroll haqiqatda ichki konteynerda sodir bo'ladi — avval tashqi div kuzatilgani
    // uchun sticky mini-header hech qachon ko'rinmasdi.
    useEffect(() => {
        const el = scrollAreaRef.current;
        if (!el) return;

        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(() => {
                    const opacity = Math.min(1, Math.max(0, el.scrollTop / 120));
                    setScrollOpacity(opacity);
                    ticking = false;
                });
            }
        };

        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, [loading]);

    const handlePlay = () => {
        if (!podcast) return;
        // Ayni shu epizod o'ynayotgan bo'lsa — pauza (Pause ikonkasi bosilganda hech nima bo'lmasdi)
        if (currentTrack?.id === podcast.id) {
            setIsPlaying(!isPlaying);
        } else {
            setCurrentTrack(podcast);
            setIsPlaying(true);
        }
        setIsExpanded(true);
    };

    const handleMediaSkip = (amount) => {
        const target = Math.max(0, Math.min(duration, currentTime + amount));
        handleSeek(target);
    };



    const isPlayingThis = currentTrack?.id === podcast?.id && isPlaying;
    const isCurrent = currentTrack?.id === podcast?.id;
    const exercises = podcast?.questions || [];
    const transcript = podcast?.transcript || [];
    const isLiked = likedPodcasts.includes(podcastId);

    // Haqiqiy tinglash progressi: joriy trek bo'lsa — jonli vaqt, aks holda
    // saqlangan progress. Avval progress bar doim bo'sh (w-0) turardi.
    const totalDuration = (isCurrent && duration > 0) ? duration : getPodcastDuration(podcast);
    const saved = useMemo(
        () => (podcast?.id ? getProgress(podcast.id) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [podcast?.id, isCurrent, currentTime]
    );
    const listenedTime = isCurrent ? currentTime : (saved?.completed ? totalDuration : (saved?.time || 0));
    const progressPct = totalDuration > 0 ? Math.min(100, (listenedTime / totalDuration) * 100) : 0;
    const remaining = Math.max(0, totalDuration - listenedTime);
    const isCompleted = !isCurrent && !!saved?.completed;
    const canResume = !isCurrent && !saved?.completed && (saved?.time || 0) > 15;

    const handleRestart = () => {
        if (!podcast) return;
        clearProgress(podcast.id);
        if (isCurrent) handleSeek(0);
        else setCurrentTrack(podcast);
        setIsPlaying(true);
        setIsExpanded(true);
    };

    const handleDownload = () => {
        // Avval tugma hech nima qilmasdi
        if (!podcast?.audioUrl) {
            toast.error("Bu epizod uchun yuklab olish mavjud emas.");
            return;
        }
        const a = document.createElement('a');
        a.href = podcast.audioUrl;
        a.download = `${(podcast.title || 'podcast').replace(/[^\w\s-]/g, '')}.mp3`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    const handleLike = () => {
        if (!user?.uid) {
            navigate('/auth/login');
            return;
        }
        toggleLike(user.uid, podcastId);
    };

    return (
        <div ref={containerRef} className={`h-screen w-full flex flex-col font-sans select-none overflow-y-auto custom-scrollbar relative transition-colors duration-300 gpu-accelerated ${isDark ? 'bg-black text-white' : 'bg-zinc-50 text-zinc-900'}`}>
            {/* Top Header */}
            <div className={`sticky top-0 z-50 px-6 md:px-10 py-4 flex items-center justify-between border-b transition-colors ${isDark ? 'bg-[#121212] border-white/5' : 'bg-white border-zinc-100'}`}>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate('/podcasts');
                        }} 
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 ${isDark ? 'bg-black/60 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <h2 className={`text-xl font-black truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>Episode</h2>
                </div>
            </div>

            <div ref={scrollAreaRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
                {error ? (
                    <div className="flex items-center justify-center min-h-[60vh] px-4">
                        <PodcastError isDark={isDark} onRetry={retry} />
                    </div>
                ) : loading ? (
                    <div className="p-8">
                        <EpisodeSkeleton isDark={isDark} />
                    </div>
                ) : !podcast ? (
                    /* Epizod topilmaganda avval podcast.title o'qilib sahifa qulab tushardi */
                    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
                        <p className={`font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Epizod topilmadi.</p>
                        <button
                            onClick={() => navigate('/podcasts')}
                            className="px-5 py-2 rounded-full bg-[#1ed760] text-black font-bold text-sm"
                        >
                            Podcastlarga qaytish
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Scroll Animated Header */}
                        <div 
                            className="fixed top-[65px] left-0 w-full z-40 px-6 md:px-10 py-3 flex items-center gap-4 border-b shadow-2xl transition-opacity"
                            style={{ 
                                backgroundColor: isDark ? '#08504B' : '#E6F4F1',
                                opacity: scrollOpacity, 
                                pointerEvents: scrollOpacity > 0.3 ? 'auto' : 'none',
                                transition: 'opacity 0.2s ease-out'
                            }}
                        >
                            <button 
                                onClick={handlePlay}
                                className="w-10 h-10 bg-[#1ed760] rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 text-black shadow-lg shrink-0"
                            >
                                {isPlayingThis ? <Pause fill="black" size={18} /> : <Play fill="black" size={18} className="ml-0.5" />}
                            </button>
                            <div className="min-w-0">
                                <h2 className={`text-[15px] font-black truncate tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{podcast.title}</h2>
                                <p className={`text-[11px] font-medium leading-none mt-0.5 ${isDark ? 'text-white/60' : 'text-zinc-500'}`}>Now playing</p>
                            </div>
                        </div>

                        <EpisodeHero podcast={podcast} album={album} isDark={isDark} />

                        {/* Content section */}
                        <div className="px-6 md:px-10 pb-48">
                            {/* Date and listening progress */}
                            <div className={`flex items-center gap-2 mb-6 mt-8 text-sm font-medium ${isDark ? 'text-[#a7a7a7]' : 'text-zinc-500'}`}>
                                <span>{getPodcastDate(podcast)}</span>
                                <span aria-hidden>•</span>
                                {isCompleted ? (
                                    <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
                                        <CheckCircle2 size={15} /> Tinglab bo'lingan
                                    </span>
                                ) : (
                                    <span className="tabular-nums">
                                        {progressPct > 0
                                            ? `${formatTime(remaining)} qoldi`
                                            : formatTime(totalDuration)}
                                    </span>
                                )}
                                {totalDuration > 0 && (
                                    <div className={`w-24 h-1 rounded-full ml-2 overflow-hidden ${isDark ? 'bg-white/20' : 'bg-zinc-200'}`}>
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                            style={{ width: `${isCompleted ? 100 : progressPct}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-5 md:gap-6 mb-10 flex-wrap">
                                <button
                                    onClick={handlePlay}
                                    aria-label={isPlayingThis ? "Pauza" : (canResume ? "Davom ettirish" : "Ijro etish")}
                                    className="w-14 h-14 bg-[#1ed760] rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 text-black shadow-xl shrink-0"
                                >
                                    {isPlayingThis ? <Pause fill="black" size={28} /> : <Play fill="black" size={28} className="ml-1" />}
                                </button>

                                {/* Qayerdan davom etishi endi ochiq ko'rsatiladi */}
                                {(canResume || isCompleted) && (
                                    <button
                                        onClick={handleRestart}
                                        className={`flex items-center gap-2 px-4 h-9 rounded-full border text-[13px] font-bold transition-colors ${isDark ? 'border-white/20 text-white hover:border-white' : 'border-zinc-300 text-zinc-700 hover:border-zinc-900'}`}
                                    >
                                        <RotateCcw size={15} /> Boshidan
                                    </button>
                                )}

                                <button
                                    onClick={handleLike}
                                    aria-pressed={isLiked}
                                    aria-label={isLiked ? "Saralanganlardan olib tashlash" : "Saralanganlarga qo'shish"}
                                    title={isLiked ? "Saralanganlardan olib tashlash" : "Saralanganlarga qo'shish"}
                                    className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                                        isLiked
                                            ? 'border-emerald-500 text-emerald-500'
                                            : (isDark ? 'border-[#a7a7a7] text-[#a7a7a7] hover:text-white hover:border-white' : 'border-zinc-300 text-zinc-500 hover:text-zinc-900 hover:border-zinc-900')
                                    }`}
                                >
                                    <Heart size={16} fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 0 : 2} />
                                </button>

                                <button
                                    onClick={handleDownload}
                                    aria-label="Yuklab olish"
                                    title="Yuklab olish"
                                    className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${isDark ? 'border-[#a7a7a7] text-[#a7a7a7] hover:text-white hover:border-white' : 'border-zinc-300 text-zinc-500 hover:text-zinc-900 hover:border-zinc-900'}`}
                                >
                                    <Download size={16} />
                                </button>

                                <button
                                    onClick={() => setIsShareOpen(true)}
                                    className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${isDark ? 'border-[#a7a7a7] text-[#a7a7a7] hover:text-white hover:border-white' : 'border-zinc-300 text-zinc-500 hover:text-zinc-900 hover:border-zinc-900'}`}
                                    title="Ulashish"
                                    aria-label="Ulashish"
                                >
                                    <Share2 size={16} />
                                </button>
                            </div>

                            {/* Description */}
                            <div className="mb-10 max-w-3xl">
                                <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Episode Description</h2>
                                <div className={`text-[15px] leading-relaxed whitespace-pre-wrap ${isDark ? 'text-[#a7a7a7]' : 'text-zinc-600'}`}>
                                    {showMoreDesc ? podcast.description : (podcast.description?.substring(0, 250) + (podcast.description?.length > 250 ? "..." : ""))}
                                    {podcast.description && podcast.description.length > 250 && (
                                        <button onClick={() => setShowMoreDesc(!showMoreDesc)} className={`font-bold ml-2 hover:underline ${isDark ? 'text-white' : 'text-emerald-600'}`}>
                                            {showMoreDesc ? "Show less" : "Show more"}
                                        </button>
                                    )}
                                </div>
                                {album && (
                                    <button 
                                        onClick={() => navigate(`/podcast/album/${podcast.collectionId}`)}
                                        className={`mt-6 px-4 py-1.5 border rounded-full text-sm font-bold transition-all hover:scale-105 ${isDark ? 'border-white/30 text-white hover:border-white' : 'border-zinc-200 text-zinc-900 hover:border-zinc-900'}`}
                                    >
                                        See all episodes
                                    </button>
                                )}
                            </div>

                            <hr className={`mb-10 ${isDark ? 'border-white/10' : 'border-zinc-100'}`} />

                            <div className="max-w-3xl space-y-4">
                                <ExerciseAccordion 
                                    exercises={exercises} 
                                    openSection={openSection} 
                                    setOpenSection={setOpenSection} 
                                    isDark={isDark}
                                />
                                <TranscriptAccordion 
                                    transcript={transcript} 
                                    openSection={openSection} 
                                    setOpenSection={setOpenSection} 
                                    isDark={isDark}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Global Footer Player */}
            {currentTrack && (
                <PlayerFooter 
                    isDark={isDark}
                    podcast={currentTrack}
                    isPlaying={isPlaying}
                    setIsPlaying={setIsPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    handleMediaSkip={handleMediaSkip}
                    handleMediaSeek={handleSeek}
                    formatTime={formatTime}
                    onExpand={() => setIsExpanded(true)}
                    isFixed={true}
                    hasBottomNav={true}
                />
            )}
            {!isExpanded && <PodcastBottomNav isDark={isDark} />}

            <ShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                testId={podcastId}
                testTitle={podcast?.title}
                testType="podcast"
            />
        </div>
    );
}


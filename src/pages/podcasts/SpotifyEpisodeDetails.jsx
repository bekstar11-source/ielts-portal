import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Play, Pause, Download, Heart, RotateCcw, ChevronLeft, Share2, CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "../../context/LanguageContext";
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
    const { t } = useTranslation();
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
    // Joriy trek bo'lmaganda localStorage'dan bir marta o'qiymiz — har bir
    // currentTime tick'ida o'qish keraksiz ish edi.
    const saved = useMemo(
        () => (podcast?.id && !isCurrent ? getProgress(podcast.id) : null),
        [podcast?.id, isCurrent]
    );
    const totalDuration = (isCurrent && duration > 0)
        ? duration
        : (saved?.duration || getPodcastDuration(podcast));
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
            toast.error(t('podcastPage.downloadUnavailable'));
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
            navigate('/login');
            return;
        }
        toggleLike(user.uid, podcastId);
    };

    return (
        <div ref={containerRef} className={`h-screen w-full flex flex-col font-sans overflow-y-auto custom-scrollbar relative transition-colors duration-300 gpu-accelerated ${isDark ? 'bg-warm-dark text-warm-on-dark' : 'bg-warm-canvas text-warm-ink'}`}>
            {/* Top Header */}
            <div className={`sticky top-0 z-50 px-4 md:px-10 py-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] flex items-center justify-between border-b transition-colors ${isDark ? 'bg-warm-dark/90 border-white/5' : 'bg-warm-canvas/90 border-warm-hairline'}`}>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate('/podcasts');
                        }} 
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 ${isDark ? 'bg-white/5 text-warm-on-dark-soft hover:text-warm-on-dark hover:bg-white/10' : 'bg-warm-surface text-warm-muted hover:text-warm-ink hover:bg-warm-card'}`}
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <h2 className={`text-lg font-bold tracking-tight truncate ${isDark ? 'text-warm-on-dark' : 'text-warm-ink'}`}>{t('podcastPage.episode')}</h2>
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
                        <p className={`font-bold ${isDark ? 'text-warm-on-dark' : 'text-warm-ink'}`}>{t('podcastPage.episodeNotFound')}</p>
                        <button
                            onClick={() => navigate('/podcasts')}
                            className="px-5 py-2 rounded-full bg-warm-primary hover:bg-warm-primary-active text-warm-on-primary font-semibold text-sm transition-colors"
                        >
                            {t('podcastPage.backToPodcasts')}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Scroll Animated Header */}
                        <div 
                            className="fixed top-[calc(65px+env(safe-area-inset-top,0px))] left-0 w-full z-40 px-6 md:px-10 py-3 flex items-center gap-4 border-b shadow-lg transition-opacity"
                            style={{ 
                                backgroundColor: isDark ? '#252320' : '#f5f0e8',
                                opacity: scrollOpacity, 
                                pointerEvents: scrollOpacity > 0.3 ? 'auto' : 'none',
                                transition: 'opacity 0.2s ease-out'
                            }}
                        >
                            <button 
                                onClick={handlePlay}
                                className="w-10 h-10 bg-warm-primary hover:bg-warm-primary-active text-warm-on-primary rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-md shrink-0"
                            >
                                {isPlayingThis ? <Pause fill="currentColor" size={18} /> : <Play fill="currentColor" size={18} className="ml-0.5" />}
                            </button>
                            <div className="min-w-0">
                                <h2 className={`text-[15px] font-bold truncate tracking-tight ${isDark ? 'text-warm-on-dark' : 'text-warm-ink'}`}>{podcast.title}</h2>
                                <p className={`text-[11px] font-medium leading-none mt-0.5 ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted'}`}>{t('podcastPage.nowPlaying')}</p>
                            </div>
                        </div>

                        <EpisodeHero podcast={podcast} album={album} isDark={isDark} />

                        {/* Content section */}
                        <div className="px-6 md:px-10 pb-[calc(11rem+env(safe-area-inset-bottom,0px))]">
                            {/* Date and listening progress */}
                            <div className={`flex items-center gap-2 mb-6 mt-8 text-sm font-medium ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted'}`}>
                                <span>{getPodcastDate(podcast)}</span>
                                <span aria-hidden>•</span>
                                {isCompleted ? (
                                    <span className="flex items-center gap-1.5 text-warm-success font-semibold">
                                        <CheckCircle2 size={15} /> {t('podcastPage.completed')}
                                    </span>
                                ) : (
                                    <span className="tabular-nums">
                                        {progressPct > 0
                                            ? t('podcastPage.timeLeft', { time: formatTime(remaining) })
                                            : formatTime(totalDuration)}
                                    </span>
                                )}
                                {totalDuration > 0 && (
                                    <div className={`w-24 h-1 rounded-full ml-2 overflow-hidden ${isDark ? 'bg-white/10' : 'bg-warm-card'}`}>
                                        <div
                                            className="h-full bg-warm-primary rounded-full transition-all duration-500"
                                            style={{ width: `${isCompleted ? 100 : progressPct}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-5 md:gap-6 mb-10 flex-wrap">
                                <button
                                    onClick={handlePlay}
                                    aria-label={isPlayingThis ? t('podcastPage.pause') : (canResume ? t('podcastPage.resume') : t('podcastPage.play'))}
                                    className="w-14 h-14 bg-warm-primary hover:bg-warm-primary-active text-warm-on-primary rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shrink-0"
                                >
                                    {isPlayingThis ? <Pause fill="currentColor" size={28} /> : <Play fill="currentColor" size={28} className="ml-1" />}
                                </button>

                                {/* Qayerdan davom etishi endi ochiq ko'rsatiladi */}
                                {(canResume || isCompleted) && (
                                    <button
                                        onClick={handleRestart}
                                        className={`flex items-center gap-2 px-4 h-9 rounded-full border text-[13px] font-bold transition-colors ${isDark ? 'border-white/15 text-warm-on-dark hover:border-white/40' : 'border-warm-hairline text-warm-body hover:border-warm-muted'}`}
                                    >
                                        <RotateCcw size={15} /> {t('podcastPage.restart')}
                                    </button>
                                )}

                                <button
                                    onClick={handleLike}
                                    aria-pressed={isLiked}
                                    aria-label={isLiked ? t('podcastPage.unlike') : t('podcastPage.like')}
                                    title={isLiked ? t('podcastPage.unlike') : t('podcastPage.like')}
                                    className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                                        isLiked
                                            ? 'border-warm-primary text-warm-primary'
                                            : (isDark ? 'border-white/15 text-warm-on-dark-soft hover:text-warm-on-dark hover:border-white/40' : 'border-warm-hairline text-warm-muted hover:text-warm-ink hover:border-warm-muted')
                                    }`}
                                >
                                    <Heart size={16} fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 0 : 2} />
                                </button>

                                <button
                                    onClick={handleDownload}
                                    aria-label={t('podcastPage.download')}
                                    title={t('podcastPage.download')}
                                    className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${isDark ? 'border-white/15 text-warm-on-dark-soft hover:text-warm-on-dark hover:border-white/40' : 'border-warm-hairline text-warm-muted hover:text-warm-ink hover:border-warm-muted'}`}
                                >
                                    <Download size={16} />
                                </button>

                                <button
                                    onClick={() => setIsShareOpen(true)}
                                    className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${isDark ? 'border-white/15 text-warm-on-dark-soft hover:text-warm-on-dark hover:border-white/40' : 'border-warm-hairline text-warm-muted hover:text-warm-ink hover:border-warm-muted'}`}
                                    title={t('podcastPage.share')}
                                    aria-label={t('podcastPage.share')}
                                >
                                    <Share2 size={16} />
                                </button>
                            </div>

                            {/* Description */}
                            <div className="mb-10 max-w-3xl">
                                <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-warm-on-dark' : 'text-warm-ink'}`}>{t('podcastPage.description')}</h2>
                                <div className={`text-[15px] leading-relaxed whitespace-pre-wrap ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-body'}`}>
                                    {showMoreDesc ? podcast.description : (podcast.description?.substring(0, 250) + (podcast.description?.length > 250 ? "..." : ""))}
                                    {podcast.description && podcast.description.length > 250 && (
                                        <button onClick={() => setShowMoreDesc(!showMoreDesc)} className={`font-bold ml-2 hover:underline ${isDark ? 'text-warm-primary' : 'text-warm-primary'}`}>
                                            {showMoreDesc ? t('podcastPage.descShowLess') : t('podcastPage.descShowMore')}
                                        </button>
                                    )}
                                </div>
                                {album && (
                                    <button 
                                        onClick={() => navigate(`/podcast/album/${podcast.collectionId}`)}
                                        className={`mt-6 px-4 py-1.5 border rounded-full text-sm font-bold transition-all hover:scale-105 ${isDark ? 'border-white/15 text-warm-on-dark hover:border-white/40' : 'border-warm-hairline text-warm-ink hover:border-warm-muted'}`}
                                    >
                                        {t('podcastPage.seeAllEpisodes')}
                                    </button>
                                )}
                            </div>

                            <hr className={`mb-10 ${isDark ? 'border-white/5' : 'border-warm-hairline'}`} />

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


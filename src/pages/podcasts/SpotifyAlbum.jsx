import React, { useState, useEffect } from "react";
import { ChevronLeft, Play, Sun, Moon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "../../context/LanguageContext";
import { usePodcast } from "../../context/PodcastContext";
import { useAlbumData } from "../../hooks/usePodcastData";
import { formatTime, extractDominantColor } from "../../utils/podcastUtils";
import PlayerFooter from "../../components/InteractivePlayer/PlayerFooter";

// Sub-components
import AlbumHero from "../../components/podcasts/AlbumHero";
import EpisodeListItem from "../../components/podcasts/EpisodeListItem";
import { EpisodeRowSkeleton } from "../../components/podcasts/PodcastSkeletons";
import PodcastError from "../../components/podcasts/PodcastError";
import PodcastBottomNav from "../../components/podcasts/PodcastBottomNav";

export default function SpotifyAlbum() {
    const { albumId } = useParams();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { t } = useTranslation();
    const isDark = theme === 'dark';

    const { 
        currentTrack, setCurrentTrack, isPlaying, setIsPlaying, 
        playTrack, duration, currentTime,
        isExpanded, setIsExpanded, handleSeek, setQueue
    } = usePodcast();

    // Data Hook
    const { album, podcasts, loading, error, retry } = useAlbumData(albumId);
    
    const [dominantColor, setDominantColor] = useState("#222222");

    useEffect(() => {
        const imageUrl = album?.thumbnail || podcasts[0]?.thumbnail;
        if (imageUrl) {
            extractDominantColor(imageUrl, albumId).then(setDominantColor);
        }
    }, [album, podcasts, albumId]);

    // Avtomatik birinchi podcastni tanlash olib tashlandi
    // useEffect(() => {
    //     if (podcasts.length > 0 && !currentTrack) {
    //         setCurrentTrack(podcasts[0]);
    //     }
    // }, [podcasts, currentTrack, setCurrentTrack]);

    // Albom ochilganda navbat shu albom epizodlaridan iborat bo'ladi —
    // pleyerdagi "keyingi/oldingi" va takrorlash shu ro'yxat bo'yicha ishlaydi.
    useEffect(() => {
        if (podcasts.length > 0) setQueue(podcasts);
    }, [podcasts, setQueue]);

    const handleMediaSkip = (amount) => {
        const target = Math.max(0, Math.min(duration, currentTime + amount));
        handleSeek(target);
    };

    return (
        <div className={`h-[100dvh] w-full flex flex-col font-sans overflow-hidden relative transition-colors duration-300 ${isDark ? 'bg-warm-dark text-warm-on-dark' : 'bg-warm-canvas text-warm-ink'}`}>
            <div className={`flex-1 overflow-y-auto flex flex-col relative custom-scrollbar ${isDark ? 'bg-warm-dark' : 'bg-warm-canvas'}`}>
                <div className={`sticky top-0 z-30 px-4 md:px-8 py-3 flex items-center justify-between backdrop-blur-xl border-b pt-[calc(0.75rem+env(safe-area-inset-top,0px))] ${isDark ? 'bg-warm-dark/85 border-white/5' : 'bg-warm-canvas/85 border-warm-hairline'}`}>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/podcasts');
                            }}
                            aria-label={t('podcastPage.title')}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-white/5 text-warm-on-dark-soft hover:text-warm-on-dark hover:bg-white/10' : 'bg-warm-surface text-warm-muted hover:text-warm-ink hover:bg-warm-card'}`}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-warm-on-dark' : 'text-warm-ink'}`}>{t('podcastPage.album')}</h2>
                    </div>
                    <button
                        onClick={toggleTheme}
                        aria-label={isDark ? t('podcastPage.lightMode') : t('podcastPage.darkMode')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-white/5 text-warm-on-dark-soft hover:text-warm-on-dark hover:bg-white/10' : 'bg-warm-surface text-warm-muted hover:text-warm-ink hover:bg-warm-card'}`}
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>

                <div className="flex-1">
                    {error ? (
                        <div className="flex items-center justify-center min-h-[60vh] px-4">
                            <PodcastError isDark={isDark} onRetry={retry} />
                        </div>
                    ) : (
                        <>
                            <AlbumHero 
                                album={album} 
                                podcasts={podcasts} 
                                isDark={isDark} 
                                dominantColor={dominantColor} 
                            />

                            <div className="px-6 md:px-8 pb-[calc(9rem+env(safe-area-inset-bottom,0px))] flex-1">
                                {/* Avval bu qatorda uchta bosilmaydigan Spotify ikonkasi turardi */}
                                <div className="flex items-center gap-4 py-5">
                                    <button
                                        onClick={() => podcasts.length > 0 && playTrack(podcasts[0])}
                                        disabled={podcasts.length === 0}
                                        aria-label={t('podcastPage.play')}
                                        className="h-11 px-6 bg-warm-primary hover:bg-warm-primary-active disabled:opacity-40 disabled:hover:bg-warm-primary rounded-full flex items-center gap-2 transition-colors active:scale-95 text-warm-on-primary font-semibold text-sm shrink-0"
                                    >
                                        <Play fill="currentColor" size={17} />
                                        {t('podcastPage.play')}
                                    </button>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-10 mt-2">
                                    {/* Left Column: Episodes */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`text-[19px] md:text-[22px] font-bold tracking-tight mb-5 ${isDark ? 'text-warm-on-dark' : 'text-warm-ink'}`}>
                                            {t('podcastPage.episodes')}
                                        </h3>

                                        {loading ? (
                                            <div className={`flex flex-col gap-6 border-t pt-6 ${isDark ? 'border-white/5' : 'border-warm-hairline'}`}>
                                                {Array(5).fill(0).map((_, i) => <EpisodeRowSkeleton key={i} isDark={isDark} />)}
                                            </div>
                                        ) : podcasts.length === 0 ? (
                                            <div className={`py-20 text-center font-semibold text-sm border-t ${isDark ? 'text-warm-on-dark-soft border-white/5' : 'text-warm-muted border-warm-hairline'}`}>
                                                {t('podcastPage.noEpisodes')}
                                            </div>
                                        ) : (
                                            <div className={`flex flex-col border-t pt-2 ${isDark ? 'border-white/5' : 'border-warm-hairline'}`}>
                                                {podcasts.map((p) => (
                                                    <EpisodeListItem
                                                        key={p.id}
                                                        p={p}
                                                        album={album}
                                                        isDark={isDark}
                                                        currentTrack={currentTrack}
                                                        isPlaying={isPlaying}
                                                        playTrack={playTrack}
                                                        setCurrentTrack={setCurrentTrack}
                                                        setIsPlaying={setIsPlaying}
                                                        setIsExpanded={setIsExpanded}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column: About — soxta "4.9 ★ (8.5K)" reytingi olib tashlandi */}
                                    {album?.description && (
                                        <aside className="w-full lg:w-[320px] shrink-0 pt-2 lg:pl-4">
                                            <h3 className={`text-[19px] font-bold tracking-tight mb-3 ${isDark ? 'text-warm-on-dark' : 'text-warm-ink'}`}>About</h3>
                                            <p className={`text-[14px] leading-relaxed whitespace-pre-wrap ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-body'}`}>
                                                {album.description}
                                            </p>
                                        </aside>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Global Footer Player (Unified) */}
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

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(20, 20, 19, 0.12)'}; border-radius: 9999px; }
            `}} />
        </div>
    );
}

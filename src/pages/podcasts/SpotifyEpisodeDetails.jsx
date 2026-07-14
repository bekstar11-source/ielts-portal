import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
    Play, Pause, Download, PlusCircle, MoreHorizontal, ChevronLeft, Share2
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { usePodcast } from "../../context/PodcastContext";
import { useEpisodeDetails } from "../../hooks/usePodcastData";
import { formatTime, getPodcastDuration, getPodcastDate } from "../../utils/podcastUtils";
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
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const { 
        playTrack, currentTrack, setCurrentTrack, isPlaying, setIsPlaying, 
        currentTime, duration, handleSeek, isExpanded, setIsExpanded 
    } = usePodcast();
    
    // Data Hook
    const { podcast, album, loading, error, retry } = useEpisodeDetails(podcastId);
    
    const [showMoreDesc, setShowMoreDesc] = useState(false);
    const [scrollOpacity, setScrollOpacity] = useState(0);
    const [openSection, setOpenSection] = useState(null); // 'exercises' or 'transcript'
    const [isShareOpen, setIsShareOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        let ticking = false;
        const handleScroll = (e) => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollTop = e.target.scrollTop;
                    const opacity = Math.min(1, Math.max(0, scrollTop / 120));
                    setScrollOpacity(opacity);
                    ticking = false;
                });
                ticking = true;
            }
        };

        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    const handlePlay = () => {
        if (currentTrack?.id !== podcast.id) {
            setCurrentTrack(podcast);
        }
        setIsExpanded(true);
        setIsPlaying(true);
    };

    const handleMediaSkip = (amount) => {
        const target = Math.max(0, Math.min(duration, currentTime + amount));
        handleSeek(target);
    };



    const isPlayingThis = currentTrack?.id === podcast?.id && isPlaying;
    const exercises = podcast?.questions || [];
    const transcript = podcast?.transcript || [];

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

            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {error ? (
                    <div className="flex items-center justify-center min-h-[60vh] px-4">
                        <PodcastError isDark={isDark} onRetry={retry} />
                    </div>
                ) : loading ? (
                    <div className="p-8">
                        <EpisodeSkeleton isDark={isDark} />
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
                            {/* Date and time */}
                            <div className={`flex items-center gap-2 mb-6 mt-8 text-sm font-medium ${isDark ? 'text-[#a7a7a7]' : 'text-zinc-500'}`}>
                                <span>{getPodcastDate(podcast)} • {formatTime(getPodcastDuration(podcast))} left</span>
                                <div className={`w-24 h-1 rounded-full ml-2 overflow-hidden ${isDark ? 'bg-white/20' : 'bg-zinc-200'}`}>
                                    <div className="h-full bg-emerald-500 rounded-full w-0"></div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-6 mb-10">
                                <button 
                                    onClick={handlePlay}
                                    className="w-14 h-14 bg-[#1ed760] rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 text-black shadow-xl"
                                >
                                    {isPlayingThis ? <Pause fill="black" size={28} /> : <Play fill="black" size={28} className="ml-1" />}
                                </button>
                                <button className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${isDark ? 'border-[#a7a7a7] text-[#a7a7a7] hover:text-white hover:border-white' : 'border-zinc-300 text-zinc-500 hover:text-zinc-900 hover:border-zinc-900'}`}>
                                    <Download size={16} />
                                </button>
                                <button 
                                    onClick={() => setIsShareOpen(true)}
                                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${isDark ? 'border-[#a7a7a7] text-[#a7a7a7] hover:text-white hover:border-white' : 'border-zinc-300 text-zinc-500 hover:text-zinc-900 hover:border-zinc-900'}`}
                                    title="Share"
                                >
                                    <Share2 size={16} />
                                </button>
                                <PlusCircle size={32} strokeWidth={1} className={`cursor-pointer transition-colors ${isDark ? 'text-[#a7a7a7] hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`} />
                                <MoreHorizontal size={32} className={`cursor-pointer transition-colors ${isDark ? 'text-[#a7a7a7] hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`} />
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


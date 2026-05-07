import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
    Play, Pause, Download, PlusCircle, MoreHorizontal, ChevronLeft
} from "lucide-react";
import { usePodcast } from "../context/PodcastContext";
import { useEpisodeDetails } from "../hooks/usePodcastData";
import { formatTime, getPodcastDuration, getPodcastDate } from "../utils/podcastUtils";
import PlayerFooter from "../components/InteractivePlayer/PlayerFooter";

// Sub-components
import EpisodeHero from "../components/podcasts/EpisodeHero";
import ExerciseAccordion from "../components/podcasts/ExerciseAccordion";
import TranscriptAccordion from "../components/podcasts/TranscriptAccordion";

export default function SpotifyEpisodeDetails() {
    const { podcastId } = useParams();
    const navigate = useNavigate();
    const { 
        playTrack, currentTrack, setCurrentTrack, isPlaying, setIsPlaying, 
        currentTime, duration, handleSeek, setIsExpanded 
    } = usePodcast();
    
    // Data Hook
    const { podcast, album, loading } = useEpisodeDetails(podcastId);
    
    const [showMoreDesc, setShowMoreDesc] = useState(false);
    const [scrollOpacity, setScrollOpacity] = useState(0);
    const [openSection, setOpenSection] = useState(null); // 'exercises' or 'transcript'

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

    const handleScroll = (e) => {
        const scrollTop = e.target.scrollTop;
        const opacity = Math.min(1, Math.max(0, scrollTop / 120));
        setScrollOpacity(opacity);
    };

    if (loading) {
        return (
            <div className="h-screen w-full bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!podcast) {
        return <div className="h-screen w-full bg-black flex items-center justify-center text-white">Podcast topilmadi.</div>;
    }

    const isPlayingThis = currentTrack?.id === podcast.id && isPlaying;
    const exercises = podcast.questions || [];
    const transcript = podcast.transcript || [];

    return (
        <div onScroll={handleScroll} className="h-screen w-full bg-black text-white flex flex-col font-sans select-none overflow-y-auto custom-scrollbar relative">
            {/* Top Header */}
            <div className="sticky top-0 z-50 bg-[#121212] px-6 md:px-10 py-4 flex items-center gap-4 border-b border-white/5">
                <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-zinc-400 hover:text-white transition shrink-0">
                    <ChevronLeft size={22} />
                </button>
                <h2 className="text-xl font-black truncate text-white">Podcast Episode</h2>
            </div>

            {/* Scroll Animated Header */}
            <div 
                className="fixed top-[65px] left-0 w-full z-40 px-6 md:px-10 py-3 flex items-center gap-4 border-b border-white/5 shadow-2xl"
                style={{ 
                    backgroundColor: `#08504B`,
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
                    <h2 className="text-[15px] font-black truncate text-white tracking-tight">{podcast.title}</h2>
                    <p className="text-[11px] text-white/60 font-medium leading-none mt-0.5">Now playing</p>
                </div>
            </div>

            <EpisodeHero podcast={podcast} album={album} />

            {/* Content section */}
            <div className="px-6 md:px-10 pb-32">
                {/* Date and time */}
                <div className="flex items-center gap-2 mb-6 mt-8 text-[#a7a7a7] text-sm font-medium">
                    <span>{getPodcastDate(podcast)} • {formatTime(getPodcastDuration(podcast))} left</span>
                    <div className="w-24 h-1 bg-white/20 rounded-full ml-2 overflow-hidden">
                        <div className="h-full bg-white rounded-full w-0"></div>
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
                    <button className="w-8 h-8 rounded-full border border-[#a7a7a7] flex items-center justify-center text-[#a7a7a7] hover:text-white hover:border-white transition-colors">
                        <Download size={16} />
                    </button>
                    <PlusCircle size={32} strokeWidth={1} className="text-[#a7a7a7] hover:text-white cursor-pointer transition-colors" />
                    <MoreHorizontal size={32} className="text-[#a7a7a7] hover:text-white cursor-pointer transition-colors" />
                </div>

                {/* Description */}
                <div className="mb-10 max-w-3xl">
                    <h2 className="text-xl font-bold text-white mb-4">Episode Description</h2>
                    <div className="text-[#a7a7a7] text-[15px] leading-relaxed whitespace-pre-wrap">
                        {showMoreDesc ? podcast.description : (podcast.description?.substring(0, 250) + (podcast.description?.length > 250 ? "..." : ""))}
                        {podcast.description && podcast.description.length > 250 && (
                            <button onClick={() => setShowMoreDesc(!showMoreDesc)} className="text-white font-bold ml-2 hover:underline">
                                {showMoreDesc ? "Show less" : "Show more"}
                            </button>
                        )}
                    </div>
                    {album && (
                        <button 
                            onClick={() => navigate(`/podcast/album/${podcast.collectionId}`)}
                            className="mt-6 px-4 py-1.5 border border-white/30 rounded-full text-sm font-bold hover:border-white hover:scale-105 transition-all"
                        >
                            See all episodes
                        </button>
                    )}
                </div>

                <hr className="border-white/10 mb-10" />

                <div className="max-w-3xl space-y-4">
                    <ExerciseAccordion 
                        exercises={exercises} 
                        openSection={openSection} 
                        setOpenSection={setOpenSection} 
                    />
                    <TranscriptAccordion 
                        transcript={transcript} 
                        openSection={openSection} 
                        setOpenSection={setOpenSection} 
                    />
                </div>
            </div>

            {/* Global Footer Player */}
            {currentTrack && (
                <PlayerFooter 
                    isDark={true}
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
                />
            )}
        </div>
    );
}


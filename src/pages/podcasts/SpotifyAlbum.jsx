import React, { useState, useEffect } from "react";
import { 
    ChevronLeft, Play, PlusCircle, ArrowDownCircle, MoreHorizontal, ChevronDown, Sun, Moon
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
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
    const isDark = theme === 'dark';

    const { 
        currentTrack, setCurrentTrack, isPlaying, setIsPlaying, 
        playTrack, duration, currentTime,
        isExpanded, setIsExpanded, handleSeek
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

    const handleMediaSkip = (amount) => {
        const target = Math.max(0, Math.min(duration, currentTime + amount));
        handleSeek(target);
    };

    return (
        <div className={`h-screen w-full flex flex-col font-sans select-none overflow-hidden relative transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-zinc-50 text-zinc-900'}`}>
            <div className={`flex-1 overflow-y-auto flex flex-col relative custom-scrollbar ${isDark ? 'bg-gradient-to-b from-[#222222] to-[#121212]' : 'bg-white'}`}>
                <div className={`sticky top-0 z-30 px-8 py-4 flex items-center justify-between backdrop-blur-xl border-b ${isDark ? 'bg-[#121212]/40 border-transparent' : 'bg-white/80 border-zinc-100'}`}>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/podcasts');
                            }} 
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${isDark ? 'bg-black/60 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                        >
                            <ChevronLeft size={22} />
                        </button>
                        <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>Album</h2>
                    </div>
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

                            <div className={`px-6 md:px-8 pb-32 flex-1 transition-colors duration-300 ${isDark ? 'bg-black/30' : 'bg-white'}`}>
                                <div className="flex items-center gap-5 py-4">
                                    <button 
                                        onClick={() => podcasts.length > 0 && playTrack(podcasts[0])}
                                        className="w-12 h-12 bg-[#1ed760] rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 text-black shadow-xl shrink-0"
                                    >
                                        <Play fill="black" size={24} className="ml-0.5" />
                                    </button>
                                    <PlusCircle size={28} strokeWidth={1.5} className={`cursor-pointer transition-colors ${isDark ? 'text-[#a7a7a7] hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`} />
                                    <ArrowDownCircle size={28} strokeWidth={1.5} className={`cursor-pointer transition-colors ${isDark ? 'text-[#a7a7a7] hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`} />
                                    <MoreHorizontal size={28} className={`cursor-pointer transition-colors ${isDark ? 'text-[#a7a7a7] hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`} />
                                </div>

                                <div className="flex flex-col lg:flex-row gap-10 mt-6">
                                    {/* Left Column: Episodes */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className={`text-[20px] font-bold flex items-center gap-2 cursor-pointer hover:underline ${isDark ? 'text-white' : 'text-zinc-900'}`}>All Episodes <ChevronDown size={18} /></h3>
                                            <span className={`font-bold text-[14px] flex items-center gap-2 cursor-pointer transition-colors ${isDark ? 'text-[#a7a7a7] hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}>Newest to Oldest <ChevronDown size={18} /></span>
                                        </div>

                                        {loading ? (
                                            <div className={`flex flex-col gap-6 border-t pt-6 ${isDark ? 'border-white/10' : 'border-zinc-100'}`}>
                                                {Array(5).fill(0).map((_, i) => <EpisodeRowSkeleton key={i} />)}
                                            </div>
                                        ) : podcasts.length === 0 ? (
                                            <div className={`py-20 text-center font-bold border-t pt-6 ${isDark ? 'text-zinc-500 border-white/10' : 'text-zinc-400 border-zinc-100'}`}>
                                                No podcasts in this album yet.
                                            </div>
                                        ) : (
                                            <div className={`flex flex-col border-t pt-2 ${isDark ? 'border-white/10' : 'border-zinc-100'}`}>
                                                {podcasts.map((p, index) => (
                                                    <EpisodeListItem 
                                                        key={p.id}
                                                        p={p}
                                                        index={index}
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

                                    {/* Right Column: About */}
                                    <div className="w-full lg:w-[350px] shrink-0 pt-2 lg:pl-4">
                                        <h3 className={`text-[20px] font-bold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>About</h3>
                                        <div className={`text-[15px] leading-relaxed mb-6 space-y-4 ${isDark ? 'text-[#a7a7a7]' : 'text-zinc-500'}`}>
                                            <p className="whitespace-pre-wrap">
                                                {album?.description || "No description provided for this album."}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`border px-3 py-1 rounded-full flex items-center gap-1 text-[13px] font-bold ${isDark ? 'border-white/20 text-white' : 'border-zinc-200 text-zinc-900'}`}>
                                                4.9 <span className="text-[11px] mb-[1px]">★</span> <span className={`font-normal ${isDark ? 'text-[#a7a7a7]' : 'text-zinc-500'}`}>(8.5K)</span>
                                            </div>
                                            <div className={`border px-3 py-1 rounded-full text-[13px] font-bold ${isDark ? 'border-white/20 text-white' : 'border-zinc-200 text-zinc-900'}`}>
                                                Education
                                            </div>
                                        </div>
                                    </div>
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
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}; border-radius: 9999px; }
            `}} />
        </div>
    );
}

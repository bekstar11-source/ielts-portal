// src/pages/Podcasts.jsx
import React, { useState, useEffect } from "react";
import { List as ListIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { usePodcast } from "../context/PodcastContext";
import { usePodcastsList, usePodcastCollections } from "../hooks/usePodcastData";
import { formatTime } from "../utils/podcastUtils";
import PlayerFooter from "../components/InteractivePlayer/PlayerFooter";

// Sub-components
import PodcastSidebar from "../components/podcasts/PodcastSidebar";
import PodcastMainHeader from "../components/podcasts/PodcastMainHeader";
import AlbumGridItem from "../components/podcasts/AlbumGridItem";
import EpisodeGridItem from "../components/podcasts/EpisodeGridItem";
import { AlbumSkeleton, EpisodeSkeleton } from "../components/podcasts/PodcastSkeletons";

export default function Podcasts() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    
    const { 
        currentTrack, setCurrentTrack, isPlaying, setIsPlaying, 
        currentTime, duration, handleSeek, playTrack,
        setIsExpanded
    } = usePodcast();

    // Data Hooks
    const { podcasts, loading: podcastsLoading } = usePodcastsList();
    const { collections, loading: collectionsLoading } = usePodcastCollections();
    
    const loading = podcastsLoading || collectionsLoading;

    // Local State
    const [searchTerm, setSearchTerm] = useState("");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (podcasts.length > 0 && !currentTrack) {
            setCurrentTrack(podcasts[0]);
        }
    }, [podcasts, currentTrack, setCurrentTrack]);

    const handleMediaSkip = (amount) => {
        const target = Math.max(0, Math.min(duration, currentTime + amount));
        handleSeek(target);
    };

    const filteredPodcasts = podcasts.filter(p => 
        p.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`h-screen w-full flex flex-col font-sans overflow-hidden select-none transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-zinc-50 text-zinc-900'}`}>
            <div className="flex-1 flex overflow-hidden p-2 gap-2">
                {/* Left Sidebar */}
                <PodcastSidebar 
                    isDark={isDark}
                    isSidebarCollapsed={isSidebarCollapsed}
                    setIsSidebarCollapsed={setIsSidebarCollapsed}
                    loading={loading}
                    collections={collections}
                    podcasts={podcasts}
                    setCurrentTrack={setCurrentTrack}
                    setIsExpanded={setIsExpanded}
                />

                {/* Main Content */}
                <div className={`flex-1 rounded-lg overflow-y-auto flex flex-col relative custom-scrollbar border transition-all duration-300 ${isDark ? 'bg-gradient-to-b from-[#222222] to-[#121212] border-transparent' : 'bg-white border-zinc-200'}`}>
                    <PodcastMainHeader 
                        isDark={isDark}
                        isSidebarCollapsed={isSidebarCollapsed}
                        setIsSidebarCollapsed={setIsSidebarCollapsed}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        toggleTheme={toggleTheme}
                    />

                    <div className="px-4 md:px-8 pb-32 pt-6">
                        {/* Collections / Albums Section */}
                        <section className="mb-10">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-[24px] font-black tracking-tight hover:underline cursor-pointer">Official Albums</h2>
                                <span className="text-sm font-bold text-[#a7a7a7] hover:underline cursor-pointer">Show all</span>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                {loading ? (
                                    Array(6).fill(0).map((_, i) => <AlbumSkeleton key={i} />)
                                ) : collections.length === 0 ? (
                                    <div className="col-span-full py-10 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center text-zinc-500 font-bold">
                                        No albums available yet.
                                    </div>
                                ) : (
                                    collections.map((col) => (
                                        <AlbumGridItem 
                                            key={col.id} 
                                            col={col} 
                                            isDark={isDark} 
                                            episodeCount={podcasts.filter(p => p.collectionId === col.id).length}
                                        />
                                    ))
                                )}
                            </div>
                        </section>

                        {/* Episodes Section */}
                        <section className="mb-10">
                            <h2 className="text-[24px] font-black tracking-tight mb-6 hover:underline cursor-pointer">New Episodes</h2>
                            
                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {Array(4).fill(0).map((_, i) => <EpisodeSkeleton key={i} />)}
                                </div>
                            ) : filteredPodcasts.length === 0 ? (
                                <div className="text-center py-10 text-zinc-500 font-bold">No podcasts found.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredPodcasts.slice(0, 8).map((p) => (
                                        <EpisodeGridItem 
                                            key={p.id}
                                            p={p}
                                            currentTrack={currentTrack}
                                            isPlaying={isPlaying}
                                            setCurrentTrack={setCurrentTrack}
                                            setIsPlaying={setIsPlaying}
                                            setIsExpanded={setIsExpanded}
                                            playTrack={playTrack}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

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
                />
            )}

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}; border-radius: 9999px; }
            `}} />
        </div>
    );
}

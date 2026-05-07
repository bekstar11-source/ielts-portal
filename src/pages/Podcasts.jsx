// src/pages/Podcasts.jsx
import React, { useState, useEffect } from "react";
import { List as ListIcon, Search as SearchIcon, Plus, Moon, Sun, Heart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { usePodcast } from "../context/PodcastContext";
import { usePodcastsList, usePodcastCollections } from "../hooks/usePodcastData";
import { formatTime } from "../utils/podcastUtils";
import PlayerFooter from "../components/InteractivePlayer/PlayerFooter";
import { useAuth } from "../context/AuthContext";

// Sub-components
import PodcastSidebar from "../components/podcasts/PodcastSidebar";
import PodcastMainHeader from "../components/podcasts/PodcastMainHeader";
import AlbumGridItem from "../components/podcasts/AlbumGridItem";
import EpisodeGridItem from "../components/podcasts/EpisodeGridItem";
import PodcastBottomNav from "../components/podcasts/PodcastBottomNav";
import { AlbumSkeleton, EpisodeSkeleton } from "../components/podcasts/PodcastSkeletons";
import PodcastError from "../components/podcasts/PodcastError";
import PodcastSplash from "../components/podcasts/PodcastSplash";
import { AnimatePresence } from "framer-motion";

export default function Podcasts() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const currentMobileTab = queryParams.get('tab') || 'home';
    const [showSplash, setShowSplash] = useState(location.state?.fromBottomNav || false);

    useEffect(() => {
        if (showSplash) {
            const timer = setTimeout(() => {
                setShowSplash(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showSplash]);
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    
    const { 
        currentTrack, setCurrentTrack, isPlaying, setIsPlaying, 
        currentTime, duration, handleSeek, playTrack,
        setIsExpanded, isExpanded,
        likedPodcasts, fetchUserLikes, toggleLike
    } = usePodcast();

    // Data Hooks
    const { podcasts, loading: podcastsLoading, error: podcastsError, retry: retryPodcasts } = usePodcastsList();
    const { collections, loading: collectionsLoading, error: collectionsError, retry: retryCollections } = usePodcastCollections();
    
    const loading = podcastsLoading || collectionsLoading;
    const error = podcastsError || collectionsError;
    const handleRetry = () => {
        retryPodcasts();
        retryCollections();
    };

    const { user } = useAuth();
    useEffect(() => {
        if (user?.uid) {
            const unsubscribe = fetchUserLikes(user.uid);
            return () => unsubscribe && unsubscribe();
        }
    }, [user?.uid]);

    // Local State
    const [searchTerm, setSearchTerm] = useState("");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState("all"); // 'all', 'music', 'podcasts'

    // Avtomatik birinchi podcastni tanlash olib tashlandi (autoplay muammosi uchun)
    // useEffect(() => {
    //     if (podcasts.length > 0 && !currentTrack) {
    //         setCurrentTrack(podcasts[0]);
    //     }
    // }, [podcasts, currentTrack, setCurrentTrack]);

    const handleMediaSkip = (amount) => {
        const target = Math.max(0, Math.min(duration, currentTime + amount));
        handleSeek(target);
    };

    const filteredPodcasts = podcasts.filter(p => 
        p.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <AnimatePresence>
                {showSplash && <PodcastSplash />}
            </AnimatePresence>
            
            <div className={`h-screen w-full flex flex-col font-sans overflow-hidden select-none transition-all duration-700 ${isDark ? 'bg-black text-white' : 'bg-zinc-50 text-zinc-900'} ${showSplash ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
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
                    <div className="hidden md:block">
                        <PodcastMainHeader 
                            isDark={isDark}
                            isSidebarCollapsed={isSidebarCollapsed}
                            setIsSidebarCollapsed={setIsSidebarCollapsed}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            toggleTheme={toggleTheme}
                        />
                    </div>

                    <div className="px-4 md:px-8 pb-40 pt-4 md:pt-6">
                        {/* Mobile Filter Pills */}
                        <div className="flex md:hidden items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                            <button 
                                onClick={toggleTheme}
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${isDark ? 'bg-[#2a2a2a] text-white' : 'bg-zinc-100 text-zinc-900'} shadow-md border ${isDark ? 'border-white/10' : 'border-zinc-200'}`}
                            >
                                {isDark ? <Moon size={18} /> : <Sun size={18} />}
                            </button>
                            {['All', 'Music', 'Podcasts'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab.toLowerCase())}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                                        activeTab === tab.toLowerCase()
                                            ? (isDark ? 'bg-[#1ed760] text-black' : 'bg-zinc-900 text-white')
                                            : (isDark ? 'bg-[#2a2a2a] text-white hover:bg-[#333]' : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200')
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {error ? (
                            <div className="mt-10">
                                <PodcastError isDark={isDark} onRetry={handleRetry} />
                            </div>
                        ) : currentMobileTab === 'library' ? (
                            /* Library View (Mobile Only) */
                            <div className="md:hidden">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-[#ff7f50]' : 'bg-orange-100 text-orange-600'} font-bold text-xs`}>A</div>
                                        <h1 className="text-2xl font-black">Your Library</h1>
                                    </div>
                                    <div className="flex items-center gap-5">
                                        <SearchIcon size={24} />
                                        <Plus size={24} />
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 mb-6">
                                    <button className={`px-4 py-1.5 rounded-full text-xs font-bold ${isDark ? 'bg-[#2a2a2a] text-white' : 'bg-zinc-100'}`}>Playlists</button>
                                    <button className={`px-4 py-1.5 rounded-full text-xs font-bold ${isDark ? 'bg-[#2a2a2a] text-white' : 'bg-zinc-100'}`}>Artists</button>
                                </div>

                                <div className="grid grid-cols-3 gap-y-6 gap-x-4">
                                    {collections.map(c => (
                                        <div key={c.id} onClick={() => navigate(`/podcast/album/${c.id}`)} className="flex flex-col items-center gap-2">
                                            <div className="w-full aspect-square rounded-full overflow-hidden shadow-lg">
                                                <img src={c.thumbnail} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <span className="text-[11px] font-bold text-center line-clamp-1">{c.name}</span>
                                            <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'} font-medium`}>Album</span>
                                        </div>
                                    ))}
                                    {podcasts.slice(0, 6).map(p => (
                                        <div key={p.id} onClick={() => navigate(`/podcast/spotify/${p.id}`)} className="flex flex-col items-center gap-2">
                                            <div className="w-full aspect-square rounded-full overflow-hidden shadow-lg">
                                                <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <span className="text-[11px] font-bold text-center line-clamp-1">{p.title}</span>
                                            <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'} font-medium`}>Episode</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : currentMobileTab === 'liked' ? (
                            /* Liked View (Mobile Only) */
                            <div className="md:hidden">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-700 to-blue-400 flex items-center justify-center shadow-lg">
                                        <Heart fill="white" className="text-white" size={32} />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-black">Liked Podcasts</h1>
                                        <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'} font-black uppercase tracking-[0.2em]`}>{podcasts.filter(p => likedPodcasts.includes(p.id)).length} episodes</p>
                                    </div>
                                </div>
                                
                                {podcasts.filter(p => likedPodcasts.includes(p.id)).length > 0 ? (
                                    <div className="grid grid-cols-1 gap-1">
                                        {podcasts.filter(p => likedPodcasts.includes(p.id)).map((p) => (
                                            <EpisodeGridItem 
                                                key={p.id} 
                                                p={p} 
                                                isDark={isDark} 
                                                currentTrack={currentTrack}
                                                isPlaying={isPlaying}
                                                setCurrentTrack={setCurrentTrack}
                                                setIsPlaying={setIsPlaying}
                                                setIsExpanded={setIsExpanded}
                                                playTrack={playTrack}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                                            <Heart size={30} className={isDark ? 'text-zinc-600' : 'text-zinc-300'} />
                                        </div>
                                        <h3 className="font-bold text-lg mb-2">No liked podcasts yet</h3>
                                        <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Tap the heart icon on any episode to save it to your collection.</p>
                                    </div>
                                )}
                            </div>
                        ) : currentMobileTab === 'search' ? (
                            /* Search View (Mobile Only) */
                            <div className="md:hidden">
                                <h1 className="text-3xl font-black mb-6">Search</h1>
                                <div className="relative mb-8">
                                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                                    <input 
                                        autoFocus
                                        type="text" 
                                        placeholder="What do you want to listen to?"
                                        className={`w-full py-3.5 pl-12 pr-4 rounded-lg font-bold outline-none border-2 transition-all ${
                                            isDark 
                                                ? 'bg-white text-black border-transparent' 
                                                : 'bg-zinc-100 border-zinc-200 focus:border-zinc-300'
                                        }`}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                
                                <h2 className="font-black text-lg mb-4">Browse all</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    {['Podcasts', 'Live Events', 'Made For You', 'New Releases', 'IELTS Practice', 'Grammar'].map((cat, i) => (
                                        <div 
                                            key={cat} 
                                            className={`aspect-[16/9] rounded-lg p-3 relative overflow-hidden cursor-pointer transition-transform active:scale-95 ${
                                                [
                                                    'bg-orange-500', 'bg-blue-600', 'bg-purple-600', 
                                                    'bg-pink-600', 'bg-emerald-600', 'bg-yellow-600'
                                                ][i % 6]
                                            }`}
                                        >
                                            <span className="text-white font-black text-base relative z-10">{cat}</span>
                                            <div className="absolute -right-4 -bottom-2 w-16 h-16 rotate-[25deg] shadow-2xl opacity-60">
                                                {collections[i % collections.length]?.thumbnail && (
                                                    <img src={collections[i % collections.length].thumbnail} alt="" className="w-full h-full object-cover rounded" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Standard Home View */
                            <>
                                {/* Recents Grid (Mobile Style) */}
                                <div className="grid grid-cols-2 gap-3 mb-8 md:hidden">
                                    {loading ? (
                                        Array(4).fill(0).map((_, i) => (
                                            <div key={i} className={`h-12 rounded flex items-center gap-2 ${isDark ? 'bg-white/5' : 'bg-zinc-100'} animate-pulse`}>
                                                <div className="w-12 h-12 bg-white/10 rounded-l" />
                                            </div>
                                        ))
                                    ) : collections.slice(0, 6).map((col) => (
                                        <div 
                                            key={col.id} 
                                            onClick={() => navigate(`/podcast/album/${col.id}`)}
                                            className={`flex items-center gap-2 rounded overflow-hidden cursor-pointer active:scale-95 transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-zinc-100 hover:bg-zinc-200'}`}
                                        >
                                            <div className="w-12 h-12 shrink-0">
                                                <img src={col.thumbnail} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <span className="text-[10px] font-bold truncate pr-2 leading-tight">{col.name}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Collections / Albums Section */}
                                <section className="mb-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-[20px] md:text-[24px] font-black tracking-tight hover:underline cursor-pointer">Official Albums</h2>
                                        <span className="text-sm font-bold text-[#a7a7a7] hover:underline cursor-pointer hidden md:inline">Show all</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
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
                                    <h2 className="text-[20px] md:text-[24px] font-black tracking-tight mb-6 hover:underline cursor-pointer">New Episodes</h2>
                                    
                                    {loading ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                            {Array(4).fill(0).map((_, i) => <EpisodeSkeleton key={i} />)}
                                        </div>
                                    ) : filteredPodcasts.length === 0 ? (
                                        <div className="text-center py-10 text-zinc-500 font-bold">No podcasts found.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                            {filteredPodcasts.slice(0, 12).map((p) => (
                                                <EpisodeGridItem 
                                                    key={p.id}
                                                    p={p}
                                                    isDark={isDark}
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
                            </>
                        )}
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
                    hasBottomNav={true}
                />
            )}

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}; border-radius: 9999px; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />

            {!isExpanded && <PodcastBottomNav isDark={isDark} />}
        </div>
        </>
    );
}

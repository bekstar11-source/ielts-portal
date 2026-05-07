// src/pages/Podcasts.jsx
import React, { useState, useEffect } from "react";
import { 
    Home, Search, ChevronLeft, ChevronRight, Library, Play, Pause, Mic2, List as ListIcon, Heart, Expand, Bell, Plus, Clock, MoreHorizontal, PlusCircle, ArrowDownCircle, ChevronDown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { usePodcast } from "../context/PodcastContext";
import LazyImage from "../components/common/LazyImage";
import { Sun, Moon } from "lucide-react";

const DIFF_COLORS = {
    easy: "bg-emerald-500",
    medium: "bg-blue-500",
    hard: "bg-orange-500",
    super_hard: "bg-rose-500",
};

export default function Podcasts() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    
    const { 
        currentTrack, setCurrentTrack, isPlaying, setIsPlaying, 
        playTrack, isExpanded, setIsExpanded
    } = usePodcast();

    // Data State
    const [podcasts, setPodcasts] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Podcasts
                const qP = query(
                    collection(db, "podcasts"), 
                    where("status", "==", "published"),
                    where("mode", "==", "spotify"),
                    orderBy("createdAt", "desc")
                );
                const snapP = await getDocs(qP);
                const podData = snapP.docs.map(d => ({ id: d.id, ...d.data() }));
                setPodcasts(podData);

                // Fetch Collections
                const qC = query(collection(db, "podcast_collections"), orderBy("createdAt", "asc"));
                const snapC = await getDocs(qC);
                setCollections(snapC.docs.map(d => ({ id: d.id, ...d.data() })));
                
                if (podData.length > 0 && !currentTrack) {
                    setCurrentTrack(podData[0]);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentTrack, setCurrentTrack]);

    const filteredPodcasts = podcasts.filter(p => 
        p.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`h-screen w-full flex flex-col font-sans overflow-hidden select-none transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-zinc-50 text-zinc-900'}`}>
            <div className="flex-1 flex overflow-hidden p-2 gap-2">
                {/* Left Sidebar */}
                <div className={`hidden md:flex flex-col gap-2 shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'w-[72px]' : 'w-[300px]'}`}>
                    <div className={`${isDark ? 'bg-[#121212]' : 'bg-white'} rounded-lg p-3 md:p-5 flex flex-col gap-5 border ${isDark ? 'border-transparent' : 'border-zinc-200 shadow-sm'}`}>
                        <div className="flex items-center justify-between">
                            <div onClick={() => navigate('/dashboard')} className={`flex items-center gap-5 cursor-pointer transition px-1 group ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}>
                                <Home size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                                {!isSidebarCollapsed && <span className="hidden md:block font-bold text-[16px]">Home</span>}
                            </div>
                            {!isSidebarCollapsed && (
                                <button 
                                    onClick={() => setIsSidebarCollapsed(true)}
                                    className={`hidden md:flex p-1 rounded-full transition ${isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            )}
                        </div>
                        <div className={`flex items-center gap-5 cursor-pointer transition px-1 group ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            <Search size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                            {!isSidebarCollapsed && <span className="hidden md:block font-bold text-[16px]">Search</span>}
                        </div>
                    </div>

                    <div className={`${isDark ? 'bg-[#121212]' : 'bg-white'} rounded-lg flex-1 flex flex-col overflow-hidden border ${isDark ? 'border-transparent' : 'border-zinc-200 shadow-sm'}`}>
                        <div className={`p-4 px-5 flex items-center justify-between ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            <div className="flex items-center gap-4 group">
                                <Library size={26} strokeWidth={2.5} className={`transition-colors ${isDark ? 'group-hover:text-white' : 'group-hover:text-zinc-900'}`} />
                                {!isSidebarCollapsed && <span className="hidden md:block font-bold text-[16px] truncate">Your Library</span>}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-2 md:px-3 pb-4 space-y-1 custom-scrollbar">
                            {loading ? (
                                Array(10).fill(0).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                                        <div className="w-12 h-12 rounded bg-white/5 flex-shrink-0" />
                                        <div className="hidden md:block flex-1">
                                            <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                                            <div className="h-3 bg-white/5 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <>
                                    {collections.map(c => (
                                        <div key={c.id} onClick={() => navigate(`/podcast/album/${c.id}`)} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition group ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'}`}>
                                            <div className={`w-12 h-12 rounded bg-zinc-800 flex-shrink-0 flex items-center justify-center border ${isDark ? 'border-white/5' : 'border-zinc-200'}`}>
                                                <ListIcon size={18} className={`transition-colors ${isDark ? 'text-zinc-500 group-hover:text-white' : 'text-zinc-400 group-hover:text-zinc-900'}`} />
                                            </div>
                                            {!isSidebarCollapsed && (
                                                <div className="hidden md:block overflow-hidden">
                                                    <p className={`font-bold truncate text-[14px] leading-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{c.name}</p>
                                                    <p className={`text-[12px] truncate mt-0.5 uppercase tracking-tighter font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Album</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {podcasts.slice(0, 8).map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => { 
                                                const isVideoDisplay = (p.mediaType === 'youtube' || p.mediaType === 'video') && p.showVideo !== false && String(p.showVideo) !== 'false';
                                                if (isVideoDisplay) {
                                                    setCurrentTrack(p);
                                                    setIsExpanded(true);
                                                } else {
                                                    navigate(`/podcast/spotify/${p.id}`);
                                                }
                                            }} 
                                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition group ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'}`}
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden shadow-lg">
                                                <LazyImage src={p.thumbnail || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&q=80"} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            {!isSidebarCollapsed && (
                                                <div className="hidden md:block overflow-hidden">
                                                    <p className={`font-bold truncate text-[14px] leading-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{p.title}</p>
                                                    <p className={`text-[12px] truncate mt-0.5 uppercase tracking-tighter font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{p.level || "B2"} • Podcast</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className={`flex-1 rounded-lg overflow-y-auto flex flex-col relative custom-scrollbar border transition-all duration-300 ${isDark ? 'bg-gradient-to-b from-[#222222] to-[#121212] border-transparent' : 'bg-white border-zinc-200'}`}>
                    <div className={`sticky top-0 z-30 px-6 py-4 flex items-center relative h-16 border-b backdrop-blur-xl ${isDark ? 'bg-[#121212]/40 border-transparent' : 'bg-white/80 border-zinc-100'}`}>
                        {/* Left: Toggle Button */}
                        <div className="flex items-center gap-4 z-10">
                            {isSidebarCollapsed ? (
                                <button 
                                    onClick={() => setIsSidebarCollapsed(false)}
                                    className={`hidden md:flex w-8 h-8 rounded-full items-center justify-center transition ${isDark ? 'bg-black/60 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                                >
                                    <ChevronRight size={22} />
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setIsSidebarCollapsed(true)}
                                    className={`hidden md:flex w-8 h-8 rounded-full items-center justify-center transition ${isDark ? 'bg-black/60 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                                >
                                    <ChevronLeft size={22} />
                                </button>
                            )}
                            <button 
                                onClick={() => navigate('/dashboard')}
                                className={`md:hidden w-10 h-10 rounded-full flex items-center justify-center transition ${isDark ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-900'}`}
                            >
                                <Home size={20} />
                            </button>
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <h2 className={`flex items-center gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                <span className="text-[20px] font-black uppercase tracking-tight">ENGLEV</span>
                                <span className="text-[20px] font-light">Podcasts</span>
                            </h2>
                        </div>
                        
                        {/* Right: Search & Theme Toggle */}
                        <div className="flex-1 flex justify-end items-center gap-4 z-10">
                            <div className="w-full max-w-[200px] relative hidden md:block">
                                <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    <Search size={14} />
                                </div>
                                <input 
                                    type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search..." 
                                    className={`w-full rounded-full py-2 pl-9 pr-4 outline-none border transition text-[12px] ${
                                        isDark 
                                            ? 'bg-[#242424] hover:bg-[#2a2a2a] text-white border-transparent focus:border-white/20 placeholder:text-zinc-500' 
                                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-200 focus:border-zinc-300 placeholder:text-zinc-400'
                                    }`}
                                />
                            </div>
                            <button 
                                onClick={toggleTheme}
                                className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                            >
                                {isDark ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="px-4 md:px-8 pb-32 pt-6">
                        {/* Collections / Albums Section */}
                        <section className="mb-10">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-[24px] font-black tracking-tight hover:underline cursor-pointer">Official Albums</h2>
                                <span className="text-sm font-bold text-[#a7a7a7] hover:underline cursor-pointer">Show all</span>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                {loading ? (
                                    Array(6).fill(0).map((_, i) => (
                                        <div key={i} className="bg-[#181818] p-4 rounded-xl animate-pulse">
                                            <div className="aspect-square w-full rounded-md bg-white/5 mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.5)]" />
                                            <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                                            <div className="h-3 bg-white/5 rounded w-1/2" />
                                        </div>
                                    ))
                                ) : collections.length === 0 ? (
                                    <div className="col-span-full py-10 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center text-zinc-500 font-bold">
                                        No albums available yet.
                                    </div>
                                ) : (
                                    collections.map((col, i) => (
                                        <div 
                                            key={col.id} 
                                            onClick={() => navigate(`/podcast/album/${col.id}`)}
                                            className={`p-4 rounded-xl transition duration-300 cursor-pointer group flex flex-col ${isDark ? 'bg-[#181818] hover:bg-[#282828]' : 'bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-lg'}`}
                                        >
                                            <div className="relative aspect-square w-full rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.15)] mb-4 overflow-hidden bg-zinc-800 flex items-center justify-center">
                                                {col.thumbnail ? (
                                                    <LazyImage src={col.thumbnail} className="w-full h-full object-cover" />
                                                ) : podcasts.find(p => p.collectionId === col.id)?.thumbnail ? (
                                                    <LazyImage src={podcasts.find(p => p.collectionId === col.id).thumbnail} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Mic2 size={48} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                                                )}
                                                <div className="absolute bottom-2 right-2 w-10 h-10 bg-[#1ed760] rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-105 active:scale-95">
                                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="black" className="ml-1">
                                                        <path d="M6 4l14 8-14 8z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <h3 className={`font-bold text-[16px] truncate mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{col.name}</h3>
                                            <p className={`text-[14px] line-clamp-2 leading-snug ${isDark ? 'text-[#a7a7a7]' : 'text-zinc-500'}`}>
                                                {col.description || `Collection • ${podcasts.filter(p => p.collectionId === col.id).length} episodes`}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* Episodes Section */}
                        <section className="mb-10">
                            <h2 className="text-[24px] font-black tracking-tight mb-6 hover:underline cursor-pointer">New Episodes</h2>
                            
                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {Array(4).fill(0).map((_, i) => (
                                        <div key={i} className="rounded-xl p-6 h-[280px] bg-zinc-900/50 animate-pulse flex flex-col justify-between border border-white/5">
                                            <div>
                                                <div className="h-8 bg-white/5 rounded w-full mb-3" />
                                                <div className="h-4 bg-white/5 rounded w-1/3" />
                                            </div>
                                            <div className="flex items-end justify-between">
                                                <div className="w-32 h-32 rounded-lg bg-white/5 rotate-[-5deg] translate-y-4 translate-x-[-10px]" />
                                                <div className="w-12 h-12 rounded-full bg-white/5" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredPodcasts.length === 0 ? (
                                <div className="text-center py-10 text-zinc-500 font-bold">No podcasts found.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredPodcasts.slice(0, 8).map((p, i) => {
                                        const isPlayingThis = currentTrack?.id === p.id && isPlaying;
                                        
                                        return (
                                            <div 
                                                key={p.id}
                                                onClick={() => {
                                                    const isVideoDisplay = (p.mediaType === 'youtube' || p.mediaType === 'video') && p.showVideo !== false && String(p.showVideo) !== 'false';
                                                    if (isVideoDisplay) {
                                                        setCurrentTrack(p);
                                                        setIsExpanded(true);
                                                    } else {
                                                        navigate(`/podcast/spotify/${p.id}`);
                                                    }
                                                }}
                                                className={`group rounded-xl p-6 cursor-pointer relative overflow-hidden flex flex-col justify-between transition-transform hover:scale-[1.02] shadow-lg min-h-[280px] ${DIFF_COLORS[p.difficulty] || 'bg-blue-800'}`}
                                            >
                                                <div className="relative z-10 flex flex-col h-full">
                                                    <div>
                                                        <h3 className="text-2xl font-black text-white leading-tight mb-2 line-clamp-3">{p.title}</h3>
                                                        <p className="text-white/80 font-medium text-sm">Episode • {p.level || "IELTS"}</p>
                                                    </div>
                                                    
                                                    <div className="mt-auto pt-6 flex items-end justify-between">
                                                        <div className="w-32 h-32 rounded-lg shadow-2xl overflow-hidden rotate-[-5deg] translate-y-4 translate-x-[-10px] group-hover:rotate-0 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-500 border-4 border-white/10 shrink-0">
                                                            <LazyImage src={p.thumbnail || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80"} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                        
                                                        <div 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const isVideoDisplay = (p.mediaType === 'youtube' || p.mediaType === 'video') && p.showVideo !== false && String(p.showVideo) !== 'false';
                                                                if (isVideoDisplay) {
                                                                    setCurrentTrack(p);
                                                                    setIsExpanded(true);
                                                                    setIsPlaying(false);
                                                                } else {
                                                                    playTrack(p);
                                                                }
                                                            }}
                                                            className={`w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 shrink-0 ${isPlayingThis ? 'scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'}`}
                                                        >
                                                            {isPlayingThis ? <Pause size={24} fill="black" stroke="black" /> : <Play size={24} fill="black" stroke="black" className="ml-1" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>

                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}; border-radius: 9999px; }
            `}} />
        </div>
    );
}

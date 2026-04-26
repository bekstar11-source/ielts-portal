// src/pages/Podcasts.jsx
import React, { useState, useEffect } from "react";
import { 
    Home, Search, ChevronLeft, Library, Play, Pause, Zap, Mic2, Shuffle, SkipBack, SkipForward, Repeat, List as ListIcon, Volume2, VolumeX, Heart, Expand, Bell, Plus, Clock, MoreHorizontal, PlusCircle, ArrowDownCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { motion } from "framer-motion";
import { usePodcast } from "../context/PodcastContext";
import InteractivePlayer from "../components/InteractivePlayer";

const DIFF_COLORS = {
    easy: "bg-emerald-500",
    medium: "bg-blue-500",
    hard: "bg-orange-500",
    super_hard: "bg-rose-500",
};

export default function Podcasts() {
    const navigate = useNavigate();
    const { 
        currentTrack, setCurrentTrack, isPlaying, setIsPlaying, 
        currentTime, duration, volume, isMuted, repeat, setRepeat, 
        shuffle, setShuffle, playTrack, handleSeek, toggleMute, updateVolume, audioRef 
    } = usePodcast();

    // Data State
    const [podcasts, setPodcasts] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);

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

    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const onSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        handleSeek(percent * duration);
    };

    const onVolumeChange = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        updateVolume(Math.max(0, Math.min(1, percent)));
    };

    const filteredPodcasts = podcasts.filter(p => 
        p.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-screen w-full bg-black text-white flex flex-col font-sans overflow-hidden select-none">
            <div className="flex-1 flex overflow-hidden p-2 gap-2">
                {/* Left Sidebar */}
                <div className="w-[72px] md:w-[300px] flex flex-col gap-2 shrink-0">
                    <div className="bg-[#121212] rounded-lg p-3 md:p-5 flex flex-col gap-5">
                        <div onClick={() => navigate('/dashboard')} className="flex items-center gap-5 text-zinc-400 hover:text-white cursor-pointer transition px-1 group">
                            <Home size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                            <span className="hidden md:block font-bold text-[16px]">Home</span>
                        </div>
                        <div className="flex items-center gap-5 text-white cursor-pointer transition px-1 group">
                            <Search size={26} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                            <span className="hidden md:block font-bold text-[16px]">Search</span>
                        </div>
                    </div>

                    <div className="bg-[#121212] rounded-lg flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 px-5 flex items-center justify-between text-zinc-400">
                            <div className="flex items-center gap-4">
                                <Library size={26} strokeWidth={2.5} />
                                <span className="hidden md:block font-bold text-[16px]">Your Library</span>
                            </div>
                            <Plus size={20} className="hover:bg-zinc-800 p-1.5 rounded-full w-8 h-8 flex items-center justify-center transition" />
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
                                        <div key={c.id} onClick={() => navigate(`/podcast/album/${c.id}`)} className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-800/50 cursor-pointer transition group">
                                            <div className="w-12 h-12 rounded bg-zinc-800 flex-shrink-0 flex items-center justify-center border border-white/5">
                                                <ListIcon size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                                            </div>
                                            <div className="hidden md:block overflow-hidden">
                                                <p className="font-bold truncate text-[14px] text-white leading-tight">{c.name}</p>
                                                <p className="text-[12px] text-zinc-400 truncate mt-0.5 uppercase tracking-tighter font-bold">Album</p>
                                            </div>
                                        </div>
                                    ))}
                                    {podcasts.slice(0, 8).map(p => (
                                        <div key={p.id} onClick={() => { setCurrentTrack(p); setIsExpanded(true); }} className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-800/50 cursor-pointer transition group">
                                            <div className="w-12 h-12 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden shadow-lg">
                                                <img src={p.thumbnail || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&q=80"} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            <div className="hidden md:block overflow-hidden">
                                                <p className="font-bold truncate text-[14px] text-white leading-tight">{p.title}</p>
                                                <p className="text-[12px] text-zinc-400 truncate mt-0.5 uppercase tracking-tighter font-bold">{p.level || "B2"} • Podcast</p>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-gradient-to-b from-[#222222] to-[#121212] rounded-lg overflow-y-auto flex flex-col relative custom-scrollbar">
                    <div className="sticky top-0 z-30 bg-[#121212]/40 backdrop-blur-xl px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-zinc-400 hover:text-white transition">
                                <ChevronLeft size={22} />
                            </button>
                            <h2 className="text-xl font-black hidden sm:block">Explore Podcasts</h2>
                        </div>
                        <div className="flex-1 max-w-[450px] mx-8 relative hidden md:block">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                                <Search size={18} />
                            </div>
                            <input 
                                type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="What do you want to listen to?" 
                                className="w-full bg-[#242424] hover:bg-[#2a2a2a] text-white rounded-full py-3 pl-12 pr-4 outline-none border border-transparent focus:border-white/20 transition text-[14px] placeholder:text-zinc-500"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <Bell size={20} className="text-zinc-400 hover:text-white transition cursor-pointer" />
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-[14px] font-black border-2 border-black/20 cursor-pointer hover:scale-105 transition">A</div>
                        </div>
                    </div>

                    <div className="px-8 pb-32 pt-6">
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
                                            className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition duration-300 cursor-pointer group flex flex-col"
                                        >
                                            <div className="relative aspect-square w-full rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.5)] mb-4 overflow-hidden bg-zinc-800 flex items-center justify-center">
                                                {col.thumbnail ? (
                                                    <img src={col.thumbnail} className="w-full h-full object-cover" />
                                                ) : podcasts.find(p => p.collectionId === col.id)?.thumbnail ? (
                                                    <img src={podcasts.find(p => p.collectionId === col.id).thumbnail} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Mic2 size={48} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                                                )}
                                                <div className="absolute bottom-2 right-2 w-10 h-10 bg-[#1ed760] rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-105 active:scale-95">
                                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="black" className="ml-1">
                                                        <path d="M6 4l14 8-14 8z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-[16px] text-white truncate mb-1">{col.name}</h3>
                                            <p className="text-[#a7a7a7] text-[14px] line-clamp-2 leading-snug">
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
                                                onClick={() => { playTrack(p); setIsExpanded(true); }}
                                                className={`group rounded-xl p-6 cursor-pointer relative overflow-hidden flex flex-col justify-between transition-transform hover:scale-[1.02] shadow-lg min-h-[280px] ${DIFF_COLORS[p.difficulty] || 'bg-blue-800'}`}
                                            >
                                                <div className="relative z-10 flex flex-col h-full">
                                                    <div>
                                                        <h3 className="text-2xl font-black text-white leading-tight mb-2 line-clamp-3">{p.title}</h3>
                                                        <p className="text-white/80 font-medium text-sm">Episode • {p.level || "IELTS"}</p>
                                                    </div>
                                                    
                                                    <div className="mt-auto pt-6 flex items-end justify-between">
                                                        <div className="w-32 h-32 rounded-lg shadow-2xl overflow-hidden rotate-[-5deg] translate-y-4 translate-x-[-10px] group-hover:rotate-0 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-500 border-4 border-white/10 shrink-0">
                                                            <img src={p.thumbnail || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80"} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                        
                                                        <div className={`w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 shrink-0 ${isPlayingThis ? 'scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'}`}>
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

            {/* Global Footer Player */}
            <div className="h-[85px] bg-black border-t border-white/5 px-6 flex items-center justify-between z-50 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-4 w-[30%] min-w-[200px]">
                    {currentTrack ? (
                        <>
                            <div className="w-12 h-12 bg-zinc-800 rounded-lg flex-shrink-0 overflow-hidden relative group cursor-pointer shadow-2xl" onClick={() => setIsExpanded(true)}>
                                <img src={currentTrack.thumbnail || null} alt="" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft size={20} className="text-white rotate-90" /></div>
                            </div>
                            <div className="hidden sm:block truncate pr-4 cursor-pointer" onClick={() => setIsExpanded(true)}>
                                <p className="text-[13px] font-black hover:underline truncate text-white leading-tight">{currentTrack.title}</p>
                                <p className="text-[10px] text-[#a7a7a7] hover:underline truncate mt-0.5 font-bold uppercase tracking-wider">{currentTrack.level || "B2"} Podcast</p>
                            </div>
                            <Heart size={18} className="text-[#a7a7a7] hover:text-white transition-colors cursor-pointer" />
                        </>
                    ) : <div className="animate-pulse w-full h-12 bg-white/5 rounded-lg" />}
                </div>

                <div className="flex flex-col items-center max-w-[650px] w-full px-4">
                    <div className="flex items-center gap-7 mb-3">
                        <Shuffle size={18} className={`cursor-pointer transition-colors ${shuffle ? 'text-emerald-500' : 'text-[#a7a7a7] hover:text-white'}`} onClick={() => setShuffle(!shuffle)} />
                        <SkipBack size={24} fill="currentColor" className="text-[#a7a7a7] hover:text-white transition-transform active:scale-90 cursor-pointer" onClick={() => audioRef.current && (audioRef.current.currentTime -= 10)} />
                        <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-all shadow-lg active:scale-95" onClick={() => setIsPlaying(!isPlaying)}>
                            {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
                        </button>
                        <SkipForward size={24} fill="currentColor" className="text-[#a7a7a7] hover:text-white transition-transform active:scale-90 cursor-pointer" onClick={() => audioRef.current && (audioRef.current.currentTime += 10)} />
                        <Repeat size={18} className={`cursor-pointer transition-colors ${repeat ? 'text-emerald-500' : 'text-[#a7a7a7] hover:text-white'}`} onClick={() => setRepeat(!repeat)} />
                    </div>
                    <div className="flex items-center gap-3 w-full">
                        <span className="text-[11px] text-[#a7a7a7] font-black w-8 text-right tabular-nums">{formatTime(currentTime)}</span>
                        <div className="flex-1 h-[4px] bg-[#4d4d4d] rounded-full group cursor-pointer flex items-center" onClick={onSeek}>
                            <div className="h-full bg-white group-hover:bg-[#1ed760] rounded-full relative transition-colors" style={{ width: `${(currentTime / duration) * 100 || 0}%` }}>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-xl" />
                            </div>
                        </div>
                        <span className="text-[11px] text-[#a7a7a7] font-black w-8 tabular-nums">{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-5 w-[30%] min-w-[200px] text-[#a7a7a7]">
                    <Mic2 size={18} className="hover:text-white transition cursor-pointer hidden lg:block" />
                    <ListIcon size={18} className="hover:text-white transition cursor-pointer hidden lg:block" />
                    <div className="flex items-center gap-2 w-[110px] group">
                        <button className="hover:text-white transition-colors" onClick={toggleMute}>{isMuted || volume === 0 ? <VolumeX size={18} className="text-rose-500" /> : <Volume2 size={18} />}</button>
                        <div className="flex-1 h-[4px] bg-[#4d4d4d] rounded-full cursor-pointer flex items-center" onClick={onVolumeChange}>
                            <div className="h-full bg-white group-hover:bg-[#1ed760] rounded-full relative transition-colors" style={{ width: `${isMuted ? 0 : volume * 100}%` }}>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 9999px; }
            `}} />

            <InteractivePlayer isOpen={isExpanded} onClose={() => setIsExpanded(false)} />
        </div>
    );
}

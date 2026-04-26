import React, { useState, useEffect } from "react";
import { 
    ChevronLeft, Play, Pause, Shuffle, SkipBack, SkipForward, Repeat, List as ListIcon, Volume2, VolumeX, Heart, Expand, Clock, MoreHorizontal, PlusCircle, ArrowDownCircle, ChevronDown
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { motion } from "framer-motion";
import { usePodcast } from "../context/PodcastContext";
import InteractivePlayer from "../components/InteractivePlayer";

export default function SpotifyAlbum() {
    const { albumId } = useParams();
    const navigate = useNavigate();
    const { 
        currentTrack, setCurrentTrack, isPlaying, setIsPlaying, 
        playTrack, duration, currentTime, toggleMute, isMuted, volume, updateVolume, repeat, setRepeat, shuffle, setShuffle, audioRef
    } = usePodcast();

    const [podcasts, setPodcasts] = useState([]);
    const [album, setAlbum] = useState(() => {
        const cached = localStorage.getItem(`album-info-${albumId}`);
        return cached ? JSON.parse(cached) : null;
    });
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [dominantColor, setDominantColor] = useState(() => {
        return localStorage.getItem(`album-color-${albumId}`) || "#222222";
    });

    useEffect(() => {
        const imageUrl = album?.thumbnail || podcasts[0]?.thumbnail;
        if (!imageUrl) return;

        const cachedColor = localStorage.getItem(`album-color-${albumId}`);
        if (cachedColor) {
            setDominantColor(cachedColor);
            return;
        }

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = 1;
            canvas.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1);
            const data = ctx.getImageData(0, 0, 1, 1).data;
            const color = `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
            setDominantColor(color);
            localStorage.setItem(`album-color-${albumId}`, color);
        };
    }, [album, podcasts, albumId]);

    const formatTime = (time) => {
        if (!time || isNaN(time)) return "0:00";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        if (m > 0) return `${m} min ${s} sec`;
        return `${s} sec`;
    };

    const getPodcastDuration = (p) => {
        if (p.duration && p.duration > 0) return p.duration;
        let maxTime = 0;
        if (p.transcript && Array.isArray(p.transcript)) {
            p.transcript.forEach(s => { if (s.time > maxTime) maxTime = s.time; });
        }
        if (p.questions && Array.isArray(p.questions)) {
            p.questions.forEach(q => { if (q.time > maxTime) maxTime = q.time; });
        }
        return maxTime > 0 ? maxTime + 10 : 0; // Add 10s buffer for the last segment
    };

    const getPodcastDate = (p) => {
        try {
            const date = p.createdAt?.toDate ? p.createdAt.toDate() : (p.createdAt ? new Date(p.createdAt) : new Date());
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) {
            return "Apr 26";
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Album Details
                const albumSnap = await getDoc(doc(db, "podcast_collections", albumId));
                if (albumSnap.exists()) {
                    const albumData = albumSnap.data();
                    setAlbum(albumData);
                    localStorage.setItem(`album-info-${albumId}`, JSON.stringify({
                        thumbnail: albumData.thumbnail,
                        name: albumData.name,
                        description: albumData.description
                    }));
                }

                // Fetch Podcasts in this collection
                const q = query(
                    collection(db, "podcasts"), 
                    where("status", "==", "published"),
                    where("mode", "==", "spotify"),
                    where("collectionId", "==", albumId)
                );
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setPodcasts(data);
                
                if (data.length > 0 && !currentTrack) {
                    setCurrentTrack(data[0]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [albumId]);

    return (
        <div className="h-screen w-full bg-black text-white flex flex-col font-sans select-none overflow-hidden relative">
            <InteractivePlayer isOpen={isExpanded} onClose={() => setIsExpanded(false)} />
            
            <div className="flex-1 bg-gradient-to-b from-[#222222] to-[#121212] overflow-y-auto flex flex-col relative custom-scrollbar">
                <div className="sticky top-0 z-30 bg-[#121212]/40 backdrop-blur-xl px-8 py-4 flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-zinc-400 hover:text-white transition">
                        <ChevronLeft size={22} />
                    </button>
                    <h2 className="text-xl font-black">Album</h2>
                </div>

                <div 
                    className="px-6 md:px-8 pt-8 pb-6 flex flex-col md:flex-row items-end gap-6 shrink-0 transition-colors duration-300"
                    style={{ background: `linear-gradient(to bottom, ${dominantColor}, #121212)` }}
                >
                    <div className="w-48 h-48 sm:w-60 sm:h-60 shadow-[0_8px_40px_rgba(0,0,0,0.6)] rounded-md overflow-hidden shrink-0 bg-zinc-900 flex items-center justify-center">
                        {album?.thumbnail ? (
                            <img src={album.thumbnail} alt="Playlist Cover" className="w-full h-full object-cover" />
                        ) : podcasts[0]?.thumbnail ? (
                            <img src={podcasts[0].thumbnail} alt="Playlist Cover" className="w-full h-full object-cover" />
                        ) : (
                            <ListIcon size={64} className="text-zinc-700" />
                        )}
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                        <span className="text-[13px] font-bold text-white uppercase tracking-wider">Public Playlist</span>
                        <h1 className="text-5xl sm:text-6xl md:text-8xl font-black text-white tracking-tighter leading-none mb-2 md:mb-4 pb-2 truncate">
                            {album?.name || "Official Album"}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                <span className="text-white text-[10px] font-bold">iP</span>
                            </div>
                            <span className="text-[14px] font-bold text-white hover:underline cursor-pointer">IELTS Portal</span>
                            <span className="text-[14px] text-white/70">• {podcasts.length} podcasts</span>
                        </div>
                    </div>
                </div>

                <div className="px-6 md:px-8 pb-32 bg-black/30 flex-1">
                    <div className="flex items-center gap-6 py-6">
                        <button 
                            onClick={() => podcasts.length > 0 && playTrack(podcasts[0])}
                            className="w-14 h-14 bg-[#1ed760] rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 text-black shadow-xl"
                        >
                            <Play fill="black" size={28} className="ml-1" />
                        </button>
                        <PlusCircle size={32} strokeWidth={1} className="text-[#a7a7a7] hover:text-white cursor-pointer transition-colors" />
                        <ArrowDownCircle size={32} strokeWidth={1} className="text-[#a7a7a7] hover:text-white cursor-pointer transition-colors" />
                        <MoreHorizontal size={32} className="text-[#a7a7a7] hover:text-white cursor-pointer transition-colors" />
                    </div>

                    <div className="flex flex-col lg:flex-row gap-10 mt-6">
                        {/* Left Column: Episodes */}
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[20px] font-bold text-white flex items-center gap-2 cursor-pointer hover:underline">All Episodes <ChevronDown size={18} /></h3>
                                <span className="text-[#a7a7a7] font-bold text-[14px] flex items-center gap-2 cursor-pointer hover:text-white transition-colors">Newest to Oldest <ChevronDown size={18} /></span>
                            </div>

                            {loading ? (
                                <div className="flex flex-col gap-6 border-t border-white/10 pt-6">
                                    {Array(5).fill(0).map((_, i) => (
                                        <div key={i} className="flex gap-4 animate-pulse">
                                            <div className="w-[112px] h-[112px] rounded-lg bg-white/5 shrink-0" />
                                            <div className="flex flex-col flex-1">
                                                <div className="h-5 bg-white/5 rounded w-1/2 mb-2" />
                                                <div className="h-4 bg-white/5 rounded w-1/4 mb-4" />
                                                <div className="h-3 bg-white/5 rounded w-full mb-1" />
                                                <div className="h-3 bg-white/5 rounded w-3/4 mb-4" />
                                                <div className="flex items-center justify-between mt-auto">
                                                    <div className="h-4 bg-white/5 rounded w-1/3" />
                                                    <div className="w-8 h-8 rounded-full bg-white/5" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : podcasts.length === 0 ? (
                                <div className="py-20 text-center text-zinc-500 font-bold border-t border-white/10 pt-6">
                                    No podcasts in this album yet.
                                </div>
                            ) : (
                                <div className="flex flex-col border-t border-white/10 pt-2">
                                    {podcasts.map((p, i) => {
                                        const isPlayingThis = currentTrack?.id === p.id && isPlaying;
                                        const isActiveThis = currentTrack?.id === p.id;
                                        return (
                                            <div 
                                                key={p.id}
                                                onClick={() => playTrack(p)}
                                                className={`group flex gap-4 p-4 -mx-4 rounded-md cursor-pointer transition-colors hover:bg-white/5 border-b border-white/10 last:border-0 ${isActiveThis ? 'bg-white/5' : ''}`}
                                            >
                                                <div className="relative shrink-0">
                                                    <img src={p.thumbnail || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80"} className="w-[112px] h-[112px] rounded-lg object-cover" />
                                                    {isPlayingThis && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                                                            <div className="w-3 h-3 flex items-end gap-[2px]">
                                                                <motion.div animate={{ height: [3, 10, 3] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-[#1ed760] rounded-t-sm" />
                                                                <motion.div animate={{ height: [8, 4, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-[#1ed760] rounded-t-sm" />
                                                                <motion.div animate={{ height: [5, 12, 5] }} transition={{ repeat: Infinity, duration: 0.9 }} className="w-1 bg-[#1ed760] rounded-t-sm" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <div className="flex items-start gap-2 mb-1">
                                                        {!isActiveThis && <div className="w-2 h-2 mt-1.5 rounded-full bg-[#3e82d5] shrink-0" />}
                                                        <h4 className={`font-bold text-[16px] leading-tight group-hover:underline ${isActiveThis ? 'text-[#1ed760]' : 'text-white'}`}>{p.title}</h4>
                                                    </div>
                                                    <span className="text-[14px] font-bold text-white mb-3">{album?.name || "Official Podcast"}</span>
                                                    <p className="text-[14px] text-[#a7a7a7] line-clamp-2 leading-snug mb-3 pr-4 group-hover:text-white transition-colors">
                                                        {p.description || `Episode from ${album?.name || 'this collection'}.`}
                                                    </p>
                                                    <div className="mt-auto flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <PlusCircle size={22} strokeWidth={1.5} className="text-[#a7a7a7] hover:text-white transition-colors" onClick={(e) => e.stopPropagation()} />
                                                            <span className="text-[13px] font-medium text-[#a7a7a7] group-hover:text-white transition-colors">
                                                                {getPodcastDate(p)} • {formatTime(getPodcastDuration(p))}
                                                            </span>
                                                        </div>
                                                        <button 
                                                            className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 text-black shrink-0 shadow-md"
                                                        >
                                                            {isPlayingThis ? <Pause fill="black" size={14} /> : <Play fill="black" size={14} className="ml-0.5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Right Column: About */}
                        <div className="w-full lg:w-[350px] shrink-0 pt-2 lg:pl-4">
                            <h3 className="text-[20px] font-bold text-white mb-4">About</h3>
                            <div className="text-[15px] text-[#a7a7a7] leading-relaxed mb-6 space-y-4">
                                <p className="whitespace-pre-wrap">
                                    {album?.description || "No description provided for this album."}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="border border-white/20 px-3 py-1 rounded-full flex items-center gap-1 text-[13px] font-bold text-white">
                                    4.9 <span className="text-[11px] mb-[1px]">★</span> <span className="text-[#a7a7a7] font-normal">(8.5K)</span>
                                </div>
                                <div className="border border-white/20 px-3 py-1 rounded-full text-[13px] font-bold text-white">
                                    Education
                                </div>
                            </div>
                        </div>
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
                        <div className="flex-1 h-[4px] bg-[#4d4d4d] rounded-full group cursor-pointer flex items-center">
                            <div className="h-full bg-white group-hover:bg-[#1ed760] rounded-full relative transition-colors" style={{ width: `${(currentTime / duration) * 100 || 0}%` }}>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-xl" />
                            </div>
                        </div>
                        <span className="text-[11px] text-[#a7a7a7] font-black w-8 tabular-nums">{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-5 w-[30%] min-w-[200px] text-[#a7a7a7]">
                    <div className="flex items-center gap-4">
                        <div className="group flex items-center gap-2">
                            {isMuted || volume === 0 ? <VolumeX size={18} className="text-zinc-500 cursor-pointer hover:text-white shrink-0" /> : <Volume2 size={18} className="text-zinc-500 cursor-pointer hover:text-white shrink-0" />}
                            <div className="w-20 h-1 bg-white/10 rounded-full relative group cursor-pointer hidden sm:flex items-center">
                                <div className="h-full bg-emerald-500 rounded-full relative" style={{ width: `${volume * 100}%` }}>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-xl" />
                                </div>
                                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => updateVolume(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
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
        </div>
    );
}

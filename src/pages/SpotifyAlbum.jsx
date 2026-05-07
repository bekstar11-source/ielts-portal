import React, { useState, useEffect } from "react";
import { 
    ChevronLeft, Play, Pause, Shuffle, SkipBack, SkipForward, Repeat, List as ListIcon, Volume2, VolumeX, Heart, Expand, Clock, MoreHorizontal, PlusCircle, ArrowDownCircle, ChevronDown
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { usePodcast } from "../context/PodcastContext";
import PlayerFooter from "../components/InteractivePlayer/PlayerFooter";
import LazyImage from "../components/common/LazyImage";
import { Sun, Moon } from "lucide-react";

export default function SpotifyAlbum() {
    const { albumId } = useParams();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    const { 
        currentTrack, setCurrentTrack, isPlaying, setIsPlaying, 
        playTrack, duration, currentTime, toggleMute, isMuted, volume, updateVolume, repeat, setRepeat, shuffle, setShuffle, audioRef,
        isExpanded, setIsExpanded, handleSeek
    } = usePodcast();

    const [podcasts, setPodcasts] = useState([]);
    const [album, setAlbum] = useState(() => {
        const cached = localStorage.getItem(`album-info-${albumId}`);
        return cached ? JSON.parse(cached) : null;
    });
    const [loading, setLoading] = useState(true);
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
        return `${m}:${s.toString().padStart(2, '0')}`;
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

    const handleMediaSkip = (amount) => {
        const target = Math.max(0, Math.min(duration, currentTime + amount));
        handleSeek(target);
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
        <div className={`h-screen w-full flex flex-col font-sans select-none overflow-hidden relative transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-zinc-50 text-zinc-900'}`}>
            
            
            <div className={`flex-1 overflow-y-auto flex flex-col relative custom-scrollbar ${isDark ? 'bg-gradient-to-b from-[#222222] to-[#121212]' : 'bg-white'}`}>
                <div className={`sticky top-0 z-30 px-8 py-4 flex items-center justify-between backdrop-blur-xl border-b ${isDark ? 'bg-[#121212]/40 border-transparent' : 'bg-white/80 border-zinc-100'}`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${isDark ? 'bg-black/60 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}>
                            <ChevronLeft size={22} />
                        </button>
                        <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>Album</h2>
                    </div>
                    <button 
                        onClick={toggleTheme}
                        className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                    >
                        {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>

                <div 
                    className="px-6 md:px-8 pt-6 md:pt-10 pb-8 flex flex-col md:flex-row items-center justify-center gap-6 shrink-0 transition-colors duration-300"
                    style={{ background: isDark ? `linear-gradient(to bottom, ${dominantColor}, #121212)` : `linear-gradient(to bottom, ${dominantColor}, #ffffff)` }}
                >
                    <div className={`w-40 h-40 sm:w-52 sm:h-52 shadow-[0_8px_40px_rgba(0,0,0,0.4)] rounded-md overflow-hidden shrink-0 flex items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-zinc-100 border border-white/20'}`}>
                        {album?.thumbnail ? (
                            <LazyImage src={album.thumbnail} alt="Playlist Cover" className="w-full h-full object-cover" />
                        ) : podcasts[0]?.thumbnail ? (
                            <LazyImage src={podcasts[0].thumbnail} alt="Playlist Cover" className="w-full h-full object-cover" />
                        ) : (
                            <ListIcon size={64} className={isDark ? 'text-zinc-700' : 'text-zinc-300'} />
                        )}
                    </div>
                    <div className="flex flex-col items-center md:items-start w-full pb-1">
                        <span className={`text-[12px] font-bold mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Public Playlist</span>
                        <h1 className={`text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-tight mb-2 pb-3 truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            {album?.name || "Official Album"}
                        </h1>
                        {album?.description && (
                            <p className={`text-[13px] font-medium mb-3 line-clamp-2 max-w-2xl ${isDark ? 'text-white/60' : 'text-zinc-700'}`}>
                                {album.description}
                            </p>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                <span className="text-black text-[9px] font-black italic">iP</span>
                            </div>
                            <div className={`flex items-center gap-1.5 text-[13px] font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                <span className="hover:underline cursor-pointer">IELTS Portal</span>
                                <span className={`font-normal ${isDark ? 'text-white/70' : 'text-zinc-500'}`}>• {podcasts.length} podcasts</span>
                            </div>
                        </div>
                    </div>
                </div>

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
                                <div className={`py-20 text-center font-bold border-t pt-6 ${isDark ? 'text-zinc-500 border-white/10' : 'text-zinc-400 border-zinc-100'}`}>
                                    No podcasts in this album yet.
                                </div>
                            ) : (
                                <div className={`flex flex-col border-t pt-2 ${isDark ? 'border-white/10' : 'border-zinc-100'}`}>
                                    {podcasts.map((p, i) => {
                                        const isPlayingThis = currentTrack?.id === p.id && isPlaying;
                                        const isActiveThis = currentTrack?.id === p.id;
                                        return (
                                            <div 
                                                key={p.id}
                                                onClick={() => navigate(`/podcast/episode/${p.id}`)}
                                                className={`group flex gap-4 p-4 -mx-4 rounded-md cursor-pointer transition-colors border-b last:border-0 ${
                                                    isDark 
                                                        ? `hover:bg-white/5 border-white/10 ${isActiveThis ? 'bg-white/5' : ''}` 
                                                        : `hover:bg-zinc-50 border-zinc-100 ${isActiveThis ? 'bg-zinc-50' : ''}`
                                                }`}
                                            >
                                                <div className="relative shrink-0">
                                                    <LazyImage src={p.thumbnail || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80"} className="w-[112px] h-[112px] rounded-lg object-cover shadow-sm" />
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
                                                        <h4 className={`font-bold text-[16px] leading-tight group-hover:underline ${isActiveThis ? 'text-[#1ed760]' : (isDark ? 'text-white' : 'text-zinc-900')}`}>{p.title}</h4>
                                                    </div>
                                                    <span className={`text-[14px] font-bold mb-3 ${isDark ? 'text-white' : 'text-zinc-700'}`}>{album?.name || "Official Podcast"}</span>
                                                    <p className={`text-[14px] line-clamp-2 leading-snug mb-3 pr-4 transition-colors ${isDark ? 'text-[#a7a7a7] group-hover:text-white' : 'text-zinc-500 group-hover:text-zinc-900'}`}>
                                                        {p.description || `Episode from ${album?.name || 'this collection'}.`}
                                                    </p>
                                                    <div className="mt-auto flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <PlusCircle size={22} strokeWidth={1.5} className={`transition-colors ${isDark ? 'text-[#a7a7a7] hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`} onClick={(e) => e.stopPropagation()} />
                                                            <span className={`text-[13px] font-medium transition-colors ${isDark ? 'text-[#a7a7a7] group-hover:text-white' : 'text-zinc-400 group-hover:text-zinc-900'}`}>
                                                                {getPodcastDate(p)} • {formatTime(getPodcastDuration(p))}
                                                            </span>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                 const isVideoDisplay = (p.mediaType === 'youtube' || p.mediaType === 'video') && p.showVideo !== false && String(p.showVideo) !== 'false';
                                                                if (currentTrack?.id === p.id) {
                                                                    setIsPlaying(!isPlaying);
                                                                    if (isVideoDisplay) setIsExpanded(true);
                                                                } else {
                                                                    playTrack(p);
                                                                    if (isVideoDisplay) setIsExpanded(true);
                                                                }
                                                            }}
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shrink-0 shadow-md ${isDark ? 'bg-white text-black' : 'bg-zinc-900 text-white'}`}
                                                        >
                                                            {isPlayingThis ? <Pause fill="currentColor" size={14} /> : <Play fill="currentColor" size={14} className="ml-0.5" />}
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
            </div>

            {/* Global Footer Player (Unified with Interactive Player) */}
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

// src/pages/SpotifyPodcast.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
    Mic2, List as ListIcon, Heart, Expand, X, CheckCircle2,
    Shuffle, Repeat
} from "lucide-react";
import { usePodcast } from "../../context/PodcastContext";
import LazyImage from "../../components/common/LazyImage";
import { useGamification } from "../../hooks/useGamification";
import { useAuth } from "../../context/AuthContext";

export default function SpotifyPodcast() {
    const { podcastId } = useParams();
    const navigate = useNavigate();
    const { 
        currentTrack, setCurrentTrack, isPlaying, setIsPlaying, 
        currentTime, duration, volume, isMuted, repeat, setRepeat, 
        shuffle, setShuffle, handleSeek, toggleMute, updateVolume, audioRef 
    } = usePodcast();

    const [podcast, setPodcast] = useState(null);
    const [loading, setLoading] = useState(true);
    const { awardXP } = useGamification();
    const { user, userData } = useAuth();
    const [xpAwardedSession, setXpAwardedSession] = useState(false);
    
    // Questions logic removed as per user request


    // Combined Timeline: Text + Questions
    const combinedTimeline = useMemo(() => {
        if (!podcast) return [];
        return (podcast.transcript || []).map(t => ({ ...t, type: 'text' }))
            .sort((a, b) => a.time - b.time);
    }, [podcast]);

    const activeTimelineIdx = useMemo(() => {
        const idx = combinedTimeline.findIndex((item, i) => {
            const nextTime = combinedTimeline[i + 1]?.time || Infinity;
            return currentTime >= item.time && currentTime < nextTime;
        });
        return idx === -1 ? 0 : idx;
    }, [combinedTimeline, currentTime]);

    useEffect(() => {
        if (!podcastId) return;
        const fetchPodcast = async () => {
            try {
                const snap = await getDoc(doc(db, "podcasts", podcastId));
                if (snap.exists()) {
                    const data = { id: snap.id, ...snap.data() };
                    setPodcast(data);
                    // If this is a new track, set it globally
                    if (currentTrack?.id !== data.id) {
                        setCurrentTrack(data);
                        setIsPlaying(true);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPodcast();
    }, [podcastId, currentTrack, setCurrentTrack, setIsPlaying]);

    useEffect(() => {
        if (podcast && user && duration > 0 && currentTime > 0 && !xpAwardedSession) {
            if (currentTime / duration > 0.9) {
                setXpAwardedSession(true);
                awardXP('podcast', podcast.id, podcast.title).then(res => {
                    if (res.success) {
                        alert(`Tabriklaymiz! Siz ushbu podcastni tinglab ${res.amount} XP yig'dingiz.`);
                    }
                });
            }
        }
    }, [currentTime, duration, podcast, user, xpAwardedSession, awardXP]);



    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
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

    if (loading) return (
        <div className="h-screen bg-black flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-12 h-12 border-4 border-white/5 border-t-emerald-500 rounded-full" />
        </div>
    );

    if (!podcast) return <div className="p-20 text-center text-white bg-black h-screen font-bold">Podcast topilmadi.</div>;

    return (
        <div className="h-screen w-full bg-black text-white flex flex-col font-sans select-none relative overflow-hidden">
            {/* Header */}
            <header className="relative z-20 px-6 py-4 flex items-center justify-between bg-black/40 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
                        <SkipBack size={20} className="text-zinc-400" />
                    </button>
                    <div>
                        <h1 className="text-sm font-black truncate max-w-[300px] leading-tight text-white">{podcast.title}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] bg-emerald-500 text-black px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">{podcast.level || "B2"}</span>
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Interactive Session</span>
                        </div>
                    </div>
                </div>
                <button onClick={() => navigate('/podcasts')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5 text-zinc-400"><X size={18} /></button>
            </header>

            <main className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-black">
                {/* Left Side: Visuals */}
                <div className="lg:w-[40%] flex flex-col items-center justify-center p-8 lg:p-12">
                    <motion.div animate={{ rotate: isPlaying ? 360 : 0 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} className="relative w-full max-w-[380px] aspect-square">
                        <div className="absolute inset-0 rounded-full border-[10px] border-white/5 shadow-2xl overflow-hidden bg-[#121212]">
                            <LazyImage src={podcast.thumbnail} alt="" className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-500" />
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-black rounded-full border-4 border-white/5 flex items-center justify-center shadow-inner">
                            <div className="w-3 h-3 bg-white/10 rounded-full" />
                        </div>
                    </motion.div>
                </div>

                {/* Right Side: Script */}
                <div className="flex-1 flex flex-col overflow-hidden bg-black/20 lg:border-l border-white/5">
                    <div className="flex-1 flex flex-col items-center justify-center px-8 md:px-16 space-y-8 md:space-y-12">
                        {[-1, 0, 1].map(offset => {
                            const originalIdx = activeTimelineIdx + offset;
                            const item = combinedTimeline[originalIdx];
                            if (!item) return <div key={`empty-${offset}`} className="h-20 opacity-0" />;
                            const isActive = offset === 0;
                            return (
                                <motion.div 
                                    key={`${originalIdx}-${item.type}`} onClick={() => handleSeek(item.time)}
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: isActive ? 1 : 0.2, scale: isActive ? 1 : 0.9, y: 0, filter: isActive ? "blur(0px)" : "blur(1px)" }}
                                    transition={{ duration: 0.5 }} className="text-center w-full px-4 cursor-pointer"
                                >
                                    <p className={`text-xl md:text-3xl font-black leading-tight tracking-tight transition-all duration-500 ${isActive ? "text-emerald-400" : "text-zinc-500"}`}>{item.text}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Premium Player Bar (Identical to Podcasts.jsx) */}
            <div className="h-[95px] bg-black border-t border-white/5 px-6 flex items-center justify-between z-50 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-4 w-[30%] min-w-[200px]">
                    <div className="w-14 h-14 bg-zinc-800 rounded-lg flex-shrink-0 overflow-hidden relative group cursor-pointer shadow-2xl">
                        <LazyImage src={podcast.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                    </div>
                    <div className="hidden sm:block truncate pr-4">
                        <p className="text-[14px] font-black truncate text-white leading-tight">{podcast.title}</p>
                        <p className="text-[11px] text-[#a7a7a7] font-bold uppercase tracking-wider">{podcast.level || "B2"} Podcast</p>
                    </div>
                    <Heart size={18} className="text-[#a7a7a7] hover:text-white transition-colors cursor-pointer" />
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

        </div>
    );
}

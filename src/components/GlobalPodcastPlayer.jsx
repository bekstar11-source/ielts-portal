import React from "react";
import { useLocation } from "react-router-dom";
import { 
    Play, Pause, Shuffle, SkipBack, SkipForward, Repeat, Volume2, VolumeX, Heart, ChevronLeft 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePodcast } from "../context/PodcastContext";
import { useTheme } from "../context/ThemeContext";
import LazyImage from "./common/LazyImage";
import InteractivePlayer from "./InteractivePlayer";

export default function GlobalPodcastPlayer() {
    const location = useLocation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { 
        currentTrack, isPlaying, setIsPlaying, duration, currentTime, 
        toggleMute, isMuted, volume, updateVolume, repeat, setRepeat, 
        shuffle, setShuffle, audioRef, isExpanded, setIsExpanded, handleSeek
    } = usePodcast();

    // Faqat podcast bo'limlarida ko'rinadi
    const isPodcastRoute = location.pathname.startsWith('/podcast') || 
                          location.pathname === '/podcasts' || 
                          location.pathname === '/library';

    if (!currentTrack || !isPodcastRoute) return (
        <InteractivePlayer isOpen={isExpanded} onClose={() => setIsExpanded(false)} />
    );

    const formatTime = (time) => {
        if (!time || isNaN(time)) return "0:00";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <>
            <InteractivePlayer isOpen={isExpanded} onClose={() => setIsExpanded(false)} />
            
            <div className={`h-[85px] border-t px-4 md:px-6 flex items-center justify-between z-[60] shrink-0 shadow-2xl transition-all duration-300 fixed bottom-0 left-0 w-full ${isDark ? 'bg-black border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]' : 'bg-white border-zinc-200'}`}>
                <div className="flex items-center gap-4 w-[30%] min-w-[200px]">
                    <div className={`w-12 h-12 rounded-md flex-shrink-0 overflow-hidden relative group cursor-pointer shadow-2xl ${isDark ? 'bg-zinc-800' : 'bg-zinc-100 border border-zinc-200'}`} onClick={() => setIsExpanded(true)}>
                        <LazyImage src={currentTrack.thumbnail || null} alt="" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronLeft size={20} className="text-white rotate-90" />
                        </div>
                    </div>
                    <div className="hidden sm:block truncate pr-4 cursor-pointer" onClick={() => setIsExpanded(true)}>
                        <p className={`text-[14px] font-black hover:underline truncate leading-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{currentTrack.title}</p>
                        <p className={`text-[11px] hover:underline truncate mt-0.5 font-bold uppercase tracking-wider ${isDark ? 'text-[#a7a7a7]' : 'text-zinc-500'}`}>{currentTrack.level || "B2"} Podcast</p>
                    </div>
                    <Heart size={18} className={`transition-colors cursor-pointer hidden lg:block ${isDark ? 'text-[#a7a7a7] hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`} />
                </div>

                <div className="flex flex-col items-center max-w-[650px] w-full px-4 -mt-1">
                    <div className="flex items-center gap-6 mb-1.5">
                        <Shuffle size={16} className={`cursor-pointer transition-colors ${shuffle ? 'text-emerald-500' : (isDark ? 'text-[#a7a7a7] hover:text-white' : 'text-zinc-400 hover:text-zinc-900')}`} onClick={() => setShuffle(!shuffle)} />
                        <SkipBack size={20} fill="currentColor" className={`transition-transform active:scale-90 cursor-pointer ${isDark ? 'text-[#a7a7a7] hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`} onClick={() => audioRef.current && (audioRef.current.currentTime -= 10)} />
                        <button 
                            className={`w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-lg active:scale-95 ${isDark ? 'bg-white text-black' : 'bg-zinc-900 text-white'}`} 
                            onClick={() => {
                                const isVideoDisplay = (currentTrack?.mediaType === 'youtube' || currentTrack?.mediaType === 'video') && currentTrack?.showVideo !== false && String(currentTrack?.showVideo) !== 'false';
                                if (!isPlaying && isVideoDisplay) {
                                    setIsExpanded(true);
                                }
                                setIsPlaying(!isPlaying);
                            }}
                        >
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                        </button>
                        <SkipForward size={20} fill="currentColor" className={`transition-transform active:scale-90 cursor-pointer ${isDark ? 'text-[#a7a7a7] hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`} onClick={() => audioRef.current && (audioRef.current.currentTime += 10)} />
                        <button className={`cursor-pointer transition-colors ${repeat ? 'text-emerald-500' : (isDark ? 'text-[#a7a7a7] hover:text-white' : 'text-zinc-400 hover:text-zinc-900')}`} onClick={() => setRepeat(!repeat)}>
                            <Repeat size={16} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 w-full">
                        <span className={`text-[11px] font-medium min-w-[32px] text-right tabular-nums ${isDark ? 'text-[#a7a7a7]' : 'text-zinc-500'}`}>{formatTime(currentTime)}</span>
                        <div className={`flex-1 h-[4px] rounded-full group cursor-pointer flex items-center ${isDark ? 'bg-[#4d4d4d]' : 'bg-zinc-200'}`} onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const percent = (e.clientX - rect.left) / rect.width;
                            handleSeek(percent * duration);
                        }}>
                            <div className={`h-full rounded-full relative transition-colors ${isDark ? 'bg-white group-hover:bg-[#1ed760]' : 'bg-zinc-900 group-hover:bg-emerald-600'}`} style={{ width: `${(currentTime / duration) * 100 || 0}%` }}>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-zinc-200 rounded-full opacity-0 group-hover:opacity-100 shadow-xl" />
                            </div>
                        </div>
                        <span className={`text-[11px] font-medium min-w-[32px] tabular-nums ${isDark ? 'text-[#a7a7a7]' : 'text-zinc-500'}`}>{formatTime(duration)}</span>
                    </div>
                </div>

                <div className={`flex items-center justify-end gap-5 w-[30%] min-w-[200px] ${isDark ? 'text-[#a7a7a7]' : 'text-zinc-400'}`}>
                    <div className="flex items-center gap-4">
                        <div className="group flex items-center gap-2">
                            <button className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-zinc-900'}`} onClick={toggleMute}>{isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
                            <div className={`w-20 h-1 rounded-full relative group cursor-pointer hidden sm:flex items-center ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`}>
                                <div className={`h-full rounded-full relative ${isDark ? 'bg-emerald-500' : 'bg-zinc-900'}`} style={{ width: `${volume * 100}%` }}>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white border border-zinc-200 rounded-full opacity-0 group-hover:opacity-100 shadow-xl" />
                                </div>
                                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => updateVolume(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

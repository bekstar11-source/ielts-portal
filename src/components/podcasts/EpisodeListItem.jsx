import { Play, Pause, PlusCircle, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import LazyImage from "../common/LazyImage";
import { formatTime, getPodcastDuration, getPodcastDate } from "../../utils/podcastUtils";
import { usePodcast } from "../../context/PodcastContext";
import { useAuth } from "../../context/AuthContext";

export default function EpisodeListItem({ 
    p, 
    album, 
    isDark, 
    currentTrack, 
    isPlaying, 
    playTrack, 
    setIsPlaying, 
    setIsExpanded 
}) {
    const { user } = useAuth();
    const { likedPodcasts, toggleLike } = usePodcast();
    const isLiked = likedPodcasts.includes(p?.id);
    const navigate = useNavigate();
    const isPlayingThis = currentTrack?.id === p.id && isPlaying;
    const isActiveThis = currentTrack?.id === p.id;

    const handlePlayClick = (e) => {
        e.stopPropagation();
        const isVideoDisplay = (p.mediaType === 'youtube' || p.mediaType === 'video') && p.showVideo !== false && String(p.showVideo) !== 'false';
        if (currentTrack?.id === p.id) {
            setIsPlaying(!isPlaying);
            if (isVideoDisplay) setIsExpanded(true);
        } else {
            playTrack(p);
            if (isVideoDisplay) setIsExpanded(true);
        }
    };

    return (
        <div 
            onClick={() => navigate(`/podcast/episode/${p.id}`)}
            className={`group flex gap-4 p-4 -mx-4 rounded-md cursor-pointer transition-colors border-b last:border-0 ${
                isDark 
                    ? `hover:bg-white/5 border-white/10 ${isActiveThis ? 'bg-white/5' : ''}` 
                    : `hover:bg-zinc-50 border-zinc-100 ${isActiveThis ? 'bg-zinc-50' : ''}`
            }`}
        >
            <div className="relative shrink-0">
                <LazyImage src={p.thumbnail} className="w-[112px] h-[112px] rounded-lg object-cover shadow-sm" />
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
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleLike(user?.uid, p?.id); }}
                            className={`flex items-center gap-1 transition-all active:scale-125 ${isLiked ? 'text-emerald-500' : (isDark ? 'text-[#a7a7a7] hover:text-white' : 'text-zinc-400 hover:text-zinc-900')}`}
                        >
                            <Heart size={18} fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 0 : 1.5} />
                        </button>
                        <span className={`text-[13px] font-medium transition-colors ${isDark ? 'text-[#a7a7a7] group-hover:text-white' : 'text-zinc-400 group-hover:text-zinc-900'}`}>
                            {getPodcastDate(p)} • {formatTime(getPodcastDuration(p))}
                        </span>
                    </div>
                    <button 
                        onClick={handlePlayClick}
                        className={`w-8 h-8 rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shrink-0 shadow-md ${isDark ? 'bg-white text-black' : 'bg-zinc-900 text-white'}`}
                    >
                        {isPlayingThis ? <Pause fill="currentColor" size={14} /> : <Play fill="currentColor" size={14} className="ml-0.5" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

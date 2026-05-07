import React from "react";
import { Play, Pause, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LazyImage from "../common/LazyImage";
import { usePodcast } from "../../context/PodcastContext";
import { useAuth } from "../../context/AuthContext";

const DIFF_COLORS = {
    easy: "bg-emerald-500",
    medium: "bg-blue-500",
    hard: "bg-orange-500",
    super_hard: "bg-rose-500",
};

export default function EpisodeGridItem({ 
    p, 
    isDark,
    currentTrack, 
    isPlaying, 
    setIsExpanded, 
    playTrack,
    setCurrentTrack,
    setIsPlaying
}) {
    const { user } = useAuth();
    const { likedPodcasts, toggleLike } = usePodcast();
    const isLiked = likedPodcasts.includes(p?.id);
    const navigate = useNavigate();
    if (!p) return null;
    const isPlayingThis = currentTrack?.id === p.id && isPlaying;

    const handleContainerClick = () => {
        const isVideoDisplay = (p.mediaType === 'youtube' || p.mediaType === 'video') && p.showVideo !== false && String(p.showVideo) !== 'false';
        if (isVideoDisplay) {
            setCurrentTrack(p);
            setIsExpanded(true);
        } else {
            navigate(`/podcast/spotify/${p.id}`);
        }
    };

    const handlePlayClick = (e) => {
        e.stopPropagation();
        const isVideoDisplay = (p.mediaType === 'youtube' || p.mediaType === 'video') && p.showVideo !== false && String(p.showVideo) !== 'false';
        if (isVideoDisplay) {
            setCurrentTrack(p);
            setIsExpanded(true);
            setIsPlaying(false);
        } else {
            playTrack(p);
        }
    };

    return (
        <div 
            onClick={handleContainerClick}
            className={`group rounded-lg p-4 cursor-pointer relative overflow-hidden flex flex-col transition-all duration-300 ${
                isDark 
                    ? 'bg-[#181818] hover:bg-[#282828] border border-white/5' 
                    : 'bg-white border border-zinc-200 hover:shadow-xl'
            }`}
        >
            <div className="relative aspect-square w-full mb-4 shadow-lg rounded-md overflow-hidden">
                <LazyImage src={p.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-500" />
                
                {/* Difficulty Badge */}
                <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest text-white shadow-lg ${DIFF_COLORS[p.difficulty] || 'bg-blue-500'}`}>
                    {p.level || "IELTS"}
                </div>

                {/* Play Button Overlay */}
                <div 
                    onClick={handlePlayClick}
                    className={`absolute bottom-2 right-2 w-10 h-10 bg-[#1ed760] rounded-full flex items-center justify-center shadow-xl transition-all duration-300 transform ${
                        isPlayingThis ? 'scale-100' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                    } hover:scale-110`}
                >
                    {isPlayingThis ? <Pause size={20} fill="black" stroke="black" /> : <Play size={20} fill="black" stroke="black" className="ml-0.5" />}
                </div>
            </div>
            
            <div className="flex items-center justify-between mt-auto">
                <div className="flex flex-col gap-1 overflow-hidden flex-1 mr-2">
                    <h3 className={`font-bold text-[14px] leading-tight line-clamp-1 transition-colors ${
                        isDark ? 'text-white' : 'text-zinc-900'
                    } group-hover:text-emerald-500`}>
                        {p.title}
                    </h3>
                    <p className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {p.duration || '15 min'}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(user?.uid, p?.id);
                        }}
                        className={`flex items-center gap-1 p-1 rounded-full transition-all active:scale-125 ${
                            isLiked ? 'text-emerald-500' : (isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900')
                        }`}
                    >
                        <Heart size={14} fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 0 : 2} />
                        <span className="text-[11px] font-bold">{(p.likesCount || 0) + (isLiked ? 1 : 0)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

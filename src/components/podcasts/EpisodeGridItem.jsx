import React from "react";
import { Play, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LazyImage from "../common/LazyImage";

const DIFF_COLORS = {
    easy: "bg-emerald-500",
    medium: "bg-blue-500",
    hard: "bg-orange-500",
    super_hard: "bg-rose-500",
};

export default function EpisodeGridItem({ 
    p, 
    currentTrack, 
    isPlaying, 
    setCurrentTrack, 
    setIsPlaying, 
    setIsExpanded, 
    playTrack 
}) {
    const navigate = useNavigate();
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
            className={`group rounded-xl p-6 cursor-pointer relative overflow-hidden flex flex-col justify-between transition-transform hover:scale-[1.02] shadow-lg min-h-[280px] ${DIFF_COLORS[p.difficulty] || 'bg-blue-800'}`}
        >
            <div className="relative z-10 flex flex-col h-full">
                <div>
                    <h3 className="text-2xl font-black text-white leading-tight mb-2 line-clamp-3">{p.title}</h3>
                    <p className="text-white/80 font-medium text-sm">Episode • {p.level || "IELTS"}</p>
                </div>
                
                <div className="mt-auto pt-6 flex items-end justify-between">
                    <div className="w-32 h-32 rounded-lg shadow-2xl overflow-hidden rotate-[-5deg] translate-y-4 translate-x-[-10px] group-hover:rotate-0 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-500 border-4 border-white/10 shrink-0">
                        <LazyImage src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                    
                    <div 
                        onClick={handlePlayClick}
                        className={`w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 shrink-0 ${isPlayingThis ? 'scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'}`}
                    >
                        {isPlayingThis ? <Pause size={24} fill="black" stroke="black" /> : <Play size={24} fill="black" stroke="black" className="ml-1" />}
                    </div>
                </div>
            </div>
        </div>
    );
}

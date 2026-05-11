import React from "react";
import { RotateCcw, Pause, Play, RotateCw, Target, Heart } from "lucide-react";
import { usePodcast } from "../../context/PodcastContext";
import { useAuth } from "../../context/AuthContext";

export default function PlayerFooter({ 
    isDark, 
    podcast, 
    isPlaying, 
    setIsPlaying, 
    currentTime, 
    duration, 
    handleMediaSkip, 
    handleMediaSeek, 
    formatTime,
    currentStep,
    onExpand, // Added prop to open player
    isFixed = false, // Added prop to control positioning
    hasBottomNav = false // Added prop to adjust for bottom navigation bar
}) {
    const { likedPodcasts, toggleLike } = usePodcast();
    const { user } = useAuth();
    const isLiked = likedPodcasts.includes(podcast?.id);

    return (
        <footer className={`shrink-0 border-t z-50 transition-all duration-300 
            ${isFixed ? `fixed ${hasBottomNav ? 'bottom-[56px]' : 'bottom-0'} md:bottom-0 left-0 right-0 md:w-full rounded-none shadow-[0_-4px_12px_rgba(0,0,0,0.1)] md:shadow-none` : 'relative'}
            ${isDark ? 'border-neutral-800 bg-[#121212]/98 backdrop-blur-xl text-white' : 'border-zinc-100 bg-white/98 backdrop-blur-xl text-zinc-900'}
            h-[56px] md:h-20 px-3 md:px-8 flex items-center justify-between`}>
            
            {/* Left: Info & Mini Preview (Mobile Friendly) */}
            <div className="flex items-center gap-2 flex-1 min-w-0 md:w-1/4 h-full">
                <div 
                    onClick={onExpand}
                    className={`flex items-center gap-3 h-full relative overflow-hidden flex-1 group/seek ${onExpand ? 'cursor-pointer' : ''}`}
                    onMouseDown={(e) => {
                        if (window.innerWidth >= 768) return; // Only for mobile swipe-seek on the title
                        const rect = e.currentTarget.getBoundingClientRect();
                        const startX = e.clientX;
                        const startTime = currentTime;
                        
                        const handleMouseMove = (moveEvent) => {
                            const deltaX = moveEvent.clientX - startX;
                            const percentChange = deltaX / rect.width;
                            const newTime = Math.max(0, Math.min(duration, startTime + (duration * percentChange)));
                            handleMediaSeek(newTime);
                        };
                        const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                    }}
                    onTouchStart={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const touch = e.touches[0];
                        const startX = touch.clientX;
                        const startTime = currentTime;
                        
                        const handleTouchMove = (moveEvent) => {
                            const moveTouch = moveEvent.touches[0];
                            const deltaX = moveTouch.clientX - startX;
                            const percentChange = deltaX / rect.width;
                            const newTime = Math.max(0, Math.min(duration, startTime + (duration * percentChange)));
                            handleMediaSeek(newTime);
                        };
                        const handleTouchEnd = () => {
                            document.removeEventListener('touchmove', handleTouchMove);
                            document.removeEventListener('touchend', handleTouchEnd);
                        };
                        document.addEventListener('touchmove', handleTouchMove);
                        document.addEventListener('touchend', handleTouchEnd);
                    }}
                >
                    {/* Progress Overlay (Dark shadow moving over the title) */}
                    <div 
                        className="absolute inset-0 z-0 bg-black/20 pointer-events-none transition-all duration-500 ease-linear"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                    <div className="absolute bottom-0 left-0 h-[3px] bg-emerald-500 z-10 transition-all duration-500 ease-linear" 
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />

                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded overflow-hidden flex items-center justify-center border shadow-md shrink-0 z-10 ml-1 ${isDark ? 'bg-neutral-800 border-white/5' : 'bg-zinc-100 border-zinc-200'}`}>
                        {podcast.thumbnail ? (
                            <img src={podcast.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Target size={18} className="text-emerald-500" />
                        )}
                    </div>
                    
                    <div className="flex flex-col overflow-hidden flex-1 z-10">
                        <span className={`text-[13px] md:text-sm font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>{podcast.title}</span>
                        <span className="text-[11px] text-neutral-500 truncate">EP {podcast.level || "B2"}</span>
                    </div>
                </div>

                {/* Like Button - Outside the progress container */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(user?.uid, podcast?.id);
                    }}
                    className={`shrink-0 p-2 transition-all active:scale-125 z-20 ${isLiked ? 'text-emerald-500' : (isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900')}`}
                >
                    <Heart size={20} fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 0 : 2} />
                </button>
            </div>

            {/* Center: Controls */}
            <div className="flex items-center gap-1.5 md:gap-6 shrink-0">
                <div className="flex items-center gap-1 md:gap-6">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleMediaSkip(-5); }}
                        className={`p-1.5 transition-all active:scale-75 ${isDark ? 'text-neutral-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
                    >
                        <RotateCcw size={20} strokeWidth={2.5} />
                    </button>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                        className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full hover:scale-105 active:scale-90 transition-all shadow-lg ${isDark ? 'bg-white text-black' : 'bg-zinc-900 text-white'}`}
                    >
                        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                    </button>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleMediaSkip(5); }}
                        className={`p-1.5 transition-all active:scale-75 ${isDark ? 'text-neutral-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
                    >
                        <RotateCw size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Desktop-only Progress Bar Section */}
            <div className="hidden md:flex flex-1 max-w-xl flex-col items-center gap-1.5 ml-8">
                <div className="w-full flex items-center gap-3">
                    <span className="text-[10px] font-mono text-neutral-500">{formatTime(currentTime)}</span>
                    <div 
                        className={`flex-1 h-1.5 rounded-full cursor-pointer relative group ${isDark ? 'bg-neutral-800' : 'bg-zinc-200'}`}
                        onMouseDown={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const handleMouseMove = (moveEvent) => {
                                const percent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
                                handleMediaSeek(duration * percent);
                            };
                            const handleMouseUp = () => {
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                            };
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                            handleMouseMove(e);
                        }}
                    >
                        <div 
                            className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full"
                            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform" />
                        </div>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500">{formatTime(duration)}</span>
                </div>
            </div>

            {/* Mobile-only Progress Line (Bottom of pill) */}
            <div className="md:hidden absolute bottom-0 left-3 right-3 h-0.5 bg-neutral-800/30 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
            </div>
        </footer>
    );
}

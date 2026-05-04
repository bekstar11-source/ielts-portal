import React from "react";
import { RotateCcw, Pause, Play, RotateCw, Target } from "lucide-react";

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
    currentStep 
}) {
    return (
        <footer className={`h-20 shrink-0 border-t px-4 md:px-8 flex items-center justify-between relative z-20 transition-colors duration-300 ${isDark ? 'border-neutral-800 bg-[#0a0a0c]/80 backdrop-blur-xl' : 'border-zinc-100 bg-white/90 backdrop-blur-xl'}`}>
            {/* Left: Info & Mini Video - Hidden on mobile */}
            <div className="hidden lg:flex items-center gap-4 w-1/4 min-w-[280px]">
                {/* Mini Video Preview for YouTube Podcasts */}
                {podcast.mediaType === 'youtube' ? (
                    <div className="w-16 h-10 rounded bg-black overflow-hidden shadow-lg border border-white/10 shrink-0 relative group/mini">
                        <iframe 
                            className="w-[140%] h-[140%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none scale-110"
                            src={`https://www.youtube.com/embed/${podcast.youtubeId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&origin=${window.location.origin}`}
                            title="Mini Video"
                            frameBorder="0"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover/mini:bg-transparent transition-colors" />
                    </div>
                ) : (
                    <div className={`w-10 h-10 rounded-sm flex items-center justify-center border shadow-md shrink-0 ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-zinc-100 border-zinc-200'}`}>
                        <Target size={18} className="text-emerald-500" />
                    </div>
                )}
                
                <div className="flex flex-col overflow-hidden">
                    <span className={`text-sm font-medium leading-tight truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>{podcast.title}</span>
                    <span className="text-xs text-neutral-500 truncate">Englev Podcast • EP {podcast.level || "B2"}</span>
                </div>
            </div>

            {/* Center: Controls & Progress */}
            <div className="flex-1 max-w-2xl flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-6">
                    <button onClick={() => handleMediaSkip(-5)} className={`flex items-center gap-1 transition-colors group ${isDark ? 'text-neutral-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}>
                        <RotateCcw size={16} strokeWidth={2.5} />
                        <span className="text-[9px] font-mono font-bold -ml-1">5</span>
                    </button>
                    
                    <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full hover:scale-105 transition-transform shadow-lg ${isDark ? 'bg-white text-black' : 'bg-zinc-900 text-white'}`}
                    >
                        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                    </button>
                    
                    <button onClick={() => handleMediaSkip(5)} className={`flex items-center gap-1 transition-colors group ${isDark ? 'text-neutral-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}>
                        <RotateCw size={16} strokeWidth={2.5} />
                        <span className="text-[9px] font-mono font-bold -ml-1">5</span>
                    </button>
                </div>
                
                <div className="w-full flex items-center gap-3">
                    <span className="text-[10px] font-mono text-neutral-500">{formatTime(currentTime)}</span>
                    <div 
                        className={`flex-1 h-1.5 rounded-full cursor-pointer relative group ${isDark ? 'bg-neutral-800' : 'bg-zinc-200'}`}
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const percent = (e.clientX - rect.left) / rect.width;
                            handleMediaSeek(duration * percent);
                        }}
                    >
                        <div 
                            className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all duration-100"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform" />
                        </div>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500">{formatTime(duration)}</span>
                </div>
            </div>

            {/* Right: Info/Shortcuts - Hidden on mobile */}
            <div className="hidden lg:flex items-center justify-end gap-1 w-1/4 min-w-[200px]">
                <div className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full border ${isDark ? 'border-neutral-800 text-neutral-600' : 'border-zinc-200 text-zinc-400'}`}>
                    {currentStep === 1 ? 'Filling Gaps' : currentStep === 2 ? 'MCQ Active' : 'Sentence Completion'}
                </div>
            </div>
        </footer>
    );
}

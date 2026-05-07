import React from "react";
import { List as ListIcon } from "lucide-react";
import LazyImage from "../common/LazyImage";

export default function AlbumHero({ album, podcasts, isDark, dominantColor }) {
    return (
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
    );
}

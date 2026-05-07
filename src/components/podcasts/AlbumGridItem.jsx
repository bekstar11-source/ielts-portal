import React from "react";
import { Mic2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LazyImage from "../common/LazyImage";

export default function AlbumGridItem({ col, isDark, episodeCount }) {
    const navigate = useNavigate();

    return (
        <div 
            onClick={() => navigate(`/podcast/album/${col.id}`)}
            className={`p-4 rounded-xl transition duration-300 cursor-pointer group flex flex-col h-full ${isDark ? 'bg-[#181818] hover:bg-[#282828]' : 'bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-lg'}`}
        >
            <div className="relative aspect-square w-full rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.15)] mb-4 overflow-hidden bg-zinc-800 flex items-center justify-center">
                {col.thumbnail ? (
                    <LazyImage src={col.thumbnail} className="w-full h-full object-cover" />
                ) : (
                    <Mic2 size={48} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                )}
                <div className="absolute bottom-2 right-2 w-10 h-10 bg-[#1ed760] rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-105 active:scale-95">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="black" className="ml-1">
                        <path d="M6 4l14 8-14 8z" />
                    </svg>
                </div>
            </div>
            <h3 className={`font-bold text-[16px] truncate mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{col.name}</h3>
            <p className={`text-[14px] line-clamp-2 leading-snug ${isDark ? 'text-[#a7a7a7]' : 'text-zinc-500'}`}>
                {col.description || `Collection • ${episodeCount} episodes`}
            </p>
        </div>
    );
}

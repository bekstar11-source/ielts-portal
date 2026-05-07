import React from "react";
import LazyImage from "../common/LazyImage";

export default function EpisodeHero({ podcast, album }) {
    return (
        <div className="bg-gradient-to-b from-[#08504B] to-[#121212] pt-6 pb-6 px-6 md:px-10 relative">
            <div className="mt-2 mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#3e82d5]"></div>
                    <span className="text-white text-sm font-semibold">New Podcast Episode</span>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-tight mb-4">
                    {podcast.title}
                </h1>
                
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-zinc-800 overflow-hidden shadow-lg">
                        {podcast.thumbnail ? (
                            <LazyImage src={podcast.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : album?.thumbnail ? (
                            <LazyImage src={album.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : null}
                    </div>
                    <span className="text-white font-bold text-lg">{album?.name || "Official Podcast"}</span>
                </div>
            </div>
        </div>
    );
}

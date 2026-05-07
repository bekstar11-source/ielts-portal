import React from "react";

export const AlbumSkeleton = () => (
    <div className="bg-[#181818] p-4 rounded-xl animate-pulse">
        <div className="aspect-square w-full rounded-md bg-white/5 mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.5)]" />
        <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
    </div>
);

export const EpisodeSkeleton = () => (
    <div className="rounded-xl p-6 h-[280px] bg-zinc-900/50 animate-pulse flex flex-col justify-between border border-white/5">
        <div>
            <div className="h-8 bg-white/5 rounded w-full mb-3" />
            <div className="h-4 bg-white/5 rounded w-1/3" />
        </div>
        <div className="flex items-end justify-between">
            <div className="w-32 h-32 rounded-lg bg-white/5 rotate-[-5deg] translate-y-4 translate-x-[-10px]" />
            <div className="w-12 h-12 rounded-full bg-white/5" />
        </div>
    </div>
);

export const SidebarSkeleton = () => (
    <div className="flex items-center gap-3 p-2 animate-pulse">
        <div className="w-12 h-12 rounded bg-white/5 flex-shrink-0" />
        <div className="hidden md:block flex-1">
            <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
        </div>
    </div>
);

export const EpisodeRowSkeleton = () => (
    <div className="flex gap-4 animate-pulse p-4">
        <div className="w-[112px] h-[112px] rounded-lg bg-white/5 shrink-0" />
        <div className="flex flex-col flex-1">
            <div className="h-5 bg-white/5 rounded w-1/2 mb-2" />
            <div className="h-4 bg-white/5 rounded w-1/4 mb-4" />
            <div className="h-3 bg-white/5 rounded w-full mb-1" />
            <div className="h-3 bg-white/5 rounded w-3/4" />
        </div>
    </div>
);

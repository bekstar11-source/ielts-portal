import React from "react";

// Skeletonlar avval qat'iy qora fon bilan chizilardi — yorug' rejimda sahifa
// o'rtasida qora to'rtburchaklar bo'lib turardi.
const shell = (isDark) => (isDark ? "bg-white/[0.04] border-white/5" : "bg-white border-warm-hairline");
const block = (isDark) => (isDark ? "bg-white/10" : "bg-warm-card");

export const AlbumSkeleton = ({ isDark = true }) => (
    <div className={`p-3 rounded-xl border animate-pulse ${shell(isDark)}`}>
        <div className={`aspect-square w-full rounded-lg mb-3 ${block(isDark)}`} />
        <div className={`h-3.5 rounded w-3/4 mb-2 ${block(isDark)}`} />
        <div className={`h-3 rounded w-1/2 ${block(isDark)}`} />
    </div>
);

export const EpisodeSkeleton = ({ isDark = true }) => (
    <div className={`p-3 rounded-xl border animate-pulse ${shell(isDark)}`}>
        <div className={`aspect-square w-full rounded-lg mb-3 ${block(isDark)}`} />
        <div className={`h-3.5 rounded w-5/6 mb-2 ${block(isDark)}`} />
        <div className={`h-3 rounded w-1/3 mb-3 ${block(isDark)}`} />
        <div className="flex items-center justify-between">
            <div className={`h-3 rounded w-10 ${block(isDark)}`} />
            <div className={`h-3 w-3 rounded ${block(isDark)}`} />
        </div>
    </div>
);

export const SidebarSkeleton = ({ isDark = true }) => (
    <div className="flex items-center gap-3 p-2 animate-pulse">
        <div className={`w-12 h-12 rounded-lg flex-shrink-0 ${block(isDark)}`} />
        <div className="hidden md:block flex-1">
            <div className={`h-3.5 rounded w-3/4 mb-2 ${block(isDark)}`} />
            <div className={`h-3 rounded w-1/2 ${block(isDark)}`} />
        </div>
    </div>
);

export const EpisodeRowSkeleton = ({ isDark = true }) => (
    <div className="flex gap-4 animate-pulse p-4">
        <div className={`w-[112px] h-[112px] rounded-lg shrink-0 ${block(isDark)}`} />
        <div className="flex flex-col flex-1">
            <div className={`h-5 rounded w-1/2 mb-2 ${block(isDark)}`} />
            <div className={`h-4 rounded w-1/4 mb-4 ${block(isDark)}`} />
            <div className={`h-3 rounded w-full mb-1 ${block(isDark)}`} />
            <div className={`h-3 rounded w-3/4 ${block(isDark)}`} />
        </div>
    </div>
);

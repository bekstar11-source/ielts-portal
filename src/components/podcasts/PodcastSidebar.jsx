import React from "react";
import { Home, Search, Library, ChevronLeft, List as ListIcon, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LazyImage from "../common/LazyImage";
import { SidebarSkeleton } from "./PodcastSkeletons";

export default function PodcastSidebar({ 
    isDark, 
    isSidebarCollapsed, 
    setIsSidebarCollapsed, 
    loading, 
    collections, 
    podcasts,
    setCurrentTrack,
    setIsExpanded
}) {
    const navigate = useNavigate();

    return (
        <div className={`hidden md:flex flex-col gap-2 shrink-0 transition-all duration-300 overflow-x-hidden ${isSidebarCollapsed ? 'w-[72px]' : 'w-[300px]'}`}>
            <div className={`${isDark ? 'bg-[#121212]' : 'bg-white'} rounded-lg p-3 ${isSidebarCollapsed ? 'md:p-3' : 'md:p-5'} flex flex-col gap-5 border ${isDark ? 'border-transparent' : 'border-zinc-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                    <div onClick={() => navigate('/dashboard')} className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-5'} cursor-pointer transition px-1 group ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'} w-full`}>
                        <Home size={26} strokeWidth={2.5} className="transition-transform" />
                        {!isSidebarCollapsed && <span className="hidden md:block font-bold text-[16px]">Home</span>}
                    </div>
                    {!isSidebarCollapsed && (
                        <button 
                            onClick={() => setIsSidebarCollapsed(true)}
                            className={`hidden md:flex p-1 rounded-full transition ${isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}
                </div>
                <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-5'} cursor-pointer transition px-1 group ${isDark ? 'text-white' : 'text-zinc-900'} w-full`}>
                    <Search size={26} strokeWidth={2.5} className="transition-transform" />
                    {!isSidebarCollapsed && <span className="hidden md:block font-bold text-[16px]">Search</span>}
                </div>
            </div>

            <div className={`${isDark ? 'bg-[#121212]' : 'bg-white'} rounded-lg flex-1 flex flex-col overflow-hidden border ${isDark ? 'border-transparent' : 'border-zinc-200 shadow-sm'}`}>
                <div className={`p-4 ${isSidebarCollapsed ? 'px-3' : 'px-5'} flex items-center justify-between ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-4'} group w-full`}>
                        <Library size={26} strokeWidth={2.5} className={`transition-colors ${isDark ? 'group-hover:text-white' : 'group-hover:text-zinc-900'}`} />
                        {!isSidebarCollapsed && <span className="hidden md:block font-bold text-[16px] truncate">Your Library</span>}
                    </div>
                </div>

                <div className="px-2 md:px-3 mb-2">
                    <div 
                        onClick={() => navigate('/podcasts?tab=liked')}
                        className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} p-2 rounded-md cursor-pointer transition group ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'}`}
                    >
                        <div className="w-12 h-12 rounded bg-gradient-to-br from-indigo-700 to-blue-400 flex-shrink-0 flex items-center justify-center shadow-sm">
                            <Heart size={20} fill="white" className="text-white" />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="hidden md:block overflow-hidden">
                                <p className={`font-bold truncate text-[14px] leading-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Liked Podcasts</p>
                                <p className={`text-[12px] truncate mt-0.5 font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Playlist</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 md:px-3 pb-4 space-y-1 custom-scrollbar">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => <SidebarSkeleton key={i} />)
                    ) : (
                        <>
                            {collections.length > 0 && !isSidebarCollapsed && (
                                <p className={`px-2 mb-2 mt-4 text-[12px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Albums</p>
                            )}
                            {collections.map(c => (
                                <div key={c.id} onClick={() => navigate(`/podcast/album/${c.id}`)} className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} p-2 rounded-md cursor-pointer transition group ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'}`}>
                                    <div className={`w-12 h-12 rounded bg-zinc-800 flex-shrink-0 overflow-hidden flex items-center justify-center border shadow-sm ${isDark ? 'border-white/5' : 'border-zinc-200'}`}>
                                        {c.thumbnail ? (
                                            <LazyImage src={c.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-500" />
                                        ) : (
                                            <ListIcon size={18} className={`transition-colors ${isDark ? 'text-zinc-500 group-hover:text-white' : 'text-zinc-400 group-hover:text-zinc-900'}`} />
                                        )}
                                    </div>
                                    {!isSidebarCollapsed && (
                                        <div className="hidden md:block overflow-hidden">
                                            <p className={`font-bold truncate text-[14px] leading-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{c.name}</p>
                                            <p className={`text-[12px] truncate mt-0.5 uppercase tracking-tighter font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Album</p>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {podcasts.length > 0 && (
                                <div className={`my-4 border-t ${isDark ? 'border-white/5' : 'border-zinc-100'}`} />
                            )}
                            {!isSidebarCollapsed && podcasts.length > 0 && (
                                <p className={`px-2 mb-2 text-[12px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Recent Episodes</p>
                            )}
                            {podcasts.slice(0, 8).map(p => (
                                <div 
                                    key={p.id} 
                                    onClick={() => { 
                                        const isVideoDisplay = (p.mediaType === 'youtube' || p.mediaType === 'video') && p.showVideo !== false && String(p.showVideo) !== 'false';
                                        if (isVideoDisplay) {
                                            setCurrentTrack(p);
                                            setIsExpanded(true);
                                        } else {
                                            navigate(`/podcast/spotify/${p.id}`);
                                        }
                                    }} 
                                    className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} p-2 rounded-md cursor-pointer transition group ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'}`}
                                >
                                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden shadow-md border border-white/5">
                                        <LazyImage src={p.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-500" />
                                    </div>
                                    {!isSidebarCollapsed && (
                                        <div className="hidden md:block overflow-hidden">
                                            <p className={`font-bold truncate text-[14px] leading-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{p.title}</p>
                                            <p className={`text-[12px] truncate mt-0.5 uppercase tracking-tighter font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{p.level || "B2"} • Episode</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

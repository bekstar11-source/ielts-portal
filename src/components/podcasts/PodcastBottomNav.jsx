import React from "react";
import { Home, Search, Library, Heart, LayoutDashboard } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function PodcastBottomNav({ isDark }) {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { id: 'home', label: 'Home', icon: Home, path: '/podcasts' },
        { id: 'liked', label: 'Liked', icon: Heart, path: '/podcasts?tab=liked' },
        { id: 'search', label: 'Search', icon: Search, path: '/podcasts?tab=search' },
        { id: 'library', label: 'Your Library', icon: Library, path: '/podcasts?tab=library' },
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ];

    const isActive = (path) => location.pathname + location.search === path;

    return (
        <div className={`md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 h-[56px] flex items-center backdrop-blur-xl border-t transition-colors duration-300 ${
            isDark 
                ? 'bg-black/80 border-white/5 text-[#a7a7a7]' 
                : 'bg-white/95 border-zinc-100 text-zinc-500 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]'
        }`}>
            <div className="flex items-center justify-between w-full max-w-md mx-auto">
                {tabs.map((tab) => {
                    const active = isActive(tab.path);
                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.path)}
                            className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${
                                active 
                                    ? (isDark ? 'text-white' : 'text-zinc-900 font-bold') 
                                    : ''
                            }`}
                        >
                            <tab.icon 
                                size={24} 
                                strokeWidth={active ? 2.5 : 2}
                                className={active ? (isDark ? 'text-white' : 'text-zinc-900') : ''}
                            />
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

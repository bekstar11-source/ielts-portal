import React from "react";
import { Search, ChevronLeft, ChevronRight, Home, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../common/Logo";

export default function PodcastMainHeader({ 
    isDark, 
    isSidebarCollapsed, 
    setIsSidebarCollapsed, 
    searchTerm, 
    setSearchTerm, 
    toggleTheme 
}) {
    const navigate = useNavigate();

    return (
        <div className={`sticky top-0 z-30 px-6 py-4 flex items-center relative h-16 border-b backdrop-blur-xl ${isDark ? 'bg-[#121212]/40 border-transparent' : 'bg-white/80 border-zinc-100'}`}>
            <div className="flex items-center gap-4 z-10">
                <button 
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className={`hidden md:flex w-8 h-8 rounded-full items-center justify-center transition ${isDark ? 'bg-black/60 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                >
                    {isSidebarCollapsed ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
                </button>
                <button 
                    onClick={() => navigate('/dashboard')}
                    className={`md:hidden w-10 h-10 rounded-full flex items-center justify-center transition ${isDark ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-900'}`}
                >
                    <Home size={20} />
                </button>
            </div>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Logo size="md" tone={isDark ? 'light' : 'ink'} suffix="Podcasts" />
            </div>
            
            <div className="flex-1 flex justify-end items-center gap-4 z-10">
                <div className="w-full max-w-[200px] relative hidden md:block">
                    <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        <Search size={14} />
                    </div>
                    <input 
                        type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search..." 
                        className={`w-full rounded-full py-2 pl-9 pr-4 outline-none border transition text-[12px] ${
                            isDark 
                                ? 'bg-[#242424] hover:bg-[#2a2a2a] text-white border-transparent focus:border-white/20 placeholder:text-zinc-500' 
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-200 focus:border-zinc-300 placeholder:text-zinc-400'
                        }`}
                    />
                </div>
                <button 
                    onClick={toggleTheme}
                    className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>
        </div>
    );
}

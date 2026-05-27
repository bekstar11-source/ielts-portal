import React from 'react';
import { ArrowLeft, Save, Play, Code, Layout } from 'lucide-react';

export const PodcastHeader = ({ 
    navigate, editId, isProMode, setIsProMode, handleSave, saving 
}) => (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors shrink-0">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-base md:text-lg font-bold tracking-tight">Spotify Podcast Creator</h1>
                    <p className="text-[9px] md:text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none mt-0.5">Admin Editorial Suite</p>
                </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start">
                <button 
                    onClick={() => setIsProMode(!isProMode)}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all border ${isProMode ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}
                >
                    {isProMode ? <Layout size={14} /> : <Code size={14} />}
                    {isProMode ? 'UI Mode' : 'Pro (JSON)'}
                </button>
                {editId && (
                    <button 
                        onClick={() => window.open(`/podcast/spotify/${editId}`, '_blank')}
                        className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-xs font-bold hover:bg-zinc-200 transition-all border border-zinc-200"
                    >
                        <Play size={14} fill="currentColor" /> Preview
                    </button>
                )}
                <div className="w-[1px] h-6 bg-zinc-200 mx-0.5 sm:mx-1"></div>
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 sm:px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95"
                >
                    {saving ? "Saving..." : <><Save size={16} /> Save</>}
                </button>
            </div>
        </div>
    </header>
);

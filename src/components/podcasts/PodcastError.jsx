import React from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PodcastError({ message, onRetry, isDark }) {
    const navigate = useNavigate();

    return (
        <div className={`flex flex-col items-center justify-center p-10 text-center min-h-[400px] rounded-2xl border transition-colors ${
            isDark 
                ? 'bg-[#121212] border-white/5 text-white' 
                : 'bg-white border-zinc-100 text-zinc-900 shadow-sm'
        }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'}`}>
                <AlertCircle size={32} />
            </div>
            
            <h2 className="text-2xl font-black mb-3">Something went wrong</h2>
            <p className={`max-w-md mb-8 text-[15px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {message || "We couldn't load the podcasts. Please check your internet connection and try again."}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                {onRetry && (
                    <button 
                        onClick={onRetry}
                        className="flex items-center justify-center gap-2 px-8 py-3 bg-[#1ed760] hover:bg-[#1db954] text-black font-bold rounded-full transition-all active:scale-95 shadow-lg"
                    >
                        <RefreshCcw size={18} />
                        Try Again
                    </button>
                )}
                <button 
                    onClick={() => navigate('/dashboard')}
                    className={`flex items-center justify-center gap-2 px-8 py-3 font-bold rounded-full transition-all active:scale-95 border ${
                        isDark 
                            ? 'border-white/20 text-white hover:bg-white/5' 
                            : 'border-zinc-200 text-zinc-900 hover:bg-zinc-50'
                    }`}
                >
                    <Home size={18} />
                    Go Home
                </button>
            </div>
        </div>
    );
}

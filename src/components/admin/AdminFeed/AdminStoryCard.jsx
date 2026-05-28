import React from 'react';
import { FaTrash } from 'react-icons/fa';
import { useTheme } from '../../../context/ThemeContext';

export default function AdminStoryCard({ story, onDelete }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const isExpired = story.expiresAt && story.expiresAt < new Date();

    return (
        <div 
            className={`rounded-3xl border overflow-hidden relative group aspect-[2/3] flex flex-col justify-between shadow-sm transition ${
                isDark ? 'bg-zinc-900 border-white/5 hover:border-white/10' : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
        >
            {/* Background media preview */}
            <div className="absolute inset-0 z-0 bg-black/10">
                {story.mediaType === 'text' ? (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center p-4 text-center">
                        <p className="text-white text-[10px] font-bold leading-relaxed line-clamp-6">{story.text}</p>
                    </div>
                ) : story.mediaType === 'video' ? (
                    <video src={story.mediaUrl} className="w-full h-full object-cover opacity-60" muted playsInline />
                ) : (
                    <img src={story.mediaUrl} alt="story preview" className="w-full h-full object-cover opacity-75" />
                )}
            </div>

            {/* Content info overlay */}
            <div className="relative z-10 p-3 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start">
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase text-white ${
                    isExpired ? 'bg-gray-600' : 'bg-emerald-600'
                }`}>
                    {isExpired ? "Eski" : "Faol"}
                </span>
                <button 
                    onClick={() => onDelete(story.id)}
                    className="p-1.5 rounded-lg bg-black/40 hover:bg-red-600 text-white transition pointer-events-auto"
                >
                    <FaTrash size={10} />
                </button>
            </div>

            <div className="relative z-10 p-3 bg-gradient-to-t from-black/95 via-black/40 to-transparent text-white space-y-1">
                <p className="text-[9px] text-white/50">
                    {story.createdAt instanceof Date ? story.createdAt.toLocaleDateString() : ''}
                </p>
                <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-bold line-clamp-1 flex-1">{story.text || 'Story Media'}</p>
                    {story.interactiveData && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-pink-500 to-yellow-500 rounded text-white shrink-0 uppercase">
                            {story.interactiveData.type}
                        </span>
                    )}
                </div>
                {story.ctaUrl && <p className="text-[8px] text-blue-400 font-bold truncate">🔗 {story.ctaText || 'CTA'}</p>}
            </div>
        </div>
    );
}

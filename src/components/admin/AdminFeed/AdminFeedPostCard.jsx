import React from 'react';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';
import { useTheme } from '../../../context/ThemeContext';

export default function AdminFeedPostCard({ post, onEdit, onDelete }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div 
            className={`p-5 rounded-3xl border flex justify-between items-start gap-4 transition shadow-sm ${
                isDark ? 'bg-[#1E1E1E] border-white/5 hover:border-white/10' : 'bg-white border-gray-200 hover:bg-gray-300'
            }`}
        >
            <div className="flex-1 flex gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                    isDark ? 'bg-white/5' : 'bg-gray-55 border border-gray-100'
                }`}>
                    {post.type === 'announcement' ? '📢' : '📝'}
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm md:text-base line-clamp-1">
                            {post.title || post.content?.slice(0, 40)}...
                        </h3>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            post.type === 'announcement' 
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 border-amber-500/20' 
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 border-blue-500/20'
                        }`}>
                            {post.type}
                        </span>
                        {post.mediaType === 'carousel' && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-purple-100 dark:bg-purple-900/30 text-purple-600 border-purple-500/20">
                                Karusel ({post.mediaUrls?.length || 0})
                            </span>
                        )}
                    </div>
                    <p className={`text-xs leading-relaxed line-clamp-2 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                        {post.content}
                    </p>
                    <div className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'} flex items-center gap-3`}>
                        <span>{post.createdAt instanceof Date ? post.createdAt.toLocaleString() : ''}</span>
                        <span>•</span>
                        <span>❤️ {post.likes?.length || 0} ta</span>
                        <span>•</span>
                        <span>💬 {post.commentsCount || 0} ta izoh</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={() => onEdit(post)}
                    className={`p-2.5 rounded-xl transition ${
                        isDark ? 'bg-white/5 hover:bg-blue-500/10 hover:text-blue-400' : 'bg-gray-55 border border-gray-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100'
                    }`}
                    title="Tahrirlash"
                >
                    <FaPencilAlt size={12} />
                </button>
                <button
                    onClick={() => onDelete(post.id)}
                    className={`p-2.5 rounded-xl transition ${
                        isDark ? 'bg-white/5 hover:bg-red-500/10 hover:text-red-500' : 'bg-gray-55 border border-gray-100 hover:bg-red-50 hover:text-red-600 hover:border-red-100'
                    }`}
                    title="O'chirish"
                >
                    <FaTrash size={12} />
                </button>
            </div>
        </div>
    );
}

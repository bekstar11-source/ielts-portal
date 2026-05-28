import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Trash2, ArrowRight, Play, BookOpen, Volume2, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import CommentsModal from './CommentsModal';
import { handleUniversalNavigate } from '../../utils/navigation';

export default function FeedPostCard({ post, user, userData, onLike, onCommentAdded, onDelete }) {
    const navigate = useNavigate();
    const [showComments, setShowComments] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const isLiked = post.likes?.includes(user?.uid);
    const likesCount = post.likes?.length || 0;
    const commentsCount = post.commentsCount || 0;
    const isAdmin = userData?.role === 'admin';

    // Format relative time (e.g. "3 soat oldin")
    const getRelativeTime = (date) => {
        if (!date) return "";
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Hozirgina";
        if (diffMins < 60) return `${diffMins} daqiqa oldin`;
        if (diffHours < 24) return `${diffHours} soat oldin`;
        return `${diffDays} kun oldin`;
    };

    const handleShare = () => {
        const shareUrl = window.location.origin + (post.ctaUrl || `/`);
        navigator.clipboard.writeText(shareUrl);
        toast.success("Havola buferga nusxalandi! 📋");
    };

    // Render type-specific badges or decorations
    const renderCardHeaderDecoration = () => {
        switch (post.type) {
            case 'test':
                return <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full">Test</span>;
            case 'podcast':
                return <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold px-2 py-0.5 rounded-full">Podcast</span>;
            case 'article':
                return <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">Maqola</span>;
            case 'announcement':
                return <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full">E'lon</span>;
            default:
                return null;
        }
    };

    // Render main body card based on content type
    const renderContentMedia = () => {
        if (post.type === 'announcement') {
            const announcementStyles = {
                warning: 'bg-orange-50 dark:bg-orange-950/10 border-orange-100 dark:border-orange-900/20 text-orange-950 dark:text-orange-200',
                danger: 'bg-red-50 dark:bg-red-950/10 border-red-100 dark:border-red-900/20 text-red-950 dark:text-red-200',
                success: 'bg-green-50 dark:bg-green-950/10 border-green-100 dark:border-green-900/20 text-green-950 dark:text-green-200',
                info: 'bg-blue-50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/20 text-blue-950 dark:text-blue-200',
            };

            const type = post.announcementType || 'info';
            return (
                <div className={`p-5 rounded-2xl border ${announcementStyles[type] || announcementStyles.info} mx-4 my-2 flex items-start gap-3`}>
                    <Megaphone className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-sm mb-1">{post.title}</h4>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    </div>
                </div>
            );
        }

        // For tests, articles, podcasts, or custom media
        const mediaUrls = post.mediaUrls || (post.mediaUrl ? [post.mediaUrl] : []);
        const hasCarousel = mediaUrls.length > 1;

        const handleNextImage = (e) => {
            e.stopPropagation();
            setCurrentImageIndex((prev) => (prev + 1) % mediaUrls.length);
        };

        const handlePrevImage = (e) => {
            e.stopPropagation();
            setCurrentImageIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
        };

        // Swipe support variables
        let touchStartX = 0;
        let touchEndX = 0;

        const handleTouchStart = (e) => {
            touchStartX = e.changedTouches[0].screenX;
        };

        const handleTouchEnd = (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        };

        const handleSwipe = () => {
            if (touchStartX - touchEndX > 50) {
                // Swipe left
                setCurrentImageIndex((prev) => (prev + 1) % mediaUrls.length);
            }
            if (touchEndX - touchStartX > 50) {
                // Swipe right
                setCurrentImageIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
            }
        };

        return (
            <div className="px-4 py-2 flex flex-col gap-3">
                {/* Media Image / Video / Carousel */}
                {mediaUrls.length > 0 && (
                    <div 
                        className="relative w-full aspect-video md:aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-800 border border-gray-100 dark:border-white/5 shadow-sm group/carousel"
                        onTouchStart={hasCarousel ? handleTouchStart : undefined}
                        onTouchEnd={hasCarousel ? handleTouchEnd : undefined}
                    >
                        {hasCarousel ? (
                            <>
                                {/* Swipeable Slides Container */}
                                <div className="w-full h-full relative overflow-hidden">
                                    <div 
                                        className="w-full h-full flex transition-transform duration-350 ease-out"
                                        style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                                    >
                                        {mediaUrls.map((url, idx) => (
                                            <div key={idx} className="w-full h-full flex-shrink-0">
                                                <img 
                                                    src={url} 
                                                    alt={`Post carousel ${idx}`} 
                                                    className="w-full h-full object-cover select-none" 
                                                    loading="lazy" 
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Navigation Arrows */}
                                <button
                                    onClick={handlePrevImage}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10 pointer-events-auto"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={handleNextImage}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10 pointer-events-auto"
                                >
                                    <ChevronRight size={16} />
                                </button>

                                {/* Dot Indicators */}
                                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10">
                                    {mediaUrls.map((_, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                idx === currentImageIndex ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/50'
                                            }`}
                                        />
                                    ))}
                                </div>

                                {/* Index Badge */}
                                <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/60 text-white text-[9px] font-bold tracking-wider z-10">
                                    {currentImageIndex + 1}/{mediaUrls.length}
                                </div>
                            </>
                        ) : (
                            post.mediaType === 'video' ? (
                                <video src={post.mediaUrl} controls className="w-full h-full object-cover" />
                            ) : (
                                <img src={post.mediaUrl} alt="Post content" className="w-full h-full object-cover animate-fade-in" loading="lazy" />
                            )
                        )}
                    </div>
                )}

                {/* Material Details Card */}
                {(post.type === 'test' || post.type === 'podcast' || post.type === 'article') && (
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-150 dark:border-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-gray-100 dark:border-white/5 flex items-center justify-center text-gray-500 dark:text-zinc-400">
                                {post.type === 'test' && <BookOpen size={20} className="text-blue-500" />}
                                {post.type === 'podcast' && <Volume2 size={20} className="text-purple-500" />}
                                {post.type === 'article' && <Play size={20} className="text-emerald-500" />}
                            </div>
                            <div>
                                <h4 className="font-bold text-xs md:text-sm text-gray-900 dark:text-white line-clamp-1">{post.title}</h4>
                                <p className="text-[10px] text-gray-400 dark:text-zinc-500 line-clamp-1 mt-0.5">{post.content || post.description || "Yangi IELTS materiali"}</p>
                            </div>
                        </div>
                        {post.ctaUrl && (
                            <button
                                onClick={() => handleUniversalNavigate(post.ctaUrl, navigate)}
                                className="flex items-center gap-1 bg-black dark:bg-white text-white dark:text-black font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl hover:scale-105 active:scale-95 transition-all"
                            >
                                {post.ctaText || "Boshlash"}
                                <ArrowRight size={10} />
                            </button>
                        )}
                    </div>
                )}

                {/* Caption / Text details for standard posts */}
                {post.type === 'post' && (
                    <div className="px-1 text-sm text-gray-800 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold mr-2 text-gray-900 dark:text-white">IELTS Portal Admin</span>
                        {post.content}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full bg-white dark:bg-[#09090b] border-b border-gray-150 dark:border-white/5 py-4 transition-colors">
            {/* Header */}
            <div className="flex justify-between items-center px-4 pb-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-xs font-black select-none">
                        IP
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-gray-900 dark:text-white">IELTS Portal Admin</span>
                            {renderCardHeaderDecoration()}
                        </div>
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-medium block mt-0.5">
                            {getRelativeTime(post.createdAt)}
                        </span>
                    </div>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => onDelete(post.id)}
                        className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {/* Content Area */}
            {renderContentMedia()}

            {/* Actions Bar */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onLike(post.id, isLiked)}
                        className="flex items-center gap-1.5 focus:outline-none transition group"
                    >
                        <Heart
                            size={20}
                            className={`transition-colors ${
                                isLiked 
                                    ? 'fill-red-500 text-red-500 scale-110' 
                                    : 'text-gray-500 dark:text-zinc-400 group-hover:text-red-500'
                            }`}
                        />
                        <span className="text-xs font-bold text-gray-600 dark:text-zinc-400">{likesCount}</span>
                    </button>

                    <button
                        onClick={() => setShowComments(true)}
                        className="flex items-center gap-1.5 focus:outline-none transition group"
                    >
                        <MessageCircle size={20} className="text-gray-500 dark:text-zinc-400 group-hover:text-blue-500" />
                        <span className="text-xs font-bold text-gray-600 dark:text-zinc-400">{commentsCount}</span>
                    </button>
                </div>

                <button
                    onClick={handleShare}
                    className="p-1 text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-white transition"
                >
                    <Share2 size={20} />
                </button>
            </div>

            {/* Comments Drawer/Modal */}
            <CommentsModal
                isOpen={showComments}
                onClose={() => setShowComments(false)}
                postId={post.id}
                user={user}
                userData={userData}
                onCommentAdded={onCommentAdded}
            />
        </div>
    );
}

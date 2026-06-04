import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Trash2, ArrowRight, Play, BookOpen, Volume2, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import CommentsModal from './CommentsModal';
import { handleUniversalNavigate, getCategoryUrl } from '../../utils/navigation';
import { db } from '../../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { usePodcast } from '../../context/PodcastContext';

export default function FeedPostCard({ post, user, userData, onLike, onCommentAdded, onDelete }) {
    const navigate = useNavigate();
    const [showComments, setShowComments] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [aspectRatio, setAspectRatio] = useState(() => {
        if (post.aspectRatio) return post.aspectRatio;
        if (post.mediaType === 'video') return 1.777;
        return 1.777; // Default to landscape instead of 4:3 to prevent initial tall stretching
    });
    const [showPodcastConfirm, setShowPodcastConfirm] = useState(false);

    const { setCurrentTrack, setIsExpanded, setIsPlaying } = usePodcast();

    const extractPodcastId = (ctaUrl) => {
        if (!ctaUrl) return null;
        const parts = ctaUrl.split('/');
        return parts[parts.length - 1];
    };

    const handlePodcastPlay = (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        setShowPodcastConfirm(true);
    };

    const confirmPodcastPlay = async () => {
        setShowPodcastConfirm(false);
        const podcastId = extractPodcastId(post.ctaUrl);
        if (!podcastId) {
            toast.error("Podcast ID topilmadi");
            return;
        }

        const loadingToast = toast.loading("Podcast yuklanmoqda...");
        try {
            const snap = await getDoc(doc(db, "podcasts", podcastId));
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() };
                setCurrentTrack(data);
                setIsExpanded(true);
                setIsPlaying(true);
                toast.dismiss(loadingToast);
            } else {
                toast.error("Podcast topilmadi", { id: loadingToast });
            }
        } catch (err) {
            console.error("Error loading podcast details:", err);
            toast.error("Podcastni yuklashda xatolik yuz berdi", { id: loadingToast });
        }
    };

    const getMaterialType = () => {
        if (post.type === 'test' || post.type === 'podcast' || post.type === 'article') {
            return post.type;
        }
        if (post.ctaUrl) {
            if (post.ctaUrl.includes('/podcast')) return 'podcast';
            if (post.ctaUrl.includes('/test')) return 'test';
            if (post.ctaUrl.includes('/article')) return 'article';
        }
        return null;
    };

    const materialType = getMaterialType();

    const getCleanCtaUrl = () => {
        if (!post.ctaUrl) return '';
        if (materialType === 'podcast' && post.ctaUrl.includes('/podcast/') && !post.ctaUrl.includes('/podcast/spotify/') && !post.ctaUrl.includes('/podcast/album/') && !post.ctaUrl.includes('/podcast/episode/')) {
            return post.ctaUrl.replace('/podcast/', '/podcast/spotify/');
        }
        return post.ctaUrl;
    };

    useEffect(() => {
        const mediaUrls = post.mediaUrls || (post.mediaUrl ? [post.mediaUrl] : []);
        if (mediaUrls.length === 0) return;

        const firstUrl = mediaUrls[0];
        if (post.mediaType === 'video') {
            setAspectRatio(1.777); // Default to 16:9 for video
            return;
        }

        if (post.aspectRatio) {
            setAspectRatio(post.aspectRatio);
            return;
        }

        const img = new Image();
        img.src = firstUrl;
        img.onload = () => {
            const ratio = img.naturalWidth / img.naturalHeight;
            // Clamp ratio between 0.8 (4:5 portrait) and 1.91 (16:8.4 landscape)
            const clampedRatio = Math.max(0.8, Math.min(1.91, ratio));
            setAspectRatio(clampedRatio);
        };
        img.onerror = () => {
            setAspectRatio(1.777); // Fallback to 1.777 landscape instead of 1.333
        };
    }, [post]);

    const isLiked = post.likes?.includes(user?.uid);
    const likesCount = post.likes?.length || 0;
    const commentsCount = post.commentsCount || 0;
    const isAdmin = userData?.role === 'admin';
    const isTeacherPost = post.type === 'teacher_test';
    const authorName = isTeacherPost ? (post.teacherName || "Sizning ustozingiz") : "IELTS Portal Admin";
    const authorInitials = isTeacherPost 
        ? (post.teacherName ? post.teacherName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : "US")
        : "IP";

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
        const type = materialType || post.type;
        switch (type) {
            case 'teacher_test':
                return <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full">Vazifa</span>;
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
        if (post.type === 'teacher_test') {
            const isExpired = post.deadline && new Date(post.deadline) < new Date();
            return (
                <div className="px-4 py-2 flex flex-col gap-3">
                    <div className="p-4 rounded-xl border border-indigo-150 dark:border-indigo-900/25 bg-indigo-50/15 dark:bg-indigo-950/10 flex flex-col gap-3 text-left">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-150 dark:border-indigo-900/30">
                                {post.testType === 'mock_full' ? 'Mock Exam' : post.testType?.toUpperCase()}
                            </span>
                            {post.deadline && (
                                <span className={`text-[9px] font-semibold ${isExpired ? 'text-rose-500 font-bold' : 'text-gray-400 dark:text-zinc-500'}`}>
                                    Muddat: {new Date(post.deadline).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        <h4 className="font-extrabold text-xs text-gray-800 dark:text-zinc-200 leading-snug">
                            {post.content || post.testTitle || 'Vazifa testi'}
                        </h4>
                        
                        <button
                            onClick={() => {
                                if (post.testType === 'mock_full') {
                                    navigate('/mock-exam', { state: { mockData: { id: post.testId, title: post.content, type: 'mock_full' } } });
                                } else {
                                    navigate(`/test/${post.testId}`);
                                }
                            }}
                            className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] py-2 rounded-lg active:scale-[0.98] transition-all shadow-sm shrink-0"
                        >
                            Vazifani bajarish
                            <ArrowRight size={12} />
                        </button>
                    </div>
                </div>
            );
        }

        if (post.type === 'announcement') {
            const announcementStyles = {
                warning: 'bg-orange-50 dark:bg-orange-950/10 border-orange-100 dark:border-orange-900/20 text-orange-950 dark:text-orange-200',
                danger: 'bg-red-50 dark:bg-red-950/10 border-red-100 dark:border-red-900/20 text-red-950 dark:text-red-200',
                success: 'bg-green-50 dark:bg-green-950/10 border-green-100 dark:border-green-900/20 text-green-950 dark:text-green-200',
                info: 'bg-blue-50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/20 text-blue-950 dark:text-blue-200',
            };

            const type = post.announcementType || 'info';
            return (
                <div className={`p-5 rounded-lg border ${announcementStyles[type] || announcementStyles.info} mx-4 my-2 flex items-start gap-3`}>
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

        const isMediaClickable = materialType && post.ctaUrl && post.mediaType !== 'video';

        return (
            <div className="px-4 py-2 flex flex-col gap-3">
                {/* Media Image / Video / Carousel */}
                {mediaUrls.length > 0 && (
                    <div 
                        onClick={
                            materialType === 'podcast'
                                ? handlePodcastPlay
                                : isMediaClickable
                                    ? () => handleUniversalNavigate(getCleanCtaUrl(), navigate, { fromNewsfeed: true })
                                    : undefined
                        }
                        className={`relative w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 border border-gray-100 dark:border-white/5 shadow-sm group/carousel transition-all ${
                            isMediaClickable ? 'cursor-pointer hover:shadow-md' : ''
                        }`}
                        style={{ aspectRatio: aspectRatio }}
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
                                <video 
                                    src={post.mediaUrl} 
                                    controls 
                                    className="w-full h-full object-cover" 
                                    onLoadedMetadata={(e) => {
                                        const { videoWidth, videoHeight } = e.target;
                                        if (videoWidth && videoHeight) {
                                            const ratio = videoWidth / videoHeight;
                                            const clampedRatio = Math.max(0.8, Math.min(1.91, ratio));
                                            setAspectRatio(clampedRatio);
                                        }
                                    }}
                                />
                            ) : (
                                <img src={post.mediaUrl} alt="Post content" className="w-full h-full object-cover animate-fade-in" loading="lazy" />
                            )
                        )}

                        {/* No overlays on top of the image (glassmorphism removed) */}
                    </div>
                )}

                {/* Attached Tests Carousel (Horizontal scrollable cards) */}
                {post.attachedTests && post.attachedTests.length > 0 ? (
                    <div className="w-full flex flex-col gap-1.5 mt-1 px-1">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block text-left">Tavsiya Etilgan Testlar</span>
                        <div className="w-full flex gap-3 overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory text-left">
                            {post.attachedTests.map((test) => {
                                const categoryUrl = getCategoryUrl(test);
                                return (
                                    <div 
                                        key={test.id}
                                        onClick={() => handleUniversalNavigate(categoryUrl, navigate)}
                                        className="min-w-[210px] max-w-[210px] p-3 rounded-lg border border-gray-150 dark:border-white/5 bg-gray-50/60 dark:bg-zinc-900/40 hover:bg-gray-50 dark:hover:bg-zinc-900/85 hover:border-gray-200 dark:hover:border-white/10 hover:shadow-sm cursor-pointer transition-all duration-200 snap-center flex flex-col justify-between gap-3 group/test-card"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                                                    {test.type || 'Test'}
                                                </span>
                                                <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-medium">
                                                    {test.difficulty || 'Medium'}
                                                </span>
                                            </div>
                                            <h4 className="font-extrabold text-xs text-gray-800 dark:text-zinc-200 line-clamp-2 leading-snug group-hover/test-card:text-blue-500 dark:group-hover/test-card:text-blue-400 transition-colors">
                                                {test.title}
                                            </h4>
                                        </div>
                                        
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleUniversalNavigate(categoryUrl, navigate);
                                            }}
                                            className="w-full flex items-center justify-center gap-1.5 bg-[#0066cc] dark:bg-[#3894ff] hover:bg-[#0055aa] dark:hover:bg-[#1a7ddb] text-white font-bold text-[9px] py-1.5 rounded-md active:scale-[0.98] transition-all shadow-sm shrink-0"
                                        >
                                            {post.ctaText || "Testni bajarish"}
                                            <ArrowRight size={10} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : materialType && (
                    <div 
                        onClick={
                            materialType === 'podcast'
                                ? handlePodcastPlay
                                : post.ctaUrl
                                    ? () => handleUniversalNavigate(getCleanCtaUrl(), navigate, { fromNewsfeed: true })
                                    : undefined
                        }
                        className={`flex items-center justify-between py-2.5 px-4 rounded-lg border transition-all duration-200 group/material-card ${
                            post.ctaUrl 
                                ? 'cursor-pointer bg-gray-55/60 hover:bg-gray-55 dark:bg-zinc-900/45 dark:hover:bg-zinc-900/85 active:scale-[0.995] border-gray-100 dark:border-white/5 hover:border-gray-150 dark:hover:border-white/10 hover:shadow-sm' 
                                : 'bg-gray-55/30 dark:bg-zinc-900/20 border-gray-100 dark:border-white/5'
                        }`}
                    >
                        <div className="min-w-0 flex-1 pr-3">
                            <h4 className="font-bold text-xs text-gray-800 dark:text-zinc-200 line-clamp-1 group-hover/material-card:text-blue-500 dark:group-hover/material-card:text-blue-400 transition-colors">
                                {post.title || (materialType === 'podcast' ? 'Podcast' : materialType === 'test' ? 'Test' : 'Maqola')}
                            </h4>
                            <p className="text-[10px] text-gray-400 dark:text-zinc-500 line-clamp-1 mt-0.5">
                                {post.description || (materialType === 'podcast' ? 'IELTS Podcast tinglang va mashqlarni bajaring' : materialType === 'test' ? 'IELTS testini yeching' : 'IELTS maqolasini o\'qing')}
                            </p>
                        </div>
                        {post.ctaUrl && (
                            <button
                                onClick={
                                    materialType === 'podcast'
                                        ? handlePodcastPlay
                                        : (e) => {
                                            e.stopPropagation();
                                            handleUniversalNavigate(getCleanCtaUrl(), navigate, { fromNewsfeed: true });
                                        }
                                }
                                className="flex items-center gap-1 bg-[#0066cc] dark:bg-[#3894ff] hover:bg-[#0055aa] dark:hover:bg-[#1a7ddb] text-white font-medium text-[9px] px-2.5 py-1 rounded-md active:scale-95 transition-all shadow-sm flex-shrink-0"
                            >
                                {materialType === 'test' 
                                    ? 'Testni bajarish' 
                                    : materialType === 'podcast' 
                                        ? 'Podcastni tinglash' 
                                        : 'Maqolani o\'qish'}
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
                        {authorInitials}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-gray-900 dark:text-white">{authorName}</span>
                            {renderCardHeaderDecoration()}
                        </div>
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-medium block mt-0.5">
                            {getRelativeTime(post.createdAt)}
                        </span>
                    </div>
                </div>

                {(isAdmin || (isTeacherPost && (post.teacherId === user?.uid || userData?.role === 'teacher'))) && (
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

            {/* Podcast Confirm Modal */}
            <AnimatePresence>
                {showPodcastConfirm && (
                    <div className="fixed inset-0 flex items-center justify-center z-[110] p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPodcastConfirm(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="relative bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-2xl w-full max-w-[300px] text-center border border-[#E4E2E3]/30 dark:border-zinc-800 z-10"
                        >
                            <h3 className="text-lg font-bold mb-1 text-[#161616] dark:text-white tracking-tight">Podcast</h3>
                            <p className="text-xs font-medium text-[#A8AAAC] dark:text-zinc-400 mb-5 px-2 leading-relaxed">
                                Podcastni eshitishni xohlaysizmi?
                            </p>
                            <div className="flex gap-2.5">
                                <button 
                                    onClick={() => setShowPodcastConfirm(false)} 
                                    className="flex-1 py-2.5 rounded-xl font-bold text-[#A8AAAC] dark:text-zinc-400 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 transition-all duration-300 text-xs"
                                >
                                    Yo'q
                                </button>
                                <button 
                                    onClick={confirmPodcastPlay} 
                                    className="flex-1 py-2.5 rounded-xl font-bold text-white bg-[#161616] dark:bg-white dark:text-black hover:bg-black dark:hover:bg-zinc-200 transition-all duration-300 text-xs shadow-lg shadow-black/10 dark:shadow-white/5 active:scale-[0.98]"
                                >
                                    Ha
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

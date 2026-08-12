import React, { useEffect, useRef } from 'react';
import { useNewsFeed } from '../../hooks/dashboard/useNewsFeed';
import FeedPostCard from './FeedPostCard';
import StoriesContainer from './StoriesContainer';
import { db } from '../../firebase/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export default function NewsFeed({ user, userData, assignments, groupIds = [], spotlight = null }) {
    const {
        posts, loading, loadingMore, hasMore,
        fetchNextPage, handleLike, handleCommentAdded, handlePostDeleted
    } = useNewsFeed(user, userData, groupIds);

    const loaderRef = useRef(null);

    // Infinite Scroll IntersectionObserver
    useEffect(() => {
        if (loading || !hasMore) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !loadingMore) {
                fetchNextPage();
            }
        }, {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        });

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => {
            if (loaderRef.current) {
                observer.unobserve(loaderRef.current);
            }
        };
    }, [loaderRef, loading, loadingMore, hasMore]);

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Haqiqatan ham ushbu postni Feeddan o'chirmoqchimisiz?")) return;
        try {
            await deleteDoc(doc(db, 'feed_posts', postId));
            handlePostDeleted(postId);
        } catch (err) {
            console.error("Error deleting post:", err);
            alert("Postni o'chirishda xatolik yuz berdi.");
        }
    };

    // Feed Loading Skeletons
    const renderSkeletons = () => (
        <div className="space-y-6 px-4 w-full max-w-[470px]">
            {[1, 2].map((i) => (
                <div key={i} className="bg-warm-canvas dark:bg-warm-dark-elevated rounded-2xl border border-warm-hairline dark:border-white/5 p-4 space-y-4 animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-warm-surface dark:bg-white/10" />
                        <div className="space-y-2">
                            <div className="w-24 h-3 bg-warm-surface dark:bg-white/10 rounded" />
                            <div className="w-16 h-2 bg-warm-surface dark:bg-white/10 rounded" />
                        </div>
                    </div>
                    <div className="w-full aspect-video bg-warm-surface dark:bg-white/10 rounded-2xl" />
                    <div className="flex gap-4">
                        <div className="w-12 h-4 bg-warm-surface dark:bg-white/10 rounded" />
                        <div className="w-12 h-4 bg-warm-surface dark:bg-white/10 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="w-full max-w-[630px] mx-auto bg-warm-canvas dark:bg-warm-dark min-h-screen pb-16 transition-colors flex flex-col items-start">
            {/* Top Stories */}
            <div className="w-[calc(100%+2rem)] -mx-4 md:w-full md:mx-0 lg:-ml-20 lg:w-[calc(100%+80px)] border-b border-warm-hairline dark:border-white/5 md:border-none">
                <StoriesContainer user={user} userData={userData} />
            </div>

            {/* Spotlight: aksiyalar + savol parchalari (stories bilan feed orasida) */}
            {spotlight && (
                <div className="w-full max-w-[470px] mt-4">
                    {spotlight}
                </div>
            )}

            {/* Posts Stream */}
            <div className={`mt-2 w-full max-w-[470px] divide-y divide-warm-hairline dark:divide-white/5 ${!loading ? 'animate-fade-in' : 'opacity-0'}`}>
                {posts.map(post => (
                    <FeedPostCard
                        key={post.id}
                        post={post}
                        user={user}
                        userData={userData}
                        assignments={assignments}
                        onLike={handleLike}
                        onCommentAdded={() => handleCommentAdded(post.id)}
                        onDelete={handleDeletePost}
                    />
                ))}
            </div>

            {/* Bottom State Indicator */}
            {loading && posts.length === 0 && renderSkeletons()}

            {!loading && posts.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center p-12 text-warm-muted-soft dark:text-warm-on-dark-soft min-h-[40vh] w-full max-w-[470px]">
                    <span className="text-sm font-medium">Hozircha hech qanday yangiliklar yo'q.</span>
                </div>
            )}

            {hasMore && (
                <div ref={loaderRef} className="py-8 flex justify-center items-center w-full max-w-[470px]">
                    <div className="w-6 h-6 border-2 border-warm-primary border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {!hasMore && posts.length > 0 && (
                <div className="py-12 text-center text-xs text-warm-muted-soft dark:text-warm-on-dark-soft font-medium w-full max-w-[470px]">
                    Siz barcha yangiliklarni ko'rib bo'ldingiz ✨
                </div>
            )}
        </div>
    );
}

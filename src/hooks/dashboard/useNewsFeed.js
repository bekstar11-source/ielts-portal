import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/firebase';
import { 
    collection, query, orderBy, limit, startAfter, getDocs, 
    doc, updateDoc, arrayUnion, arrayRemove, increment 
} from 'firebase/firestore';

const PAGE_SIZE = 5;

export function useNewsFeed(user, userData, groupIds = []) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    
    const lastDocRef = useRef(null);

    const fetchPosts = async (isRefresh = false) => {
        if (isRefresh) {
            setLoading(true);
            lastDocRef.current = null;
            setHasMore(true);
        } else {
            setLoadingMore(true);
        }

        try {
            let q = query(
                collection(db, 'feed_posts'),
                orderBy('createdAt', 'desc'),
                limit(PAGE_SIZE)
            );

            if (!isRefresh && lastDocRef.current) {
                q = query(
                    collection(db, 'feed_posts'),
                    orderBy('createdAt', 'desc'),
                    startAfter(lastDocRef.current),
                    limit(PAGE_SIZE)
                );
            }

            const snap = await getDocs(q);
            
            if (snap.empty) {
                setHasMore(false);
                if (isRefresh) setPosts([]);
            } else {
                const fetchedPosts = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    createdAt: d.data().createdAt?.seconds ? new Date(d.data().createdAt.seconds * 1000) : new Date()
                }));

                const allGroupIds = new Set([
                    ...(groupIds || []),
                    ...(userData?.groupId && userData.groupId !== 'none' ? [userData.groupId] : [])
                ]);
                const filteredPosts = fetchedPosts.filter(post => {
                    if (!post.groupId) return true;
                    return allGroupIds.has(post.groupId);
                });

                lastDocRef.current = snap.docs[snap.docs.length - 1];
                
                if (snap.docs.length < PAGE_SIZE) {
                    setHasMore(false);
                }

                if (isRefresh) {
                    setPosts(filteredPosts);
                } else {
                    setPosts(prev => {
                        // Avoid duplicates
                        const existingIds = new Set(prev.map(p => p.id));
                        const uniqueNew = filteredPosts.filter(p => !existingIds.has(p.id));
                        return [...prev, ...uniqueNew];
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching news feed:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchPosts(true);
    }, [user, userData?.groupId, groupIds.join(',')]);

    const handleLike = async (postId, isLiked) => {
        if (!user) return;
        
        // Optimistic UI update
        setPosts(prev => prev.map(post => {
            if (post.id === postId) {
                const currentLikes = post.likes || [];
                const updatedLikes = isLiked 
                    ? currentLikes.filter(uid => uid !== user.uid)
                    : [...currentLikes, user.uid];
                return { ...post, likes: updatedLikes };
            }
            return post;
        }));

        try {
            const postRef = doc(db, 'feed_posts', postId);
            await updateDoc(postRef, {
                likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
            });
        } catch (error) {
            console.error("Error toggling like:", error);
            // Revert on error
            setPosts(prev => prev.map(post => {
                if (post.id === postId) {
                    const currentLikes = post.likes || [];
                    const updatedLikes = isLiked 
                        ? [...currentLikes, user.uid]
                        : currentLikes.filter(uid => uid !== user.uid);
                    return { ...post, likes: updatedLikes };
                }
                return post;
            }));
        }
    };

    const handleCommentAdded = (postId) => {
        // Increment commentsCount in UI state
        setPosts(prev => prev.map(post => {
            if (post.id === postId) {
                return { ...post, commentsCount: (post.commentsCount || 0) + 1 };
            }
            return post;
        }));
    };

    const handlePostDeleted = (postId) => {
        setPosts(prev => prev.filter(post => post.id !== postId));
    };

    return {
        posts,
        loading,
        loadingMore,
        hasMore,
        fetchNextPage: () => {
            if (!loading && !loadingMore && hasMore) {
                fetchPosts(false);
            }
        },
        refreshFeed: () => fetchPosts(true),
        handleLike,
        handleCommentAdded,
        handlePostDeleted
    };
}

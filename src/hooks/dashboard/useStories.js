import { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export function useStories(user) {
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewedStoryIds, setViewedStoryIds] = useState(new Set());

    const getStorageKey = () => user ? `viewed_stories_${user.uid}` : 'viewed_stories_guest';

    // Fetch stories
    useEffect(() => {
        const fetchStories = async () => {
            setLoading(true);
            try {
                // Fetch all stories sorted by creation date
                const q = query(
                    collection(db, 'stories'),
                    orderBy('createdAt', 'desc')
                );
                
                const snap = await getDocs(q);
                const fetchedStories = snap.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        ...data,
                        createdAt: data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date(),
                        expiresAt: data.expiresAt?.seconds ? new Date(data.expiresAt.seconds * 1000) : null,
                    };
                });

                // Filter out inactive and expired stories on the client side
                const now = new Date();
                const activeStories = fetchedStories.filter(story => {
                    if (story.active === false) return false;
                    if (!story.expiresAt) return true;
                    return story.expiresAt > now;
                });

                setStories(activeStories);
            } catch (error) {
                console.error("Error fetching stories:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStories();

        // Load viewed stories from local storage
        try {
            const cached = localStorage.getItem(getStorageKey());
            if (cached) {
                setViewedStoryIds(new Set(JSON.parse(cached)));
            }
        } catch (e) {
            console.error("Error loading viewed stories from cache:", e);
        }
    }, [user]);

    const markStoryAsViewed = (storyId) => {
        if (!storyId) return;
        setViewedStoryIds(prev => {
            const next = new Set(prev);
            next.add(storyId);
            try {
                localStorage.setItem(getStorageKey(), JSON.stringify(Array.from(next)));
            } catch (e) {
                console.error("Error saving viewed story to cache:", e);
            }
            return next;
        });
    };

    return {
        stories,
        loading,
        viewedStoryIds,
        markStoryAsViewed
    };
}

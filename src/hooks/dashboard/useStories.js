import { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, query, where, getDocs, orderBy, doc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

export function useStories(user) {
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewedStoryIds, setViewedStoryIds] = useState(new Set());
    const [userVotes, setUserVotes] = useState({});

    const getStorageKey = () => user ? `viewed_stories_${user.uid}` : 'viewed_stories_guest';

    // Fetch stories and votes
    useEffect(() => {
        const fetchStoriesAndVotes = async () => {
            setLoading(true);
            try {
                // Fetch active stories sorted by creation date
                const q = query(
                    collection(db, 'stories'),
                    where('active', '==', true),
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

                // Filter out expired stories on the client side
                const now = new Date();
                const activeStories = fetchedStories.filter(story => {
                    if (!story.expiresAt) return true;
                    return story.expiresAt > now;
                });

                setStories(activeStories);

                // Fetch user's votes only for these active stories (chunked by 30 to support 'in' query)
                if (user && activeStories.length > 0) {
                    const activeStoryIds = activeStories.map(s => s.id);
                    const votesMap = {};
                    const CHUNK_SIZE = 30;
                    const chunks = [];
                    for (let i = 0; i < activeStoryIds.length; i += CHUNK_SIZE) {
                        chunks.push(activeStoryIds.slice(i, i + CHUNK_SIZE));
                    }

                    const chunkSnapshots = await Promise.all(
                        chunks.map(chunk => 
                            getDocs(query(
                                collection(db, 'story_responses'),
                                where('userId', '==', user.uid),
                                where('storyId', 'in', chunk)
                            ))
                        )
                    );

                    chunkSnapshots.forEach(votesSnap => {
                        votesSnap.forEach(d => {
                            const data = d.data();
                            votesMap[data.storyId] = data.votedOption;
                        });
                    });
                    
                    setUserVotes(votesMap);
                } else {
                    setUserVotes({});
                }
            } catch (error) {
                console.error("Error fetching stories:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStoriesAndVotes();

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

    const submitVote = async (storyId, optionIdx, isCorrect) => {
        if (!user) return;

        // Optimistic UI Update
        setUserVotes(prev => ({
            ...prev,
            [storyId]: optionIdx
        }));

        setStories(prev => prev.map(story => {
            if (story.id === storyId && story.interactiveData) {
                const currentVotes = { ...(story.interactiveData.votes || {}) };
                const prevCount = currentVotes[optionIdx] || 0;
                currentVotes[optionIdx] = prevCount + 1;
                return {
                    ...story,
                    interactiveData: {
                        ...story.interactiveData,
                        votes: currentVotes
                    }
                };
            }
            return story;
        }));

        try {
            // 1. Save response
            await setDoc(doc(db, 'story_responses', `${user.uid}_${storyId}`), {
                userId: user.uid,
                storyId,
                votedOption: optionIdx,
                isCorrect,
                createdAt: serverTimestamp()
            });

            // 2. Increment count in story doc
            await updateDoc(doc(db, 'stories', storyId), {
                [`interactiveData.votes.${optionIdx}`]: increment(1)
            });
        } catch (error) {
            console.error("Error submitting story vote:", error);
        }
    };

    return {
        stories,
        loading,
        viewedStoryIds,
        markStoryAsViewed,
        userVotes,
        submitVote
    };
}

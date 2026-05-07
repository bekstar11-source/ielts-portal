// src/context/PodcastContext.jsx
import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, addDoc, deleteDoc, doc, query, where, getDocs, onSnapshot, updateDoc, increment, setDoc } from "firebase/firestore";

const PodcastContext = createContext();

export const usePodcast = () => useContext(PodcastContext);

export const PodcastProvider = ({ children }) => {
    const audioRef = useRef(null);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.7);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [repeat, setRepeat] = useState(false);
    const [shuffle, setShuffle] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // Global player expansion state
    const [likedPodcasts, setLikedPodcasts] = useState([]); // Array of podcast IDs
    const youtubePlayerRef = useRef(null); // Global ref for YouTube player

    // Fetch Likes for a user
    const fetchUserLikes = (userId) => {
        if (!userId) {
            setLikedPodcasts([]);
            return;
        }
        const q = query(collection(db, "podcastLikes"), where("userId", "==", userId));
        return onSnapshot(q, (snapshot) => {
            const likedIds = snapshot.docs.map(doc => doc.data().podcastId);
            setLikedPodcasts(likedIds);
        });
    };

    const toggleLike = async (userId, podcastId) => {
        if (!userId || !podcastId) return;

        const isLiked = likedPodcasts.includes(podcastId);
        const likeDocId = `${userId}_${podcastId}`;
        const likeRef = doc(db, "podcastLikes", likeDocId);
        const podcastRef = doc(db, "podcasts", podcastId);

        try {
            if (isLiked) {
                // Unlike
                await deleteDoc(likeRef);
                await updateDoc(podcastRef, { likesCount: increment(-1) }).catch(() => {});
            } else {
                // Like
                await setDoc(likeRef, {
                    userId,
                    podcastId,
                    createdAt: new Date()
                });
                await updateDoc(podcastRef, { likesCount: increment(1) }).catch(() => {});
            }
        } catch (e) {
            console.error("Error toggling like:", e);
        }
    };

    // Persist state to localStorage
    useEffect(() => {
        const saved = localStorage.getItem('last_played_podcast');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                // Vaqtincha o'chirildi: har doim boshidan boshlansin
                setCurrentTrack(data.track);
                setCurrentTime(0);
            } catch (e) { console.error("Error loading saved podcast", e); }
        }
    }, []);

    useEffect(() => {
        if (currentTrack) {
            localStorage.setItem('last_played_podcast', JSON.stringify({
                track: currentTrack,
                time: currentTime,
                timestamp: Date.now()
            }));
        }
    }, [currentTrack, currentTime]);

    // Audio Playback Sync
    useEffect(() => {
        if (!audioRef.current || !currentTrack) return;
        
        audioRef.current.playbackRate = playbackRate;
        if (isPlaying) {
            audioRef.current.play().catch(e => console.log("Playback interaction required"));
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying, currentTrack, playbackRate]);

    const playTrack = (track) => {
        if (currentTrack?.id === track.id) {
            setIsPlaying(!isPlaying);
        } else {
            setCurrentTrack(track);
            setIsPlaying(true);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current && currentTrack?.mediaType !== 'youtube') {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
            audioRef.current.playbackRate = playbackRate;
            
            // Resume feature vaqtincha o'chirildi
            audioRef.current.currentTime = 0;
        }
    };

    const handleSeek = (time) => {
        if (currentTrack?.mediaType === 'youtube' && youtubePlayerRef.current?.seekTo) {
            youtubePlayerRef.current.seekTo(time, true);
        } else if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
        setCurrentTime(time);
    };

    const toggleMute = () => {
        if (isMuted) {
            if (audioRef.current) audioRef.current.volume = volume;
            setIsMuted(false);
        } else {
            if (audioRef.current) audioRef.current.volume = 0;
            setIsMuted(true);
        }
    };

    const updateVolume = (newVolume) => {
        setVolume(newVolume);
        if (audioRef.current) audioRef.current.volume = newVolume;
        if (newVolume > 0) setIsMuted(false);
    };

    const updatePlaybackRate = (rate) => {
        setPlaybackRate(rate);
        if (audioRef.current) audioRef.current.playbackRate = rate;
    };

    return (
        <PodcastContext.Provider value={{
            currentTrack, setCurrentTrack,
            isPlaying, setIsPlaying,
            currentTime, setCurrentTime,
            duration, setDuration,
            volume, setVolume,
            isMuted, setIsMuted,
            repeat, setRepeat,
            shuffle, setShuffle,
            isExpanded, setIsExpanded,
            likedPodcasts, fetchUserLikes, toggleLike,
            youtubePlayerRef,
            playbackRate, updatePlaybackRate,
            playTrack,
            handleSeek,
            toggleMute,
            updateVolume,
            audioRef
        }}>
            {children}
            {currentTrack && (currentTrack.mediaType !== 'youtube' || currentTrack.audioUrl) && (
                currentTrack.mediaType === 'video' ? (
                    <video 
                        ref={audioRef}
                        src={currentTrack.audioUrl}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => setIsPlaying(false)}
                        style={{ display: 'none' }}
                    />
                ) : (
                    <audio 
                        ref={audioRef}
                        src={currentTrack.audioUrl}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => setIsPlaying(false)}
                        style={{ display: 'none' }}
                    />
                )
            )}
        </PodcastContext.Provider>
    );
};

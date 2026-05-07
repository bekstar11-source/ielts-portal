// src/context/PodcastContext.jsx
import React, { createContext, useContext, useState, useRef, useEffect } from "react";

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
    const [isExpanded, setIsExpanded] = useState(false);

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
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
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

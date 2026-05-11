import { useEffect, useRef } from "react";

export function useYouTubeBridge(podcast, isOpen, setIsPlaying, setCurrentTime, setDuration, currentTime, youtubePlayerRef, isPlaying) {
    // We now use the global youtubePlayerRef passed from PodcastContext
    let interval;

    useEffect(() => {
        if (!podcast || podcast.mediaType !== 'youtube') return;

        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        const startInterval = () => {
            if (interval) clearInterval(interval);
            interval = setInterval(() => {
                if (youtubePlayerRef.current && typeof youtubePlayerRef.current.getCurrentTime === 'function') {
                    const state = youtubePlayerRef.current.getPlayerState();
                    if (state === window.YT.PlayerState.PLAYING || state === window.YT.PlayerState.PAUSED) {
                        const time = youtubePlayerRef.current.getCurrentTime();
                        if (time !== undefined) setCurrentTime(time);
                        
                        const d = youtubePlayerRef.current.getDuration();
                        if (d && d > 0) setDuration(d);
                    }
                }
            }, 200);
        };

        const initPlayer = () => {
            youtubePlayerRef.current = new window.YT.Player('youtube-player-iframe', {
                videoId: podcast.youtubeId,
                playerVars: {
                    autoplay: 0,
                    modestbranding: 1,
                    rel: 0,
                    enablejsapi: 1,
                    origin: window.location.origin
                },
                events: {
                    onReady: (event) => {
                        const d = event.target.getDuration();
                        if (d) setDuration(d);
                        // Only play if isPlaying is already true
                        if (isPlaying) {
                            event.target.playVideo();
                        }
                    },
                    onStateChange: (event) => {
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            setIsPlaying(true);
                            const d = event.target.getDuration();
                            if (d) setDuration(d);
                        } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
                            setIsPlaying(false);
                        }
                    }
                }
            });
            youtubePlayerRef.current.loadedVideoId = podcast.youtubeId;
            startInterval();
        };

        if (window.YT && window.YT.Player) {
            // Check if THIS video is already loaded in THIS player instance
            if (youtubePlayerRef.current && youtubePlayerRef.current.loadedVideoId === podcast.youtubeId) {
                startInterval();
                return;
            }

            if (youtubePlayerRef.current && typeof youtubePlayerRef.current.loadVideoById === 'function') {
                // Different video, load it
                youtubePlayerRef.current.loadVideoById(podcast.youtubeId);
                // setIsPlaying(true); // Don't auto-play on load
                setCurrentTime(0);
                setDuration(0);
                youtubePlayerRef.current.loadedVideoId = podcast.youtubeId;
                startInterval();
            } else {
                initPlayer();
            }
        } else {
            window.onYouTubeIframeAPIReady = initPlayer;
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [podcast?.youtubeId, setIsPlaying, setCurrentTime, setDuration, isPlaying]);

    const handleYoutubeSeek = (time) => {
        if (youtubePlayerRef.current && youtubePlayerRef.current.seekTo) {
            youtubePlayerRef.current.seekTo(time, true);
        }
    };

    const syncYoutubeState = (isPlaying) => {
        if (!youtubePlayerRef.current || !youtubePlayerRef.current.getPlayerState) return;
        const state = youtubePlayerRef.current.getPlayerState();
        if (isPlaying && state !== window.YT.PlayerState.PLAYING) {
            youtubePlayerRef.current.playVideo();
        } else if (!isPlaying && state === window.YT.PlayerState.PLAYING) {
            youtubePlayerRef.current.pauseVideo();
        }
    };

    return { ytPlayerRef: youtubePlayerRef, handleYoutubeSeek, syncYoutubeState };
}

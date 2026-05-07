import { useEffect, useRef } from "react";

export function useYouTubeBridge(podcast, isOpen, setIsPlaying, setCurrentTime, setDuration, currentTime, youtubePlayerRef) {
    // We now use the global youtubePlayerRef passed from PodcastContext

    useEffect(() => {
        if (!podcast || podcast.mediaType !== 'youtube') return;

        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        let interval;

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
                    autoplay: 1,
                    modestbranding: 1,
                    rel: 0
                },
                events: {
                    onReady: (event) => {
                        const d = event.target.getDuration();
                        if (d) setDuration(d);
                        event.target.playVideo();
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
            startInterval();
        };

        if (window.YT && window.YT.Player) {
            if (youtubePlayerRef.current && typeof youtubePlayerRef.current.loadVideoById === 'function') {
                // If player exists, just load the new video
                youtubePlayerRef.current.loadVideoById(podcast.youtubeId);
                setIsPlaying(true);
                setCurrentTime(0);
                setDuration(0); // Reset duration to avoid flicker
                startInterval(); // CRITICAL: Restart interval for the new video
            } else {
                initPlayer();
            }
        } else {
            window.onYouTubeIframeAPIReady = initPlayer;
        }

        return () => {
            clearInterval(interval);
            // Don't destroy the player on unmount if we want background play
            // Actually, we keep it alive because InteractivePlayer stays mounted.
        };
    }, [podcast?.youtubeId, setIsPlaying, setCurrentTime, setDuration]);

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

import { useEffect, useRef } from "react";

export function useYouTubeBridge(podcast, isOpen, setIsPlaying, setCurrentTime, setDuration, currentTime) {
    const ytPlayerRef = useRef(null);

    useEffect(() => {
        if (!podcast || podcast.mediaType !== 'youtube' || !isOpen) return;

        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        let interval;

        const initPlayer = () => {
            ytPlayerRef.current = new window.YT.Player('youtube-player-iframe', {
                events: {
                    onReady: (event) => {
                        const d = event.target.getDuration();
                        if (d) setDuration(d);
                        
                        // Seek to saved position if available
                        if (currentTime > 0) {
                            event.target.seekTo(currentTime, true);
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

            interval = setInterval(() => {
                if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
                    const state = ytPlayerRef.current.getPlayerState();
                    if (state === window.YT.PlayerState.PLAYING || state === window.YT.PlayerState.PAUSED) {
                        const time = ytPlayerRef.current.getCurrentTime();
                        if (time !== undefined) setCurrentTime(time);
                        
                        const d = ytPlayerRef.current.getDuration();
                        if (d && d > 0) setDuration(d);
                    }
                }
            }, 200);
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            window.onYouTubeIframeAPIReady = initPlayer;
        }

        return () => {
            clearInterval(interval);
            if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
                ytPlayerRef.current.destroy();
            }
        };
    }, [podcast?.youtubeId, isOpen, setIsPlaying, setCurrentTime, setDuration]);

    const handleYoutubeSeek = (time) => {
        if (ytPlayerRef.current && ytPlayerRef.current.seekTo) {
            ytPlayerRef.current.seekTo(time, true);
        }
    };

    const syncYoutubeState = (isPlaying) => {
        if (!ytPlayerRef.current || !ytPlayerRef.current.getPlayerState) return;
        const state = ytPlayerRef.current.getPlayerState();
        if (isPlaying && state !== window.YT.PlayerState.PLAYING) {
            ytPlayerRef.current.playVideo();
        } else if (!isPlaying && state === window.YT.PlayerState.PLAYING) {
            ytPlayerRef.current.pauseVideo();
        }
    };

    return { ytPlayerRef, handleYoutubeSeek, syncYoutubeState };
}

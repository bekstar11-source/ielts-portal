import { useEffect, useRef, useCallback } from "react";
import { getResumeTime } from "../../utils/podcastProgress";

export function useYouTubeBridge(podcast, isOpen, setIsPlaying, setCurrentTime, setDuration, currentTime, youtubePlayerRef, isPlaying, setIsLoading, onEnded) {
    const intervalRef = useRef(null);

    const startInterval = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            if (youtubePlayerRef.current && typeof youtubePlayerRef.current.getCurrentTime === 'function') {
                try {
                    const state = youtubePlayerRef.current.getPlayerState();
                    if (state === window.YT.PlayerState.PLAYING || state === window.YT.PlayerState.PAUSED) {
                        const time = youtubePlayerRef.current.getCurrentTime();
                        if (time !== undefined && typeof time === 'number') setCurrentTime(time);
                        
                        const d = youtubePlayerRef.current.getDuration();
                        if (d && d > 0) setDuration(d);
                    }
                } catch (e) {
                    // Ignore errors during state polling
                }
            }
        }, 500); // Polling every 500ms is enough and safer
    }, [setCurrentTime, setDuration, youtubePlayerRef]);

    const initPlayer = useCallback(() => {
        if (!podcast || podcast.mediaType !== 'youtube') return;
        
        // Ensure the target element exists
        const target = document.getElementById('youtube-player-iframe');
        if (!target) return;

        youtubePlayerRef.current = new window.YT.Player('youtube-player-iframe', {
            videoId: podcast.youtubeId,
            playerVars: {
                autoplay: isPlaying ? 1 : 0,
                modestbranding: 1,
                rel: 0,
                enablejsapi: 1,
                origin: window.location.origin,
                widget_referrer: window.location.href
            },
            events: {
                onReady: (event) => {
                    const d = event.target.getDuration();
                    if (d) setDuration(d);

                    // Saqlangan joydan davom ettirish — avval bu faqat oddiy audio
                    // epizodlarda ishlab, YouTube epizodlari doim boshidan boshlanardi.
                    const resumeAt = getResumeTime(podcast.id, d);
                    if (resumeAt != null) {
                        try {
                            event.target.seekTo(resumeAt, true);
                            setCurrentTime(resumeAt);
                        } catch { /* player hali tayyor emas */ }
                    }

                    if (isPlaying) {
                        event.target.playVideo();
                    }
                    startInterval();
                },
                onStateChange: (event) => {
                    if (event.data === window.YT.PlayerState.PLAYING) {
                        setIsPlaying(true);
                        if (setIsLoading) setIsLoading(false);
                        const d = event.target.getDuration();
                        if (d) setDuration(d);
                    } else if (event.data === window.YT.PlayerState.PAUSED) {
                        setIsPlaying(false);
                        if (setIsLoading) setIsLoading(false);
                    } else if (event.data === window.YT.PlayerState.ENDED) {
                        if (setIsLoading) setIsLoading(false);
                        // Takrorlash / keyingi epizodga o'tish oddiy audio bilan bir xil ishlasin
                        if (onEnded) onEnded();
                        else setIsPlaying(false);
                    } else if (event.data === window.YT.PlayerState.BUFFERING) {
                        if (setIsLoading) setIsLoading(true);
                    }
                },
                onError: (e) => {
                    console.error("YouTube Player Error:", e.data);
                }
            }
        });
        youtubePlayerRef.current.loadedVideoId = podcast.youtubeId;
    }, [podcast, isPlaying, setIsPlaying, setCurrentTime, setDuration, startInterval, youtubePlayerRef, setIsLoading, onEnded]);

    useEffect(() => {
        if (!podcast || podcast.mediaType !== 'youtube') return;

        if (!window.YT || !window.YT.Player) {
            if (!window.YT) {
                const tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            }
            window.onYouTubeIframeAPIReady = initPlayer;
        } else {
            // Check if player is already initialized for this video
            if (youtubePlayerRef.current && youtubePlayerRef.current.loadedVideoId === podcast.youtubeId) {
                // Already loaded, just ensure interval is running
                startInterval();
            } else if (youtubePlayerRef.current && typeof youtubePlayerRef.current.loadVideoById === 'function') {
                // Boshqa video — mavjud pleyerga yuklaymiz. `loadVideoById` videoni darhol
                // ijro etib yuboradi, shuning uchun ijro so'ralmagan bo'lsa `cueVideoById`
                // ishlatiladi: aks holda epizod almashganda ovoz o'z-o'zidan chiqib ketardi.
                const resumeAt = getResumeTime(podcast.id, 0);
                const load = isPlaying
                    ? youtubePlayerRef.current.loadVideoById
                    : (youtubePlayerRef.current.cueVideoById || youtubePlayerRef.current.loadVideoById);
                load.call(youtubePlayerRef.current, podcast.youtubeId, resumeAt ?? 0);
                setCurrentTime(resumeAt ?? 0);
                setDuration(0);
                youtubePlayerRef.current.loadedVideoId = podcast.youtubeId;
                startInterval();
            } else {
                // Not initialized or broken, init fresh
                initPlayer();
            }
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [podcast?.youtubeId, isPlaying, initPlayer, startInterval, youtubePlayerRef, setCurrentTime, setDuration]);

    const handleYoutubeSeek = useCallback((time) => {
        if (youtubePlayerRef.current && typeof youtubePlayerRef.current.seekTo === 'function') {
            youtubePlayerRef.current.seekTo(time, true);
        }
    }, [youtubePlayerRef]);

    const syncYoutubeState = useCallback((playing) => {
        if (!youtubePlayerRef.current || typeof youtubePlayerRef.current.getPlayerState !== 'function') return;
        
        try {
            const state = youtubePlayerRef.current.getPlayerState();
            if (playing && state !== window.YT.PlayerState.PLAYING) {
                youtubePlayerRef.current.playVideo();
            } else if (!playing && state === window.YT.PlayerState.PLAYING) {
                youtubePlayerRef.current.pauseVideo();
            }
        } catch (e) {
            console.error("Error syncing YT state:", e);
        }
    }, [youtubePlayerRef]);

    return { ytPlayerRef: youtubePlayerRef, handleYoutubeSeek, syncYoutubeState };
}

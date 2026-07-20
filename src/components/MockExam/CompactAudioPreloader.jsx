import React, { useState, useEffect, useRef } from 'react';

/**
 * Compact audio preloader for IELTS Listening tests.
 * Fetches the audio to Cache API and generates Blob URLs for offline resilience.
 */
export default function CompactAudioPreloader({ test, onReady, onBlobsReady }) {
    const [loadedCount, setLoadedCount] = useState(0);
    const [isDone, setIsDone] = useState(false);
    const hasCalledReady = useRef(false);
    const passages = test?.passages || [];

    useEffect(() => {
        let isMounted = true;
        const newUrls = {};
        const uniqueSrcs = new Set();
        
        passages.forEach(passage => {
            const src = passage.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file;
            if (src) uniqueSrcs.add(src);
        });

        const totalCount = uniqueSrcs.size;

        if (totalCount === 0) {
            setIsDone(true);
            onBlobsReady?.({});
            onReady?.();
            return;
        }

        let loaded = 0;

        const checkLoaded = () => {
            if (!isMounted) return;
            loaded++;
            setLoadedCount(loaded);
            if (loaded >= totalCount && !hasCalledReady.current) {
                hasCalledReady.current = true;
                setIsDone(true);
                onBlobsReady?.(newUrls);
                onReady?.();
            }
        };

        const fetchAudio = async (src) => {
            try {
                // Ignore if it's already a blob URL
                if (src.startsWith('blob:')) {
                    newUrls[src] = src;
                    checkLoaded();
                    return;
                }

                // Check Cache API first
                const cache = await caches.open('ielts-audio-cache');
                let response = await cache.match(src);
                
                if (!response) {
                    // Fetch the audio and store it in cache
                    response = await fetch(src);
                    if (response.ok) {
                        cache.put(src, response.clone());
                    } else {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                }
                
                const blob = await response.blob();
                newUrls[src] = URL.createObjectURL(blob);
            } catch (e) {
                console.warn('Failed to fetch/cache audio:', e);
                newUrls[src] = src; // Fallback to original URL
            }
            checkLoaded();
        };

        uniqueSrcs.forEach(src => fetchAudio(src));

        const timeout = setTimeout(() => {
            if (!hasCalledReady.current) {
                console.warn('Audio preloading timed out, falling back to network URLs');
                hasCalledReady.current = true;
                setIsDone(true);
                onBlobsReady?.(newUrls);
                onReady?.();
            }
        }, 30000); // 30s timeout

        return () => {
            isMounted = false;
            clearTimeout(timeout);
            // We do not revoke object URLs here because they need to be used by the test!
        };
    }, [passages, test, onReady, onBlobsReady]);

    const totalCount = new Set(passages.map(p => p.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file).filter(Boolean)).size;
    const pct = totalCount > 0 ? Math.min(100, Math.round((loadedCount / totalCount) * 100)) : 100;

    return (
        <div className="w-full">
            {!isDone ? (
                <div className="flex flex-col items-center gap-1 py-1">
                    <div className="flex items-center gap-2 text-zinc-400">
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                            Loading {pct}%
                        </span>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

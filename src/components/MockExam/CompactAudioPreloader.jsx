import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Compact audio preloader for IELTS Listening tests.
 * Fetches the audio to Cache API and generates Blob URLs for offline resilience.
 */
export default function CompactAudioPreloader({ test, onReady, onBlobsReady }) {
    const [loadedCount, setLoadedCount] = useState(0);
    const [isDone, setIsDone] = useState(false);
    const hasCalledReady = useRef(false);

    // Callbacklar ref orqali chaqiriladi: parent ularni har renderda YANGI inline arrow
    // sifatida uzatadi. Ilgari ular effekt dependency'sida edi va effekt har renderda
    // (masalan ovoz slayderi surilganda) qayta ishga tushib, audio qaytadan yuklanardi —
    // har safar yangi blob URL yaratilib, eskisi revoke qilinmasdi.
    const onReadyRef = useRef(onReady);
    const onBlobsReadyRef = useRef(onBlobsReady);
    useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
    useEffect(() => { onBlobsReadyRef.current = onBlobsReady; }, [onBlobsReady]);

    // Manzillar ro'yxatini barqaror satr kalitiga aylantiramiz — effekt faqat audio
    // manbalari haqiqatan o'zgarganda qayta ishga tushadi.
    const sources = useMemo(() => {
        const passages = test?.passages || [];
        const set = new Set();
        passages.forEach(passage => {
            const src = passage.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file;
            if (src) set.add(src);
        });
        return Array.from(set);
    }, [test]);
    const sourcesKey = sources.join('|');

    useEffect(() => {
        let isMounted = true;
        const newUrls = {};
        const uniqueSrcs = new Set(sourcesKey ? sourcesKey.split('|') : []);

        const totalCount = uniqueSrcs.size;

        if (totalCount === 0) {
            setIsDone(true);
            hasCalledReady.current = true;
            onBlobsReadyRef.current?.({});
            onReadyRef.current?.();
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
                onBlobsReadyRef.current?.(newUrls);
                onReadyRef.current?.();
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
                onBlobsReadyRef.current?.(newUrls);
                onReadyRef.current?.();
            }
        }, 30000); // 30s timeout

        return () => {
            isMounted = false;
            clearTimeout(timeout);
            // Blob URL'lar bu yerda revoke QILINMAYDI — ular test obyektiga berilgan
            // va audio hali ijro etilishi kerak. Effekt endi manbalar o'zgargandagina
            // qayta ishga tushadi, shuning uchun ortiqcha blob ham yaratilmaydi.
        };
    }, [sourcesKey]);

    const totalCount = sources.length;
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

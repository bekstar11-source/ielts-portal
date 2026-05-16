import React, { useState, useEffect, useRef } from 'react';

/**
 * Compact audio preloader for IELTS Listening tests.
 * Polls the readyState of audio elements to report loading progress.
 */
export default function CompactAudioPreloader({ test, onReady }) {
    const [loadedCount, setLoadedCount] = useState(0);
    const [isDone, setIsDone] = useState(false);
    const hasCalledReady = useRef(false);
    const passages = test?.passages || [];
    const totalCount = passages.filter(p =>
        p.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file
    ).length || 0;

    useEffect(() => {
        if (totalCount === 0) {
            setIsDone(true);
            onReady?.();
            return;
        }

        let loaded = 0;
        const pollIntervals = [];

        const checkLoaded = () => {
            loaded++;
            setLoadedCount(loaded);
            if (loaded >= totalCount && !hasCalledReady.current) {
                hasCalledReady.current = true;
                setIsDone(true);
                onReady?.();
                pollIntervals.forEach(clearInterval);
            }
        };

        passages.forEach((passage, idx) => {
            const src = passage.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file;
            if (!src) { checkLoaded(); return; }

            const pollId = setInterval(() => {
                const audioEl = document.getElementById(`preload-audio-${idx}`);
                if (!audioEl) return;
                if (audioEl.readyState >= 3 || audioEl.error) {
                    clearInterval(pollId);
                    checkLoaded();
                }
            }, 200);
            pollIntervals.push(pollId);
        });

        const timeout = setTimeout(() => {
            if (!hasCalledReady.current) {
                hasCalledReady.current = true;
                setIsDone(true);
                onReady?.();
                pollIntervals.forEach(clearInterval);
            }
        }, 20000);

        return () => {
            clearTimeout(timeout);
            pollIntervals.forEach(clearInterval);
        };
    }, [totalCount, passages, test, onReady]);

    const pct = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 100;

    return (
        <div className="w-full">
            {passages.map((passage, idx) => {
                const src = passage.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file;
                if (!src) return null;
                return (
                    <audio key={idx} id={`preload-audio-${idx}`} src={src} preload="auto" style={{ display: 'none' }} />
                );
            })}

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

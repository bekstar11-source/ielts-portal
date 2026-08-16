import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getCdnUrl, getOriginUrl } from '../../utils/cdnUtils';
import { registerAudioBlob } from '../../utils/audioBlobRegistry';

const AUDIO_CACHE = 'ielts-audio-cache';

/**
 * Compact audio preloader for IELTS Listening tests.
 * Fetches the audio to Cache API and generates Blob URLs for offline resilience.
 *
 * @param {(report: {total:number, ok:number, failed:string[]}) => void} onReady
 *        Yuklash tugaganda CHAQIRILADI — hisobot bilan. Chaqiruvchi hisobotni
 *        tekshirib, imtihonni boshlashga ruxsat bermasligi mumkin.
 */
export default function CompactAudioPreloader({ test, onReady, onBlobsReady }) {
    const [loadedCount, setLoadedCount] = useState(0);
    const [isDone, setIsDone] = useState(false);
    const [report, setReport] = useState(null);
    const [attempt, setAttempt] = useState(0);
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
        const failed = [];
        const uniqueSrcs = new Set(sourcesKey ? sourcesKey.split('|') : []);

        const totalCount = uniqueSrcs.size;
        hasCalledReady.current = false;
        setIsDone(false);
        setLoadedCount(0);

        const finish = () => {
            hasCalledReady.current = true;
            const result = { total: totalCount, ok: totalCount - failed.length, failed: [...failed] };
            setReport(result);
            setIsDone(true);
            onBlobsReadyRef.current?.(newUrls);
            onReadyRef.current?.(result);
        };

        if (totalCount === 0) {
            finish();
            return;
        }

        let settled = 0;

        const checkLoaded = () => {
            if (!isMounted) return;
            settled++;
            setLoadedCount(settled);
            if (settled >= totalCount && !hasCalledReady.current) finish();
        };

        // Bitta manzilni oladi. CDN yiqilsa xom Firebase Storage manziliga qaytadi —
        // Worker yagona nuqta bo'lgani uchun bu fallback SHART.
        const fetchWithFallback = async (src) => {
            const candidates = [getCdnUrl(src)];
            const origin = getOriginUrl(getCdnUrl(src));
            if (origin !== candidates[0]) candidates.push(origin);

            const cache = await caches.open(AUDIO_CACHE).catch(() => null);

            for (const url of candidates) {
                try {
                    let response = cache ? await cache.match(url) : null;
                    if (!response) {
                        response = await fetch(url);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        if (cache) cache.put(url, response.clone()).catch(() => {});
                    }
                    return await response.blob();
                } catch (e) {
                    console.warn(`Audio fetch failed for ${url}:`, e?.message || e);
                }
            }
            return null;
        };

        const fetchAudio = async (src) => {
            // Ignore if it's already a blob URL
            if (src.startsWith('blob:')) {
                newUrls[src] = src;
                checkLoaded();
                return;
            }

            const blob = await fetchWithFallback(src);
            if (blob) {
                newUrls[src] = registerAudioBlob(URL.createObjectURL(blob));
            } else {
                // Fallback: tarmoq manzilini beramiz — <audio> o'zi progressiv
                // yuklashga urinib ko'radi. Lekin buni MUVAFFAQIYAT deb sanamaymiz.
                newUrls[src] = src;
                failed.push(src);
            }
            checkLoaded();
        };

        uniqueSrcs.forEach(src => fetchAudio(src));

        const timeout = setTimeout(() => {
            if (!hasCalledReady.current) {
                console.warn('Audio preloading timed out, falling back to network URLs');
                // Hali kelmagan manbalar ham muvaffaqiyatsiz hisoblanadi — ilgari
                // timeout jimgina "tayyor" deb e'lon qilardi va talaba audiosiz
                // imtihonga kirib ketardi.
                uniqueSrcs.forEach(src => {
                    if (!newUrls[src]) {
                        newUrls[src] = src;
                        failed.push(src);
                    }
                });
                finish();
            }
        }, 30000); // 30s timeout

        return () => {
            isMounted = false;
            clearTimeout(timeout);
            // Blob URL'lar bu yerda revoke QILINMAYDI — ular test obyektiga berilgan
            // va audio hali ijro etilishi kerak. Tozalash `revokeMockAudioBlobs()`
            // orqali listening tugagach amalga oshiriladi.
        };
    }, [sourcesKey, attempt]);

    const totalCount = sources.length;
    const pct = totalCount > 0 ? Math.min(100, Math.round((loadedCount / totalCount) * 100)) : 100;
    const failedCount = report?.failed?.length || 0;

    if (isDone && failedCount > 0) {
        return (
            <div className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left">
                <p className="text-[11px] font-bold text-red-700">
                    {report.ok === 0
                        ? 'Audio yuklanmadi'
                        : `${failedCount} ta audio fayl yuklanmadi (${report.ok}/${report.total} tayyor)`}
                </p>
                <p className="text-[10px] text-red-600 mt-0.5 leading-snug">
                    Internetni tekshiring va qayta urinib ko'ring. Muammo takrorlansa nazoratchini chaqiring.
                </p>
                <button
                    onClick={() => setAttempt(a => a + 1)}
                    className="mt-2 px-3 py-1 bg-red-600 text-white rounded font-bold text-[10px] hover:bg-red-700 active:scale-[0.98] transition-all"
                >
                    Qayta urinish
                </button>
            </div>
        );
    }

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

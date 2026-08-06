import React, { useCallback, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/plugins/regions";
import TimelinePlugin from "wavesurfer.js/plugins/timeline";
import { processTime, toMMSS } from "./CreateTestUtils";

const REGION_COLORS = [
    "rgba(59,130,246,0.28)",
    "rgba(16,185,129,0.28)",
    "rgba(245,158,11,0.28)",
    "rgba(236,72,153,0.26)",
];

/**
 * Listening part vaqtlarini to'lqin shaklida belgilash.
 * Region'ni sichqoncha bilan surish/cho'zish start/end vaqtlarini to'g'ridan-to'g'ri yozadi —
 * mm:ss ni qo'lda terish shart emas.
 */
export default function PartWaveformEditor({ audioUrl, passages = [], partCount = 4, onChange, isDark }) {
    const containerRef = useRef(null);
    const wsRef = useRef(null);
    const regionsRef = useRef(null);
    const regionByPart = useRef({});   // partIndex → region
    const onChangeRef = useRef(onChange);
    const passagesRef = useRef(passages);

    const [ready, setReady] = useState(false);
    const [regionParts, setRegionParts] = useState([]); // qaysi partlarda region bor
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState("");

    // Region'lar faqat bir marta — audio tayyor bo'lganda — kiritilgan vaqtlardan quriladi.
    // Keyin ular manba bo'lib qoladi: har o'zgarishda qayta qurilsa, surish paytida sakrardi.
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { passagesRef.current = passages; }, [passages]);

    const syncRegionParts = () => setRegionParts(Object.keys(regionByPart.current).map(Number));

    const commit = useCallback((partIdx, region) => {
        onChangeRef.current?.(partIdx, {
            startTime: toMMSS(Math.floor(region.start)),
            endTime: toMMSS(Math.floor(region.end))
        });
    }, []);

    useEffect(() => {
        if (!containerRef.current || !audioUrl) return;

        const regions = RegionsPlugin.create();
        regionsRef.current = regions;

        const ws = WaveSurfer.create({
            container: containerRef.current,
            height: 72,
            waveColor: isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)",
            progressColor: "#3b82f6",
            cursorColor: "#ef4444",
            cursorWidth: 2,
            normalize: true,
            url: audioUrl,
            plugins: [regions, TimelinePlugin.create({ height: 18, insertPosition: "beforebegin" })],
        });
        wsRef.current = ws;

        const onReady = () => {
            setReady(true);
            setDuration(ws.getDuration());
            regionByPart.current = {};
            (passagesRef.current || []).slice(0, partCount).forEach((p, i) => {
                const start = processTime(p?.startTime);
                const end = processTime(p?.endTime);
                if (!(end > start)) return;
                const region = regions.addRegion({
                    start,
                    end,
                    color: REGION_COLORS[i % REGION_COLORS.length],
                    drag: true,
                    resize: true,
                    content: `Part ${i + 1}`,
                });
                region.__partIdx = i;
                regionByPart.current[i] = region;
            });
            syncRegionParts();
        };

        ws.on("ready", onReady);
        ws.on("play", () => setIsPlaying(true));
        ws.on("pause", () => setIsPlaying(false));
        ws.on("finish", () => setIsPlaying(false));
        ws.on("error", (e) => setError(String(e?.message || e || "Audio yuklanmadi")));
        regions.on("region-updated", (region) => {
            if (region.__partIdx === undefined) return;
            commit(region.__partIdx, region);
        });

        return () => {
            try { ws.destroy(); } catch { /* allaqachon yopilgan */ }
            wsRef.current = null;
            regionsRef.current = null;
            regionByPart.current = {};
        };
    }, [audioUrl, partCount, isDark, commit]);

    // Region'i yo'q partga joriy pozitsiyadan yangi region qo'shish
    const addRegionForPart = (i) => {
        const ws = wsRef.current;
        const regions = regionsRef.current;
        if (!ws || !regions || !ready) return;
        if (regionByPart.current[i]) {
            ws.setTime(regionByPart.current[i].start);
            return;
        }
        const start = ws.getCurrentTime();
        const end = Math.min(ws.getDuration(), start + Math.max(30, ws.getDuration() / (partCount || 4)));
        const region = regions.addRegion({
            start,
            end,
            color: REGION_COLORS[i % REGION_COLORS.length],
            drag: true,
            resize: true,
            content: `Part ${i + 1}`,
        });
        region.__partIdx = i;
        regionByPart.current[i] = region;
        syncRegionParts();
        commit(i, region);
    };

    // Audio'ni teng qismlarga bo'lib, barcha partlarga region beradi
    const splitEvenly = () => {
        const ws = wsRef.current;
        const regions = regionsRef.current;
        if (!ws || !regions || !ready) return;
        regions.clearRegions();
        regionByPart.current = {};
        const total = ws.getDuration();
        const slice = total / partCount;
        for (let i = 0; i < partCount; i++) {
            const region = regions.addRegion({
                start: i * slice,
                end: (i + 1) * slice,
                color: REGION_COLORS[i % REGION_COLORS.length],
                drag: true,
                resize: true,
                content: `Part ${i + 1}`,
            });
            region.__partIdx = i;
            regionByPart.current[i] = region;
            commit(i, region);
        }
        syncRegionParts();
    };

    const playRegion = (i) => {
        const region = regionByPart.current[i];
        if (region) region.play();
    };

    const btn = `h-7 px-2.5 rounded-lg border text-[10px] font-black transition active:scale-95 disabled:opacity-30 ${isDark ? 'border-white/10 hover:bg-white/10 text-gray-300' : 'border-gray-200 hover:bg-white text-gray-600'}`;

    if (!audioUrl) return null;

    return (
        <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#121212] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">To'lqin bo'yicha belgilash</p>
                    <p className="text-[9px] opacity-35">Region'ni suring yoki chetidan cho'zing — vaqtlar avtomatik yoziladi</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button type="button" onClick={splitEvenly} disabled={!ready} className={btn} title="Audio'ni teng qismlarga bo'lish">
                        Teng bo'lish
                    </button>
                    <button
                        type="button"
                        onClick={() => wsRef.current?.playPause()}
                        disabled={!ready}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition active:scale-95 shrink-0 ${ready ? 'bg-blue-600 text-white hover:bg-blue-500' : 'opacity-30'}`}
                        title={isPlaying ? "Pauza" : "Ijro"}
                    >
                        {isPlaying
                            ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                            : <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                    </button>
                </div>
            </div>

            <div ref={containerRef} className="w-full" />

            {error ? (
                <p className="mt-2 text-[10px] font-bold text-red-500">Audio yuklanmadi: {error}</p>
            ) : !ready ? (
                <p className="mt-2 text-[10px] opacity-40">To'lqin yuklanmoqda...</p>
            ) : (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-mono opacity-40 mr-1">{toMMSS(Math.floor(duration))}</span>
                    {[...Array(partCount)].map((_, i) => {
                        const has = regionParts.includes(i);
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => (has ? playRegion(i) : addRegionForPart(i))}
                                className={btn}
                                title={has ? `Part ${i + 1} segmentini eshitish` : `Part ${i + 1} uchun region qo'shish`}
                            >
                                {has ? `▶ Part ${i + 1}` : `+ Part ${i + 1}`}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

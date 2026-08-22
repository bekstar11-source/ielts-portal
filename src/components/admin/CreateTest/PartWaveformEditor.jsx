import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/plugins/regions";
import TimelinePlugin from "wavesurfer.js/plugins/timeline";
import { toMMSS, formatAudioTime, roundAudioTime } from "./CreateTestUtils";
import { parseAudioTimeInput } from "../../../utils/audioTime";
import { analyzeListeningParts, worstIssueLevel } from "../../../utils/listeningSegments";

// Qo'shni partlar chegarasi shu masofadan yaqin bo'lsa — aynan bir nuqtaga
// yopishtiriladi. Aks holda part 1 tugagan joy bilan part 2 boshlangan joy
// orasida ko'zga ko'rinmas "teshik" yoki ustma-ustlik qolib ketardi.
const SNAP_TOLERANCE = 0.75;

// Region bilan maydondagi qiymat shundan ko'proq farq qilsa — sinxronlanadi.
// Kichik farqlar (float xatolari) e'tiborsiz qoldiriladi, aks holda region
// o'zini-o'zi cheksiz qayta yozib turardi.
const SYNC_EPSILON = 0.02;

const DARK_WAVE = "rgba(255,255,255,0.22)";
const LIGHT_WAVE = "rgba(0,0,0,0.18)";

const REGION_COLORS = [
    "rgba(59,130,246,0.28)",
    "rgba(16,185,129,0.28)",
    "rgba(245,158,11,0.28)",
    "rgba(236,72,153,0.26)",
];

/**
 * Listening part vaqtlarini to'lqin shaklida belgilash.
 *
 * IKKI TOMONLAMA: region'ni surish maydonlarga yoziladi, maydonga yozilgan
 * soniya esa region'ni joyidan qimirlatadi. Ilgari region'lar faqat audio
 * yuklanganda bir marta qurilardi — admin soniyani qo'lda o'zgartirsa,
 * to'lqin eski joyida qolib, ekran yolg'on ko'rsatardi.
 */
export default function PartWaveformEditor({
    audioUrl,
    passages = [],
    partCount = 4,
    onChange,
    onDuration,
    isDark,
}) {
    const containerRef = useRef(null);
    const wsRef = useRef(null);
    const regionsRef = useRef(null);
    const regionByPart = useRef({});   // partIndex → region
    const lastValues = useRef({});     // partIndex → {start, end} (oxirgi ma'lum holat)
    const draggingRef = useRef(false);
    const readyRef = useRef(false);
    const onChangeRef = useRef(onChange);
    const onDurationRef = useRef(onDuration);
    const passagesRef = useRef(passages);
    const chainRef = useRef(true);
    const waveColorRef = useRef(isDark ? DARK_WAVE : LIGHT_WAVE);

    const [ready, setReady] = useState(false);
    const [regionParts, setRegionParts] = useState([]); // qaysi partlarda region bor
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState("");
    const [dragLabel, setDragLabel] = useState(null); // surish paytidagi jonli ko'rsatkich
    const [chain, setChain] = useState(true);

    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { onDurationRef.current = onDuration; }, [onDuration]);
    useEffect(() => { passagesRef.current = passages; }, [passages]);
    useEffect(() => { chainRef.current = chain; }, [chain]);
    useEffect(() => { waveColorRef.current = isDark ? DARK_WAVE : LIGHT_WAVE; }, [isDark]);

    const parts = useMemo(
        () => analyzeListeningParts(passages, partCount, { fileDuration: duration }),
        [passages, partCount, duration]
    );

    // Yangi massiv har safar qaytarilsa, "passages" har renderda yangi bo'lgan
    // holatda effekt → setState → render → effekt aylanasi hosil bo'lardi.
    const refreshRegionParts = useCallback(() => {
        const next = Object.keys(regionByPart.current).map(Number).sort((a, b) => a - b);
        setRegionParts(prev => (
            prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next
        ));
    }, []);

    const remember = (i, region) => {
        lastValues.current[i] = { start: roundAudioTime(region.start), end: roundAudioTime(region.end) };
    };

    // Bir nechta partni BIR chaqiruvda yuborish shart: parent har chaqiruvda
    // JSON'ni qaytadan o'qiydi va ketma-ket ikki chaqiruv bir-birini o'chirardi.
    const commitMany = useCallback((patches) => {
        if (!patches.length) return;
        onChangeRef.current?.(patches);
    }, []);

    const createRegion = useCallback((i, start, end) => {
        const regions = regionsRef.current;
        if (!regions) return null;
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
        remember(i, region);
        return region;
    }, []);

    // Maydonlardagi qiymat → region. Surish davomida ishlamaydi, aks holda
    // region qo'l ostidan sakrab ketardi.
    const syncRegionsFromPassages = useCallback(() => {
        const ws = wsRef.current;
        const regions = regionsRef.current;
        if (!ws || !regions || !readyRef.current || draggingRef.current) return;

        const total = ws.getDuration();
        const list = passagesRef.current || [];

        for (let i = 0; i < partCount; i++) {
            const p = list[i] || {};
            const s = parseAudioTimeInput(p.startTime);
            const e = parseAudioTimeInput(p.endTime);
            const existing = regionByPart.current[i];

            const start = s.valid ? Math.min(s.seconds, total) : null;
            const end = e.valid ? Math.min(e.seconds, total) : null;
            const usable = start !== null && end !== null && end > start;

            if (!usable) {
                // Vaqt o'chirilgan yoki xato yozilgan — to'lqinda ham ko'rsatmaymiz.
                if (existing) { existing.remove(); delete regionByPart.current[i]; delete lastValues.current[i]; }
                continue;
            }
            if (!existing) { createRegion(i, start, end); continue; }
            if (Math.abs(existing.start - start) > SYNC_EPSILON || Math.abs(existing.end - end) > SYNC_EPSILON) {
                existing.setOptions({ start, end });
                remember(i, existing);
            }
        }

        // partCount kamaysa — ortiqcha region'lar qolib ketmasin.
        Object.keys(regionByPart.current).map(Number).forEach((i) => {
            if (i >= partCount) {
                regionByPart.current[i].remove();
                delete regionByPart.current[i];
                delete lastValues.current[i];
            }
        });

        refreshRegionParts();
    }, [partCount, createRegion, refreshRegionParts]);

    // Surilgan region chetlarini qo'shni partlarga yopishtiradi va "bog'langan
    // chegara" rejimida qo'shnining chetini ham ergashtiradi — shunda part N
    // tugagan soniya bilan part N+1 boshlangan soniya har doim bir xil bo'ladi.
    const handleRegionUpdated = useCallback((region) => {
        const i = region.__partIdx;
        if (i === undefined) return;
        draggingRef.current = false;
        setDragLabel(null);

        const prev = regionByPart.current[i - 1];
        const next = regionByPart.current[i + 1];
        const before = lastValues.current[i] || { start: region.start, end: region.end };

        let start = roundAudioTime(region.start);
        let end = roundAudioTime(region.end);

        if (prev && Math.abs(start - prev.end) <= SNAP_TOLERANCE) start = roundAudioTime(prev.end);
        if (next && Math.abs(end - next.start) <= SNAP_TOLERANCE) end = roundAudioTime(next.start);
        if (!(end > start)) return;

        if (Math.abs(start - region.start) > 0.001 || Math.abs(end - region.end) > 0.001) {
            region.setOptions({ start, end });
        }

        const patches = [{ index: i, patch: { startTime: toMMSS(start), endTime: toMMSS(end) } }];

        if (chainRef.current) {
            const startMoved = Math.abs(start - before.start) > SYNC_EPSILON;
            const endMoved = Math.abs(end - before.end) > SYNC_EPSILON;
            // Qo'shnining faqat TEGISHLI cheti suriladi; ikkinchi cheti joyida
            // qoladi, shuning uchun zanjir bo'ylab tarqalib ketmaydi.
            if (startMoved && prev && start > prev.start + 0.2) {
                prev.setOptions({ end: start });
                remember(i - 1, prev);
                patches.push({ index: i - 1, patch: { endTime: toMMSS(start) } });
            }
            if (endMoved && next && end < next.end - 0.2) {
                next.setOptions({ start: end });
                remember(i + 1, next);
                patches.push({ index: i + 1, patch: { startTime: toMMSS(end) } });
            }
        }

        remember(i, region);
        commitMany(patches);
    }, [commitMany]);

    useEffect(() => {
        if (!containerRef.current || !audioUrl) return;

        const regions = RegionsPlugin.create();
        regionsRef.current = regions;

        const ws = WaveSurfer.create({
            container: containerRef.current,
            height: 80,
            waveColor: waveColorRef.current,
            progressColor: "#3b82f6",
            cursorColor: "#ef4444",
            cursorWidth: 2,
            normalize: true,
            url: audioUrl,
            plugins: [regions, TimelinePlugin.create({ height: 18, insertPosition: "beforebegin" })],
        });
        wsRef.current = ws;

        const onReady = () => {
            readyRef.current = true;
            setReady(true);
            const d = ws.getDuration();
            setDuration(d);
            onDurationRef.current?.(d);
            regionByPart.current = {};
            lastValues.current = {};
            syncRegionsFromPassages();
        };

        ws.on("ready", onReady);
        ws.on("play", () => setIsPlaying(true));
        ws.on("pause", () => setIsPlaying(false));
        ws.on("finish", () => setIsPlaying(false));
        ws.on("error", (e) => setError(String(e?.message || e || "Audio yuklanmadi")));

        // `region-update` surish DAVOMIDA uchadi — undan faqat jonli ko'rsatkich
        // uchun foydalanamiz. Yozish esa `region-updated` da (qo'yib yuborilganda)
        // bo'ladi: har piksel uchun butun testni qayta yozish shart emas.
        regions.on("region-update", (region) => {
            if (region.__partIdx === undefined) return;
            draggingRef.current = true;
            setDragLabel({
                index: region.__partIdx,
                start: roundAudioTime(region.start),
                end: roundAudioTime(region.end),
            });
        });
        regions.on("region-updated", handleRegionUpdated);

        return () => {
            readyRef.current = false;
            try { ws.destroy(); } catch { /* allaqachon yopilgan */ }
            wsRef.current = null;
            regionsRef.current = null;
            regionByPart.current = {};
            lastValues.current = {};
        };
        // `isDark` ATAYLAB dependency emas: mavzu almashganda butun to'lqinni
        // qaytadan yuklash (va region'larni qaytadan qurish) shart emas — rang
        // pastdagi effektda joyida almashtiriladi.
    }, [audioUrl, syncRegionsFromPassages, handleRegionUpdated]);

    useEffect(() => {
        wsRef.current?.setOptions({ waveColor: waveColorRef.current });
    }, [isDark]);

    // Maydonda soniya o'zgarsa — to'lqin darhol ergashadi.
    useEffect(() => { syncRegionsFromPassages(); }, [passages, partCount, ready, syncRegionsFromPassages]);

    // Region'i yo'q partga joriy pozitsiyadan yangi region qo'shish
    const addRegionForPart = (i) => {
        const ws = wsRef.current;
        if (!ws || !ready) return;
        if (regionByPart.current[i]) {
            ws.setTime(regionByPart.current[i].start);
            return;
        }
        const total = ws.getDuration();
        const prev = regionByPart.current[i - 1];
        // Oldingi part tugagan joydan boshlaymiz — eng ko'p kerak bo'ladigan holat.
        const start = prev ? roundAudioTime(prev.end) : roundAudioTime(ws.getCurrentTime());
        const next = regionByPart.current[i + 1];
        const end = roundAudioTime(Math.min(
            next ? next.start : total,
            start + Math.max(30, total / (partCount || 4))
        ));
        if (!(end > start)) return;
        createRegion(i, start, end);
        refreshRegionParts();
        commitMany([{ index: i, patch: { startTime: toMMSS(start), endTime: toMMSS(end) } }]);
    };

    // Audio'ni teng qismlarga bo'lib, barcha partlarga region beradi
    const splitEvenly = () => {
        const ws = wsRef.current;
        const regions = regionsRef.current;
        if (!ws || !regions || !ready) return;
        regions.clearRegions();
        regionByPart.current = {};
        lastValues.current = {};
        const total = ws.getDuration();
        const slice = total / partCount;
        // Chegaralar bir marta yaxlitlanadi va qo'shni partlar AYNAN shu qiymatni
        // baham ko'radi — part N tugagan soniya part N+1 boshlangan soniya bilan bir xil.
        const bounds = [...Array(partCount + 1)].map((_, i) => roundAudioTime(i * slice));
        const patches = [];
        for (let i = 0; i < partCount; i++) {
            createRegion(i, bounds[i], bounds[i + 1]);
            patches.push({ index: i, patch: { startTime: toMMSS(bounds[i]), endTime: toMMSS(bounds[i + 1]) } });
        }
        refreshRegionParts();
        commitMany(patches);
    };

    const playRegion = (i) => {
        const region = regionByPart.current[i];
        if (region) region.play();
    };

    // Chegarani tekshirish: o'tish joyini 3 soniya oldin boshlab eshittiradi.
    // Kesim to'g'ri joydami — quloq bilan shu yerda tekshiriladi.
    const playBoundary = (i) => {
        const ws = wsRef.current;
        const region = regionByPart.current[i];
        if (!ws || !region) return;
        const from = Math.max(0, region.end - 3);
        const to = Math.min(ws.getDuration(), region.end + 3);
        ws.play(from, to);
    };

    const btn = `h-7 px-2.5 rounded-lg border text-[10px] font-black transition active:scale-95 disabled:opacity-30 ${isDark ? 'border-white/10 hover:bg-white/10 text-gray-300' : 'border-gray-200 hover:bg-white text-gray-600'}`;
    const miniBtn = `h-6 px-1.5 rounded-md border text-[9px] font-black transition active:scale-95 ${isDark ? 'border-white/10 hover:bg-white/10 text-gray-300' : 'border-gray-200 hover:bg-white text-gray-600'}`;

    if (!audioUrl) return null;

    return (
        <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#181715] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">To'lqin bo'yicha belgilash</p>
                    <p className="text-[9px] opacity-35">Region'ni suring yoki chetidan cho'zing — vaqtlar avtomatik yoziladi. Soniyani qo'lda yozsangiz ham to'lqin ergashadi.</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setChain(c => !c)}
                        className={`h-7 px-2.5 rounded-lg border text-[10px] font-black transition active:scale-95 ${
                            chain
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : (isDark ? 'border-white/10 hover:bg-white/10 text-gray-300' : 'border-gray-200 hover:bg-white text-gray-600')
                        }`}
                        title="Yoqilganda: bir partning chetini surganda qo'shnisi ham ergashadi — partlar orasida bo'shliq ham, ustma-ustlik ham qolmaydi"
                    >
                        {chain ? '🔗 Bog\'langan' : '🔗 Erkin'}
                    </button>
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
                <>
                    <div className="mt-2 flex items-center justify-between text-[9px] font-mono opacity-40">
                        <span>0:00</span>
                        <span>Audio uzunligi: {formatAudioTime(duration)}</span>
                    </div>

                    <div className="mt-2 space-y-1">
                        {parts.map((part) => {
                            const has = regionParts.includes(part.index);
                            const live = dragLabel && dragLabel.index === part.index ? dragLabel : null;
                            const level = worstIssueLevel(part.issues);
                            const tone = level === 'error' ? 'text-red-500' : level === 'warning' ? 'text-amber-500' : 'opacity-50';
                            return (
                                <div key={part.index} className="flex items-center gap-1.5 text-[9px]">
                                    <span className="font-black uppercase tracking-wider w-11 shrink-0 opacity-50">Part {part.index + 1}</span>
                                    <span className={`font-mono tabular-nums ${live ? 'text-blue-500 font-bold' : tone}`}>
                                        {live
                                            ? `${toMMSS(live.start)} → ${toMMSS(live.end)}`
                                            : (has ? `${toMMSS(part.start)} → ${toMMSS(part.end)}` : "belgilanmagan")}
                                    </span>
                                    {has && (
                                        <span className="font-mono tabular-nums opacity-35">
                                            ({formatAudioTime((live ? live.end - live.start : part.end - part.start))})
                                        </span>
                                    )}
                                    {part.gapAfter ? <span className="text-amber-500 font-bold">bo'shliq {part.gapAfter.toFixed(1)}s</span> : null}
                                    {part.overlapAfter ? <span className="text-red-500 font-bold">ustma-ust {part.overlapAfter.toFixed(1)}s</span> : null}
                                    <span className="ml-auto flex items-center gap-1">
                                        {has ? (
                                            <>
                                                <button type="button" onClick={() => playRegion(part.index)} className={miniBtn} title={`Part ${part.index + 1} segmentini eshitish`}>▶</button>
                                                {part.index < partCount - 1 && (
                                                    <button type="button" onClick={() => playBoundary(part.index)} className={miniBtn} title="Kesim joyini tekshirish: tugashdan 3s oldin → 3s keyin">
                                                        ▶ chegara
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <button type="button" onClick={() => addRegionForPart(part.index)} className={miniBtn} title={`Part ${part.index + 1} uchun region qo'shish`}>
                                                + qo'shish
                                            </button>
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

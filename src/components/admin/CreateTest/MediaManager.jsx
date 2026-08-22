import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { toMMSS, formatAudioTime, roundAudioTime } from "./CreateTestUtils";
import { parseAudioTimeInput } from "../../../utils/audioTime";
import { analyzeListeningParts } from "../../../utils/listeningSegments";
import PartWaveformEditor from "./PartWaveformEditor";
import { getCdnUrl } from "../../../utils/cdnUtils";

// Strelka bilan bir bosishda qancha suriladi. 0.5s — quloq ilg'aydigan eng
// kichik farq; undan mayda qadam admin vaqtini behuda oladi.
const NUDGE_STEP = 0.5;
// Chegarani quloq bilan tekshirish uchun eshittiriladigan oyna.
const BOUNDARY_PREVIEW = 3;
// Bo'sh ro'yxat uchun BARQAROR havola: har renderda yangi `[]` yuborilsa,
// to'lqin muharriridagi sinxronlash effekti bekorga qayta ishga tushardi.
const EMPTY_PASSAGES = [];

/**
 * Vaqt maydoni: "6:05", "1:07:30", "365" — hammasi tushuniladi.
 *
 * Muhimi: NOTO'G'RI yozuv jimgina saqlanmaydi. Ilgari "6;05" kabi yozuv 0 ga
 * aylanib qolar va admin buni faqat imtihon boshqa joydan boshlanganda bilardi.
 */
const TimeField = ({ label, title, value, onCommit, isDark, placeholder, disabled }) => {
    const [draft, setDraft] = useState(null);
    const shown = draft !== null ? draft : (value ?? "");
    const parsed = parseAudioTimeInput(shown);
    const invalid = !parsed.valid && !parsed.empty;

    const commit = (raw) => {
        const p = parseAudioTimeInput(raw);
        if (p.valid) onCommit(toMMSS(p.seconds));
        else if (p.empty) onCommit("");
    };

    const nudge = (delta) => {
        const base = parsed.valid ? parsed.seconds : 0;
        const next = Math.max(0, roundAudioTime(base + delta));
        setDraft(null);
        onCommit(toMMSS(next));
    };

    const inputCls = `w-full h-8 pl-2 pr-5 rounded-lg border outline-none text-[10px] font-mono tabular-nums transition ${
        invalid
            ? 'border-red-500 text-red-500'
            : (isDark ? 'bg-[#1f1e1b] border-white/5 focus:border-blue-500' : 'bg-white border-gray-200 focus:border-blue-500')
    } ${isDark && !invalid ? '' : ''}`;

    return (
        <div>
            <span className="text-[8px] font-bold uppercase opacity-35 block mb-1" title={title}>{label}</span>
            <div className="relative">
                <input
                    type="text"
                    inputMode="decimal"
                    disabled={disabled}
                    className={inputCls}
                    placeholder={placeholder}
                    value={shown}
                    onChange={e => { setDraft(e.target.value); commit(e.target.value); }}
                    onBlur={() => { if (!invalid) setDraft(null); }}
                    onKeyDown={e => {
                        if (e.key === 'ArrowUp') { e.preventDefault(); nudge(e.shiftKey ? 1 : NUDGE_STEP); }
                        if (e.key === 'ArrowDown') { e.preventDefault(); nudge(e.shiftKey ? -1 : -NUDGE_STEP); }
                        if (e.key === 'Enter') { e.currentTarget.blur(); }
                    }}
                />
                {/* Aniq sozlash: 0.5s qadam (Shift bilan 1s) */}
                <div className="absolute right-0.5 top-1/2 -translate-y-1/2 flex flex-col">
                    <button type="button" tabIndex={-1} disabled={disabled} onClick={() => nudge(NUDGE_STEP)}
                        className="h-3 w-4 flex items-center justify-center opacity-35 hover:opacity-100 disabled:opacity-15" title={`+${NUDGE_STEP}s`}>
                        <svg className="w-2 h-2" viewBox="0 0 8 8" fill="currentColor"><path d="M4 1l3 4H1z" /></svg>
                    </button>
                    <button type="button" tabIndex={-1} disabled={disabled} onClick={() => nudge(-NUDGE_STEP)}
                        className="h-3 w-4 flex items-center justify-center opacity-35 hover:opacity-100 disabled:opacity-15" title={`-${NUDGE_STEP}s`}>
                        <svg className="w-2 h-2" viewBox="0 0 8 8" fill="currentColor"><path d="M4 7L1 3h6z" /></svg>
                    </button>
                </div>
            </div>
            <p className={`mt-0.5 text-[8px] font-mono ${invalid ? 'text-red-500 font-bold' : 'opacity-30'}`}>
                {invalid
                    ? `xato format · saqlanmadi${value ? ` (${value})` : ''}`
                    : (parsed.valid ? `${parsed.seconds.toFixed(1)}s` : 'bo\'sh')}
            </p>
        </div>
    );
};

/**
 * Segment preview — imtihondagi pleyerning AYNAN o'zi kabi ishlaydi:
 * `start` dan boshlanadi, `end` da to'xtaydi va undan keyin "kutish" sukunatini
 * ham xuddi shunday sanaydi. Shu tufayli bu yerda eshitilgan narsa imtihonda
 * ham bir xil eshitiladi.
 */
const AudioSegmentPlayer = ({ index, audioUrl, start, end, cuts, silence, isDark, onMark, onDuration }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [absTime, setAbsTime] = useState(0);      // audio faylidagi haqiqiy pozitsiya
    const [fileDuration, setFileDuration] = useState(0);
    const [markMode, setMarkMode] = useState(false);
    const [silentElapsed, setSilentElapsed] = useState(0);
    const rafRef = useRef(null);
    const silenceRef = useRef(null);
    const stopAtRef = useRef(null);   // vaqtinchalik chegara (masalan "oxirini eshitish")

    const segmentEnd = cuts ? end : (fileDuration > start ? fileDuration : 0);
    const segmentDuration = segmentEnd > start ? segmentEnd - start : 0;
    // O'quvchi tomonda part davomiyligi sukunat bilan birga hisoblanadi —
    // preview ham xuddi shu raqamni ko'rsatishi kerak.
    const viewDuration = markMode ? fileDuration : segmentDuration + silence;
    const viewTime = markMode
        ? absTime
        : Math.min(viewDuration, Math.max(0, absTime - start) + silentElapsed);

    const stopSilence = useCallback(() => {
        if (silenceRef.current) { clearInterval(silenceRef.current); silenceRef.current = null; }
        setSilentElapsed(0);
    }, []);

    const stopTicker = useCallback(() => {
        if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    }, []);

    useEffect(() => () => { stopTicker(); stopSilence(); }, [stopTicker, stopSilence]);

    // Ijro davomidagi chegara ref'dan o'qiladi: admin soniyani ijro paytida
    // o'zgartirsa ham yangi chegara DARHOL kuchga kiradi (ilgari ijro eski
    // qiymat bilan davom etib, preview yolg'on ko'rsatardi).
    const boundsRef = useRef({ start, end, cuts, silence });
    useEffect(() => { boundsRef.current = { start, end, cuts, silence }; }, [start, end, cuts, silence]);

    // Imtihondagidek: sukunat REAL soat bo'yicha sanaladi.
    const runSilence = () => {
        const { silence: total } = boundsRef.current;
        if (total <= 0) return;
        const startedAt = performance.now();
        stopSilence();
        silenceRef.current = setInterval(() => {
            const elapsed = (performance.now() - startedAt) / 1000;
            if (elapsed >= total) {
                stopSilence();
                setSilentElapsed(total);
            } else {
                setSilentElapsed(elapsed);
            }
        }, 100);
    };

    const startTicker = (audio) => {
        stopTicker();
        const tick = () => {
            rafRef.current = requestAnimationFrame(tick);
            if (audio.paused) return;
            const b = boundsRef.current;
            const limit = stopAtRef.current !== null ? stopAtRef.current : (b.cuts ? b.end : Infinity);
            if (!markMode && limit !== Infinity && audio.currentTime >= limit) {
                audio.pause();
                try { audio.currentTime = limit; } catch { /* seek imkonsiz */ }
                setAbsTime(limit);
                if (stopAtRef.current === null) runSilence();
                stopAtRef.current = null;
                return;
            }
            setAbsTime(audio.currentTime);
        };
        tick();
    };

    const playFrom = (from, stopAt = null) => {
        const audio = audioRef.current;
        if (!audioUrl || !audio) return;
        document.querySelectorAll('audio[id^="preview-audio-"]').forEach(a => { if (a !== audio && !a.paused) a.pause(); });
        stopSilence();
        stopAtRef.current = stopAt;
        try { audio.currentTime = from; } catch { /* metadata hali yo'q */ }
        setAbsTime(from);
        audio.play().then(() => { setIsPlaying(true); startTicker(audio); })
            .catch(e => console.error("Error playing preview:", e));
    };

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audioUrl || !audio) return;
        if (isPlaying) { audio.pause(); return; }
        if (markMode) { playFrom(audio.currentTime); return; }
        const outside = audio.currentTime < start || (cuts && audio.currentTime >= end);
        playFrom(outside ? start : audio.currentTime);
    };

    const handleProgressClick = (e) => {
        const audio = audioRef.current;
        if (!audioUrl || !audio || viewDuration <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        stopSilence();
        // Bosilgan nuqta ko'rsatkich chizig'i bilan AYNI shkalada o'lchanadi
        // (sukunat qismi ham shkalaga kiradi), aks holda bosgan joy bilan
        // playhead to'xtagan joy bir-biriga to'g'ri kelmasdi.
        const target = markMode
            ? pct * fileDuration
            : Math.min(segmentEnd || fileDuration, start + pct * (viewDuration || fileDuration));
        try { audio.currentTime = target; } catch { /* metadata hali yo'q */ }
        setAbsTime(target);
    };

    const handlePause = () => { setIsPlaying(false); stopTicker(); };

    // `Math.floor` yo'q: playhead qayerda bo'lsa, o'sha nuqta saqlanadi.
    const mark = (field) => {
        const audio = audioRef.current;
        if (!audio || !onMark) return;
        onMark(field, toMMSS(audio.currentTime));
    };

    const markBtn = `h-6 px-2 rounded-lg border text-[9px] font-black transition active:scale-95 disabled:opacity-30 ${isDark ? 'border-white/10 hover:bg-white/10 text-gray-300' : 'border-gray-200 hover:bg-white text-gray-600'}`;
    const inSilence = silentElapsed > 0 && silentElapsed < silence;

    return (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2">
                <audio
                    id={`preview-audio-${index}`}
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={handlePause}
                    onPause={handlePause}
                    onPlay={() => setIsPlaying(true)}
                    preload="metadata"
                    onLoadedMetadata={() => {
                        const d = audioRef.current?.duration;
                        const safe = Number.isFinite(d) ? d : 0;
                        setFileDuration(safe);
                        onDuration?.(safe);
                    }}
                />
                <button
                    onClick={togglePlay}
                    type="button"
                    disabled={!audioUrl}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition shrink-0 ${
                        !audioUrl ? 'opacity-30 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                    title={isPlaying ? "Pauza" : "Eshitib ko'rish (Preview)"}
                >
                    {isPlaying ? (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                        <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                </button>
                <div className="flex-1 flex items-center gap-1.5 text-[9px] font-mono tabular-nums opacity-60">
                    <span>{formatAudioTime(viewTime)}</span>
                    <div
                        onClick={handleProgressClick}
                        className={`flex-1 h-2 -my-0.5 rounded-full relative cursor-pointer ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}
                    >
                        {/* Belgilash rejimida joriy segment ko'k yo'lakcha bilan ko'rsatiladi */}
                        {markMode && fileDuration > 0 && segmentEnd > start && (
                            <div
                                className="absolute inset-y-0 bg-blue-500/25 rounded-full pointer-events-none"
                                style={{ left: `${(start / fileDuration) * 100}%`, width: `${((segmentEnd - start) / fileDuration) * 100}%` }}
                            />
                        )}
                        {/* Sukunat qismi — imtihonda audio jim turadigan vaqt */}
                        {!markMode && silence > 0 && viewDuration > 0 && (
                            <div
                                className="absolute inset-y-0 right-0 bg-amber-400/25 rounded-r-full pointer-events-none"
                                style={{ width: `${(silence / viewDuration) * 100}%` }}
                            />
                        )}
                        <div
                            className={`h-full rounded-full pointer-events-none transition-all duration-75 ${inSilence ? 'bg-amber-400' : 'bg-blue-500'}`}
                            style={{ width: `${viewDuration > 0 ? Math.min(100, (viewTime / viewDuration) * 100) : 0}%` }}
                        />
                    </div>
                    <span>{formatAudioTime(viewDuration)}</span>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <button
                    type="button"
                    onClick={() => playFrom(start, Math.min(segmentEnd || Infinity, start + BOUNDARY_PREVIEW))}
                    disabled={!audioUrl || markMode}
                    className={markBtn}
                    title={`Segment boshidagi ${BOUNDARY_PREVIEW} soniyani eshitish — to'g'ri joydan boshlanyaptimi?`}
                >
                    ▶ boshi
                </button>
                <button
                    type="button"
                    onClick={() => playFrom(Math.max(start, (segmentEnd || 0) - BOUNDARY_PREVIEW), segmentEnd || null)}
                    disabled={!audioUrl || markMode || !(segmentEnd > start)}
                    className={markBtn}
                    title={`Segment oxiridagi ${BOUNDARY_PREVIEW} soniyani eshitish — gap o'rtasidan kesilmadimi?`}
                >
                    ▶ oxiri
                </button>
                {onMark && (
                    <>
                        <button
                            type="button"
                            onClick={() => { setMarkMode(m => !m); stopSilence(); }}
                            disabled={!audioUrl}
                            title="Butun audio bo'ylab yurib, vaqtlarni playhead'dan belgilash"
                            className={`h-6 px-2 rounded-lg border text-[9px] font-black transition active:scale-95 disabled:opacity-30 ${
                                markMode
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : (isDark ? 'border-white/10 hover:bg-white/10 text-gray-300' : 'border-gray-200 hover:bg-white text-gray-600')
                            }`}
                        >
                            Belgilash
                        </button>
                        {markMode && (
                            <>
                                <button type="button" onClick={() => mark('startTime')} className={markBtn} title="Joriy vaqtni boshlanish deb belgilash">
                                    ⇤ Boshlanish
                                </button>
                                <button type="button" onClick={() => mark('endTime')} className={markBtn} title="Joriy vaqtni tugash deb belgilash">
                                    Tugash ⇥
                                </button>
                                <span className="text-[9px] font-mono opacity-40 ml-auto">{toMMSS(absTime)}</span>
                            </>
                        )}
                    </>
                )}
                {inSilence && (
                    <span className="text-[9px] font-black text-amber-500 ml-auto">
                        sukunat {silentElapsed.toFixed(0)}s / {silence}s
                    </span>
                )}
            </div>
        </div>
    );
};

const MediaManager = ({ 
    testData, setTestData, 
    audioMode, setAudioMode, 
    singleAudioUrl, handleSingleAudioUpload, handleSingleAudioUrlChange,
    partAudios, handlePartAudioUpload, handleAudioUrlChange,
    listeningPartCount,
    uploadedMaps, handleMapUpload, handleDeleteMap,
    uploading, uploadingPart, uploadProgress,
    isDark,
    onPassageTimeChange
}) => {
    // Map/diagramma faqat reading va listening testlarida ishlatiladi —
    // writing/speaking uchun bu blok shunchaki shovqin edi.
    const showMaps = testData.type === 'reading' || testData.type === 'listening';
    const hasAnyAudio = audioMode === 'single' ? !!singleAudioUrl : Object.values(partAudios || {}).some(Boolean);

    // Audio uzunligi — "tugash belgilanmagan" va "fayldan tashqarida" holatlarini
    // aniq soniyaga aylantirish uchun kerak. Har part o'z faylidan xabar beradi.
    const [fileDurations, setFileDurations] = useState({});
    const reportDuration = useCallback((index, seconds) => {
        setFileDurations(prev => (prev[index] === seconds ? prev : { ...prev, [index]: seconds }));
    }, []);
    const reportSharedDuration = useCallback((seconds) => {
        setFileDurations(prev => {
            const next = { ...prev };
            let changed = false;
            for (let i = 0; i < 12; i++) { if (next[i] !== seconds) { next[i] = seconds; changed = true; } }
            return changed ? next : prev;
        });
    }, []);

    const passages = testData.passages || EMPTY_PASSAGES;
    // Chegaralar AYNAN imtihondagi qoida bo'yicha hisoblanadi — admin ekranda
    // "qanday belgiladim" emas, "imtihonda qanday eshitiladi" ni ko'radi.
    const partAnalysis = useMemo(() => analyzeListeningParts(
        passages,
        listeningPartCount,
        { fileDurations: Array.from({ length: listeningPartCount }, (_, i) => fileDurations[i] || 0) }
    ), [passages, listeningPartCount, fileDurations]);

    const problemCount = useMemo(() => partAnalysis.reduce((acc, p) => {
        p.issues.forEach(i => { acc[i.level] = (acc[i.level] || 0) + 1; });
        return acc;
    }, {}), [partAnalysis]);

    // Qo'shni partlarni bitta nuqtada uchrashtiradi. Ikkala part ham BIR
    // chaqiruvda yoziladi: ketma-ket ikki chaqiruv bir-birini o'chirib yuborardi.
    const alignBoundary = (i) => {
        const cur = partAnalysis[i];
        const next = partAnalysis[i + 1];
        if (!cur || !next) return;
        // O'rtacha nuqta: ikkala part ham eng kam siljiydi.
        const mid = roundAudioTime((cur.end + next.start) / 2);
        onPassageTimeChange([
            { index: i, patch: { endTime: toMMSS(mid) } },
            { index: i + 1, patch: { startTime: toMMSS(mid) } },
        ]);
    };

    return (
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-50">Media & Fayllar</h3>
                {uploading ? (
                    <span className="flex items-center gap-2 text-[9px] font-black text-blue-500">
                        <span className="w-16 h-1 rounded-full bg-blue-500/15 overflow-hidden">
                            <span className="block h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress || 0}%` }} />
                        </span>
                        {uploadProgress || 0}%
                    </span>
                ) : testData.type === 'listening' && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${hasAnyAudio ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                        {hasAnyAudio ? 'Audio bor' : 'Audio yo\'q'}
                    </span>
                )}
            </div>

            {testData.type === 'listening' && (
                <>
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold opacity-60">Audio Rejimi</label>
                            <div className={`flex p-1 rounded-lg ${isDark ? 'bg-[#181715]' : 'bg-gray-100'}`}>
                                <button 
                                    onClick={() => setAudioMode('single')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${audioMode === 'single' ? 'bg-blue-600 text-white shadow-md' : 'opacity-40 hover:opacity-100'}`}
                                >
                                    Yagona Audio
                                </button>
                                <button 
                                    onClick={() => setAudioMode('multiple')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${audioMode === 'multiple' ? 'bg-blue-600 text-white shadow-md' : 'opacity-40 hover:opacity-100'}`}
                                >
                                    Bo'laklangan
                                </button>
                            </div>
                        </div>

                        {audioMode === 'single' ? (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            className={`w-full h-10 pl-4 pr-9 rounded-xl border outline-none text-xs transition focus:border-blue-500 ${isDark ? 'bg-[#181715] border-white/5' : 'bg-gray-50 border-gray-200'}`}
                                            placeholder="Yagona audio URL..."
                                            value={singleAudioUrl}
                                            onChange={e => handleSingleAudioUrlChange(e.target.value)}
                                        />
                                        {singleAudioUrl && (
                                            <svg className="w-4 h-4 text-green-500 absolute right-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                        )}
                                    </div>
                                    <label className={`h-10 px-4 shrink-0 rounded-xl border flex items-center justify-center cursor-pointer hover:bg-blue-500/10 transition ${isDark ? 'border-white/5' : 'border-gray-200'} ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <input type="file" className="hidden" accept="audio/*" onChange={handleSingleAudioUpload} disabled={uploading} />
                                        {uploading && uploadingPart === 'single' ? (
                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <span className="text-[10px] font-bold">Yuklash</span>
                                        )}
                                    </label>
                                </div>
                                {singleAudioUrl && (
                                    <audio src={getCdnUrl(singleAudioUrl)} controls preload="none" className="w-full h-8" />
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[...Array(listeningPartCount)].map((_, i) => (
                                    <div key={i} className={`p-3 rounded-xl border ${isDark ? 'bg-[#181715] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-bold uppercase opacity-40">Part {i + 1}</p>
                                            <span className={`w-1.5 h-1.5 rounded-full ${partAudios[i] ? 'bg-green-500' : 'bg-gray-400/40'}`} title={partAudios[i] ? "Audio biriktirilgan" : "Audio yo'q"} />
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className={`flex-1 h-8 px-2 rounded-lg border outline-none text-[10px] transition focus:border-blue-500 ${isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-200'}`}
                                                value={partAudios[i] || ""}
                                                onChange={e => handleAudioUrlChange(e.target.value, i)}
                                                placeholder="URL..."
                                            />
                                            <label className={`h-8 px-2 rounded-lg bg-blue-600 text-white flex items-center justify-center cursor-pointer hover:bg-blue-500 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`} title={`Part ${i + 1} audiosini yuklash`}>
                                                <input type="file" className="hidden" accept="audio/*" onChange={e => handlePartAudioUpload(e, i)} disabled={uploading} />
                                                {uploading && uploadingPart === i ? (
                                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </>
            )}

            {/* MAP IMAGES */}
            {showMaps && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <span className="text-xs font-bold opacity-60 block">Map / Diagramma Rasmlari</span>
                            <span className="text-[10px] opacity-35">Yuklangan rasm map_labeling savoliga avtomatik biriktiriladi</span>
                        </div>
                        <label className={`h-8 px-4 shrink-0 rounded-xl border flex items-center justify-center cursor-pointer hover:bg-blue-500/10 transition ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                            <input type="file" className="hidden" accept="image/*" onChange={handleMapUpload} disabled={uploading} />
                            {uploading && uploadingPart === 'map' ? (
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <span className="text-[10px] font-bold">+ Rasm</span>
                            )}
                        </label>
                    </div>

                    {uploadedMaps.length === 0 ? (
                        <div className={`rounded-xl border border-dashed p-3 text-center text-[10px] opacity-40 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            Hozircha rasm yuklanmagan
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {uploadedMaps.map((map, idx) => (
                                <div key={idx} className={`flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-lg border text-[10px] font-medium ${isDark ? 'bg-[#181715] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                    <img src={map.url} alt="" className="w-7 h-7 rounded object-cover bg-black/10" />
                                    <a href={map.url} target="_blank" rel="noreferrer" className="max-w-[110px] truncate hover:text-blue-500" title={map.name}>{map.name}</a>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteMap(idx)}
                                        aria-label="Rasmni o'chirish"
                                        className="w-4 h-4 flex items-center justify-center rounded text-red-500 hover:bg-red-500/10"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* THUMBNAIL */}
            <div className="mb-6">
                <label htmlFor="test-thumbnail" className="text-xs font-bold mb-1.5 block opacity-60">Thumbnail URL</label>
                <div className="flex gap-2">
                    <input
                        id="test-thumbnail"
                        type="text"
                        className={`flex-1 h-10 px-4 rounded-xl border outline-none text-xs transition ${isDark ? 'bg-[#181715] border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`}
                        value={testData.thumbnail || ""}
                        onChange={e => setTestData({ ...testData, thumbnail: e.target.value })}
                        placeholder="Test rasmi URL manzili..."
                    />
                    {testData.thumbnail && (
                        <img
                            src={testData.thumbnail}
                            alt="Thumbnail"
                            className={`w-10 h-10 rounded-xl object-cover border ${isDark ? 'border-white/5' : 'border-gray-200'}`}
                            onError={e => { e.currentTarget.style.opacity = '0.2'; }}
                        />
                    )}
                </div>
            </div>

            {/* AUDIO TIMESTAMPS MANAGER */}
            {testData.type === 'listening' && onPassageTimeChange && (
                <div className="border-t border-gray-100 dark:border-white/5 pt-5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="text-xs font-bold opacity-60">Audio Segmentlari Vaqtlari (Passages Timestamps)</label>
                        {(problemCount.error || problemCount.warning) ? (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                problemCount.error
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}>
                                {problemCount.error ? `${problemCount.error} ta xato` : `${problemCount.warning} ta ogohlantirish`}
                            </span>
                        ) : (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full border bg-green-500/10 text-green-500 border-green-500/20">
                                Chegaralar joyida
                            </span>
                        )}
                    </div>
                    <p className="text-[9px] opacity-35 mb-3">
                        Format: <span className="font-mono">m:ss</span>, <span className="font-mono">m:ss.d</span>, <span className="font-mono">h:mm:ss</span> yoki oddiy soniya.
                        Maydonda ↑/↓ tugmalari {NUDGE_STEP}s (Shift bilan 1s) suradi. Bu yerda ko'ringan vaqt — imtihonda eshitiladigan vaqt.
                    </p>

                    {/* Yagona audio rejimida to'lqin ustida region surib belgilash mumkin */}
                    {audioMode === 'single' && singleAudioUrl && (
                        <div className="mb-3">
                            <PartWaveformEditor
                                key={singleAudioUrl}
                                audioUrl={getCdnUrl(singleAudioUrl)}
                                passages={passages}
                                partCount={listeningPartCount}
                                onChange={onPassageTimeChange}
                                onDuration={reportSharedDuration}
                                isDark={isDark}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {partAnalysis.map((part) => {
                            const i = part.index;
                            const passage = testData.passages?.[i] || {};
                            const partAudioUrl = audioMode === 'single' ? singleAudioUrl : (partAudios[i] || passage.audio || "");
                            const hasError = part.issues.some(x => x.level === 'error');
                            const hasWarning = !hasError && part.issues.length > 0;
                            const misaligned = part.gapAfter || part.overlapAfter;
                            return (
                                <div key={i} className={`p-3 rounded-xl border ${
                                    hasError
                                        ? 'border-red-500/30 bg-red-500/[0.04]'
                                        : hasWarning
                                            ? 'border-amber-500/30 bg-amber-500/[0.04]'
                                            : (isDark ? 'bg-[#181715] border-white/5' : 'bg-gray-50 border-gray-200')
                                }`}>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className="text-[10px] font-bold uppercase opacity-40">Part {i + 1} Vaqti</span>
                                        <span className={`text-[9px] font-bold font-mono tabular-nums px-1.5 py-0.5 rounded ${
                                            hasError ? 'text-red-500 bg-red-500/10' : 'text-blue-500 bg-blue-500/10'
                                        }`}>
                                            {toMMSS(part.start)} → {part.end > part.start ? toMMSS(part.end) : "?"}
                                            {part.duration > 0 ? ` · ${formatAudioTime(part.duration)}` : ""}
                                            {part.silence > 0 ? ` (+${part.silence}s)` : ""}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        <TimeField
                                            label="Boshlash"
                                            title="Part shu soniyadan boshlab eshitiladi"
                                            placeholder="0:00"
                                            value={passage.startTime || ""}
                                            onCommit={(v) => onPassageTimeChange(i, 'startTime', v)}
                                            isDark={isDark}
                                        />
                                        <TimeField
                                            label="Tugash"
                                            title="Part shu soniyada to'xtaydi"
                                            placeholder="7:30"
                                            value={passage.endTime || ""}
                                            onCommit={(v) => onPassageTimeChange(i, 'endTime', v)}
                                            isDark={isDark}
                                        />
                                        <div>
                                            <span className="text-[8px] font-bold uppercase opacity-35 block mb-1" title="Part tugagandan keyin keyingi partgacha necha soniya sukunat qo'shilishi">Kutish (sek)</span>
                                            <input
                                                type="number"
                                                className={`w-full h-8 px-2 rounded-lg border outline-none text-[10px] font-mono tabular-nums ${isDark ? 'bg-[#1f1e1b] border-white/5 focus:border-blue-500' : 'bg-white border-gray-200 focus:border-blue-500'}`}
                                                placeholder="0"
                                                min="0"
                                                value={passage.extraSilentTime !== undefined ? passage.extraSilentTime : ""}
                                                onChange={e => onPassageTimeChange(i, 'extraSilentTime', e.target.value === "" ? "" : Number(e.target.value))}
                                            />
                                            <p className="mt-0.5 text-[8px] font-mono opacity-30">javob uchun pauza</p>
                                        </div>
                                    </div>

                                    {part.issues.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {part.issues.map((issue, k) => (
                                                <li key={k} className={`flex items-start gap-1 text-[9px] font-medium leading-snug ${issue.level === 'error' ? 'text-red-500' : 'text-amber-600 dark:text-amber-500'}`}>
                                                    <span className="shrink-0">{issue.level === 'error' ? '✕' : '!'}</span>
                                                    <span>{issue.message}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {misaligned ? (
                                        <button
                                            type="button"
                                            onClick={() => alignBoundary(i)}
                                            className="mt-2 h-6 px-2 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-500 text-[9px] font-black transition active:scale-95 hover:bg-blue-500/20"
                                            title={`Part ${i + 1} tugashi va Part ${i + 2} boshlanishini bitta nuqtaga keltirish`}
                                        >
                                            ⇄ Part {i + 2} bilan tekislash
                                        </button>
                                    ) : null}

                                    <AudioSegmentPlayer
                                        index={i}
                                        audioUrl={getCdnUrl(partAudioUrl)}
                                        start={part.start}
                                        end={part.end}
                                        cuts={part.cuts}
                                        silence={part.silence}
                                        isDark={isDark}
                                        onMark={(field, value) => onPassageTimeChange(i, field, value)}
                                        onDuration={(d) => reportDuration(i, d)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(MediaManager);

// src/components/PodcastInterface/admin/WaveformEditor.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/plugins/regions";
import TimelinePlugin from "wavesurfer.js/plugins/timeline";
import {
    collection, getDocs, orderBy, query, updateDoc, deleteDoc, doc, writeBatch,
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import "../shared/PodcastStyles.css";

const REGION_COLORS = [
    "rgba(99,102,241,0.35)",
    "rgba(16,185,129,0.30)",
    "rgba(245,158,11,0.30)",
    "rgba(236,72,153,0.28)",
    "rgba(20,184,166,0.30)",
];

function fmtTime(sec) {
    if (!sec && sec !== 0) return "0:00.0";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m}:${String(s).padStart(2, "0")}.${ms}`;
}

export default function WaveformEditor({ podcastId, audioUrl }) {
    const waveRef = useRef(null);
    const wsRef = useRef(null);
    const regionsRef = useRef(null);

    const [segments, setSegments] = useState([]);
    const [selectedIdx, setSelectedIdx] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editText, setEditText] = useState("");
    const [editStartTime, setEditStartTime] = useState(""); // string input
    const [editEndTime, setEditEndTime] = useState("");     // string input
    const [isDirty, setIsDirty] = useState(false);         // saqlalmagan o'zgartirish bor

    // Transport state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [speed, setSpeed] = useState(1);
    const [wsReady, setWsReady] = useState(false);

    // ── Fetch segments ──────────────────────────────────────────────
    useEffect(() => {
        const fetchSegs = async () => {
            const q = query(collection(db, "podcasts", podcastId, "segments"), orderBy("index"));
            const snap = await getDocs(q);
            setSegments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoading(false);
        };
        fetchSegs();
    }, [podcastId]);

    // ── WaveSurfer init ─────────────────────────────────────────────
    useEffect(() => {
        if (!waveRef.current || !audioUrl || loading) return;

        const regions = RegionsPlugin.create();
        regionsRef.current = regions;

        const timeline = TimelinePlugin.create({
            height: 24,
            insertPosition: "beforebegin",
            style: {
                fontSize: "10px",
                color: "rgba(255,255,255,0.45)",
                background: "#0a0e1a",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
            },
            formatTimeCallback: (sec) => {
                if (sec === 0) return "0s";
                const m = Math.floor(sec / 60);
                const s = Math.round(sec % 60);
                return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
            },
        });

        const ws = WaveSurfer.create({
            container: waveRef.current,
            waveColor: "rgba(99,102,241,0.5)",
            progressColor: "rgba(99,102,241,1)",
            cursorColor: "rgba(255,255,255,0.9)",
            cursorWidth: 2,
            height: 140,
            barWidth: 2,
            barRadius: 3,
            barGap: 1,
            url: audioUrl,
            plugins: [timeline, regions],
            normalize: true,
        });
        wsRef.current = ws;

        ws.on("ready", () => {
            setDuration(ws.getDuration());
            setWsReady(true);
            segments.forEach((seg, i) => {
                regions.addRegion({
                    id: seg.id,
                    start: seg.startTime,
                    end: seg.endTime,
                    color: REGION_COLORS[i % REGION_COLORS.length],
                    drag: true,
                    resize: true,
                });
            });
        });

        ws.on("timeupdate", (t) => setCurrentTime(t));
        ws.on("play", () => setIsPlaying(true));
        ws.on("pause", () => setIsPlaying(false));
        ws.on("finish", () => setIsPlaying(false));

        regions.on("region-updated", (region) => {
            setSegments((prev) =>
                prev.map((seg) =>
                    seg.id === region.id
                        ? { ...seg, startTime: parseFloat(region.start.toFixed(2)), endTime: parseFloat(region.end.toFixed(2)) }
                        : seg
                )
            );
        });

        regions.on("region-clicked", (region, e) => {
            e.stopPropagation();
            const idx = segments.findIndex((s) => s.id === region.id);
            if (idx >= 0) {
                setSelectedIdx(idx);
                setEditText(segments[idx].text);
            }
        });

        return () => ws.destroy();
    }, [loading, audioUrl]);

    // ── Transport controls ──────────────────────────────────────────
    const togglePlay = useCallback(() => wsRef.current?.playPause(), []);
    const seek = useCallback((delta) => {
        if (!wsRef.current) return;
        wsRef.current.setTime(Math.max(0, Math.min(wsRef.current.getCurrentTime() + delta, wsRef.current.getDuration())));
    }, []);
    const jumpToSegment = useCallback((idx) => {
        if (!wsRef.current || !segments[idx]) return;
        wsRef.current.setTime(segments[idx].startTime);
        setSelectedIdx(idx);
        setEditText(segments[idx].text);
        setEditStartTime(String(segments[idx].startTime));
        setEditEndTime(String(segments[idx].endTime));
    }, [segments]);
    const playSegment = useCallback((idx) => {
        if (!wsRef.current || !segments[idx]) return;
        const seg = segments[idx];
        wsRef.current.setTime(seg.startTime);
        wsRef.current.play();
        // Auto-stop at segment end
        const stopAt = seg.endTime;
        const check = () => {
            if (wsRef.current && wsRef.current.getCurrentTime() >= stopAt - 0.05) {
                wsRef.current.pause();
            } else {
                requestAnimationFrame(check);
            }
        };
        requestAnimationFrame(check);
    }, [segments]);

    const changeVolume = useCallback((v) => {
        setVolume(v);
        wsRef.current?.setVolume(v);
    }, []);
    const changeSpeed = useCallback((s) => {
        setSpeed(s);
        wsRef.current?.setPlaybackRate(s, true);
    }, []);

    // ── Time input handlers ─────────────────────────────────────────
    const handleStartTimeChange = useCallback((val) => {
        setEditStartTime(val);
        const parsed = parseFloat(val);
        if (isNaN(parsed) || parsed < 0) return;
        setSegments(prev => prev.map((s, i) => i === selectedIdx ? { ...s, startTime: parsed } : s));
        // Move wavesurfer region
        if (regionsRef.current && selectedIdx !== null) {
            const seg = segments[selectedIdx];
            const allRegions = regionsRef.current.getRegions();
            const region = allRegions.find(r => r.id === seg?.id);
            if (region) region.setOptions({ start: parsed });
        }
    }, [selectedIdx, segments]);

    const handleEndTimeChange = useCallback((val) => {
        setEditEndTime(val);
        const parsed = parseFloat(val);
        if (isNaN(parsed) || parsed < 0) return;
        setSegments(prev => prev.map((s, i) => i === selectedIdx ? { ...s, endTime: parsed } : s));
        // Move wavesurfer region
        if (regionsRef.current && selectedIdx !== null) {
            const seg = segments[selectedIdx];
            const allRegions = regionsRef.current.getRegions();
            const region = allRegions.find(r => r.id === seg?.id);
            if (region) region.setOptions({ end: parsed });
        }
    }, [selectedIdx, segments]);

    // ── Unsaved changes guard ──────────────────────────────────────
    // Brauzer refresh / tab yopish / oyna yopish
    useEffect(() => {
        const onBeforeUnload = (e) => {
            if (!isDirty) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [isDirty]);

    // ── Keyboard shortcuts ──────────────────────────────────────────
    useEffect(() => {
        const onKey = (e) => {
            if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
            if (e.code === "Space") { e.preventDefault(); togglePlay(); }
            if (e.code === "ArrowLeft") { e.preventDefault(); seek(-5); }
            if (e.code === "ArrowRight") { e.preventDefault(); seek(5); }
            if (e.code === "ArrowUp") { e.preventDefault(); if (selectedIdx !== null && selectedIdx > 0) jumpToSegment(selectedIdx - 1); }
            if (e.code === "ArrowDown") { e.preventDefault(); if (selectedIdx !== null && selectedIdx < segments.length - 1) jumpToSegment(selectedIdx + 1); }
            if (e.code === "KeyP" && selectedIdx !== null) { e.preventDefault(); playSegment(selectedIdx); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [togglePlay, seek, selectedIdx, jumpToSegment, playSegment, segments.length]);

    // ── Save segment ───────────────────────────────────────────────
    const handleSave = async () => {
        if (selectedIdx === null) return;
        setSaving(true);
        const seg = segments[selectedIdx];
        try {
            await updateDoc(doc(db, "podcasts", podcastId, "segments", seg.id), {
                text: editText,
                startTime: seg.startTime,
                endTime: seg.endTime,
                editedBy: "admin",
            });
            setSegments((prev) => prev.map((s, i) => i === selectedIdx ? { ...s, text: editText, editedBy: "admin" } : s));
        } catch (e) {
            alert("Saqlashda xato: " + e.message);
        } finally {
            setIsDirty(false); // Muvaffaqiyatli saqlandi
            setSaving(false);
        }
    };

    // ── Delete segment ─────────────────────────────────────────────
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (selectedIdx === null) return;
        const seg = segments[selectedIdx];
        const confirmed = window.confirm(
            `#${selectedIdx + 1} segmentni o'chirishni tasdiqlaysizmi?\n"${seg.text.slice(0, 80)}"`
        );
        if (!confirmed) return;

        setDeleting(true);
        try {
            // 1. Firestore'dan o'chirish
            await deleteDoc(doc(db, "podcasts", podcastId, "segments", seg.id));

            // 2. WaveSurfer regionni o'chirish
            if (regionsRef.current) {
                const allRegions = regionsRef.current.getRegions();
                const region = allRegions.find(r => r.id === seg.id);
                if (region) region.remove();
            }

            // 3. Local state'dan o'chirib, qolganlarini re-index qilish
            const newSegments = segments
                .filter((_, i) => i !== selectedIdx)
                .map((s, i) => ({ ...s, index: i }));

            // 4. Qolgan segmentlarning index'ini Firestore'da ham yangilash
            const batch = writeBatch(db);
            newSegments.forEach(s => {
                batch.update(doc(db, "podcasts", podcastId, "segments", s.id), { index: s.index });
            });
            await batch.commit();

            setSegments(newSegments);
            setIsDirty(false); // O'chirildi, tozalandi

            // Keyin kelgan segmentni tanlash
            if (newSegments.length > 0) {
                const nextIdx = Math.min(selectedIdx, newSegments.length - 1);
                setSelectedIdx(nextIdx);
                setEditText(newSegments[nextIdx]?.text || "");
                setEditStartTime(String(newSegments[nextIdx]?.startTime || ""));
                setEditEndTime(String(newSegments[nextIdx]?.endTime || ""));
            } else {
                setSelectedIdx(null);
            }
        } catch (e) {
            alert("O'chirishda xato: " + e.message);
        } finally {
            setDeleting(false);
        }
    };

    // When selectedIdx changes from list click, sync time strings
    useEffect(() => {
        if (selectedIdx !== null && segments[selectedIdx]) {
            setEditStartTime(String(segments[selectedIdx].startTime));
            setEditEndTime(String(segments[selectedIdx].endTime));
        }
    }, [selectedIdx]); // eslint-disable-line


    if (loading) return <div style={{ padding: 40, color: "var(--pod-text-2)" }}>Segmentlar yuklanmoqda...</div>;

    const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
    const selectedSeg = selectedIdx !== null ? segments[selectedIdx] : null;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, background: "#111827", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>

            {/* ── WAVEFORM AREA ─────────────────────────────────────── */}
            <div style={{ padding: "20px 20px 0", background: "#0f1623" }}>
                <div ref={waveRef} style={{ borderRadius: 8, overflow: "hidden" }} />
            </div>

            {/* ── TIMELINE BAR ─────────────────────────────────────── */}
            <div style={{ background: "#0f1623", padding: "8px 20px 0" }}>
                <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99, position: "relative" }}>
                    <div style={{ height: "100%", background: "linear-gradient(90deg, #6366f1, #8b5cf6)", borderRadius: 99, width: `${pct}%`, transition: "width 0.1s linear" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{fmtTime(currentTime)}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{fmtTime(duration)}</span>
                </div>
            </div>

            {/* ── TRANSPORT BAR ──────────────────────────────────────── */}
            <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "12px 20px", background: "#161d2e",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                flexWrap: "wrap",
            }}>
                {/* Time display */}
                <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: "#e2e8f0", minWidth: 90, letterSpacing: 1 }}>
                    {fmtTime(currentTime)}
                </div>

                <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

                {/* Rewind 5s */}
                <button onClick={() => seek(-5)} title="5s orqaga (←)" style={tbtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.41" /><text x="10" y="16" fontSize="8" fill="currentColor" stroke="none">5</text></svg>
                </button>

                {/* Prev segment */}
                <button onClick={() => selectedIdx !== null && jumpToSegment(Math.max(0, selectedIdx - 1))} title="Oldingi segment (↑)" style={tbtn} disabled={selectedIdx === null || selectedIdx === 0}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
                </button>

                {/* Play/Pause */}
                <button onClick={togglePlay} title="Play/Pause (Space)" style={{ ...tbtn, width: 44, height: 44, borderRadius: "50%", background: isPlaying ? "rgba(99,102,241,0.3)" : "#6366f1", color: "white", fontSize: 18 }} disabled={!wsReady}>
                    {isPlaying
                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    }
                </button>

                {/* Play selected segment only */}
                <button onClick={() => selectedIdx !== null && playSegment(selectedIdx)} title="Tanlangan segmentni ijro et (P)" style={{ ...tbtn, background: "rgba(16,185,129,0.15)", color: "#10b981" }} disabled={selectedIdx === null}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    <span style={{ fontSize: 10, marginLeft: 3 }}>SEG</span>
                </button>

                {/* Next segment */}
                <button onClick={() => selectedIdx !== null && jumpToSegment(Math.min(segments.length - 1, selectedIdx + 1))} title="Keyingi segment (↓)" style={tbtn} disabled={selectedIdx === null || selectedIdx === segments.length - 1}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zm-3.5 6L4 6v12z" /></svg>
                </button>

                {/* Forward 5s */}
                <button onClick={() => seek(5)} title="5s oldinga (→)" style={tbtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15A9 9 0 1 1 20 11.57" /><text x="8" y="16" fontSize="8" fill="currentColor" stroke="none">5</text></svg>
                </button>

                <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

                {/* Volume */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)"><path d="M11 5 6 9H2v6h4l5 4V5zm6.07 2.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                    <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e => changeVolume(Number(e.target.value))} style={slider} title="Ovoz balandligi" />
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", minWidth: 24 }}>{Math.round(volume * 100)}%</span>
                </div>

                <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

                {/* Speed */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>TEZLIK</span>
                    {[0.5, 0.75, 1, 1.25, 1.5].map(s => (
                        <button key={s} onClick={() => changeSpeed(s)}
                            style={{ ...tbtn, fontSize: 10, padding: "3px 7px", borderRadius: 6, minWidth: 0, height: 26, background: speed === s ? "#6366f1" : "rgba(255,255,255,0.06)", color: speed === s ? "white" : "rgba(255,255,255,0.5)" }}>
                            {s}x
                        </button>
                    ))}
                </div>

                {/* Segment indicator */}
                <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
                    {selectedIdx !== null ? (
                        <span style={{ color: "#6366f1" }}>
                            #{selectedIdx + 1}/{segments.length} &nbsp;
                            <span style={{ color: "rgba(255,255,255,0.35)" }}>{fmtTime(selectedSeg?.startTime)} → {fmtTime(selectedSeg?.endTime)}</span>
                        </span>
                    ) : (
                        <span>{segments.length} segment</span>
                    )}
                </div>
            </div>

            {/* ── KEYBOARD SHORTCUTS HINT ────────────────────────────── */}
            <div style={{ display: "flex", gap: 16, padding: "6px 20px", background: "#0f1623", flexWrap: "wrap" }}>
                {[["Space", "Play/Pause"], ["←/→", "±5s"], ["↑/↓", "Seg nav"], ["P", "Seg play"], ["Click", "Tanlash"]].map(([k, v]) => (
                    <span key={k} style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                        <kbd style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", marginRight: 4 }}>{k}</kbd>{v}
                    </span>
                ))}
            </div>

            {/* ── BODY: Segment list + Edit panel ───────────────────── */}
            <div style={{ display: "flex", gap: 0, flex: 1, minHeight: 500 }}>

                {/* Segment list */}
                <div style={{ flex: 1, overflowY: "auto", maxHeight: 580, padding: 16, display: "flex", flexDirection: "column", gap: 6, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
                        {segments.length} ta segment
                    </div>
                    {segments.map((seg, i) => (
                        <div
                            key={seg.id}
                            onClick={() => { setSelectedIdx(i); setEditText(seg.text); wsRef.current?.setTime(seg.startTime); }}
                            style={{
                                padding: "10px 14px",
                                cursor: "pointer",
                                borderRadius: 10,
                                border: `1px solid ${selectedIdx === i ? "#6366f1" : "rgba(255,255,255,0.06)"}`,
                                background: selectedIdx === i ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.02)",
                                transition: "all 0.15s",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <span style={{
                                        fontSize: 10, fontWeight: 700, fontFamily: "monospace",
                                        background: REGION_COLORS[i % REGION_COLORS.length].replace("0.3", "0.8").replace("0.35", "0.8").replace("0.28", "0.8"),
                                        padding: "2px 7px", borderRadius: 99, color: "white",
                                    }}>#{i + 1}</span>
                                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
                                        {fmtTime(seg.startTime)} → {fmtTime(seg.endTime)}
                                    </span>
                                </div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    {seg.editedBy === "admin" && <span style={{ fontSize: 9, color: "#10b981" }}>✓ edited</span>}
                                    {seg.editedBy === "gibrid-align" && <span style={{ fontSize: 9, color: "#6366f1" }}>↔ aligned</span>}
                                    {seg.editedBy === "auto-merged" && <span style={{ fontSize: 9, color: "#f59e0b" }}>⊕ merged</span>}
                                    {/* Play this segment mini btn */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); playSegment(i); }}
                                        style={{ ...tbtn, width: 22, height: 22, borderRadius: "50%", padding: 0, background: "rgba(99,102,241,0.2)" }}
                                        title="Bu segmentni ijro et"
                                    >
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                    </button>
                                </div>
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: selectedIdx === i ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                                {seg.text}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Edit panel */}
                <div style={{ width: 400, flexShrink: 0, padding: 20, display: "flex", flexDirection: "column", gap: 14, background: "#0f1623", position: "sticky", top: 0, height: "fit-content" }}>
                    {selectedIdx !== null ? (
                        <>
                            {/* Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
                                    Segment #{selectedIdx + 1}
                                </span>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <button onClick={() => jumpToSegment(Math.max(0, selectedIdx - 1))} style={{ ...tbtn, fontSize: 12 }} disabled={selectedIdx === 0}>‹ Oldingi</button>
                                    <button onClick={() => jumpToSegment(Math.min(segments.length - 1, selectedIdx + 1))} style={{ ...tbtn, fontSize: 12 }} disabled={selectedIdx === segments.length - 1}>Keyingi ›</button>
                                </div>
                            </div>

                            {/* Editable time inputs + play */}
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                {/* Start time */}
                                <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(99,102,241,0.12)", borderRadius: 8, padding: "2px 8px 2px 4px", border: "1px solid rgba(99,102,241,0.3)" }}>
                                    <span style={{ fontSize: 11, color: "#818cf8" }}>▶</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        value={editStartTime}
                                        onChange={e => { handleStartTimeChange(e.target.value); setIsDirty(true); }}
                                        style={{
                                            width: 70, background: "transparent", border: "none", outline: "none",
                                            fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#818cf8",
                                            textAlign: "center",
                                        }}
                                        title="Boshlash vaqti (sekund)"
                                    />
                                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>s</span>
                                </div>

                                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>→</span>

                                {/* End time */}
                                <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(99,102,241,0.12)", borderRadius: 8, padding: "2px 8px 2px 4px", border: "1px solid rgba(99,102,241,0.3)" }}>
                                    <span style={{ fontSize: 11, color: "#818cf8" }}>⏹</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        value={editEndTime}
                                        onChange={e => { handleEndTimeChange(e.target.value); setIsDirty(true); }}
                                        style={{
                                            width: 70, background: "transparent", border: "none", outline: "none",
                                            fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#818cf8",
                                            textAlign: "center",
                                        }}
                                        title="Tugash vaqti (sekund)"
                                    />
                                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>s</span>
                                </div>

                                {/* Duration badge */}
                                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>
                                    ({((selectedSeg?.endTime || 0) - (selectedSeg?.startTime || 0)).toFixed(2)}s)
                                </span>

                                <button onClick={() => playSegment(selectedIdx)}
                                    style={{ ...tbtn, marginLeft: "auto", background: "rgba(16,185,129,0.15)", color: "#10b981", padding: "4px 12px", fontSize: 12, borderRadius: 8 }}>
                                    ▶ Ijro (P)
                                </button>
                            </div>

                            {/* Textarea */}
                            <textarea
                                value={editText}
                                onChange={(e) => { setEditText(e.target.value); setIsDirty(true); }}
                                rows={10}
                                style={{
                                    width: "100%", boxSizing: "border-box",
                                    background: "rgba(255,255,255,0.04)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 10, color: "#e2e8f0",
                                    fontSize: 14, lineHeight: 1.7,
                                    padding: "12px 14px", resize: "vertical",
                                    fontFamily: "system-ui, sans-serif",
                                    outline: "none",
                                }}
                                onFocus={e => e.target.style.borderColor = "#6366f1"}
                                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                                placeholder="Segment matni..."
                            />

                            {/* Actions */}
                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    style={{
                                        flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                                        background: saving ? "rgba(99,102,241,0.3)" : "#6366f1",
                                        color: "white", fontWeight: 700, fontSize: 14, cursor: saving ? "wait" : "pointer",
                                    }}
                                >
                                    {saving ? "⏳ Saqlanmoqda..." : "💾 Saqlash"}
                                </button>
                                <button
                                    onClick={() => { setEditText(selectedSeg?.text || ""); }}
                                    style={{ ...tbtn, padding: "10px 16px", borderRadius: 10, fontSize: 13 }}
                                    title="O'zgarishlarni bekor qilish"
                                >
                                    ↩ Reset
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    style={{
                                        ...tbtn,
                                        padding: "10px 14px", borderRadius: 10, fontSize: 13,
                                        background: deleting ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.15)",
                                        color: "#f87171",
                                        border: "1px solid rgba(239,68,68,0.3)",
                                    }}
                                    title="Segmentni o'chirish"
                                >
                                    {deleting ? "⏳" : "🗑"}
                                </button>
                            </div>

                            {/* Word count */}
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "right" }}>
                                {editText.trim().split(/\s+/).filter(Boolean).length} so'z
                            </div>
                        </>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, flex: 1, opacity: 0.4, padding: 40 }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                            <p style={{ color: "#e2e8f0", fontSize: 13, textAlign: "center", margin: 0 }}>
                                Segmentni tanlang<br />
                                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>ro'yxatdan yoki waveformdan</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Shared style for transport buttons
const tbtn = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 36, height: 36, borderRadius: 8, border: "none",
    background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)",
    cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
    fontSize: 14,
};

const slider = {
    WebkitAppearance: "none", appearance: "none",
    width: 80, height: 3, borderRadius: 99,
    background: "rgba(255,255,255,0.2)", outline: "none", cursor: "pointer",
};

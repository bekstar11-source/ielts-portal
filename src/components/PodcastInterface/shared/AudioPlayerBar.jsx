// src/components/PodcastInterface/shared/AudioPlayerBar.jsx
// Segment-based mini player — har segment alohida qisqa audio faylday ko'rsatiladi

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, RefreshCw } from "lucide-react";
import "./PodcastStyles.css";

function fmt(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Props:
 *  isPlaying       - bool
 *  onTogglePlay    - fn
 *  onRewind        - fn  (3s orqaga, lekin segmentdan chiqmaydi)
 *  onReplay        - fn  (segmentni boshidan)
 *  currentIndex    - number  (joriy segment indeksi)
 *  totalSegments   - number
 *  audioRef        - React ref to <audio> element
 *  segStartTime    - number  (segment.startTime, soniyada)
 *  segEndTime      - number  (segment.endTime, soniyada)
 */
export default function AudioPlayerBar({
    isPlaying,
    onTogglePlay,
    onRewind,
    onReplay,
    currentIndex,
    totalSegments,
    audioRef,
    segStartTime = 0,
    segEndTime = 0,
}) {
    const [relTime, setRelTime] = useState(0);    // joriy vaqt (segmentga nisbatan)
    const segDuration = Math.max(0, segEndTime - segStartTime); // segment davomiyligi
    const barRef = useRef(null);
    const rafRef = useRef(null);

    // ── Real-time vaqtni kuzatish ──────────────────
    useEffect(() => {
        const audio = audioRef?.current;
        if (!audio) return;

        let interval;
        if (isPlaying) {
            // Har 50ms da progressni yangilaymiz
            interval = setInterval(() => {
                const current = audio.currentTime || 0;
                const rel = Math.max(0, Math.min(current - segStartTime, segDuration));
                setRelTime(rel);
            }, 50);
        } else {
            // Paused: to'xtagan joyini qayd etamiz
            const current = audio.currentTime || 0;
            const rel = Math.max(0, Math.min(current - segStartTime, segDuration));
            setRelTime(rel);
        }

        return () => { if (interval) clearInterval(interval); };
    }, [isPlaying, audioRef, segStartTime, segDuration]);

    // Yangi segment boshlanganda progress 0 ga qaytsin
    useEffect(() => { setRelTime(0); }, [currentIndex]);

    // ── Progress bar bosish – seek ──────────────────
    const handleBarClick = (e) => {
        const audio = audioRef?.current;
        if (!audio || segDuration <= 0) return;
        const rect = barRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audio.currentTime = segStartTime + pct * segDuration;
    };

    const pct = segDuration > 0 ? (relTime / segDuration) * 100 : 0;

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "var(--pod-surface-2)",
            border: "1px solid var(--pod-border)",
            borderRadius: 12, padding: "12px 16px",
        }}>
            {/* ─ Play / Pause ─ */}
            <button
                onClick={onTogglePlay}
                title="Space — ijro/pauza"
                style={{
                    width: 38, height: 38, borderRadius: "50%", border: "none",
                    background: "#6366f1",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0,
                    boxShadow: "0 0 16px rgba(99,102,241,0.35)",
                    transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
                {isPlaying
                    ? <Pause size={16} color="white" />
                    : <Play size={16} color="white" style={{ marginLeft: 2 }} />
                }
            </button>

            {/* ─ Rewind 3s ─ */}
            <button
                onClick={onRewind}
                title="R — 3 soniya orqaga"
                style={{
                    display: "flex", alignItems: "center", gap: 4,
                    background: "none", border: "none",
                    color: "var(--pod-text-2)", cursor: "pointer",
                    padding: "6px 4px", fontSize: 12, fontFamily: "inherit",
                    transition: "color 0.15s", flexShrink: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--pod-text)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--pod-text-2)"}
            >
                <RotateCcw size={14} />
                <span>-3s</span>
            </button>

            {/* ─ Replay ─ */}
            <button
                onClick={onReplay}
                title="Shift+R — boshidan"
                style={{
                    display: "flex", alignItems: "center",
                    background: "none", border: "none",
                    color: "var(--pod-text-2)", cursor: "pointer",
                    padding: "6px 4px",
                    transition: "color 0.15s", flexShrink: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--pod-text)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--pod-text-2)"}
            >
                <RefreshCw size={14} />
            </button>

            {/* ─ Progress area ─ */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                {/* Time row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--pod-text-2)", fontVariantNumeric: "tabular-nums" }}>
                        {fmt(relTime)}
                    </span>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--pod-text-2)", fontVariantNumeric: "tabular-nums" }}>
                        {fmt(segDuration)}
                    </span>
                </div>

                {/* Seekable progress bar */}
                <div
                    ref={barRef}
                    onClick={handleBarClick}
                    style={{
                        height: 5, background: "var(--pod-surface-3)",
                        borderRadius: 99, overflow: "hidden", cursor: "pointer",
                        position: "relative",
                    }}
                    title="Vaqtni o'zgartirish uchun bosing"
                >
                    <div style={{
                        height: "100%", borderRadius: 99,
                        background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                        width: `${pct}%`,
                        transition: isPlaying ? "none" : "width 0.15s",
                    }} />
                </div>
            </div>
        </div>
    );
}

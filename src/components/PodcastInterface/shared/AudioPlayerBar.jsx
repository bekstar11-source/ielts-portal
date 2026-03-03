// src/components/PodcastInterface/shared/AudioPlayerBar.jsx
import React from "react";
import { Play, Pause, RotateCcw, RefreshCw } from "lucide-react";
import "./PodcastStyles.css";

export default function AudioPlayerBar({ isPlaying, onTogglePlay, onRewind, onReplay, currentSegment, totalSegments, currentIndex }) {
    return (
        <div className="pod-audio-bar">
            <audio style={{ display: "none" }} />

            {/* Play / Pause */}
            <button className="pod-play-btn" onClick={onTogglePlay} title="Space - ijro/to'xtat">
                {isPlaying ? <Pause /> : <Play />}
            </button>

            {/* Rewind */}
            <button
                className="pod-btn pod-btn-ghost"
                style={{ padding: "8px 12px" }}
                onClick={onRewind}
                title="R - 3 soniya orqaga"
            >
                <RotateCcw size={16} />
                <span style={{ fontSize: 12 }}>-3s</span>
            </button>

            {/* Replay */}
            <button
                className="pod-btn pod-btn-ghost"
                style={{ padding: "8px 12px" }}
                onClick={onReplay}
                title="Shift+R - qayta boshlash"
            >
                <RefreshCw size={16} />
            </button>

            {/* Progress */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                <div
                    style={{
                        flex: 1, height: 4, background: "var(--pod-surface-3)",
                        borderRadius: 99, overflow: "hidden"
                    }}
                >
                    <div
                        style={{
                            height: "100%",
                            background: "linear-gradient(90deg, var(--pod-accent), var(--pod-accent-2))",
                            borderRadius: 99,
                            width: `${totalSegments > 0 ? ((currentIndex + 1) / totalSegments) * 100 : 0}%`,
                            transition: "width 0.4s ease"
                        }}
                    />
                </div>
                <span style={{ fontSize: 12, color: "var(--pod-text-2)", whiteSpace: "nowrap" }}>
                    {currentIndex + 1} / {totalSegments}
                </span>
            </div>

            {/* Keyboard hints */}
            <div className="pod-shortcut-hint">
                <span className="pod-shortcut-key">Space</span>
                <span className="pod-shortcut-key">R</span>
                <span className="pod-shortcut-key">Shift+R</span>
            </div>
        </div>
    );
}

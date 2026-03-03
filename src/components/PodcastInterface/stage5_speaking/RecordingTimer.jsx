// src/components/PodcastInterface/stage5_speaking/RecordingTimer.jsx
import React, { useState, useEffect, useRef } from "react";
import "../shared/PodcastStyles.css";

export default function RecordingTimer({ maxSeconds, onExpire }) {
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setElapsed((e) => {
                if (e >= maxSeconds - 1) {
                    clearInterval(intervalRef.current);
                    onExpire();
                    return maxSeconds;
                }
                return e + 1;
            });
        }, 1000);
        return () => clearInterval(intervalRef.current);
    }, [maxSeconds, onExpire]);

    const remaining = maxSeconds - elapsed;
    const pct = (elapsed / maxSeconds) * 100;

    const format = (s) =>
        `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 220 }}>
            <span className={`pod-timer ${remaining < 30 ? "urgent" : ""}`} style={{ fontSize: 32 }}>
                {format(elapsed)}
            </span>
            <div style={{ width: "100%", height: 6, background: "var(--pod-surface-3)", borderRadius: 99 }}>
                <div
                    style={{
                        height: "100%",
                        background: remaining < 30 ? "var(--pod-error)" : "var(--pod-accent)",
                        borderRadius: 99,
                        width: `${pct}%`,
                        transition: "width 1s linear, background 0.3s",
                    }}
                />
            </div>
            <span style={{ fontSize: 12, color: remaining < 30 ? "var(--pod-error)" : "var(--pod-text-2)" }}>
                {format(remaining)} qoldi
            </span>
        </div>
    );
}

// src/components/PodcastInterface/stage5_speaking/SpeakingScoreCard.jsx
import React, { useEffect, useState } from "react";
import "../shared/PodcastStyles.css";

const CRITERIA = [
    { key: "fluency", label: "Ravonlik (Fluency)", icon: "🌊" },
    { key: "lexical", label: "Lug'at boyligi (Lexical)", icon: "📚" },
    { key: "grammar", label: "Grammatika (Grammar)", icon: "✏️" },
    { key: "pronunciation", label: "Talaffuz (Pronunciation)", icon: "🔊" },
];

function ScoreBar({ score }) {
    const [width, setWidth] = useState(0);
    const pct = ((score - 1) / 8) * 100;

    useEffect(() => {
        const t = setTimeout(() => setWidth(pct), 100);
        return () => clearTimeout(t);
    }, [pct]);

    const color = score >= 7 ? "var(--pod-success)" : score >= 5 ? "var(--pod-accent)" : "var(--pod-warning)";

    return (
        <div className="pod-score-bar-track">
            <div
                className="pod-score-bar-fill"
                style={{ width: `${width}%`, background: color }}
            />
        </div>
    );
}

export default function SpeakingScoreCard({ scores }) {
    return (
        <div className="pod-card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 16, color: "var(--pod-text)" }}>🎤 Nutq Natijasi</h3>
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: "var(--pod-accent)" }}>
                        {scores.overall}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--pod-text-2)" }}>IELTS Band</div>
                </div>
            </div>

            {CRITERIA.map(({ key, label, icon }) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "var(--pod-text-2)" }}>
                            {icon} {label}
                        </span>
                        <span style={{ fontWeight: 700, color: "var(--pod-text)" }}>{scores[key]}</span>
                    </div>
                    <ScoreBar score={scores[key]} />
                    {scores.feedback?.[key] && (
                        <p style={{ margin: 0, fontSize: 12, color: "var(--pod-muted)", lineHeight: 1.5 }}>
                            {scores.feedback[key]}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}

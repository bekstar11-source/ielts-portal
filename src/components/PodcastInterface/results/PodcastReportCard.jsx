// src/components/PodcastInterface/results/PodcastReportCard.jsx
import React, { useEffect, useState } from "react";
import "../shared/PodcastStyles.css";

const SKILLS = [
    { key: "listening", label: "Listening Comprehension", icon: "🎧", desc: "MCQ + Gap Fill" },
    { key: "accuracy", label: "Accuracy & Spelling", icon: "✍️", desc: "Dictation" },
    { key: "vocabulary", label: "Vocabulary", icon: "🧠", desc: "Vocab Exam" },
    { key: "speaking", label: "Speaking & Pronunciation", icon: "🗣️", desc: "AI Evaluation" },
];

function BandBar({ band }) {
    const [width, setWidth] = useState(0);
    const pct = ((band - 1) / 8) * 100;

    useEffect(() => {
        const t = setTimeout(() => setWidth(pct), 150);
        return () => clearTimeout(t);
    }, [pct]);

    const getColor = (b) => {
        if (b >= 7) return "var(--pod-success)";
        if (b >= 5.5) return "var(--pod-accent)";
        if (b >= 4) return "var(--pod-warning)";
        return "var(--pod-error)";
    };

    return (
        <div className="pod-score-bar-track">
            <div
                className="pod-score-bar-fill"
                style={{ width: `${width}%`, background: getColor(band) }}
            />
        </div>
    );
}

function getBandLabel(band) {
    if (band >= 8.5) return "Expert";
    if (band >= 7) return "Good User";
    if (band >= 5.5) return "Competent";
    if (band >= 4) return "Limited";
    return "Basic";
}

export default function PodcastReportCard({ bands, podcastTitle, onClose }) {
    const [show, setShow] = useState(false);
    useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

    if (!bands) return null;

    return (
        <div
            className="pod-animate-in"
            style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 540, margin: "0 auto" }}
        >
            {/* Header */}
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
                <h2 style={{ color: "var(--pod-text)", margin: "0 0 4px" }}>Yakuniy Natija</h2>
                {podcastTitle && (
                    <p style={{ color: "var(--pod-text-2)", fontSize: 13, margin: 0 }}>"{podcastTitle}"</p>
                )}
            </div>

            {/* Overall band */}
            <div
                style={{
                    background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(129,140,248,0.05))",
                    border: "1px solid var(--pod-border-active)",
                    borderRadius: "var(--pod-radius-lg)",
                    padding: "32px",
                    textAlign: "center",
                }}
            >
                <div style={{ fontSize: 64, fontWeight: 900, color: "var(--pod-accent)", lineHeight: 1, letterSpacing: -2 }}>
                    {bands.overall}
                </div>
                <div style={{ fontSize: 14, color: "var(--pod-text-2)", marginTop: 8 }}>
                    IELTS Band Score — {getBandLabel(bands.overall)}
                </div>
            </div>

            {/* Skills breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {SKILLS.map(({ key, label, icon, desc }) => (
                    <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--pod-text)" }}>
                                    {icon} {label}
                                </span>
                                <span style={{ fontSize: 11, color: "var(--pod-muted)", marginLeft: 8 }}>{desc}</span>
                            </div>
                            <span style={{ fontSize: 20, fontWeight: 800, color: "var(--pod-text)" }}>
                                {bands[key]}
                            </span>
                        </div>
                        <BandBar band={bands[key]} />
                    </div>
                ))}
            </div>

            {/* Motivation */}
            <div
                className="pod-card"
                style={{ textAlign: "center", background: "var(--pod-surface)", borderColor: "var(--pod-border)" }}
            >
                <p style={{ margin: 0, fontSize: 14, color: "var(--pod-text-2)", lineHeight: 1.7 }}>
                    {bands.overall >= 7
                        ? "🌟 Ajoyib natija! Siz ajoyib taraqqiyot qilmoqdasiz."
                        : bands.overall >= 5.5
                            ? "💪 Yaxshi natija! Davom eting, siz oldinga bormoqdasiz."
                            : "🚀 Boshlang'ich daraja. Har kuni mashq qilib, natijangizni yaxshilang!"}
                </p>
            </div>

            {onClose && (
                <button className="pod-btn pod-btn-primary" style={{ alignSelf: "center" }} onClick={onClose}>
                    Dashboard ga qaytish
                </button>
            )}
        </div>
    );
}

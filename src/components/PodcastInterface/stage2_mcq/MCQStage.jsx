// src/components/PodcastInterface/stage2_mcq/MCQStage.jsx
import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import "../shared/PodcastStyles.css";

const LETTERS = ["A", "B", "C", "D"];

export default function MCQStage({ podcastId, audioUrl, onComplete }) {
    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const audioRef = useRef(null);
    const [isHintPlaying, setIsHintPlaying] = useState(false);

    useEffect(() => {
        if (!podcastId) return;
        const fetch = async () => {
            const q = query(collection(db, "podcasts", podcastId, "mcqQuestions"), orderBy("index"));
            const snap = await getDocs(q);
            setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoading(false);
        };
        fetch();
    }, [podcastId]);

    const currentQ = questions[current];

    const handleSelect = (idx) => {
        if (showResult) return;
        setSelected(idx);
    };

    const handleConfirm = () => {
        if (selected === null) return;
        setShowResult(true);
        const isCorrect = selected === currentQ.correctIndex;
        setAnswers((prev) => [...prev, { selected, correct: currentQ.correctIndex, isCorrect }]);
    };

    const handleNext = () => {
        if (current < questions.length - 1) {
            setCurrent((c) => c + 1);
            setSelected(null);
            setShowResult(false);
        } else {
            const correctCount = [...answers, { isCorrect: selected === currentQ.correctIndex }].filter(
                (a) => a.isCorrect
            ).length;
            onComplete({ correct: correctCount, total: questions.length });
        }
    };

    // Audio hint — aynan audioHintTime dan boshlab o'ynash
    const handleHint = () => {
        if (!audioRef.current || currentQ?.audioHintTime == null) return;
        audioRef.current.src = audioUrl;
        audioRef.current.currentTime = currentQ.audioHintTime;
        audioRef.current.play();
        setIsHintPlaying(true);
        audioRef.current.onended = () => setIsHintPlaying(false);
    };

    if (loading) return <div style={{ padding: 40, color: "var(--pod-text-2)" }}>Yuklanmoqda...</div>;
    if (!currentQ) return null;

    const progressPct = ((current + 1) / questions.length) * 100;

    return (
        <div className="pod-animate-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <audio ref={audioRef} style={{ display: "none" }} />

            {/* Progress */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, height: 4, background: "var(--pod-surface-3)", borderRadius: 99 }}>
                    <div
                        style={{
                            height: "100%",
                            background: "linear-gradient(90deg, var(--pod-accent), var(--pod-accent-2))",
                            borderRadius: 99,
                            width: `${progressPct}%`,
                            transition: "width 0.4s ease",
                        }}
                    />
                </div>
                <span style={{ fontSize: 12, color: "var(--pod-text-2)" }}>
                    {current + 1} / {questions.length}
                </span>
            </div>

            {/* Question */}
            <div className="pod-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0, flex: 1 }}>
                        {currentQ.question}
                    </p>
                    {/* Audio hint button */}
                    {currentQ.audioHintTime != null && (
                        <button
                            className="pod-btn pod-btn-ghost"
                            style={{ padding: "8px 12px", marginLeft: 12, flexShrink: 0 }}
                            onClick={handleHint}
                            title="Javob aytilgan joydan eshitish"
                        >
                            {isHintPlaying ? "🔊" : "🎧"}
                        </button>
                    )}
                </div>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {currentQ.options.map((opt, idx) => {
                    let cls = "pod-mcq-option";
                    if (showResult) {
                        if (idx === currentQ.correctIndex) cls += " correct";
                        else if (idx === selected && selected !== currentQ.correctIndex) cls += " incorrect";
                    } else if (idx === selected) {
                        cls += " selected";
                    }

                    return (
                        <div key={idx} className={cls} onClick={() => handleSelect(idx)}>
                            <span
                                style={{
                                    width: 28, height: 28, borderRadius: "50%",
                                    background: "var(--pod-surface-3)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontWeight: 700, fontSize: 13, flexShrink: 0
                                }}
                            >
                                {LETTERS[idx]}
                            </span>
                            <span style={{ fontSize: 15 }}>{opt}</span>
                            {showResult && idx === currentQ.correctIndex && (
                                <span style={{ marginLeft: "auto", color: "var(--pod-success)" }}>✓</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
                {!showResult ? (
                    <button
                        className="pod-btn pod-btn-primary"
                        onClick={handleConfirm}
                        disabled={selected === null}
                    >
                        Tasdiqlash
                    </button>
                ) : (
                    <button className="pod-btn pod-btn-primary" onClick={handleNext}>
                        {current < questions.length - 1 ? "Keyingi savol →" : "Yakunlash"}
                    </button>
                )}
            </div>
        </div>
    );
}

// src/components/PodcastInterface/stage2_mcq/MCQStage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
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
    const [isHintPlaying, setIsHintPlaying] = useState(false);
    const [hintProgress, setHintProgress] = useState(0);     // 0–100 %
    const audioRef = useRef(null);
    const hintTimer = useRef(null);

    // ── Data fetch ────────────────────────────────────────────
    useEffect(() => {
        if (!podcastId) return;
        const fetch = async () => {
            const q = query(
                collection(db, "podcasts", podcastId, "mcqQuestions"),
                orderBy("index")
            );
            const snap = await getDocs(q);
            setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoading(false);
        };
        fetch();
    }, [podcastId]);

    // ── Keyboard shortcuts ────────────────────────────────────
    const handleKeyDown = useCallback(
        (e) => {
            if (showResult) {
                if (e.key === "Enter" || e.key === "ArrowRight") handleNext();
                return;
            }
            if (e.key === "1" || e.key === "a" || e.key === "A") setSelected(0);
            if (e.key === "2" || e.key === "b" || e.key === "B") setSelected(1);
            if (e.key === "3" || e.key === "c" || e.key === "C") setSelected(2);
            if (e.key === "4" || e.key === "d" || e.key === "D") setSelected(3);
            if (e.key === "Enter" && selected !== null) handleConfirm();
            if (e.key === "h" || e.key === "H") handleHint();
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [showResult, selected]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // ── Cleanup hint timer on question change ─────────────────
    useEffect(() => {
        setIsHintPlaying(false);
        setHintProgress(0);
        clearInterval(hintTimer.current);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
        }
    }, [current]);

    // ── Current question ───────────────────────────────────────
    const currentQ = questions[current];

    // ── Handlers ──────────────────────────────────────────────
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
            // Oxirgi savol — yakunlash
            const all = [...answers];
            // Ohirgi savol allaqachon answers ga qo'shilgan (handleConfirm da)
            const correctCount = all.filter((a) => a.isCorrect).length;
            onComplete({ correct: correctCount, total: questions.length });
        }
    };

    const handleHint = () => {
        if (!audioRef.current || currentQ?.audioHintTime == null) return;
        if (isHintPlaying) {
            audioRef.current.pause();
            setIsHintPlaying(false);
            clearInterval(hintTimer.current);
            return;
        }
        audioRef.current.src = audioUrl;
        audioRef.current.currentTime = currentQ.audioHintTime;
        audioRef.current.play();
        setIsHintPlaying(true);
        setHintProgress(0);

        const hintDuration = 15; // max 15 soniya ko'rsatib barini aniqlash uchun
        const startTime = currentQ.audioHintTime;
        hintTimer.current = setInterval(() => {
            if (!audioRef.current) return;
            const elapsed = audioRef.current.currentTime - startTime;
            const pct = Math.min((elapsed / hintDuration) * 100, 100);
            setHintProgress(pct);
        }, 100);

        audioRef.current.onended = () => {
            setIsHintPlaying(false);
            setHintProgress(100);
            clearInterval(hintTimer.current);
        };
    };

    // ── Empty / loading state ─────────────────────────────────
    if (loading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 40, alignItems: "center" }}>
                <div className="pod-spinner" />
                <p style={{ color: "var(--pod-text-2)" }}>Savollar yuklanmoqda...</p>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="pod-card" style={{ textAlign: "center", padding: 56 }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
                <h3 style={{ color: "var(--pod-text)", margin: "0 0 8px" }}>
                    Hali savollar qo'shilmagan
                </h3>
                <p style={{ color: "var(--pod-muted)", margin: "0 0 24px", fontSize: 14 }}>
                    Admin panel orqali MCQ savollarini qo'shing
                </p>
                <button className="pod-btn pod-btn-primary" onClick={() => onComplete({ correct: 0, total: 0 })}>
                    Keyingi bosqichga o'tish →
                </button>
            </div>
        );
    }

    const progressPct = ((current + 1) / questions.length) * 100;
    const correctSoFar = answers.filter((a) => a.isCorrect).length;
    const isLastQuestion = current === questions.length - 1;

    return (
        <div className="pod-animate-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <audio ref={audioRef} style={{ display: "none" }} />

            {/* ── Score + progress bar ─────────────────── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, height: 6, background: "var(--pod-surface-3)", borderRadius: 99 }}>
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
                <span style={{ fontSize: 12, color: "var(--pod-text-2)", whiteSpace: "nowrap" }}>
                    {current + 1} / {questions.length}
                </span>
                {answers.length > 0 && (
                    <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                        background: "rgba(16,185,129,0.12)", color: "var(--pod-success)",
                    }}>
                        ✓ {correctSoFar}
                    </span>
                )}
            </div>

            {/* ── Question card ────────────────────────── */}
            <div className="pod-card" style={{ gap: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 11, color: "var(--pod-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>
                            Savol {current + 1}
                        </span>
                        <p style={{ fontSize: 16, lineHeight: 1.7, margin: "8px 0 0", color: "var(--pod-text)" }}>
                            {currentQ.question}
                        </p>
                    </div>

                    {/* Audio hint button */}
                    {currentQ.audioHintTime != null && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                            <button
                                className="pod-btn pod-btn-ghost"
                                style={{
                                    padding: "10px 14px", fontSize: 20,
                                    background: isHintPlaying ? "rgba(99,102,241,0.15)" : undefined,
                                    borderColor: isHintPlaying ? "var(--pod-accent)" : undefined,
                                }}
                                onClick={handleHint}
                                title="Javob aytilgan joydan eshitish (H)"
                            >
                                {isHintPlaying ? "⏸" : "🎧"}
                            </button>
                            {/* Hint progress mini bar */}
                            {isHintPlaying && (
                                <div style={{ width: 44, height: 2, background: "var(--pod-border)", borderRadius: 99 }}>
                                    <div style={{
                                        height: "100%", borderRadius: 99,
                                        background: "var(--pod-accent)",
                                        width: `${hintProgress}%`,
                                        transition: "width 0.1s linear",
                                    }} />
                                </div>
                            )}
                            <span style={{ fontSize: 10, color: "var(--pod-muted)" }}>H</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Options ──────────────────────────────── */}
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
                        <div
                            key={idx}
                            className={cls}
                            onClick={() => handleSelect(idx)}
                            style={{ cursor: showResult ? "default" : "pointer" }}
                        >
                            {/* Letter badge */}
                            <span style={{
                                width: 28, height: 28, borderRadius: "50%",
                                background: (showResult && idx === currentQ.correctIndex)
                                    ? "var(--pod-success)"
                                    : (showResult && idx === selected && selected !== currentQ.correctIndex)
                                        ? "var(--pod-error)"
                                        : (idx === selected ? "var(--pod-accent)" : "var(--pod-surface-3)"),
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontWeight: 700, fontSize: 13, flexShrink: 0,
                                color: (showResult || idx === selected) ? "white" : "var(--pod-text-2)",
                                transition: "background 0.2s",
                            }}>
                                {LETTERS[idx]}
                            </span>

                            <span style={{ fontSize: 15, flex: 1 }}>{opt}</span>

                            {/* Keyboard shortcut hint (only before result) */}
                            {!showResult && (
                                <kbd style={{
                                    fontSize: 10, opacity: 0.35,
                                    background: "var(--pod-surface-3)",
                                    padding: "2px 6px", borderRadius: 4, fontFamily: "monospace",
                                }}>
                                    {idx + 1}
                                </kbd>
                            )}

                            {/* Result icons */}
                            {showResult && idx === currentQ.correctIndex && (
                                <span style={{ marginLeft: "auto", color: "var(--pod-success)", fontSize: 18 }}>✓</span>
                            )}
                            {showResult && idx === selected && selected !== currentQ.correctIndex && (
                                <span style={{ marginLeft: "auto", color: "var(--pod-error)", fontSize: 18 }}>✗</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Result feedback banner ────────────────── */}
            {showResult && (
                <div style={{
                    padding: "12px 18px", borderRadius: "var(--pod-radius)",
                    background: selected === currentQ.correctIndex
                        ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${selected === currentQ.correctIndex
                        ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)"}`,
                    display: "flex", alignItems: "center", gap: 10,
                    animation: "pod-fade-in 0.3s ease",
                }}>
                    <span style={{ fontSize: 22 }}>
                        {selected === currentQ.correctIndex ? "🎉" : "💡"}
                    </span>
                    <div>
                        <p style={{ margin: 0, fontWeight: 700, color: "var(--pod-text)", fontSize: 14 }}>
                            {selected === currentQ.correctIndex ? "To'g'ri!" : "Noto'g'ri"}
                        </p>
                        {selected !== currentQ.correctIndex && currentQ.explanation && (
                            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--pod-text-2)", lineHeight: 1.5 }}>
                                {currentQ.explanation}
                            </p>
                        )}
                        {selected !== currentQ.correctIndex && !currentQ.explanation && (
                            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--pod-text-2)" }}>
                                To'g'ri javob: <strong style={{ color: "var(--pod-success)" }}>
                                    {LETTERS[currentQ.correctIndex]}. {currentQ.options[currentQ.correctIndex]}
                                </strong>
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* ── Actions ───────────────────────────────── */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {!showResult ? (
                    <button
                        className="pod-btn pod-btn-primary"
                        onClick={handleConfirm}
                        disabled={selected === null}
                        style={{ flex: 1 }}
                    >
                        Tasdiqlash{" "}
                        <kbd style={{ fontSize: 11, opacity: 0.6, background: "var(--pod-muted)", padding: "1px 7px", borderRadius: 4, fontFamily: "monospace", color: "white" }}>
                            Enter
                        </kbd>
                    </button>
                ) : (
                    <button
                        className="pod-btn pod-btn-primary"
                        onClick={handleNext}
                        style={{ flex: 1 }}
                    >
                        {isLastQuestion ? "✅ Yakunlash" : "Keyingi savol →"}
                        {" "}
                        <kbd style={{ fontSize: 11, opacity: 0.6, background: "var(--pod-muted)", padding: "1px 7px", borderRadius: 4, fontFamily: "monospace", color: "white" }}>
                            Enter
                        </kbd>
                    </button>
                )}

                {/* Keyboard hint */}
                <span style={{ fontSize: 11, color: "var(--pod-muted)" }}>
                    A B C D tugmalari bilan tanlang
                </span>
            </div>
        </div>
    );
}

// src/components/PodcastInterface/stage1_dictation/DictationStage.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { collection, getDocsFromServer, orderBy, query } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import AudioPlayerBar from "../shared/AudioPlayerBar";
import { usePodcastPlayer } from "../../../hooks/usePodcastPlayer";
import "../shared/PodcastStyles.css";

// ── Helpers ──────────────────────────────────────────────────────────
function normalize(str) {
    return str.toLowerCase().trim().replace(/[.,!?;:'"()\-]/g, "").replace(/\s+/g, " ");
}

// Faqat user yozgan so'zlar — to'g'ri javobni yashiradi
function diffUserWords(userText, correctText) {
    const userWords = normalize(userText).split(" ").filter(Boolean);
    const correctWords = normalize(correctText).split(" ").filter(Boolean);
    const result = [];
    let ci = 0;
    for (let ui = 0; ui < userWords.length; ui++) {
        if (ci < correctWords.length && userWords[ui] === correctWords[ci]) {
            result.push({ word: userWords[ui], status: "correct" }); ci++;
        } else {
            result.push({ word: userWords[ui], status: "incorrect" });
            const next = correctWords.indexOf(userWords[ui], ci);
            if (next !== -1) ci = next + 1;
        }
    }
    return result;
}

// To'liq diff: to'g'ri javob asosida (to'g'ri javobni ko'rsatish uchun)
function diffCorrectWords(userText, correctText) {
    const userWords = normalize(userText).split(" ").filter(Boolean);
    const correctWords = normalize(correctText).split(" ").filter(Boolean);
    // Original text so'zlarini saqlaymiz (katta harf, tinish belgilari bilan)
    const originalWords = correctText.trim().split(/\s+/).filter(Boolean);
    const result = [];
    let ui = 0;
    for (let ci = 0; ci < correctWords.length; ci++) {
        const isCorrect = ui < userWords.length && userWords[ui] === correctWords[ci];
        result.push({ word: originalWords[ci] || correctWords[ci], status: isCorrect ? "correct" : "incorrect" });
        if (isCorrect) ui++;
    }
    return result;
}

function diffWords(userText, correctText) {
    const userWords = normalize(userText).split(" ").filter(Boolean);
    const correctWords = normalize(correctText).split(" ").filter(Boolean);
    const result = [];
    let ui = 0;
    for (let ci = 0; ci < correctWords.length; ci++) {
        if (ui < userWords.length && userWords[ui] === correctWords[ci]) {
            result.push({ word: correctWords[ci], status: "correct" }); ui++;
        } else {
            result.push({ word: correctWords[ci], status: "incorrect" });
        }
    }
    return result;
}

function calcAccuracy(userText, correctText) {
    const d = diffWords(userText, correctText);
    if (!d.length) return 100;
    return Math.round((d.filter(x => x.status === "correct").length / d.length) * 100);
}

// ── Component ────────────────────────────────────────────────────────
export default function DictationStage({ podcastId, audioUrl, hintWords, onComplete }) {
    const [segments, setSegments] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [phase, setPhase] = useState("listening"); // 'listening'|'typing'|'result_error'|'result_ok'
    const [userInput, setUserInput] = useState("");
    const [userWordDiff, setUserWordDiff] = useState([]);    // user words colored
    const [correctWordDiff, setCorrectWordDiff] = useState([]); // correct sentence colored
    const [allResults, setAllResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFullAnswer, setShowFullAnswer] = useState(true); // default: to'g'ri javobni ko'rsat
    const [attemptCount, setAttemptCount] = useState(0);

    const inputRef = useRef(null);
    const currentSegEndRef = useRef(null);
    const phaseRef = useRef("listening");

    const { audioRef, isPlaying, setIsPlaying, togglePlay, rewind, replay, setIsLoaded } =
        usePodcastPlayer(segments);

    // ── Load segments ────────────────────────────────────────────────
    useEffect(() => {
        if (!podcastId) return;
        const fetchData = async () => {
            const q = query(collection(db, "podcasts", podcastId, "segments"), orderBy("index"));
            const snap = await getDocsFromServer(q); // cache bypass — admin o'zgarishlari darhol
            setSegments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        };
        fetchData();
    }, [podcastId]);

    // ── timeupdate: audio stops → auto switch to typing ─────────────
    const handleTimeUpdate = useCallback(() => {
        if (!audioRef.current || currentSegEndRef.current === null) return;
        if (audioRef.current.currentTime >= currentSegEndRef.current - 0.1) {
            audioRef.current.pause();
            if (phaseRef.current === "listening") {
                phaseRef.current = "typing";
                setPhase("typing");
                setTimeout(() => inputRef.current?.focus(), 120);
            }
        }
    }, [audioRef]);

    // ── Audio setup ──────────────────────────────────────────────────
    useEffect(() => {
        if (!segments.length || !audioRef.current) return;
        audioRef.current.src = audioUrl;
        audioRef.current.addEventListener("timeupdate", handleTimeUpdate);
        audioRef.current.addEventListener("canplaythrough", () => setIsLoaded(true));
        return () => { audioRef.current?.removeEventListener("timeupdate", handleTimeUpdate); };
    }, [segments, audioUrl]);

    // ── New segment init ─────────────────────────────────────────────
    useEffect(() => {
        if (!segments.length || !audioRef.current) return;
        const seg = segments[currentIdx];
        if (!seg) return;
        currentSegEndRef.current = seg.endTime;
        phaseRef.current = "listening";
        setPhase("listening");
        setUserInput("");
        setUserWordDiff([]);
        setCorrectWordDiff([]);
        setAttemptCount(0);
        audioRef.current.currentTime = seg.startTime;
        audioRef.current.play().catch(() => { });
        setTimeout(() => inputRef.current?.focus(), 200);
    }, [currentIdx, segments]);

    // ── togglePlay override: segment tugab qolganda qayta boshlash ────
    const handleTogglePlay = useCallback(() => {
        const audio = audioRef.current;
        const seg = segments[currentIdx];
        if (!audio || !seg) return;

        if (isPlaying) {
            audio.pause(); // native pause → usePodcastPlayer listener isPlaying=false qiladi
        } else {
            // Agar audio segment oxirida tugan bo'lsa — boshidan o'ynat
            if (audio.currentTime >= seg.endTime - 0.15) {
                audio.currentTime = seg.startTime;
                phaseRef.current = "listening";
                setPhase("listening");
                setUserWordDiff([]);
                setCorrectWordDiff([]);
            }
            audio.play().catch(() => { });
        }
    }, [isPlaying, audioRef, segments, currentIdx]);


    const goToSegment = useCallback((idx) => {
        if (idx < 0 || idx >= segments.length) return;
        // Save current result if typing/error
        if ((phase === "typing" || phase === "result_error") && userInput.trim()) {
            const correct = segments[currentIdx]?.text || "";
            const newResults = [...allResults, {
                segmentIndex: currentIdx, userText: userInput,
                correctText: correct, accuracyPct: calcAccuracy(userInput, correct),
            }];
            setAllResults(newResults);
        }
        setCurrentIdx(idx);
    }, [phase, userInput, segments, currentIdx, allResults]);

    // ── Skip ────────────────────────────────────────────────────────
    const handleSkip = useCallback(() => {
        const correct = segments[currentIdx]?.text || "";
        const accuracy = userInput.trim() ? calcAccuracy(userInput, correct) : 0;
        const newResults = [...allResults, {
            segmentIndex: currentIdx, userText: userInput,
            correctText: correct, accuracyPct: accuracy, skipped: true,
        }];
        setAllResults(newResults);

        if (currentIdx < segments.length - 1) {
            setCurrentIdx(i => i + 1);
        } else {
            const totalWords = newResults.reduce((s, r) => s + normalize(r.correctText).split(" ").filter(Boolean).length, 0);
            const correctCount = newResults.reduce((s, r) => s + diffWords(r.userText, r.correctText).filter(d => d.status === "correct").length, 0);
            onComplete({ accuracyPct: totalWords > 0 ? Math.round((correctCount / totalWords) * 100) : 0, segments: newResults });
        }
    }, [currentIdx, segments, userInput, allResults, onComplete]);

    // ── Check ────────────────────────────────────────────────────────
    const handleCheck = useCallback(() => {
        if (!userInput.trim() || phase === "result_ok") return;
        const correct = segments[currentIdx]?.text || "";
        const accuracy = calcAccuracy(userInput, correct);
        setUserWordDiff(diffUserWords(userInput, correct));
        setCorrectWordDiff(diffCorrectWords(userInput, correct));
        setAttemptCount(c => c + 1);

        if (accuracy === 100) {
            phaseRef.current = "result_ok";
            setPhase("result_ok");
            const newResults = [...allResults, { segmentIndex: currentIdx, userText: userInput, correctText: correct, accuracyPct: accuracy }];
            setAllResults(newResults);
            // Avtomatik keyingisiga o'tmaydi (foydalanuvchi o'zi tugmani bosadi)
        } else {
            phaseRef.current = "result_error";
            setPhase("result_error");
        }
    }, [userInput, phase, segments, currentIdx, allResults, onComplete]);

    // ── Relisten ─────────────────────────────────────────────────────
    const handleRelisten = useCallback(() => {
        const seg = segments[currentIdx];
        if (!seg || !audioRef.current) return;
        phaseRef.current = "listening";
        setPhase("listening");
        setUserWordDiff([]);
        setCorrectWordDiff([]);
        audioRef.current.currentTime = seg.startTime;
        audioRef.current.play().catch(() => { });
    }, [segments, currentIdx, audioRef]);

    // ── Keyboard ─────────────────────────────────────────────────────
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (phase === "typing") handleCheck(); }
        if (e.key === "Escape" && phase === "listening") { audioRef.current?.pause(); phaseRef.current = "typing"; setPhase("typing"); setTimeout(() => inputRef.current?.focus(), 80); }
    };

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: 60, color: "rgba(255,255,255,0.4)", flexDirection: "column" }}>
            <div style={{ width: 32, height: 32, border: "2px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "dspin 0.8s linear infinite" }} />
            Yuklanmoqda...
        </div>
    );

    const seg = segments[currentIdx];
    const hasError = phase === "result_error";
    const hasOk = phase === "result_ok";
    const isListening = phase === "listening";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, fontFamily: "'Inter', sans-serif" }}>
            <audio
                ref={audioRef}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                style={{ display: "none" }}
            />

            {/* ── Navigation bar ─────────────────────────── */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 20,
            }}>
                {/* Prev arrow */}
                <button
                    onClick={() => goToSegment(currentIdx - 1)}
                    disabled={currentIdx === 0}
                    style={{
                        background: "none", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8, color: currentIdx === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)",
                        padding: "6px 12px", cursor: currentIdx === 0 ? "default" : "pointer",
                        fontSize: 16, transition: "all 0.15s",
                    }}
                >←</button>

                {/* Counter */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", letterSpacing: 0.3 }}>
                        {currentIdx + 1} / {segments.length}
                    </span>
                    {/* Progress dots */}
                    <div style={{ display: "flex", gap: 3 }}>
                        {segments.slice(Math.max(0, currentIdx - 4), currentIdx + 5).map((_, i) => {
                            const absIdx = Math.max(0, currentIdx - 4) + i;
                            return (
                                <button
                                    key={absIdx}
                                    onClick={() => goToSegment(absIdx)}
                                    style={{
                                        width: absIdx === currentIdx ? 20 : 6,
                                        height: 6, borderRadius: 3,
                                        background: absIdx === currentIdx ? "#6366f1" : allResults.find(r => r.segmentIndex === absIdx) ? "#10b981" : "rgba(255,255,255,0.12)",
                                        border: "none", cursor: "pointer", padding: 0,
                                        transition: "all 0.2s",
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Next arrow */}
                <button
                    onClick={() => goToSegment(currentIdx + 1)}
                    disabled={currentIdx === segments.length - 1}
                    style={{
                        background: "none", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8, color: currentIdx === segments.length - 1 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)",
                        padding: "6px 12px", cursor: currentIdx === segments.length - 1 ? "default" : "pointer",
                        fontSize: 16, transition: "all 0.15s",
                    }}
                >→</button>
            </div>

            {/* ── Audio player ───────────────────────────── */}
            <div style={{ marginBottom: 16 }}>
                <AudioPlayerBar
                    isPlaying={isPlaying}
                    onTogglePlay={handleTogglePlay}
                    onRewind={rewind}
                    onReplay={replay}
                    currentIndex={currentIdx}
                    totalSegments={segments.length}
                    audioRef={audioRef}
                    segStartTime={seg?.startTime ?? 0}
                    segEndTime={seg?.endTime ?? 0}
                />
            </div>

            {/* ── Hint words ─────────────────────────────── */}
            {hintWords && hintWords.trim() && (
                <div style={{ marginBottom: 16, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginRight: 2 }}>💡</span>
                    {hintWords.split(",").map((w, i) => w.trim() && (
                        <span key={i} style={{
                            fontSize: 12, color: "#fcd34d",
                            background: "rgba(245,158,11,0.1)",
                            border: "1px solid rgba(245,158,11,0.15)",
                            padding: "2px 8px", borderRadius: 6, fontFamily: "monospace",
                        }}>{w.trim()}</span>
                    ))}
                </div>
            )}

            {/* ── Main input ─────────────────────────────── */}
            <textarea
                ref={inputRef}
                rows={3}
                placeholder="Eshitganingizni yozing..."
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={hasOk} // faqat to'g'ri bo'lganda yopiladi
                style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.04)",
                    border: `2px solid ${hasError ? "rgba(239,68,68,0.5)" : hasOk ? "rgba(16,185,129,0.5)" : "rgba(99,102,241,0.5)"}`,
                    borderRadius: 12,
                    color: "#e2e8f0", fontFamily: "'Inter', sans-serif",
                    fontSize: 17, lineHeight: 1.7, padding: "14px 18px",
                    resize: "none", outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    boxShadow: hasError ? "0 0 0 4px rgba(239,68,68,0.08)"
                        : hasOk ? "0 0 0 4px rgba(16,185,129,0.08)"
                            : "none",
                    marginBottom: 12,
                }}
            />

            {/* ── Status + Skip row ──────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hasError ? 16 : 12 }}>
                {/* Status */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isListening && (
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", display: "inline-block", animation: "dripple 1.4s ease infinite" }} />
                            Tinglang...
                        </span>
                    )}
                    {hasError && (
                        <span style={{ fontSize: 14, color: "#f59e0b", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                            ⚠ Xato
                            {attemptCount > 1 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>({attemptCount}-urinish)</span>}
                        </span>
                    )}
                    {hasOk && (
                        <span style={{ fontSize: 14, color: "#10b981", fontWeight: 600 }}>✓ To'g'ri!</span>
                    )}
                </div>

                {/* Skip button */}
                {!hasOk && (
                    <button
                        onClick={handleSkip}
                        style={{
                            padding: "6px 16px", borderRadius: 8,
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "rgba(255,255,255,0.5)",
                            fontSize: 13, cursor: "pointer",
                            fontFamily: "inherit", transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                    >
                        Skip
                    </button>
                )}
            </div>

            {/* ── Correct answer display (Daily Dictation style) ── */}
            {hasError && showFullAnswer && correctWordDiff.length > 0 && (
                <div style={{ marginBottom: 16, lineHeight: 2.0, fontSize: 17, fontWeight: 500 }}>
                    {correctWordDiff.map((item, i) => (
                        <span key={i} style={{
                            color: item.status === "correct" ? "#e2e8f0" : "#34d399",
                            fontWeight: item.status === "incorrect" ? 700 : 400,
                        }}>
                            {item.word}{i < correctWordDiff.length - 1 ? " " : ""}
                        </span>
                    ))}
                </div>
            )}

            {/* ── Action buttons ─────────────────────────── */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {!hasOk && (
                    <button
                        onClick={handleCheck}
                        disabled={!userInput.trim()}
                        style={{
                            flex: 1, padding: "12px 20px", borderRadius: 10, border: "none",
                            background: userInput.trim() ? "#6366f1" : "rgba(99,102,241,0.2)",
                            color: "white", fontWeight: 700, fontSize: 15,
                            cursor: userInput.trim() ? "pointer" : "not-allowed",
                            fontFamily: "inherit", transition: "all 0.15s",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        }}
                    >
                        Tekshirish <kbd style={{ fontSize: 11, opacity: 0.6, background: "rgba(255,255,255,0.15)", padding: "2px 7px", borderRadius: 4, fontFamily: "monospace" }}>Enter</kbd>
                    </button>
                )}

                {hasError && (
                    <>
                        <button
                            onClick={handleRelisten}
                            style={{
                                padding: "12px 16px", borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.1)",
                                background: "transparent", color: "rgba(255,255,255,0.4)",
                                fontSize: 13, cursor: "pointer",
                                fontFamily: "inherit", transition: "all 0.15s",
                            }}
                        >🔄</button>

                        <button
                            onClick={() => handleSkip()}
                            style={{
                                padding: "12px 16px", borderRadius: 10,
                                border: "1px solid rgba(245,158,11,0.2)",
                                background: "rgba(245,158,11,0.07)", color: "#fbbf24",
                                fontSize: 13, cursor: "pointer",
                                fontFamily: "inherit", transition: "all 0.15s",
                            }}
                        >Keyingisi →</button>
                    </>
                )}

                {hasOk && (
                    <div style={{ flex: 1, display: "flex", gap: 8 }}>
                        <div style={{
                            flex: 1, padding: "12px 20px", borderRadius: 10,
                            background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                            color: "#34d399", fontWeight: 600, fontSize: 15,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            fontFamily: "inherit",
                        }}>
                            ✓ To'g'ri!
                        </div>
                        <button
                            onClick={() => handleSkip()}
                            style={{
                                flex: 1, padding: "12px 16px", borderRadius: 10,
                                border: "none", background: "#6366f1", color: "white",
                                fontWeight: 700, fontSize: 15, cursor: "pointer",
                                fontFamily: "inherit", transition: "all 0.15s",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            }}
                        >
                            Keyingisi →
                        </button>
                    </div>
                )}
            </div>

            {/* ── Options row (Daily Dictation style) ──── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
                    <span style={{
                        width: 20, height: 20, borderRadius: 5,
                        background: showFullAnswer ? "#6366f1" : "rgba(255,255,255,0.08)",
                        border: showFullAnswer ? "none" : "1px solid rgba(255,255,255,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, transition: "all 0.15s",
                    }}>
                        {showFullAnswer && <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </span>
                    <input
                        type="checkbox"
                        checked={showFullAnswer}
                        onChange={e => setShowFullAnswer(e.target.checked)}
                        style={{ display: "none" }}
                    />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>To'g'ri javobni ko'rsat (xato bo'lganda)</span>
                </label>
            </div>

            {/* ── Keyboard hints ──────────────────────────── */}
            <div style={{ display: "flex", gap: 16, paddingTop: 12, flexWrap: "wrap" }}>
                {[["Space", "Ijro/Pauza"], ["Esc", "Yozish"], ["Enter", "Tekshirish"]].map(([k, l]) => (
                    <span key={k} style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", gap: 4 }}>
                        <kbd style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", fontSize: 10 }}>{k}</kbd>
                        {l}
                    </span>
                ))}
            </div>

            <style>{`
                @keyframes dspin { to { transform: rotate(360deg); } }
                @keyframes dripple {
                    0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.5); }
                    70% { box-shadow: 0 0 0 7px rgba(99,102,241,0); }
                    100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
                }
            `}</style>
        </div>
    );
}

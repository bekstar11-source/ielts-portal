// src/components/PodcastInterface/stage1_dictation/DictationStage.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import AudioPlayerBar from "../shared/AudioPlayerBar";
import { usePodcastPlayer } from "../../../hooks/usePodcastPlayer";
import "../shared/PodcastStyles.css";

// Case-insensitive, punctuation-insensitive comparison
function normalize(str) {
    return str.toLowerCase().trim().replace(/[.,!?;:'"()\-]/g, "").replace(/\s+/g, " ");
}

// Word-level diff: compares user words only (does NOT reveal missing correct words)
// Returns array of {word, status: 'correct'|'incorrect'} for user-typed words only
function diffUserWords(userText, correctText) {
    const userWords = normalize(userText).split(" ").filter(Boolean);
    const correctWords = normalize(correctText).split(" ").filter(Boolean);
    const result = [];

    let ci = 0;
    for (let ui = 0; ui < userWords.length; ui++) {
        // Find the matching correct word position
        if (ci < correctWords.length && userWords[ui] === correctWords[ci]) {
            result.push({ word: userWords[ui], status: "correct" });
            ci++;
        } else {
            result.push({ word: userWords[ui], status: "incorrect" });
            // Try to advance ci to catch up (for insertions)
            const nextMatch = correctWords.indexOf(userWords[ui], ci);
            if (nextMatch !== -1) ci = nextMatch + 1;
        }
    }
    return result;
}

// Accuracy calculation (keeps using full correct word list)
function diffWords(userText, correctText) {
    const userWords = normalize(userText).split(" ").filter(Boolean);
    const correctWords = normalize(correctText).split(" ").filter(Boolean);
    const result = [];

    let ui = 0;
    for (let ci = 0; ci < correctWords.length; ci++) {
        if (ui < userWords.length && userWords[ui] === correctWords[ci]) {
            result.push({ word: correctWords[ci], status: "correct" });
            ui++;
        } else {
            result.push({ word: correctWords[ci], status: "incorrect" });
        }
    }
    return result;
}

export default function DictationStage({ podcastId, audioUrl, hintWords, onComplete }) {
    const [segments, setSegments] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [userInput, setUserInput] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [wordDiff, setWordDiff] = useState([]); // only user-typed words colored
    const [allResults, setAllResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inputState, setInputState] = useState("idle"); // 'idle'|'error'|'success'
    const inputRef = useRef(null);
    const currentSegEndRef = useRef(null); // always holds current segment's endTime for timeupdate

    const { audioRef, isPlaying, togglePlay, rewind, replay, setIsLoaded } =
        usePodcastPlayer(segments);

    // timeupdate handler — uses ref so it's always current
    const handleTimeUpdate = useCallback(() => {
        if (!audioRef.current || currentSegEndRef.current === null) return;
        if (audioRef.current.currentTime >= currentSegEndRef.current - 0.1) {
            audioRef.current.pause();
        }
    }, [audioRef]);

    // Segmentlarni yuklash
    useEffect(() => {
        if (!podcastId) return;
        const fetch = async () => {
            const q = query(collection(db, "podcasts", podcastId, "segments"), orderBy("index"));
            const snap = await getDocs(q);
            const segs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setSegments(segs);
            setLoading(false);
        };
        fetch();
    }, [podcastId]);

    // Audio setup: timeupdate listenerini bir marta qo'shamiz, ref orqali seg o'zgaradi
    useEffect(() => {
        if (!segments.length || !audioRef.current) return;
        audioRef.current.src = audioUrl;
        audioRef.current.addEventListener("timeupdate", handleTimeUpdate);
        audioRef.current.addEventListener("canplaythrough", () => setIsLoaded(true));
        return () => {
            audioRef.current?.removeEventListener("timeupdate", handleTimeUpdate);
        };
    }, [segments, audioUrl]); // deliberately not including handleTimeUpdate (stable ref-based)

    // Yangi segment kelganda audio boshlanadi
    useEffect(() => {
        if (!segments.length || !audioRef.current) return;
        const seg = segments[currentIdx];
        if (!seg) return;
        // Ref ni SINXRON yangilaymiz, timeupdate shu ref ni o'qiydi
        currentSegEndRef.current = seg.endTime;
        audioRef.current.currentTime = seg.startTime;
        audioRef.current.play().catch(() => { });
        setUserInput("");
        setSubmitted(false);
        setWordDiff([]);
        setInputState("idle");
        setTimeout(() => inputRef.current?.focus(), 100);
    }, [currentIdx, segments]);

    const handleCheck = useCallback(() => {
        if (!userInput.trim() || submitted) return;
        const correct = segments[currentIdx]?.text || "";
        const accuracyDiff = diffWords(userInput, correct); // full diff for scoring
        const displayDiff = diffUserWords(userInput, correct); // only user words — no answer reveal
        const hasErrors = accuracyDiff.some((d) => d.status === "incorrect");

        setWordDiff(displayDiff); // show only what user typed, colored
        setSubmitted(true);

        if (hasErrors) {
            setInputState("error");
        } else {
            setInputState("success");
            const result = {
                segmentIndex: currentIdx,
                userText: userInput,
                correctText: correct,
                accuracyPct: Math.round(
                    (accuracyDiff.filter((d) => d.status === "correct").length / accuracyDiff.length) * 100
                ),
            };
            const newResults = [...allResults, result];
            setAllResults(newResults);

            // Keyingi segment yoki tugash
            setTimeout(() => {
                if (currentIdx < segments.length - 1) {
                    setCurrentIdx((i) => i + 1);
                } else {
                    // Yakuniy hisoblash
                    const totalWords = newResults.reduce((s, r) => s + normalize(r.correctText).split(" ").length, 0);
                    const correctWords = newResults.reduce(
                        (s, r) =>
                            s + diffWords(r.userText, r.correctText).filter((d) => d.status === "correct").length,
                        0
                    );
                    const overallPct = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 0;
                    onComplete({ accuracyPct: overallPct, segments: newResults });
                }
            }, 800);
        }
    }, [userInput, submitted, segments, currentIdx, allResults, onComplete]);

    // Enter key → tekshirish
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (submitted && inputState === "error") {
                // Xatoni to'g'irlash: reset
                setSubmitted(false);
                setInputState("idle");
                setWordDiff([]);
                inputRef.current?.focus();
            } else if (!submitted) {
                handleCheck();
            }
        }
    };

    if (loading) return <div style={{ color: "var(--pod-text-2)", padding: 40 }}>Yuklanmoqda...</div>;

    const currentSegment = segments[currentIdx];
    const isLastSegment = currentIdx === segments.length - 1;

    return (
        <div className="pod-animate-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <audio ref={audioRef} style={{ display: "none" }} />

            {/* Segment counter */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--pod-text-2)" }}>
                    {currentIdx + 1} / {segments.length} — gap
                </span>
                {inputState === "error" && (
                    <span style={{ fontSize: 13, color: "var(--pod-error)", fontWeight: 600 }}>
                        ⚠ Xato topildi — to'g'irlab, Enter bosing
                    </span>
                )}
                {inputState === "success" && (
                    <span style={{ fontSize: 13, color: "var(--pod-success)", fontWeight: 600 }}>
                        ✓ To'g'ri!
                    </span>
                )}
            </div>

            {/* Yordamchi so'zlar (Hint Words) */}
            {hintWords && hintWords.trim().length > 0 && (
                <div style={{ backgroundColor: "var(--pod-surface-2)", padding: "12px 16px", borderRadius: "10px", border: "1px dashed var(--pod-border)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--pod-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>
                        💡 Yordamchi qiyin so'zlar
                    </span>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {hintWords.split(',').map((w, i) => {
                            if (!w.trim()) return null;
                            return (
                                <span key={i} style={{ backgroundColor: "var(--pod-surface-3)", padding: "4px 10px", borderRadius: "6px", fontSize: 13, color: "var(--pod-text)", fontFamily: "monospace" }}>
                                    {w.trim()}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Audio bar */}
            <AudioPlayerBar
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                onRewind={rewind}
                onReplay={replay}
                currentIndex={currentIdx}
                totalSegments={segments.length}
            />

            {/* Word diff (faqat user yozganlari, to'g'ri javob yashirilgan) */}
            {submitted && wordDiff.length > 0 && (
                <div
                    className="pod-card"
                    style={{ fontSize: 15, lineHeight: 1.8, fontFamily: "serif", display: "flex", flexWrap: "wrap", gap: 4 }}
                >
                    {wordDiff.map((item, i) => (
                        <span key={i} className={`pod-word ${item.status}`}>
                            {item.word}{" "}
                        </span>
                    ))}
                    {inputState === "error" && (
                        <span style={{ fontSize: 12, color: "var(--pod-muted)", marginLeft: 8, alignSelf: "center" }}>
                            🔴 Xato so'zlar ko'rsatildi — to'g'irlang
                        </span>
                    )}
                </div>
            )}

            {/* Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <textarea
                    ref={inputRef}
                    className={`pod-dictation-input ${inputState}`}
                    rows={3}
                    placeholder="Eshitganingizni yozing... (Enter — tekshirish)"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={inputState === "success"}
                />
                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        className="pod-btn pod-btn-primary"
                        onClick={handleCheck}
                        disabled={!userInput.trim() || submitted}
                    >
                        Tekshirish (Enter)
                    </button>
                    {submitted && inputState === "error" && (
                        <button
                            className="pod-btn pod-btn-ghost"
                            onClick={() => {
                                setSubmitted(false);
                                setInputState("idle");
                                setWordDiff([]);
                                inputRef.current?.focus();
                            }}
                        >
                            Qayta yozish
                        </button>
                    )}
                </div>
            </div>

            {/* Hint */}
            <p style={{ fontSize: 12, color: "var(--pod-muted)", margin: 0 }}>
                💡 Katta-kichik harf va tinish belgilari hisobga olinmaydi. Xatolar galma-gal ko'rsatiladi.
            </p>
        </div>
    );
}

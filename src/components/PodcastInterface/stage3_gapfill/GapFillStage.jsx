// src/components/PodcastInterface/stage3_gapfill/GapFillStage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { parseGapText, checkGapAnswer } from "../../../utils/gapParser";
import "../shared/PodcastStyles.css";

export default function GapFillStage({ podcastId, audioUrl, onComplete }) {
    const [segments, setSegments] = useState([]); // [{text, answers, gapTexts}]
    const [loading, setLoading] = useState(true);
    const [userAnswers, setUserAnswers] = useState({}); // key: "segIdx-gapIdx": value
    const [submitted, setSubmitted] = useState({});   // key: "segIdx-gapIdx": bool
    const inputRefs = useRef({});
    const audioRef = useRef(null);

    useEffect(() => {
        if (!podcastId) return;
        const fetchData = async () => {
            try {
                const snap = await getDoc(doc(db, "podcasts", podcastId, "gapFill", "data"));
                if (snap.exists()) {
                    const rawSegs = snap.data().segments || [];
                    const parsed = rawSegs.map((seg, si) => {
                        const parts = parseGapText(seg.text);
                        // Extract gap answers from original text separately
                        const gapTexts = [];
                        const gapRegex = /\{\{([^}]+)\}\}/gi;
                        let m;
                        while ((m = gapRegex.exec(seg.originalText || seg.text)) !== null) {
                            gapTexts.push(m[1] || m[0].replace(/[{}]/g, ""));
                        }
                        return { ...seg, parts, gapTexts };
                    });
                    setSegments(parsed);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [podcastId]);

    // Auto-play audio
    useEffect(() => {
        if (!segments.length || !audioRef.current) return;
        audioRef.current.src = audioUrl;
        audioRef.current.play().catch(() => { });
    }, [segments, audioUrl]);

    const handleChange = (key, val) => {
        setUserAnswers((prev) => ({ ...prev, [key]: val }));
    };

    const handleInputKeyDown = (e, segIdx, gapIdx, totalGapsInSeg, totalSegs) => {
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            checkSingleGap(segIdx, gapIdx);
        }
    };

    const checkSingleGap = useCallback(
        (segIdx, gapIdx) => {
            const key = `${segIdx}-${gapIdx}`;
            const answer = userAnswers[key] || "";
            const correct = segments[segIdx]?.gapTexts?.[gapIdx] || "";
            const isCorrect = checkGapAnswer(answer, correct);

            setSubmitted((prev) => ({ ...prev, [key]: isCorrect ? "correct" : "incorrect" }));

            if (isCorrect) {
                // Auto-focus next gap
                const nextKey = findNextGap(segIdx, gapIdx);
                if (nextKey) {
                    setTimeout(() => inputRefs.current[nextKey]?.focus(), 100);
                }
            }
        },
        [userAnswers, segments]
    );

    const findNextGap = (segIdx, gapIdx) => {
        const seg = segments[segIdx];
        if (seg && gapIdx + 1 < (seg.gapTexts?.length || 0)) {
            return `${segIdx}-${gapIdx + 1}`;
        }
        for (let si = segIdx + 1; si < segments.length; si++) {
            if (segments[si]?.gapTexts?.length > 0) return `${si}-0`;
        }
        return null;
    };

    const handleFinish = () => {
        let correct = 0;
        let total = 0;
        segments.forEach((seg, si) => {
            (seg.gapTexts || []).forEach((ans, gi) => {
                total++;
                const key = `${si}-${gi}`;
                if (submitted[key] === "correct") correct++;
            });
        });
        onComplete({ correct, total });
    };

    const allDone = () => {
        let total = 0;
        segments.forEach((seg) => { total += seg.gapTexts?.length || 0; });
        return Object.values(submitted).filter((v) => v === "correct").length >= total;
    };

    if (loading) return <div style={{ padding: 40, color: "var(--pod-text-2)" }}>Yuklanmoqda...</div>;

    return (
        <div className="pod-animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <audio ref={audioRef} style={{ display: "none" }} />
            <p style={{ fontSize: 14, color: "var(--pod-text-2)", margin: 0 }}>
                🎧 Audio eshitib, bo'sh joylarga to'g'ri so'zlarni kiriting.
            </p>

            {segments.map((seg, si) => (
                <div key={si} className="pod-card" style={{ lineHeight: 2, fontSize: 15 }}>
                    {seg.parts.map((part, pi) => {
                        if (part.type === "text") {
                            return <span key={pi}>{part.content}</span>;
                        }
                        const key = `${si}-${part.index}`;
                        const status = submitted[key] || "idle";
                        return (
                            <input
                                key={pi}
                                ref={(el) => (inputRefs.current[key] = el)}
                                className={`pod-gap-input ${status}`}
                                style={{ width: Math.max(80, (seg.gapTexts[part.index]?.length || 6) * 10 + 20) }}
                                value={userAnswers[key] || ""}
                                onChange={(e) => handleChange(key, e.target.value)}
                                onKeyDown={(e) => handleInputKeyDown(e, si, part.index)}
                                onBlur={() => {
                                    if (userAnswers[key]?.trim()) checkSingleGap(si, part.index);
                                }}
                                placeholder="..."
                                disabled={status === "correct"}
                            />
                        );
                    })}
                </div>
            ))}

            <button
                className="pod-btn pod-btn-primary"
                style={{ alignSelf: "flex-start" }}
                onClick={handleFinish}
            >
                Yakunlash
            </button>
        </div>
    );
}

// src/components/PodcastInterface/stage4_vocab/VocabPracticeStage.jsx
import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import VocabFlashcard from "./VocabFlashcard";
import "../shared/PodcastStyles.css";

const PRACTICE_TIME = 20 * 60; // 20 daqiqa

export default function VocabPracticeStage({ podcastId, onStartExam }) {
    const [vocab, setVocab] = useState([]);
    const [current, setCurrent] = useState(0);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(PRACTICE_TIME);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!podcastId) return;
        const fetch = async () => {
            const snap = await getDocs(collection(db, "podcasts", podcastId, "vocabulary"));
            setVocab(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoading(false);
        };
        fetch();
    }, [podcastId]);

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimeLeft((t) => {
                if (t <= 1) {
                    clearInterval(timerRef.current);
                    onStartExam(vocab);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [vocab, onStartExam]);

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    };

    if (loading) return <div style={{ padding: 40, color: "var(--pod-text-2)" }}>Yuklanmoqda...</div>;

    return (
        <div className="pod-animate-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
            {/* Timer */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--pod-text-2)" }}>Mashq vaqti</span>
                <span className={`pod-timer ${timeLeft < 60 ? "urgent" : ""}`}>{formatTime(timeLeft)}</span>
            </div>

            {/* Flashcard */}
            {vocab.length > 0 ? (
                <VocabFlashcard wordData={vocab[current]} />
            ) : (
                <p style={{ color: "var(--pod-text-2)" }}>Lug'at so'zlari topilmadi.</p>
            )}

            {/* Navigation */}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                    className="pod-btn pod-btn-ghost"
                    onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                    disabled={current === 0}
                >
                    ← Oldingi
                </button>
                <span style={{ fontSize: 13, color: "var(--pod-text-2)" }}>
                    {current + 1} / {vocab.length}
                </span>
                <button
                    className="pod-btn pod-btn-ghost"
                    onClick={() => setCurrent((c) => Math.min(vocab.length - 1, c + 1))}
                    disabled={current === vocab.length - 1}
                >
                    Keyingi →
                </button>
            </div>

            {/* Start exam early */}
            <button
                className="pod-btn pod-btn-primary"
                onClick={() => { clearInterval(timerRef.current); onStartExam(vocab); }}
            >
                🚀 Men tayyorman — Imtihon boshlash
            </button>

            <p style={{ fontSize: 12, color: "var(--pod-muted)", textAlign: "center" }}>
                Karta yuzini bosing — ta'rif va misol ko'ring. Vaqt tugaganda imtihon avtomatik boshlanadi.
            </p>
        </div>
    );
}

// src/components/PodcastInterface/stage4_vocab/VocabFlashcard.jsx
import React, { useState } from "react";
import "../shared/PodcastStyles.css";

export default function VocabFlashcard({ wordData }) {
    const [flipped, setFlipped] = useState(false);

    const playAudio = (e) => {
        e.stopPropagation();
        if (wordData.audioUrl) {
            new Audio(wordData.audioUrl).play().catch(() => { });
        } else {
            // Browser TTS fallback
            const utter = new SpeechSynthesisUtterance(wordData.word);
            utter.lang = "en-US";
            window.speechSynthesis.speak(utter);
        }
    };

    return (
        <div className="pod-flashcard-wrapper" onClick={() => setFlipped((f) => !f)}>
            <div className={`pod-flashcard ${flipped ? "flipped" : ""}`}>
                {/* Front — So'z */}
                <div className="pod-flashcard-front">
                    <span style={{ fontSize: 28, fontWeight: 700, color: "var(--pod-text)" }}>
                        {wordData.word}
                    </span>
                    <button
                        className="pod-btn pod-btn-ghost"
                        style={{ padding: "6px 14px", fontSize: 18 }}
                        onClick={playAudio}
                        title="Talaffuzni eshitish"
                    >
                        🔊
                    </button>
                    <span style={{ fontSize: 12, color: "var(--pod-muted)" }}>Karta bosing — ta'rifni ko'ring</span>
                </div>

                {/* Back — Ta'rif va misol */}
                <div className="pod-flashcard-back">
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--pod-accent-2)" }}>Ta'rif</span>
                    <p style={{ fontSize: 14, color: "var(--pod-text)", margin: 0, lineHeight: 1.6 }}>
                        {wordData.definition}
                    </p>
                    {wordData.example && (
                        <>
                            <div style={{ height: 1, background: "var(--pod-border)", width: "100%" }} />
                            <p style={{ fontSize: 13, color: "var(--pod-text-2)", margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>
                                "{wordData.example}"
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

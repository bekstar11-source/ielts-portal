// src/components/PodcastInterface/shared/InteractiveTranscript.jsx
import React, { useState, useEffect, useRef } from "react";
import "./PodcastStyles.css";

export default function InteractiveTranscript({ segments = [], currentTime = 0, onSegmentClick }) {
    const containerRef = useRef(null);

    // Active segmentni aniqlash
    const activeIndex = segments.findIndex(
        (s) => currentTime >= s.startTime && currentTime <= s.endTime
    );

    // Avtomatik scroll qilish
    useEffect(() => {
        if (activeIndex !== -1 && containerRef.current) {
            const activeEl = containerRef.current.querySelector(`.pod-transcript-segment.active`);
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }, [activeIndex]);

    const [popup, setPopup] = useState(null);

    const handleWordClick = (e, word) => {
        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();
        setPopup({
            word: word.replace(/[.,!?;:'"()\-]/g, ""),
            x: rect.left,
            y: rect.top - 100,
        });
    };

    // Popupni yopish
    useEffect(() => {
        const hide = () => setPopup(null);
        window.addEventListener("click", hide);
        return () => window.removeEventListener("click", hide);
    }, []);

    return (
        <div className="pod-transcript-container" ref={containerRef}>
            {segments.map((seg, i) => (
                <span
                    key={i}
                    className={`pod-transcript-segment ${i === activeIndex ? "active" : ""}`}
                    onClick={() => onSegmentClick?.(seg.startTime)}
                >
                    {seg.text.split(" ").map((word, wi) => (
                        <span
                            key={wi}
                            className="pod-transcript-word"
                            onClick={(e) => handleWordClick(e, word)}
                        >
                            {word}{" "}
                        </span>
                    ))}
                </span>
            ))}

            {popup && (
                <div
                    className="pod-translation-popup"
                    style={{ left: popup.x, top: popup.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="pod-translation-word">{popup.word}</span>
                    <span className="pod-translation-meaning">Tarjimasi kutilmoqda...</span>
                    <span className="pod-translation-context">IELTS context: Loading...</span>
                </div>
            )}
        </div>
    );
}

// src/components/PodcastInterface/stage4_vocab/VocabExamStage.jsx
import React, { useState } from "react";
import {
    DndContext,
    closestCenter,
    DragOverlay,
    useDraggable,
    useDroppable,
} from "@dnd-kit/core";
import { checkGapAnswer } from "../../../utils/gapParser";
import "../shared/PodcastStyles.css";

// --- Drag & Drop Matching bölümü ---
function DraggableWord({ id, word, disabled }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled });
    const style = transform
        ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
        : undefined;
    return (
        <div
            ref={setNodeRef}
            className={`pod-drag-item ${isDragging ? "dragging" : ""}`}
            style={{ ...style, opacity: disabled ? 0.35 : 1 }}
            {...listeners}
            {...attributes}
        >
            {word}
        </div>
    );
}

function DroppableZone({ id, label, children, status }) {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, color: "var(--pod-text-2)", lineHeight: 1.5 }}>{label}</span>
            <div
                ref={setNodeRef}
                className={`pod-drop-zone ${isOver ? "over" : ""} ${status || ""}`}
            >
                {children || <span style={{ fontSize: 12, color: "var(--pod-muted)" }}>Sürükle</span>}
            </div>
        </div>
    );
}

// --- Gap Fill qismi ---
function ContextualGapFill({ items, onComplete }) {
    const [answers, setAnswers] = useState({});
    const [checked, setChecked] = useState({});

    const handleCheck = () => {
        const result = {};
        items.forEach((item, i) => {
            result[i] = checkGapAnswer(answers[i] || "", item.word) ? "correct" : "incorrect";
        });
        setChecked(result);
        const correct = Object.values(result).filter((v) => v === "correct").length;
        onComplete({ correct, total: items.length });
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {items.map((item, i) => {
                const parts = item.testSentence.split("{{gap}}");
                return (
                    <div key={i} className="pod-card" style={{ fontSize: 15, lineHeight: 2 }}>
                        {parts[0]}
                        <input
                            className={`pod-gap-input ${checked[i] || ""}`}
                            value={answers[i] || ""}
                            onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                            style={{ width: Math.max(80, item.word.length * 12 + 20) }}
                            disabled={!!checked[i]}
                            placeholder="..."
                        />
                        {parts[1]}
                    </div>
                );
            })}
            <button
                className="pod-btn pod-btn-primary"
                style={{ alignSelf: "flex-start" }}
                onClick={handleCheck}
                disabled={Object.keys(checked).length > 0}
            >
                Tekshirish
            </button>
        </div>
    );
}

// --- Main Exam Component ---
export default function VocabExamStage({ vocab = [], onComplete }) {
    const [phase, setPhase] = useState("dragdrop"); // "dragdrop" | "gapfill"
    const [dragMatches, setDragMatches] = useState({});  // zoneId → wordId
    const [dragChecked, setDragChecked] = useState(false);
    const [dragScore, setDragScore] = useState(null);
    const [gapScore, setGapScore] = useState(null);
    const [activeId, setActiveId] = useState(null);

    // Drag & Drop phase
    const words = vocab.slice(0, Math.min(8, vocab.length));
    const shuffledDefs = [...words].sort(() => Math.random() - 0.5);

    const handleDragEnd = ({ active, over }) => {
        if (over) {
            setDragMatches((prev) => ({ ...prev, [over.id]: active.id }));
        }
        setActiveId(null);
    };

    const checkDragDrop = () => {
        let correct = 0;
        words.forEach((w, i) => {
            const zone = `zone-${i}`;
            const dropped = dragMatches[zone]; // dropped = word id
            if (dropped === w.id) correct++;
        });
        setDragScore({ correct, total: words.length });
        setDragChecked(true);
    };

    const handleGapComplete = (score) => {
        setGapScore(score);
        // Total score
        const ds = dragScore || { correct: 0, total: 0 };
        const total = ds.total + score.total;
        const correct = ds.correct + score.correct;
        onComplete({ correct, total });
    };

    const droppedWordIds = Object.values(dragMatches);

    return (
        <div className="pod-animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {phase === "dragdrop" && (
                <>
                    <h3 style={{ color: "var(--pod-text)", margin: 0, fontSize: 16 }}>
                        🔗 So'zni uning ta'rifiga sürükle
                    </h3>
                    <DndContext
                        collisionDetection={closestCenter}
                        onDragStart={({ active }) => setActiveId(active.id)}
                        onDragEnd={handleDragEnd}
                    >
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            {/* Left: Definitions (drop zones) */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {words.map((w, i) => {
                                    const zone = `zone-${i}`;
                                    const droppedId = dragMatches[zone];
                                    const droppedWord = vocab.find((v) => v.id === droppedId);
                                    let status = "";
                                    if (dragChecked && droppedWord) {
                                        status = droppedWord.id === w.id ? "correct" : "incorrect";
                                    }
                                    return (
                                        <DroppableZone key={zone} id={zone} label={w.definition} status={status}>
                                            {droppedWord && (
                                                <div className="pod-drag-item" style={{ opacity: 0.85 }}>
                                                    {droppedWord.word}
                                                </div>
                                            )}
                                        </DroppableZone>
                                    );
                                })}
                            </div>

                            {/* Right: Words (draggable) */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {words.map((w) => (
                                    <DraggableWord
                                        key={w.id}
                                        id={w.id}
                                        word={w.word}
                                        disabled={droppedWordIds.includes(w.id) || dragChecked}
                                    />
                                ))}
                            </div>
                        </div>

                        <DragOverlay>
                            {activeId ? (
                                <div className="pod-drag-item" style={{ opacity: 0.9, boxShadow: "var(--pod-shadow)" }}>
                                    {vocab.find((v) => v.id === activeId)?.word}
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>

                    {!dragChecked ? (
                        <button className="pod-btn pod-btn-primary" onClick={checkDragDrop}>
                            Tekshirish
                        </button>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <span style={{ color: "var(--pod-success)", fontWeight: 600 }}>
                                ✓ {dragScore?.correct}/{dragScore?.total} to'g'ri
                            </span>
                            <button className="pod-btn pod-btn-primary" onClick={() => setPhase("gapfill")}>
                                2-qism: Gap Fill →
                            </button>
                        </div>
                    )}
                </>
            )}

            {phase === "gapfill" && (
                <>
                    <h3 style={{ color: "var(--pod-text)", margin: 0, fontSize: 16 }}>
                        📝 Yangi gaplardagi bo'shliqlarni to'ldiring
                    </h3>
                    <ContextualGapFill items={vocab.filter((v) => v.testSentence)} onComplete={handleGapComplete} />
                </>
            )}
        </div>
    );
}

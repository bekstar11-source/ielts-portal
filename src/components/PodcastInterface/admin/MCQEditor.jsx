// src/components/PodcastInterface/admin/MCQEditor.jsx
// Admin uchun MCQ savollarini qo'shish, tahrirlash, o'chirish komponenti
import React, { useState, useEffect, useRef } from "react";
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc,
    doc, orderBy, query, writeBatch
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";

const LETTERS = ["A", "B", "C", "D"];
const EMPTY_Q = {
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    audioHintTime: "",
    explanation: "",
    index: 0,
};

export default function MCQEditor({ podcastId, audioUrl }) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editIdx, setEditIdx] = useState(null);   // index of question being edited
    const [form, setForm] = useState(EMPTY_Q);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [hintPlaying, setHintPlaying] = useState(false);
    const [bulkText, setBulkText] = useState("");
    const audioRef = useRef(null);

    // ── Load questions ────────────────────────────────────────
    const loadQuestions = async () => {
        const q = query(
            collection(db, "podcasts", podcastId, "mcqQuestions"),
            orderBy("index")
        );
        const snap = await getDocs(q);
        setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
    };

    useEffect(() => { if (podcastId) loadQuestions(); }, [podcastId]);

    // ── Form helpers ──────────────────────────────────────────
    const openNew = () => {
        setEditIdx("new");
        setForm({ ...EMPTY_Q, index: questions.length });
    };

    const openBulk = () => {
        setEditIdx("bulk");
        setBulkText("[\n  {\n    \"question\": \"Savol matni\",\n    \"options\": [\"A javob\", \"B javob\", \"C javob\", \"D javob\"],\n    \"correctIndex\": 0,\n    \"audioHintTime\": 12.5,\n    \"explanation\": \"Izoh (ixtiyoriy)\"\n  }\n]");
    };

    const openEdit = (q, i) => {
        setEditIdx(i);
        setForm({
            question: q.question || "",
            options: [...(q.options || ["", "", "", ""])],
            correctIndex: q.correctIndex ?? 0,
            audioHintTime: q.audioHintTime != null ? String(q.audioHintTime) : "",
            explanation: q.explanation || "",
            index: q.index ?? i,
        });
    };

    const closeEditor = () => { setEditIdx(null); };

    const setOption = (i, val) => {
        setForm((f) => {
            const opts = [...f.options];
            opts[i] = val;
            return { ...f, options: opts };
        });
    };

    // ── Save ──────────────────────────────────────────────────
    const handleSave = async () => {
        if (!form.question.trim()) return alert("Savol matnini kiriting");
        if (form.options.some((o) => !o.trim())) return alert("Barcha 4 ta variantni to'ldiring");
        setSaving(true);
        try {
            const hintTime = form.audioHintTime !== "" ? parseFloat(String(form.audioHintTime).replace(",", ".")) : null;
            const data = {
                question: form.question.trim(),
                options: form.options.map((o) => o.trim()),
                correctIndex: form.correctIndex,
                audioHintTime: isNaN(hintTime) ? null : hintTime,
                explanation: form.explanation.trim(),
                index: form.index,
            };

            if (editIdx === "new") {
                await addDoc(collection(db, "podcasts", podcastId, "mcqQuestions"), data);
            } else {
                const q = questions[editIdx];
                await updateDoc(doc(db, "podcasts", podcastId, "mcqQuestions", q.id), data);
            }
            await loadQuestions();
            closeEditor();
        } catch (e) {
            alert("Saqlashda xato: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Bulk Save ─────────────────────────────────────────────
    const handleBulkSave = async () => {
        try {
            const arr = JSON.parse(bulkText);
            if (!Array.isArray(arr)) throw new Error("JSON ma'lumot eng tashqarida array [] bo'lishi kerak");

            setSaving(true);
            const batch = writeBatch(db);
            let startIndex = questions.length;

            arr.forEach((item) => {
                const docRef = doc(collection(db, "podcasts", podcastId, "mcqQuestions"));
                const data = {
                    question: item.question || "",
                    options: Array.isArray(item.options) ? item.options : ["", "", "", ""],
                    correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
                    audioHintTime: typeof item.audioHintTime === 'number' ? item.audioHintTime : null,
                    explanation: item.explanation || "",
                    index: startIndex++
                };
                batch.set(docRef, data);
            });

            await batch.commit();
            await loadQuestions();
            closeEditor();
            alert(`${arr.length} ta savol json orqali muvaffaqiyatli qo'shildi!`);
        } catch (e) {
            alert("JSON formatida xato bor: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────
    const handleDelete = async (i) => {
        if (!window.confirm("Savolni o'chirmoqchimisiz?")) return;
        setDeleting(true);
        try {
            const q = questions[i];
            await deleteDoc(doc(db, "podcasts", podcastId, "mcqQuestions", q.id));
            // Re-index qolganlarni
            const remaining = questions.filter((_, idx) => idx !== i);
            const batch = writeBatch(db);
            remaining.forEach((r, idx) => {
                batch.update(doc(db, "podcasts", podcastId, "mcqQuestions", r.id), { index: idx });
            });
            await batch.commit();
            await loadQuestions();
            if (editIdx === i) closeEditor();
        } catch (e) {
            alert("O'chirishda xato: " + e.message);
        } finally {
            setDeleting(false);
        }
    };

    // ── Hint preview ──────────────────────────────────────────
    const handleHintPreview = () => {
        if (!audioRef.current || !audioUrl || form.audioHintTime === "") return;
        const t = parseFloat(String(form.audioHintTime).replace(",", "."));
        if (isNaN(t)) return;
        if (hintPlaying) {
            audioRef.current.pause();
            setHintPlaying(false);
            return;
        }
        audioRef.current.src = audioUrl;
        audioRef.current.currentTime = t;
        audioRef.current.play();
        setHintPlaying(true);
        audioRef.current.onended = () => setHintPlaying(false);
    };

    // ── Reorder (drag up/down) ────────────────────────────────
    const move = async (i, dir) => {
        const j = i + dir;
        if (j < 0 || j >= questions.length) return;
        const arr = [...questions];
        [arr[i], arr[j]] = [arr[j], arr[i]];
        const batch = writeBatch(db);
        arr.forEach((q, idx) => {
            batch.update(doc(db, "podcasts", podcastId, "mcqQuestions", q.id), { index: idx });
        });
        await batch.commit();
        setQuestions(arr.map((q, idx) => ({ ...q, index: idx })));
    };

    // ── Render ────────────────────────────────────────────────
    if (loading) return <div style={{ padding: 24, color: "var(--pod-text-2)" }}>Yuklanmoqda...</div>;

    return (
        <div style={{ display: "flex", gap: 20 }}>
            <audio ref={audioRef} style={{ display: "none" }} />

            {/* ── Left: Question list ─────────────────── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--pod-text)" }}>
                        {questions.length} ta savol
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button className="pod-btn pod-btn-primary" style={{ padding: "6px 16px", fontSize: 13, background: "var(--pod-surface-3)", color: "var(--pod-text)", border: "1px solid var(--pod-border)" }} onClick={openBulk}>
                            + JSON orqali qo'shish
                        </button>
                        <button className="pod-btn pod-btn-primary" style={{ padding: "6px 16px", fontSize: 13 }} onClick={openNew}>
                            + Yangi savol
                        </button>
                    </div>
                </div>

                {questions.length === 0 && (
                    <div className="pod-card" style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                        <p style={{ margin: 0, fontSize: 14 }}>Hali savol qo'shilmagan</p>
                    </div>
                )}

                {questions.map((q, i) => (
                    <div
                        key={q.id}
                        className="pod-card"
                        style={{
                            cursor: "pointer",
                            border: editIdx === i ? "2px solid var(--pod-accent)" : undefined,
                            background: editIdx === i ? "rgba(99,102,241,0.08)" : undefined,
                            padding: "12px 16px", gap: 0,
                        }}
                        onClick={() => openEdit(q, i)}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: 10, color: "var(--pod-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                                    #{i + 1}  {q.audioHintTime != null ? `• 🎧 ${q.audioHintTime}s` : ""}
                                </span>
                                <p style={{ margin: "4px 0 8px", fontSize: 14, color: "var(--pod-text)", lineHeight: 1.5 }}>
                                    {q.question}
                                </p>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    {q.options.map((o, idx) => (
                                        <span
                                            key={idx}
                                            style={{
                                                fontSize: 11, padding: "2px 8px", borderRadius: 99,
                                                background: idx === q.correctIndex
                                                    ? "rgba(16,185,129,0.15)" : "var(--pod-surface-2)",
                                                color: idx === q.correctIndex
                                                    ? "var(--pod-success)" : "var(--pod-text-2)",
                                                border: "1px solid",
                                                borderColor: idx === q.correctIndex
                                                    ? "rgba(16,185,129,0.3)" : "var(--pod-border)",
                                            }}
                                        >
                                            {LETTERS[idx]}. {o}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 12, flexShrink: 0 }}>
                                <button onClick={(e) => { e.stopPropagation(); move(i, -1); }}
                                    disabled={i === 0}
                                    style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: "var(--pod-muted)", fontSize: 16, padding: "2px 4px" }}
                                    title="Yuqoriga ko'chirish">▲</button>
                                <button onClick={(e) => { e.stopPropagation(); move(i, 1); }}
                                    disabled={i === questions.length - 1}
                                    style={{ background: "none", border: "none", cursor: i === questions.length - 1 ? "default" : "pointer", color: "var(--pod-muted)", fontSize: 16, padding: "2px 4px" }}
                                    title="Pastga ko'chirish">▼</button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(i); }}
                                    disabled={deleting}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pod-error)", fontSize: 14, padding: "2px 4px" }}
                                    title="O'chirish">🗑</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Right: Editor ────────────────────────── */}
            {editIdx === "bulk" ? (
                <div style={{
                    width: 440, flexShrink: 0,
                    background: "var(--pod-surface)",
                    border: "1px solid var(--pod-border)",
                    borderRadius: "var(--pod-radius-lg)",
                    padding: 20,
                    position: "sticky", top: 20,
                    height: "fit-content",
                    display: "flex", flexDirection: "column", gap: 14,
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, color: "var(--pod-text)" }}>
                            In Bulk Import (JSON)
                        </span>
                        <button className="pod-btn pod-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={closeEditor}>✕</button>
                    </div>

                    <div style={{ fontSize: 13, color: "var(--pod-text-2)", lineHeight: 1.5 }}>
                        ChatGPT yoki Claude dan huddi quyidagi formatdagi <strong>JSON array</strong> shaklida savollarni tayyorlashini so'rang va shuyerga tashlang:
                    </div>

                    <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        rows={16}
                        style={{
                            background: "var(--pod-surface-2)", border: "1px solid var(--pod-border)",
                            borderRadius: 10, color: "var(--pod-text)", fontSize: 13,
                            padding: "12px", resize: "vertical", fontFamily: "monospace",
                            outline: "none", lineHeight: 1.5, whiteSpace: "pre",
                        }}
                        onFocus={(e) => e.target.style.borderColor = "var(--pod-accent)"}
                        onBlur={(e) => e.target.style.borderColor = "var(--pod-border)"}
                    />

                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            className="pod-btn pod-btn-primary"
                            onClick={handleBulkSave}
                            disabled={saving}
                            style={{ flex: 1, background: "var(--pod-success)" }}
                        >
                            {saving ? "⏳ Yuklanmoqda..." : "🚀 Barchasini saqlash"}
                        </button>
                        <button className="pod-btn pod-btn-ghost" onClick={closeEditor} style={{ padding: "10px 16px" }}>
                            Bekor
                        </button>
                    </div>
                </div>
            ) : editIdx !== null ? (
                <div style={{
                    width: 400, flexShrink: 0,
                    background: "var(--pod-surface)",
                    border: "1px solid var(--pod-border)",
                    borderRadius: "var(--pod-radius-lg)",
                    padding: 20,
                    position: "sticky", top: 20,
                    height: "fit-content",
                    display: "flex", flexDirection: "column", gap: 14,
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, color: "var(--pod-text)" }}>
                            {editIdx === "new" ? "Yangi savol" : `#${editIdx + 1} Tahrirlash`}
                        </span>
                        <button className="pod-btn pod-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={closeEditor}>✕</button>
                    </div>

                    {/* Question text */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 12, color: "var(--pod-text-2)", fontWeight: 600 }}>Savol matni *</label>
                        <textarea
                            value={form.question}
                            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                            rows={3}
                            placeholder="Savol matnini kiriting..."
                            style={{
                                background: "var(--pod-surface-2)", border: "1px solid var(--pod-border)",
                                borderRadius: 10, color: "var(--pod-text)", fontSize: 14,
                                padding: "10px 14px", resize: "vertical", fontFamily: "inherit",
                                outline: "none", lineHeight: 1.5,
                            }}
                            onFocus={(e) => e.target.style.borderColor = "var(--pod-accent)"}
                            onBlur={(e) => e.target.style.borderColor = "var(--pod-border)"}
                        />
                    </div>

                    {/* Options */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={{ fontSize: 12, color: "var(--pod-text-2)", fontWeight: 600 }}>Variantlar (to'g'risini tanlang) *</label>
                        {form.options.map((opt, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                {/* Correct radio */}
                                <input
                                    type="radio"
                                    name="correct"
                                    checked={form.correctIndex === i}
                                    onChange={() => setForm((f) => ({ ...f, correctIndex: i }))}
                                    style={{ accentColor: "var(--pod-success)", width: 16, height: 16, cursor: "pointer" }}
                                    title="To'g'ri javob sifatida belgilash"
                                />
                                <span style={{
                                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                                    background: form.correctIndex === i ? "var(--pod-success)" : "var(--pod-surface-3)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 11, fontWeight: 700, color: form.correctIndex === i ? "white" : "var(--pod-text-2)",
                                }}>
                                    {LETTERS[i]}
                                </span>
                                <input
                                    value={opt}
                                    onChange={(e) => setOption(i, e.target.value)}
                                    placeholder={`${LETTERS[i]} variant...`}
                                    style={{
                                        flex: 1, background: "var(--pod-surface-2)",
                                        border: `1px solid ${form.correctIndex === i ? "var(--pod-success)" : "var(--pod-border)"}`,
                                        borderRadius: 8, color: "var(--pod-text)", fontSize: 13,
                                        padding: "8px 12px", fontFamily: "inherit", outline: "none",
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = "var(--pod-accent)"}
                                    onBlur={(e) => e.target.style.borderColor = form.correctIndex === i ? "var(--pod-success)" : "var(--pod-border)"}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Audio hint time */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 12, color: "var(--pod-text-2)", fontWeight: 600 }}>
                            🎧 Audio ko'mak – sekund (ixtiyoriy)
                        </label>
                        <div style={{ display: "flex", gap: 8 }}>
                            <input
                                type="number"
                                min={0}
                                step={0.1}
                                value={form.audioHintTime}
                                onChange={(e) => setForm((f) => ({ ...f, audioHintTime: e.target.value }))}
                                placeholder="Masalan: 42.5"
                                style={{
                                    flex: 1, background: "var(--pod-surface-2)",
                                    border: "1px solid var(--pod-border)", borderRadius: 8,
                                    color: "var(--pod-text)", fontSize: 13,
                                    padding: "8px 12px", fontFamily: "monospace", outline: "none",
                                }}
                            />
                            {audioUrl && (
                                <button
                                    className="pod-btn pod-btn-ghost"
                                    style={{ padding: "8px 12px", fontSize: 16 }}
                                    onClick={handleHintPreview}
                                    title="Bu vaqtdan audioga eshitish"
                                >
                                    {hintPlaying ? "⏸" : "▶"}
                                </button>
                            )}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--pod-muted)" }}>
                            O'quvchi shu sekunddan audio eshitadi (javob aytilgan joydan)
                        </span>
                    </div>

                    {/* Explanation */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 12, color: "var(--pod-text-2)", fontWeight: 600 }}>
                            💡 Izoh (xato javob uchun, ixtiyoriy)
                        </label>
                        <textarea
                            value={form.explanation}
                            onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
                            rows={2}
                            placeholder="Nega bu javob to'g'ri yoki noto'g'ri..."
                            style={{
                                background: "var(--pod-surface-2)", border: "1px solid var(--pod-border)",
                                borderRadius: 8, color: "var(--pod-text)", fontSize: 13,
                                padding: "8px 12px", resize: "vertical", fontFamily: "inherit",
                                outline: "none", lineHeight: 1.5,
                            }}
                            onFocus={(e) => e.target.style.borderColor = "var(--pod-accent)"}
                            onBlur={(e) => e.target.style.borderColor = "var(--pod-border)"}
                        />
                    </div>

                    {/* Save / Cancel */}
                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            className="pod-btn pod-btn-primary"
                            onClick={handleSave}
                            disabled={saving}
                            style={{ flex: 1 }}
                        >
                            {saving ? "⏳ Saqlanmoqda..." : "💾 Saqlash"}
                        </button>
                        <button className="pod-btn pod-btn-ghost" onClick={closeEditor} style={{ padding: "10px 16px" }}>
                            Bekor
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

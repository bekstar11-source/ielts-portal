// src/components/PodcastInterface/admin/VocabAIHelper.jsx
import React, { useState, useEffect } from "react";
import { collection, getDocs, setDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../../firebase/firebase";
import "../shared/PodcastStyles.css";

export default function VocabAIHelper({ podcastId, transcript, level = "B1", hintWords = "" }) {
    const [vocab, setVocab] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [count, setCount] = useState(10);
    const [editIdx, setEditIdx] = useState(null);

    const fetchExisting = async () => {
        const snap = await getDocs(collection(db, "podcasts", podcastId, "vocabulary"));
        setVocab(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setFetching(false);
    };

    useEffect(() => { fetchExisting(); }, [podcastId]);

    const handleGenerate = async () => {
        if (!transcript) return alert("Transcript topilmadi. Avval audio yüklang.");
        setLoading(true);
        try {
            const functions = getFunctions();
            const genVocab = httpsCallable(functions, "generateVocab");
            const result = await genVocab({ transcript, level, count, hintWords });
            setVocab(result.data.vocabulary.map((v, i) => ({ ...v, id: `ai_${i}`, _isNew: true })));
        } catch (e) {
            alert("AI xatosi: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAll = async () => {
        setLoading(true);
        try {
            // O'chirib yangidan yozish
            const existing = await getDocs(collection(db, "podcasts", podcastId, "vocabulary"));
            for (const d of existing.docs) await deleteDoc(d.ref);

            for (const item of vocab) {
                const { _isNew, id: oldId, ...data } = item;
                const newRef = doc(collection(db, "podcasts", podcastId, "vocabulary"));
                await setDoc(newRef, { ...data, createdAt: serverTimestamp() });
            }
            await fetchExisting();
            alert("✅ Lug'at saqlandi!");
        } catch (e) {
            alert("Saqlash xatosi: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (i, field, val) => {
        setVocab((prev) => prev.map((v, idx) => idx === i ? { ...v, [field]: val } : v));
    };

    if (fetching) return <div style={{ padding: 20, color: "var(--pod-text-2)" }}>Yuklanmoqda...</div>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Controls */}
            <div className="pod-card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, color: "var(--pod-text-2)" }}>So'zlar soni</label>
                    <input
                        type="number" min={5} max={20}
                        className="pod-dictation-input"
                        style={{ width: 70, padding: "6px 10px", fontSize: 14 }}
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                    />
                </div>
                <button
                    className="pod-btn pod-btn-primary"
                    style={{ alignSelf: "flex-end" }}
                    onClick={handleGenerate}
                    disabled={loading}
                >
                    {loading ? "⏳ Generatsiya..." : "✨ AI bilan Generatsiya"}
                </button>
                {vocab.length > 0 && (
                    <button
                        className="pod-btn pod-btn-ghost"
                        style={{ alignSelf: "flex-end" }}
                        onClick={handleSaveAll}
                        disabled={loading}
                    >
                        💾 Hammasini Saqlash ({vocab.length} so'z)
                    </button>
                )}
            </div>

            {/* Vocab list */}
            {vocab.length === 0 ? (
                <p style={{ color: "var(--pod-muted)", fontSize: 13 }}>
                    Hali so'z yo'q. "AI bilan Generatsiya" tugmasini bosing.
                </p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {vocab.map((item, i) => (
                        <div key={i} className="pod-card" style={{ padding: 16 }}>
                            {editIdx === i ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {["word", "definition", "example", "testSentence"].map((field) => (
                                        <div key={field} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            <label style={{ fontSize: 11, color: "var(--pod-text-2)" }}>{field}</label>
                                            <input
                                                className="pod-dictation-input"
                                                style={{ padding: "8px 12px", fontSize: 13 }}
                                                value={item[field] || ""}
                                                onChange={(e) => handleEdit(i, field, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    <button className="pod-btn pod-btn-ghost" style={{ fontSize: 12, alignSelf: "flex-start" }}
                                        onClick={() => setEditIdx(null)}>Yopish</button>
                                </div>
                            ) : (
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                                            <span style={{ fontWeight: 700, color: "var(--pod-text)", fontSize: 15 }}>{item.word}</span>
                                            {item._isNew && <span style={{ fontSize: 10, color: "var(--pod-accent)", border: "1px solid", borderColor: "var(--pod-accent)", padding: "1px 6px", borderRadius: 99 }}>AI</span>}
                                        </div>
                                        <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--pod-text-2)" }}>{item.definition}</p>
                                        {item.example && <p style={{ margin: 0, fontSize: 12, color: "var(--pod-muted)", fontStyle: "italic" }}>"{item.example}"</p>}
                                        {item.testSentence && (
                                            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--pod-accent-2)" }}>
                                                📝 {item.testSentence}
                                            </p>
                                        )}
                                    </div>
                                    <button className="pod-btn pod-btn-ghost" style={{ fontSize: 12, padding: "6px 12px", flexShrink: 0 }}
                                        onClick={() => setEditIdx(i)}>✏️</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

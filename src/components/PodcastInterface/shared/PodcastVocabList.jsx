// src/components/PodcastInterface/shared/PodcastVocabList.jsx
import React, { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import "./PodcastStyles.css";

export default function PodcastVocabList({ podcastId }) {
    const [vocab, setVocab] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!podcastId) return;
        const fetchVocab = async () => {
            const q = query(collection(db, "podcasts", podcastId, "vocabulary"), orderBy("createdAt", "asc"));
            const snap = await getDocs(q);
            setVocab(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        };
        fetchVocab();
    }, [podcastId]);

    if (loading) return <div style={{ color: "var(--pod-muted)", fontSize: 13 }}>Yuklanmoqda...</div>;
    if (vocab.length === 0) return null;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
            <h3 style={{ fontSize: 18, color: "var(--pod-text)", margin: "0 0 8px" }}>
                📚 Advanced Vocabulary & Collocations
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {vocab.map((item) => (
                    <div key={item.id} className="pod-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <span style={{ fontWeight: 700, color: "var(--pod-accent-2)", fontSize: 16 }}>{item.word}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: "var(--pod-text)", lineHeight: 1.5 }}>
                            {item.definition}
                        </p>
                        {item.example && (
                            <p style={{ margin: 0, fontSize: 13, color: "var(--pod-muted)", fontStyle: "italic" }}>
                                "{item.example}"
                            </p>
                        )}
                        {item.testSentence && (
                            <div style={{ marginTop: 4, padding: "8px 12px", background: "rgba(99, 102, 241, 0.05)", borderRadius: 8, border: "1px solid var(--pod-border)" }}>
                                <span style={{ fontSize: 11, color: "var(--pod-accent)", fontWeight: 600, display: "block", marginBottom: 2 }}>PRACTICE SENTENCE:</span>
                                <p style={{ margin: 0, fontSize: 13, color: "var(--pod-text-2)" }}>{item.testSentence}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// src/pages/AdminPodcasts.jsx
import React, { useState, useEffect } from "react";
import {
    collection,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    doc,
    updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import "../components/PodcastInterface/shared/PodcastStyles.css";

const DIFF_LABELS = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    super_hard: "Super Hard",
};

export default function AdminPodcasts() {
    const [podcasts, setPodcasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetch = async () => {
        setLoading(true);
        const q = query(collection(db, "podcasts"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setPodcasts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
    };

    useEffect(() => { fetch(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Podcast'ni o'chirishni tasdiqlaysizmi?")) return;
        await deleteDoc(doc(db, "podcasts", id));
        fetch();
    };

    const toggleStatus = async (podcast) => {
        const newStatus = podcast.status === "published" ? "draft" : "published";
        await updateDoc(doc(db, "podcasts", podcast.id), { status: newStatus });
        fetch();
    };

    return (
        <div className="podcast-layout" style={{ padding: 32, minHeight: "100vh" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--pod-text)" }}>
                        🎙 Podcast Mastery
                    </h1>
                    <p style={{ margin: "4px 0 0", color: "var(--pod-text-2)", fontSize: 13 }}>
                        {podcasts.length} ta podcast mavjud
                    </p>
                </div>
                <button
                    className="pod-btn pod-btn-primary"
                    onClick={() => navigate("/admin/create-podcast")}
                >
                    + Yangi Podcast
                </button>
            </div>

            {/* Podcast list */}
            {loading ? (
                <p style={{ color: "var(--pod-text-2)" }}>Yuklanmoqda...</p>
            ) : podcasts.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60, color: "var(--pod-muted)" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎧</div>
                    <p>Hali podcast yaratilmagan.</p>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                    {podcasts.map((p) => (
                        <div key={p.id} className="pod-card" style={{ position: "relative" }}>
                            {/* Status badge */}
                            <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 8 }}>
                                <span
                                    style={{
                                        fontSize: 10, fontWeight: 700,
                                        padding: "3px 8px", borderRadius: 99,
                                        background: p.status === "published" ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.15)",
                                        color: p.status === "published" ? "var(--pod-success)" : "var(--pod-muted)",
                                        border: "1px solid",
                                        borderColor: p.status === "published" ? "rgba(16,185,129,0.3)" : "rgba(100,116,139,0.3)",
                                    }}
                                >
                                    {p.status === "published" ? "● Published" : "○ Draft"}
                                </span>
                            </div>

                            <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--pod-text)", paddingRight: 80 }}>
                                {p.title || "Sarlavsiz Podcast"}
                            </h3>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                                {p.difficulty && (
                                    <span className={`pod-diff-badge pod-diff-${p.difficulty}`}>
                                        {DIFF_LABELS[p.difficulty] || p.difficulty}
                                    </span>
                                )}
                                {p.level && (
                                    <span style={{
                                        fontSize: 11, padding: "3px 8px", borderRadius: 99,
                                        background: "rgba(99,102,241,0.12)", color: "var(--pod-accent-2)",
                                        border: "1px solid rgba(99,102,241,0.2)"
                                    }}>
                                        {p.level}
                                    </span>
                                )}
                                {p.duration && (
                                    <span style={{ fontSize: 11, color: "var(--pod-muted)" }}>
                                        ⏱ {Math.round(p.duration / 60)} daq
                                    </span>
                                )}
                                {p.totalSegments && (
                                    <span style={{ fontSize: 11, color: "var(--pod-muted)" }}>
                                        {p.totalSegments} gap
                                    </span>
                                )}
                            </div>

                            {p.transcriptionStatus === "processing" && (
                                <p style={{ fontSize: 12, color: "var(--pod-warning)", margin: "0 0 10px" }}>
                                    ⏳ Transkriptsiya jarayonida...
                                </p>
                            )}
                            {p.transcriptionStatus === "failed" && (
                                <p style={{ fontSize: 12, color: "var(--pod-error)", margin: "0 0 10px" }}>
                                    ✗ Transkriptsiya muvaffaqiyatsiz
                                </p>
                            )}

                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    className="pod-btn pod-btn-ghost"
                                    style={{ fontSize: 12, padding: "6px 12px", flex: 1 }}
                                    onClick={() => navigate(`/admin/edit-podcast/${p.id}`)}
                                >
                                    ✏️ Tahrirlash
                                </button>
                                <button
                                    className="pod-btn pod-btn-ghost"
                                    style={{ fontSize: 12, padding: "6px 12px" }}
                                    onClick={() => toggleStatus(p)}
                                >
                                    {p.status === "published" ? "Yashirish" : "Nashr"}
                                </button>
                                <button
                                    className="pod-btn pod-btn-ghost"
                                    style={{ fontSize: 12, padding: "6px 12px", color: "var(--pod-error)" }}
                                    onClick={() => handleDelete(p.id)}
                                >
                                    🗑
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

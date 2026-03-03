// src/pages/CreatePodcast.jsx
import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    doc, getDoc, setDoc, updateDoc, serverTimestamp, collection
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db, storage } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import WaveformEditor from "../components/PodcastInterface/admin/WaveformEditor";
import VocabAIHelper from "../components/PodcastInterface/admin/VocabAIHelper";
import "../components/PodcastInterface/shared/PodcastStyles.css";

const DIFFICULTIES = [
    { value: "easy", label: "🟢 Easy" },
    { value: "medium", label: "🟡 Medium" },
    { value: "hard", label: "🔴 Hard" },
    { value: "super_hard", label: "🟣 Super Hard" },
];

const LEVELS = ["A2", "B1", "B2", "C1"];

export default function CreatePodcast() {
    const { id: editId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const fileRef = useRef(null);

    const [step, setStep] = useState(editId ? "editor" : "upload"); // 'upload' | 'transcribing' | 'editor'
    const [podcastId, setPodcastId] = useState(editId || null);
    const [podcast, setPodcast] = useState(null);

    const [form, setForm] = useState({
        title: "", description: "", difficulty: "medium", level: "B1", script: "", hintWords: "",
    });
    const [uploadProgress, setUploadProgress] = useState(0);
    const [transcribeStatus, setTranscribeStatus] = useState("");
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("segments"); // 'segments' | 'vocab'

    // Edit mode: load existing podcast
    useEffect(() => {
        if (!editId) return;
        getDoc(doc(db, "podcasts", editId)).then((snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setPodcast({ id: editId, ...data });
                setForm({
                    title: data.title || "",
                    description: data.description || "",
                    difficulty: data.difficulty || "medium",
                    level: data.level || "B1",
                    script: data.script || "",
                    hintWords: data.hintWords || "",
                });
            }
        });
    }, [editId]);

    const handleFileSelect = async (file) => {
        if (!file || !file.type.includes("audio")) return alert("Iltimos MP3 yoki audio fayl tanlang.");

        setSaving(true);
        try {
            // 1. Firestore'da podcast hujjat yaratish
            const podRef = doc(collection(db, "podcasts"));
            const newPodcast = {
                title: form.title || file.name.replace(/\.[^/.]+$/, ""),
                description: form.description,
                difficulty: form.difficulty,
                level: form.level,
                script: form.script,
                hintWords: form.hintWords,
                status: "draft",
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                transcriptionStatus: "pending",
            };
            await setDoc(podRef, newPodcast);
            setPodcastId(podRef.id);

            // 2. Firebase Storage'ga yuklash
            setStep("transcribing");
            setTranscribeStatus("Audio yuklanmoqda...");

            const storageRef = ref(storage, `podcasts/${podRef.id}/audio.mp3`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
                (err) => { setSaving(false); alert("Yuklash xatosi: " + err.message); },
                async () => {
                    const audioUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    await updateDoc(podRef, { audioUrl });

                    setTranscribeStatus("Whisper AI matnni tahlil qilmoqda...");

                    // 3. Firebase Function — transcription
                    const functions = getFunctions();
                    const transcribe = httpsCallable(functions, "transcribePodcast");
                    await transcribe({ podcastId: podRef.id, audioUrl, script: form.script });

                    // 4. Podcast ma'lumotlarini yuklash
                    const updatedSnap = await getDoc(podRef);
                    setPodcast({ id: podRef.id, ...updatedSnap.data() });
                    setStep("editor");
                    setSaving(false);
                }
            );
        } catch (e) {
            setSaving(false);
            alert("Xato: " + e.message);
        }
    };

    const handleSaveMeta = async () => {
        if (!podcastId) return;
        setSaving(true);
        await updateDoc(doc(db, "podcasts", podcastId), {
            title: form.title,
            description: form.description,
            difficulty: form.difficulty,
            level: form.level,
            script: form.script,
            hintWords: form.hintWords,
        });
        setSaving(false);
    };

    const handlePublish = async () => {
        if (!podcastId) return;
        await updateDoc(doc(db, "podcasts", podcastId), { status: "published" });
        navigate("/admin/podcasts");
    };

    return (
        <div className="podcast-layout" style={{ padding: "24px 32px" }}>
            <div style={{ maxWidth: 1400, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--pod-text)" }}>
                        {editId ? "✏️ Podcast Tahrirlash" : "+ Yangi Podcast"}
                    </h1>
                    <button className="pod-btn pod-btn-ghost" onClick={() => navigate("/admin/podcasts")}>
                        ← Orqaga
                    </button>
                </div>

                {/* Meta form */}
                <div className="pod-card" style={{ marginBottom: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 12, color: "var(--pod-text-2)" }}>Sarlavha</label>
                            <input
                                className="pod-dictation-input"
                                style={{ padding: "10px 14px", fontSize: 14 }}
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                placeholder="Podcast nomi..."
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 12, color: "var(--pod-text-2)" }}>Tavsif</label>
                            <input
                                className="pod-dictation-input"
                                style={{ padding: "10px 14px", fontSize: 14 }}
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="Qisqa tavsif..."
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 12, color: "var(--pod-text-2)" }}>Qiyinlik darajasi</label>
                            <select
                                className="pod-dictation-input"
                                style={{ padding: "10px 14px", fontSize: 14 }}
                                value={form.difficulty}
                                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                            >
                                {DIFFICULTIES.map((d) => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 12, color: "var(--pod-text-2)" }}>CEFR Daraja</label>
                            <select
                                className="pod-dictation-input"
                                style={{ padding: "10px 14px", fontSize: 14 }}
                                value={form.level}
                                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                            >
                                {LEVELS.map((l) => <option key={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>
                    {/* Yangi: Original Script matni maydoni */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <label style={{ fontSize: 13, color: "var(--pod-text)", fontWeight: 600 }}>Original Podcast Matni (Script)</label>
                            <span style={{ fontSize: 11, color: "var(--pod-muted)" }}>Ihtiyoriy, lekin aniq tekshirish uchun juda muhim!</span>
                        </div>
                        <textarea
                            className="pod-dictation-input"
                            style={{ padding: "10px 14px", fontSize: 14, minHeight: 120 }}
                            value={form.script}
                            onChange={(e) => setForm((f) => ({ ...f, script: e.target.value }))}
                            placeholder="To'liq va xatosiz audioning matnini bu yerga tashlang. Bu tizimga gaplarni 100% tushunishga va aniq vaqtlarga ajratishga yordam beradi (Forced Alignment)..."
                        />
                    </div>
                    {/* Yangi: Hint Words (Qiyin so'zlar) maydoni */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <label style={{ fontSize: 13, color: "var(--pod-text)", fontWeight: 600 }}>💡 Yordamchi so'zlar (Hint Words)</label>
                            <span style={{ fontSize: 11, color: "var(--pod-muted)" }}>Atoqli otlar yoki murakkab so'zlar. Vergul bilan ajrating</span>
                        </div>
                        <input
                            className="pod-dictation-input"
                            style={{ padding: "10px 14px", fontSize: 14 }}
                            value={form.hintWords}
                            onChange={(e) => setForm((f) => ({ ...f, hintWords: e.target.value }))}
                            placeholder="Masalan: Professor Smith, Antarctica, photosynthesis, entrepreneur..."
                        />
                    </div>
                    {podcastId && (
                        <button className="pod-btn pod-btn-ghost" style={{ marginTop: 14, fontSize: 13 }} onClick={handleSaveMeta} disabled={saving}>
                            {saving ? "Saqlanmoqda..." : "💾 Ma'lumotlarni saqlash"}
                        </button>
                    )}
                </div>

                {/* Upload step */}
                {step === "upload" && (
                    <div
                        className="pod-card"
                        style={{
                            textAlign: "center", padding: 48, cursor: "pointer",
                            borderStyle: "dashed",
                        }}
                        onClick={() => fileRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]); }}
                    >
                        <input ref={fileRef} type="file" accept="audio/*" style={{ display: "none" }}
                            onChange={(e) => handleFileSelect(e.target.files[0])} />
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🎵</div>
                        <p style={{ color: "var(--pod-text)", fontWeight: 600, margin: "0 0 6px" }}>
                            MP3 faylni shu yerga tashlang yoki bosing
                        </p>
                        <p style={{ color: "var(--pod-muted)", fontSize: 13, margin: 0 }}>
                            Yuklanganidan so'ng Whisper AI avtomatik matnga o'giradi
                        </p>
                    </div>
                )}

                {/* Transcribing step */}
                {step === "transcribing" && (
                    <div className="pod-card" style={{ textAlign: "center", padding: 40 }}>
                        <div style={{ fontSize: 36, marginBottom: 16 }}>⚙️</div>
                        <p style={{ color: "var(--pod-text)", fontWeight: 600, marginBottom: 16 }}>{transcribeStatus}</p>
                        {uploadProgress > 0 && uploadProgress < 100 && (
                            <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
                                <div style={{ height: 6, background: "var(--pod-surface-3)", borderRadius: 99 }}>
                                    <div style={{ height: "100%", background: "var(--pod-accent)", borderRadius: 99, width: `${uploadProgress}%`, transition: "width 0.3s" }} />
                                </div>
                                <span style={{ fontSize: 12, color: "var(--pod-text-2)" }}>{uploadProgress}%</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Editor step */}
                {step === "editor" && podcast && (
                    <>
                        {/* Tabs */}
                        <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "var(--pod-surface-2)", padding: 4, borderRadius: "var(--pod-radius)", width: "fit-content" }}>
                            {["segments", "vocab"].map((tab) => (
                                <button
                                    key={tab}
                                    className="pod-btn"
                                    style={{
                                        padding: "8px 20px", fontSize: 13, borderRadius: 10,
                                        background: activeTab === tab ? "var(--pod-accent)" : "transparent",
                                        color: activeTab === tab ? "white" : "var(--pod-text-2)",
                                        boxShadow: "none",
                                    }}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab === "segments" ? "🌊 Segmentlar" : "📚 Lug'at (AI)"}
                                </button>
                            ))}
                        </div>

                        {activeTab === "segments" && (
                            <WaveformEditor podcastId={podcast.id} audioUrl={podcast.audioUrl} />
                        )}
                        {activeTab === "vocab" && (
                            <VocabAIHelper podcastId={podcast.id} transcript={podcast.fullTranscript} level={form.level} hintWords={form.hintWords} />
                        )}

                        {/* Publish */}
                        <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
                            <button className="pod-btn pod-btn-primary" onClick={handlePublish}>
                                🚀 Nashr Etish (Published)
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

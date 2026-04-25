// src/pages/CreateDictation.jsx
import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc, writeBatch, deleteDoc, getDocs
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import "../components/PodcastInterface/shared/PodcastStyles.css";
import { Save, Upload, ArrowLeft, CheckCircle, AlertCircle, FileJson } from "lucide-react";

const DIFFICULTIES = [
    { value: "easy", label: "🟢 Easy" },
    { value: "medium", label: "🟡 Medium" },
    { value: "hard", label: "🔴 Hard" },
    { value: "super_hard", label: "🟣 Super Hard" },
];

const LEVELS = ["A2", "B1", "B2", "C1", "C2"];

const DEFAULT_JSON = {
  "segments": [
    { "startTime": 0, "endTime": 5, "text": "Bu yerga birinchi gapni yozing..." }
  ],
  "mcqs": [
    {
      "question": "Birinchi savolni yozing...",
      "options": ["Variant A", "Variant B", "Variant C"],
      "correctIndex": 0,
      "hint": { "startTime": 0, "endTime": 5 }
    }
  ],
  "gapFill": [
    { "text": "Gap ichidagi so'zni {{braket}} ichiga oling." }
  ]
};

export default function CreateDictation() {
    const { id: editId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const fileRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    
    const [form, setForm] = useState({
        title: "",
        description: "",
        difficulty: "medium",
        level: "B2",
        audioUrl: "",
        script: "",
        jsonContent: JSON.stringify(DEFAULT_JSON, null, 2)
    });

    const [jsonError, setJsonError] = useState(null);

    // Load data if editing
    useEffect(() => {
        if (!editId) return;
        setLoading(true);
        const fetchData = async () => {
            try {
                const podSnap = await getDoc(doc(db, "podcasts", editId));
                if (!podSnap.exists()) return;
                const podData = podSnap.data();

                // Fetch segments
                const segSnap = await getDocs(query(collection(db, "podcasts", editId, "segments"), orderBy("index")));
                const segments = segSnap.docs.map(d => ({ ...d.data(), id: d.id }));

                // Fetch MCQs
                const mcqSnap = await getDocs(query(collection(db, "podcasts", editId, "mcqQuestions"), orderBy("index")));
                const mcqs = mcqSnap.docs.map(d => ({ ...d.data(), id: d.id }));

                // Fetch Gap Fill
                const gapSnap = await getDoc(doc(db, "podcasts", editId, "gapFill", "data"));
                const gapFill = gapSnap.exists() ? gapSnap.data().segments : [];

                setForm({
                    title: podData.title || "",
                    description: podData.description || "",
                    difficulty: podData.difficulty || "medium",
                    level: podData.level || "B2",
                    audioUrl: podData.audioUrl || "",
                    script: podData.script || "",
                    jsonContent: JSON.stringify({ segments, mcqs, gapFill }, null, 2)
                });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [editId]);

    const handleFileUpload = async (file) => {
        if (!file) return;
        setSaving(true);
        const storageRef = ref(storage, `podcasts/${editId || "new"}/audio_${Date.now()}.mp3`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(Math.round(progress));
            },
            (error) => {
                console.error(error);
                setSaving(false);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                setForm(f => ({ ...f, audioUrl: downloadURL }));
                setSaving(false);
                setUploadProgress(0);
            }
        );
    };

    const validateJSON = (content) => {
        try {
            const parsed = JSON.parse(content);
            if (!parsed.segments || !Array.isArray(parsed.segments)) throw new Error("JSON'da 'segments' massivi bo'lishi shart.");
            setJsonError(null);
            return parsed;
        } catch (e) {
            setJsonError(e.message);
            return null;
        }
    };

    const handleSave = async () => {
        const parsed = validateJSON(form.jsonContent);
        if (!parsed) return;
        if (!form.title) return alert("Sarlavha kiriting");
        if (!form.audioUrl) return alert("Audio yuklang");
        
        let finalAudioUrl = form.audioUrl;
        if (finalAudioUrl.startsWith("gs://")) {
            try {
                const storageRef = ref(storage, finalAudioUrl);
                finalAudioUrl = await getDownloadURL(storageRef);
            } catch (e) {
                return alert("Xato: 'gs://' linkini o'girib bo'lmadi. Iltimos HTTPS linkdan foydalaning.");
            }
        }

        setSaving(true);
        try {
            const podId = editId || doc(collection(db, "podcasts")).id;
            const podRef = doc(db, "podcasts", podId);

            const podcastData = {
                title: form.title,
                description: form.description,
                difficulty: form.difficulty,
                level: form.level,
                audioUrl: finalAudioUrl,
                script: form.script,
                status: "published",
                type: "podcast",
                updatedAt: serverTimestamp()
            };
            if (!editId) podcastData.createdAt = serverTimestamp();

            await setDoc(podRef, podcastData, { merge: true });

            // Batch save segments
            const batch = writeBatch(db);
            
            // Delete old segments if editing
            if (editId) {
                const oldSegs = await getDocs(collection(db, "podcasts", podId, "segments"));
                oldSegs.forEach(d => batch.delete(d.ref));
                const oldMcqs = await getDocs(collection(db, "podcasts", podId, "mcqQuestions"));
                oldMcqs.forEach(d => batch.delete(d.ref));
            }

            // Save segments
            parsed.segments.forEach((seg, idx) => {
                const sRef = doc(collection(db, "podcasts", podId, "segments"));
                batch.set(sRef, { ...seg, index: idx });
            });

            // Save MCQs
            if (parsed.mcqs) {
                parsed.mcqs.forEach((m, idx) => {
                    const mRef = doc(collection(db, "podcasts", podId, "mcqQuestions"));
                    batch.set(mRef, { ...m, index: idx });
                });
            }

            // Save Gap Fill
            const gapRef = doc(db, "podcasts", podId, "gapFill", "data");
            batch.set(gapRef, { segments: parsed.gapFill || [] });

            await batch.commit();
            alert("Dictation muvaffaqiyatli saqlandi! 🚀");
            navigate("/admin/podcasts");
        } catch (e) {
            console.error(e);
            alert("Xatolik yuz berdi: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center">Yuklanmoqda...</div>;

    return (
        <div className="podcast-layout" style={{ background: "#f8f9fa", minHeight: "100vh", padding: "40px 20px" }}>
            <div style={{ maxWidth: 1000, margin: "0 auto" }}>
                <button 
                    onClick={() => navigate("/admin/podcasts")}
                    style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#6c757d", cursor: "pointer", marginBottom: 20, fontWeight: 600 }}
                >
                    <ArrowLeft size={18} /> Orqaga qaytish
                </button>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>
                        {editId ? "Dictation Tahrirlash" : "Yangi Dictation Yaratish"}
                    </h1>
                    <div style={{ display: "flex", gap: 12 }}>
                        {editId && (
                            <button 
                                onClick={() => window.open(`/podcast/${editId}`, "_blank")}
                                className="pod-btn pod-btn-ghost"
                                style={{ padding: "12px 24px" }}
                            >
                                👁 Ko'rish (Preview)
                            </button>
                        )}
                        <button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="pod-btn pod-btn-primary"
                            style={{ padding: "12px 32px", fontSize: 16 }}
                        >
                            {saving ? "Saqlanmoqda..." : <><Save size={18} /> Saqlash</>}
                        </button>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 24 }}>
                    {/* Left: JSON Editor */}
                    <div className="pod-card" style={{ padding: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                            <FileJson size={20} className="text-indigo-600" />
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Savollar va Segmentlar (JSON)</h2>
                        </div>
                        
                        <textarea
                            style={{
                                width: "100%",
                                minHeight: 600,
                                fontFamily: "monospace",
                                fontSize: 13,
                                padding: 16,
                                borderRadius: 12,
                                border: jsonError ? "2px solid #ef4444" : "1px solid #e2e8f0",
                                background: "#1e293b",
                                color: "#f8fafc",
                                outline: "none",
                                resize: "vertical"
                            }}
                            value={form.jsonContent}
                            onChange={(e) => {
                                setForm(f => ({ ...f, jsonContent: e.target.value }));
                                validateJSON(e.target.value);
                            }}
                        />
                        {jsonError && (
                            <div style={{ marginTop: 12, color: "#ef4444", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                                <AlertCircle size={14} /> {jsonError}
                            </div>
                        )}
                        {!jsonError && (
                            <div style={{ marginTop: 12, color: "#10b981", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                                <CheckCircle size={14} /> JSON format to'g'ri
                            </div>
                        )}
                    </div>

                    {/* Right: Meta & Audio */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <div className="pod-card" style={{ padding: 24 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Asosiy Ma'lumotlar</h3>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Sarlavha</label>
                                    <input 
                                        className="pod-dictation-input"
                                        placeholder="Podcast sarlavhasi..."
                                        value={form.title}
                                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Qiyinchilik</label>
                                    <select 
                                        className="pod-dictation-input"
                                        value={form.difficulty}
                                        onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                                    >
                                        {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Daraja</label>
                                    <select 
                                        className="pod-dictation-input"
                                        value={form.level}
                                        onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                                    >
                                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Podcast Script (To'liq matn)</label>
                                    <textarea 
                                        className="pod-dictation-input"
                                        style={{ minHeight: 150, resize: "vertical" }}
                                        placeholder="Podcastning to'liq matnini bu yerga kiriting..."
                                        value={form.script}
                                        onChange={e => setForm(f => ({ ...f, script: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pod-card" style={{ padding: 24 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Audio Fayl</h3>
                            
                            {form.audioUrl ? (
                                <div style={{ background: "#f1f5f9", padding: 12, borderRadius: 12, marginBottom: 16 }}>
                                    <audio src={form.audioUrl} controls style={{ width: "100%" }} />
                                    <button 
                                        onClick={() => setForm(f => ({ ...f, audioUrl: "" }))}
                                        style={{ marginTop: 8, fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                                    >
                                        O'chirish va yangisini tanlash
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                    {/* Upload option */}
                                    <div 
                                        onClick={() => fileRef.current.click()}
                                        style={{ 
                                            border: "2px dashed #e2e8f0", 
                                            borderRadius: 16, 
                                            padding: 24, 
                                            textAlign: "center", 
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                        onMouseOver={e => e.currentTarget.style.borderColor = "#6366f1"}
                                        onMouseOut={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                                    >
                                        <input 
                                            type="file" 
                                            ref={fileRef} 
                                            style={{ display: "none" }} 
                                            accept="audio/*"
                                            onChange={e => handleFileUpload(e.target.files[0])}
                                        />
                                        <Upload size={24} className="text-zinc-300 mx-auto mb-2" />
                                        <p style={{ fontSize: 13, fontWeight: 600, color: "#64748b", margin: 0 }}>Fayl yuklash</p>
                                        {uploadProgress > 0 && (
                                            <div style={{ marginTop: 12, height: 4, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                                                <div style={{ height: "100%", background: "#6366f1", width: `${uploadProgress}%` }} />
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: "flex", itemsCenter: "center", gap: 10 }}>
                                        <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                                        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>YOKI</span>
                                        <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                                    </div>

                                    {/* Link option */}
                                    <div>
                                        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Audio Link (URL)</label>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <input 
                                                className="pod-dictation-input"
                                                style={{ fontSize: 13 }}
                                                placeholder="https://example.com/audio.mp3 yoki gs://..."
                                                onBlur={async (e) => {
                                                    let val = e.target.value.trim();
                                                    if (!val) return;

                                                    if (val.startsWith("gs://")) {
                                                        try {
                                                            setSaving(true);
                                                            const storageRef = ref(storage, val);
                                                            const dlUrl = await getDownloadURL(storageRef);
                                                            setForm(f => ({ ...f, audioUrl: dlUrl }));
                                                        } catch (err) {
                                                            alert("GS Linkini o'girishda xatolik: " + err.message);
                                                        } finally {
                                                            setSaving(false);
                                                        }
                                                    } else {
                                                        setForm(f => ({ ...f, audioUrl: val }));
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

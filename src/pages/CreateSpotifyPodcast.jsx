// src/pages/CreateSpotifyPodcast.jsx
import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { Save, Upload, ArrowLeft, Headphones, Music, FileText, HelpCircle, Eye, CheckCircle2 } from "lucide-react";

const DEFAULT_JSON = {
  "transcript": [
    { "time": "0:00", "text": "Welcome to Englev's Interactive Podcast!" },
    { "time": "0:05", "text": "Today we are talking about IELTS Listening tips." },
    { "time": "0:12", "text": "First, let's look at the multiple choice questions." }
  ],
  "questions": [
    {
      "time": "0:15",
      "type": "mcq",
      "data": {
        "question": "What is today's main topic?",
        "options": ["IELTS Listening", "Reading Tips", "Speaking Practice"],
        "correctIndex": 0
      }
    },
    {
      "time": "0:45",
      "type": "gapfill",
      "data": {
        "text": "The secret to success is {{gap}} and active listening.",
        "answer": "consistency"
      }
    }
  ]
};

export default function CreateSpotifyPodcast() {
    const { id: editId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const fileRef = useRef(null);
    const thumbRef = useRef(null);

    const [saving, setSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [thumbProgress, setThumbProgress] = useState(0);

    const [form, setForm] = useState({
        title: "",
        level: "B2",
        audioUrl: "",
        thumbnail: "",
        contentJson: JSON.stringify(DEFAULT_JSON, null, 2)
    });

    useEffect(() => {
        if (!editId) return;
        getDoc(doc(db, "podcasts", editId)).then(snap => {
            if (snap.exists()) {
                const data = snap.data();
                setForm({
                    title: data.title || "",
                    level: data.level || "B2",
                    audioUrl: data.audioUrl || "",
                    thumbnail: data.thumbnail || "",
                    contentJson: JSON.stringify({
                        transcript: data.transcript?.map(t => ({ ...t, time: `${Math.floor(t.time / 60)}:${(t.time % 60).toString().padStart(2, '0')}` })) || [],
                        questions: data.questions?.map(q => ({ ...q, time: `${Math.floor(q.time / 60)}:${(q.time % 60).toString().padStart(2, '0')}` })) || []
                    }, null, 2)
                });
            }
        });
    }, [editId]);

    const handleFileUpload = (file, type) => {
        const isAudio = type === 'audio';
        const storageRef = ref(storage, `podcasts/${editId || "new"}/${isAudio ? "audio" : "thumb"}_${Date.now()}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on("state_changed", 
            snap => {
                const p = (snap.bytesTransferred / snap.totalBytes) * 100;
                isAudio ? setUploadProgress(p) : setThumbProgress(p);
            },
            err => alert(err.message),
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                setForm(f => ({ ...f, [isAudio ? 'audioUrl' : 'thumbnail']: url }));
                isAudio ? setUploadProgress(0) : setThumbProgress(0);
            }
        );
    };

    const parseTime = (timeStr) => {
        if (typeof timeStr === 'number') return timeStr;
        if (!timeStr) return 0;
        const cleanStr = String(timeStr).trim().replace(/[\[\]]/g, ''); 
        const parts = cleanStr.split(':');
        if (parts.length >= 2) {
            const min = parseInt(parts[parts.length - 2]) || 0;
            const sec = parseInt(parts[parts.length - 1]) || 0;
            return min * 60 + sec;
        }
        return parseInt(cleanStr) || 0;
    };

    const handleSave = async () => {
        if (!form.title || !form.audioUrl) return alert("Sarlavha va audio majburiy!");
        setSaving(true);

        try {
            const parsed = JSON.parse(form.contentJson);
            
            const transcript = (parsed.transcript || []).map(t => ({
                time: parseTime(t.time),
                text: t.text
            }));

            const questions = (parsed.questions || []).map(q => ({
                ...q,
                time: parseTime(q.time)
            }));

            const podId = editId || doc(collection(db, "podcasts")).id;
            await setDoc(doc(db, "podcasts", podId), {
                title: form.title,
                level: form.level,
                audioUrl: form.audioUrl,
                thumbnail: form.thumbnail,
                transcript,
                questions,
                mode: "spotify",
                status: "published",
                updatedAt: serverTimestamp(),
                createdAt: editId ? undefined : serverTimestamp()
            }, { merge: true });

            alert("Spotify Podcast muvaffaqiyatli saqlandi!");
            navigate("/admin/podcasts");
        } catch (err) {
            alert("JSON xatosi: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">
                                Spotify-Style Creator <span className="text-green-500">(JSON Mode)</span>
                            </h1>
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Interaktiv podcastlar uchun professional muharrir</p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        {editId && (
                            <button onClick={() => window.open(`/podcast/spotify/${editId}`, '_blank')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all">
                                <Eye size={18} /> Preview
                            </button>
                        )}
                        <button onClick={handleSave} disabled={saving} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20">
                            {saving ? "Saqlanmoqda..." : <><Save size={18} /> Saqlash</>}
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-zinc-100">
                            <div className="flex items-center gap-3 mb-6">
                                <Headphones size={20} className="text-green-500" />
                                <h3 className="font-bold text-zinc-900">Asosiy Ma'lumotlar</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Podcast Sarlavhasi</label>
                                    <input 
                                        className="w-full bg-zinc-50 border border-zinc-100 p-4 rounded-2xl outline-none focus:border-green-500 transition-colors font-medium"
                                        value={form.title}
                                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        placeholder="Podcast nomi..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Daraja (CEFR)</label>
                                    <select 
                                        className="w-full bg-zinc-50 border border-zinc-100 p-4 rounded-2xl outline-none focus:border-green-500 transition-colors font-medium appearance-none"
                                        value={form.level}
                                        onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                                    >
                                        {["A2", "B1", "B2", "C1", "C2"].map(l => <option key={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-zinc-100">
                            <div className="flex items-center gap-3 mb-6">
                                <Music size={20} className="text-green-500" />
                                <h3 className="font-bold text-zinc-900">Media</h3>
                            </div>
                            
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Audio Link (Direct URL)</label>
                                    <input 
                                        className="w-full bg-zinc-50 border border-zinc-100 p-4 rounded-2xl outline-none focus:border-green-500 transition-colors font-medium text-xs"
                                        placeholder="https://... yoki gs://..."
                                        value={form.audioUrl}
                                        onBlur={async (e) => {
                                            let val = e.target.value.trim();
                                            if (!val) return;
                                            if (val.startsWith("gs://")) {
                                                try {
                                                    setSaving(true);
                                                    const dlUrl = await getDownloadURL(ref(storage, val));
                                                    setForm(f => ({ ...f, audioUrl: dlUrl }));
                                                } catch (err) { alert(err.message); }
                                                finally { setSaving(false); }
                                            } else {
                                                setForm(f => ({ ...f, audioUrl: val }));
                                            }
                                        }}
                                        onChange={e => setForm(f => ({ ...f, audioUrl: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div 
                                    onClick={() => fileRef.current.click()}
                                    className="aspect-square bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 transition-all group"
                                >
                                    <input ref={fileRef} type="file" accept="audio/*" hidden onChange={e => handleFileUpload(e.target.files[0], 'audio')} />
                                    {form.audioUrl ? <CheckCircle2 className="text-green-500 mb-2" size={24} /> : <Upload className="text-zinc-300 group-hover:text-green-500 mb-2" size={24} />}
                                    <span className="text-[8px] font-bold text-zinc-400 uppercase">Fayl Yuklash</span>
                                    {uploadProgress > 0 && <div className="w-1/2 h-1 bg-zinc-200 rounded-full mt-2 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${uploadProgress}%` }} /></div>}
                                </div>
                                <div 
                                    onClick={() => thumbRef.current.click()}
                                    className="aspect-square bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 transition-all group overflow-hidden relative"
                                >
                                    <input ref={thumbRef} type="file" accept="image/*" hidden onChange={e => handleFileUpload(e.target.files[0], 'thumb')} />
                                    {form.thumbnail ? (
                                        <img src={form.thumbnail} className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <Upload className="text-zinc-300 group-hover:text-green-500 mb-2" size={24} />
                                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter">Thumbnail</span>
                                        </>
                                    )}
                                    {thumbProgress > 0 && <div className="w-1/2 h-1 bg-zinc-200 rounded-full mt-2 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${thumbProgress}%` }} /></div>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8">
                        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-zinc-100 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <FileText size={20} className="text-green-500" />
                                    <h3 className="font-bold text-zinc-900">Podcast Content (JSON)</h3>
                                </div>
                                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-50 px-3 py-1 rounded-full border border-zinc-100">Transcript & Questions</span>
                            </div>
                            <textarea 
                                className="flex-1 w-full min-h-[500px] bg-zinc-900 text-green-400 border-none p-8 rounded-3xl outline-none focus:ring-4 focus:ring-green-500/10 transition-all font-mono text-sm leading-relaxed"
                                value={form.contentJson}
                                onChange={e => setForm(f => ({ ...f, contentJson: e.target.value }))}
                                placeholder="JSON kodingizni bu yerga kiriting..."
                                spellCheck={false}
                            />
                            <div className="mt-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                                <p className="text-[10px] text-zinc-500 font-bold leading-relaxed italic">
                                    💡 Maslahat: transcript'dagi vaqtlarni "0:05" ko'rinishida yozishingiz mumkin. Savollarda {"{{gap}}"} belgisidan foydalaning.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

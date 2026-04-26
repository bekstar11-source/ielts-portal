// src/pages/CreateSpotifyPodcast.jsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, orderBy } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { 
    Save, Upload, ArrowLeft, Headphones, Music, FileText, 
    Plus, Trash2, Play, Pause, Clock, ChevronRight, 
    Layout, Code, Settings, Image as ImageIcon, 
    Type, HelpCircle, CheckCircle2, AlertCircle
} from "lucide-react";

const DEFAULT_SEGMENTS = [
    { id: '1', time: 0, type: 'text', text: "Welcome to the podcast!" },
    { id: '2', time: 5, type: 'mcq', data: { question: "Is this interactive?", options: ["Yes", "No"], correctIndex: 0 } }
];

export default function CreateSpotifyPodcast() {
    const { id: editId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const fileRef = useRef(null);
    const thumbRef = useRef(null);
    const audioRef = useRef(null);

    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [collections, setCollections] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [thumbProgress, setThumbProgress] = useState(0);
    const [isProMode, setIsProMode] = useState(false);
    
    // Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    // Form State
    const [form, setForm] = useState({
        title: "",
        description: "",
        level: "B2",
        audioUrl: "",
        thumbnail: "",
        collectionId: "None"
    });

    // Timeline State
    const [segments, setSegments] = useState(DEFAULT_SEGMENTS);
    const [jsonInput, setJsonInput] = useState("");

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            
            // Load Collections
            const colSnap = await getDocs(query(collection(db, "podcast_collections"), orderBy("createdAt", "asc")));
            setCollections(colSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            if (editId) {
                const snap = await getDoc(doc(db, "podcasts", editId));
                if (snap.exists()) {
                    const data = snap.data();
                    setForm({
                        title: data.title || "",
                        level: data.level || "B2",
                        audioUrl: data.audioUrl || "",
                        thumbnail: data.thumbnail || "",
                        collectionId: data.collectionId || "None"
                    });
                    
                    // Convert stored format to our working format
                    const transcript = (data.transcript || []).map((t, idx) => ({
                        id: `t-${idx}-${Date.now()}`,
                        time: t.time,
                        type: 'text',
                        text: t.text
                    }));
                    
                    const questions = (data.questions || []).map((q, idx) => ({
                        id: `q-${idx}-${Date.now()}`,
                        ...q
                    }));

                    const combined = [...transcript, ...questions].sort((a, b) => a.time - b.time);
                    setSegments(combined.length > 0 ? combined : DEFAULT_SEGMENTS);
                    setJsonInput(JSON.stringify({ transcript: data.transcript, questions: data.questions }, null, 2));
                }
            }
            setLoading(false);
        };
        load();
    }, [editId]);

    // Update JSON input whenever segments change
    useEffect(() => {
        const transcript = segments.filter(s => s.type === 'text').map(s => ({ time: s.time, text: s.text }));
        const questions = segments.filter(s => s.type !== 'text').map(s => {
            const { id, ...rest } = s;
            return rest;
        });
        setJsonInput(JSON.stringify({ transcript, questions }, null, 2));
    }, [segments]);

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

    const addSegment = (type) => {
        const newSeg = {
            id: Date.now().toString(),
            time: Math.floor(currentTime),
            type: type,
            text: type === 'text' ? "New transcript text..." : undefined,
            data: type === 'mcq' ? { question: "New Question?", options: ["Option 1", "Option 2"], correctIndex: 0 } : 
                  type === 'gapfill' ? { text: "The {{gap}} is here.", answer: "answer" } : undefined
        };
        setSegments(prev => [...prev, newSeg].sort((a, b) => a.time - b.time));
    };

    const updateSegment = (id, updates) => {
        setSegments(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s).sort((a, b) => a.time - b.time));
    };

    const deleteSegment = (id) => {
        setSegments(prev => prev.filter(s => s.id !== id));
    };

    const handleSave = async () => {
        if (!form.title || !form.audioUrl) return alert("Sarlavha va audio majburiy!");
        setSaving(true);

        try {
            let finalTranscript = [];
            let finalQuestions = [];

            if (isProMode) {
                const parsed = JSON.parse(jsonInput);
                finalTranscript = parsed.transcript || [];
                finalQuestions = parsed.questions || [];
            } else {
                finalTranscript = segments.filter(s => s.type === 'text').map(s => ({ time: s.time, text: s.text }));
                finalQuestions = segments.filter(s => s.type !== 'text').map(s => {
                    const { id, ...rest } = s;
                    return rest;
                });
            }

            const podId = editId || doc(collection(db, "podcasts")).id;
            await setDoc(doc(db, "podcasts", podId), {
                ...form,
                transcript: finalTranscript,
                questions: finalQuestions,
                mode: "spotify",
                status: "published",
                updatedAt: serverTimestamp(),
                createdAt: editId ? undefined : serverTimestamp()
            }, { merge: true });

            alert("Spotify Podcast muvaffaqiyatli saqlandi!");
            navigate("/admin/podcasts");
        } catch (err) {
            alert("Xatolik: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) return (
        <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fcfcfc] text-zinc-900 font-sans">
            {/* TOP BAR */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">Spotify Podcast Creator</h1>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none mt-0.5">Admin Editorial Suite</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsProMode(!isProMode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${isProMode ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}
                        >
                            {isProMode ? <Layout size={14} /> : <Code size={14} />}
                            {isProMode ? 'UI Mode' : 'Pro (JSON)'}
                        </button>
                        {editId && (
                            <button 
                                onClick={() => window.open(`/podcast/spotify/${editId}`, '_blank')}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-xs font-bold hover:bg-zinc-200 transition-all border border-zinc-200"
                            >
                                <Play size={14} fill="currentColor" /> Preview
                            </button>
                        )}
                        <div className="w-[1px] h-6 bg-zinc-200 mx-1"></div>
                        <button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                        >
                            {saving ? "Saving..." : <><Save size={16} /> Save Podcast</>}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT SIDEBAR: METADATA & MEDIA */}
                <div className="lg:col-span-4 space-y-6">
                    {/* General Info */}
                    <section className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <Settings size={16} className="text-emerald-600" />
                            </div>
                            <h2 className="font-bold text-sm uppercase tracking-wider text-zinc-500">General Info</h2>
                        </div>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Podcast Title</label>
                                <input 
                                    className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-lg outline-none focus:border-emerald-500 transition-colors text-sm font-medium"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="Enter title..."
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Episode Description</label>
                                <textarea 
                                    className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-lg outline-none focus:border-emerald-500 transition-colors text-sm font-medium min-h-[80px]"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Enter episode summary..."
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">CEFR Level</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {["A2", "B1", "B2", "C1", "C2"].map(l => (
                                        <button 
                                            key={l}
                                            onClick={() => setForm(f => ({ ...f, level: l }))}
                                            className={`py-2 rounded-lg text-xs font-bold transition-all border ${form.level === l ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-zinc-300'}`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Group / Collection</label>
                                <select 
                                    className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-lg outline-none focus:border-emerald-500 transition-colors text-sm font-medium"
                                    value={form.collectionId}
                                    onChange={e => setForm(f => ({ ...f, collectionId: e.target.value }))}
                                >
                                    <option value="None">None (Independent)</option>
                                    {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Media Assets */}
                    <section className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <Music size={16} className="text-emerald-600" />
                            </div>
                            <h2 className="font-bold text-sm uppercase tracking-wider text-zinc-500">Media Assets</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Thumbnail */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Cover Artwork</label>
                                <div 
                                    onClick={() => thumbRef.current.click()}
                                    className="relative aspect-square w-full bg-zinc-50 rounded-lg border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-all group overflow-hidden"
                                >
                                    <input ref={thumbRef} type="file" accept="image/*" hidden onChange={e => handleFileUpload(e.target.files[0], 'thumb')} />
                                    {form.thumbnail ? (
                                        <img src={form.thumbnail} className="w-full h-full object-cover" alt="Thumb" />
                                    ) : (
                                        <>
                                            <ImageIcon className="text-zinc-300 group-hover:text-emerald-500 mb-2" size={32} />
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Upload Thumbnail</span>
                                        </>
                                    )}
                                    {thumbProgress > 0 && <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all" style={{ width: `${thumbProgress}%` }} />}
                                </div>
                            </div>

                            {/* Audio */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Audio Source (URL)</label>
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-1 bg-zinc-50 border border-zinc-200 p-3 rounded-lg outline-none focus:border-emerald-500 transition-colors text-[10px] font-mono"
                                        placeholder="https://..."
                                        value={form.audioUrl}
                                        onChange={e => setForm(f => ({ ...f, audioUrl: e.target.value }))}
                                    />
                                    <button 
                                        onClick={() => fileRef.current.click()}
                                        className="p-3 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200 transition-colors"
                                    >
                                        <Upload size={16} />
                                    </button>
                                    <input ref={fileRef} type="file" accept="audio/*" hidden onChange={e => handleFileUpload(e.target.files[0], 'audio')} />
                                </div>
                                {uploadProgress > 0 && <div className="w-full h-1 bg-zinc-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${uploadProgress}%` }} /></div>}
                            </div>
                        </div>
                    </section>

                    {/* Mini Player */}
                    {form.audioUrl && (
                        <section className="bg-zinc-900 rounded-xl p-4 shadow-xl border border-zinc-800">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => {
                                        if (isPlaying) audioRef.current.pause();
                                        else audioRef.current.play();
                                        setIsPlaying(!isPlaying);
                                    }}
                                    className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center hover:scale-105 transition-all"
                                >
                                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
                                </button>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-zinc-400">{formatTime(currentTime)}</span>
                                        <span className="text-[10px] font-bold text-zinc-500">{audioRef.current?.duration ? formatTime(audioRef.current.duration) : "0:00"}</span>
                                    </div>
                                    <div 
                                        className="h-1.5 bg-zinc-800 rounded-full overflow-hidden cursor-pointer"
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const pos = (e.clientX - rect.left) / rect.width;
                                            audioRef.current.currentTime = pos * audioRef.current.duration;
                                        }}
                                    >
                                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(currentTime / (audioRef.current?.duration || 1)) * 100}%` }}></div>
                                    </div>
                                </div>
                                <audio 
                                    ref={audioRef} 
                                    src={form.audioUrl} 
                                    onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                                    onEnded={() => setIsPlaying(false)}
                                    hidden 
                                />
                            </div>
                        </section>
                    )}
                </div>

                {/* RIGHT AREA: TIMELINE OR PRO MODE */}
                <div className="lg:col-span-8">
                    {isProMode ? (
                        <div className="bg-[#121212] rounded-xl border border-zinc-800 h-full flex flex-col overflow-hidden shadow-2xl">
                            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Code size={16} className="text-zinc-500" />
                                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">JSON Source Code</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-bold italic">
                                    <AlertCircle size={12} />
                                    Be careful with JSON syntax
                                </div>
                            </div>
                            <textarea 
                                className="flex-1 w-full bg-transparent text-emerald-500 p-8 font-mono text-sm leading-relaxed outline-none resize-none"
                                value={jsonInput}
                                onChange={e => setJsonInput(e.target.value)}
                                spellCheck={false}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4 h-full flex flex-col">
                            {/* Toolbar */}
                            <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-bold text-sm flex items-center gap-2">
                                        <Clock size={16} className="text-emerald-600" />
                                        Interactive Timeline
                                    </h3>
                                    <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded font-bold uppercase">{segments.length} Items</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => addSegment('text')} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-bold rounded-lg hover:bg-zinc-800 transition-colors">
                                        <Plus size={12} /> Add Transcript
                                    </button>
                                    <button onClick={() => addSegment('mcq')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                                        <Plus size={12} /> Add MCQ
                                    </button>
                                    <button onClick={() => addSegment('gapfill')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                                        <Plus size={12} /> Add Gap-fill
                                    </button>
                                </div>
                            </div>

                            {/* Timeline List */}
                            <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                                {segments.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-50 space-y-4">
                                        <div className="p-6 border-2 border-dashed border-zinc-200 rounded-2xl">
                                            <Headphones size={48} strokeWidth={1} />
                                        </div>
                                        <p className="text-sm font-medium italic">No segments added yet. Use the buttons above to start.</p>
                                    </div>
                                ) : (
                                    segments.map((seg, idx) => (
                                        <div key={seg.id} className="group relative bg-white border border-zinc-200 rounded-xl p-4 hover:border-emerald-200 hover:shadow-md transition-all duration-300">
                                            <div className="flex items-start gap-4">
                                                {/* Time & Icon */}
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="bg-zinc-50 border border-zinc-100 px-2 py-1 rounded font-mono text-[10px] font-bold text-zinc-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                                        {formatTime(seg.time)}
                                                    </div>
                                                    <div className={`p-2 rounded-lg ${seg.type === 'text' ? 'bg-zinc-100 text-zinc-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {seg.type === 'text' ? <Type size={14} /> : seg.type === 'mcq' ? <HelpCircle size={14} /> : <FileText size={14} />}
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 group-hover:text-zinc-400 transition-colors">
                                                            {seg.type === 'text' ? 'Transcript Segment' : seg.type === 'mcq' ? 'Multiple Choice Question' : 'Gap-fill Challenge'}
                                                        </span>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => updateSegment(seg.id, { time: Math.floor(currentTime) })}
                                                                className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded transition-colors"
                                                                title="Set to current playback time"
                                                            >
                                                                <Clock size={12} />
                                                            </button>
                                                            <button 
                                                                onClick={() => deleteSegment(seg.id)}
                                                                className="p-1.5 hover:bg-rose-50 text-rose-500 rounded transition-colors"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {seg.type === 'text' ? (
                                                        <textarea 
                                                            className="w-full bg-transparent border-none text-sm font-medium resize-none outline-none leading-relaxed text-zinc-700"
                                                            value={seg.text}
                                                            onChange={e => updateSegment(seg.id, { text: e.target.value })}
                                                            placeholder="Type transcript text here..."
                                                            rows={2}
                                                        />
                                                    ) : seg.type === 'mcq' ? (
                                                        <div className="space-y-3 pt-1">
                                                            <input 
                                                                className="w-full bg-zinc-50 border border-zinc-100 p-2 rounded-lg text-sm font-bold outline-none focus:bg-white focus:border-emerald-200 transition-all"
                                                                value={seg.data.question}
                                                                onChange={e => updateSegment(seg.id, { data: { ...seg.data, question: e.target.value } })}
                                                                placeholder="Enter question..."
                                                            />
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                {seg.data.options.map((opt, oIdx) => (
                                                                    <div key={oIdx} className="flex gap-2 items-center">
                                                                        <button 
                                                                            onClick={() => updateSegment(seg.id, { data: { ...seg.data, correctIndex: oIdx } })}
                                                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${seg.data.correctIndex === oIdx ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-200'}`}
                                                                        >
                                                                            {seg.data.correctIndex === oIdx && <CheckCircle2 size={12} className="text-white" />}
                                                                        </button>
                                                                        <input 
                                                                            className="flex-1 bg-zinc-50 border border-zinc-100 px-3 py-1.5 rounded-lg text-xs font-medium outline-none"
                                                                            value={opt}
                                                                            onChange={e => {
                                                                                const newOpts = [...seg.data.options];
                                                                                newOpts[oIdx] = e.target.value;
                                                                                updateSegment(seg.id, { data: { ...seg.data, options: newOpts } });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3 pt-1">
                                                            <div className="flex flex-col gap-2">
                                                                <label className="text-[9px] font-bold text-zinc-400">Sentence with {"{{gap}}"}</label>
                                                                <input 
                                                                    className="w-full bg-zinc-50 border border-zinc-100 p-2 rounded-lg text-sm font-medium outline-none"
                                                                    value={seg.data.text}
                                                                    onChange={e => updateSegment(seg.id, { data: { ...seg.data, text: e.target.value } })}
                                                                    placeholder="e.g. The sky is {{gap}} today."
                                                                />
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <label className="text-[9px] font-bold text-zinc-400">Correct Answer</label>
                                                                <input 
                                                                    className="w-full bg-emerald-50/30 border border-emerald-100 p-2 rounded-lg text-sm font-bold text-emerald-700 outline-none"
                                                                    value={seg.data.answer}
                                                                    onChange={e => updateSegment(seg.id, { data: { ...seg.data, answer: e.target.value } })}
                                                                    placeholder="e.g. blue"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

// src/pages/AdminPodcasts.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
    collection,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    setDoc
} from "firebase/firestore";
import { db, storage } from "../../firebase/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { 
    Plus, Search, Filter, MoreVertical, Edit2, 
    Trash2, Eye, EyeOff, Headphones, Clock, 
    LayoutGrid, List, ChevronRight, Loader2,
    Calendar, CheckCircle2, MoreHorizontal, FileAudio,
    Globe, Lock, FolderPlus, Folder, Hash, X,
    Image as ImageIcon, Type, FileText, Upload
} from "lucide-react";

const LEVELS = ["All", "A2", "B1", "B2", "C1", "C2"];

export default function AdminPodcasts() {
    const [podcasts, setPodcasts] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'
    const [filterLevel, setFilterLevel] = useState("All");
    const [filterCollection, setFilterCollection] = useState("All");
    const [isFinderOpen, setIsFinderOpen] = useState(false);
    
    // Collection Management
    const [isAddingCollection, setIsAddingCollection] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState("");
    const [editingCol, setEditingCol] = useState(null); // The collection object being edited
    const [uploading, setUploading] = useState(false);
    
    const navigate = useNavigate();

    const fetchAll = async () => {
        setLoading(true);
        const qP = query(collection(db, "podcasts"), orderBy("createdAt", "desc"));
        const snapP = await getDocs(qP);
        setPodcasts(snapP.docs.map((d) => ({ id: d.id, ...d.data() })));
        
        const qC = query(collection(db, "podcast_collections"), orderBy("createdAt", "asc"));
        const snapC = await getDocs(qC);
        setCollections(snapC.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Podcast'ni o'chirishni tasdiqlaysizmi?")) return;
        await deleteDoc(doc(db, "podcasts", id));
        fetchAll();
    };

    const toggleStatus = async (podcast) => {
        const newStatus = podcast.status === "published" ? "draft" : "published";
        await updateDoc(doc(db, "podcasts", podcast.id), { status: newStatus });
        fetchAll();
    };

    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) return;
        try {
            await addDoc(collection(db, "podcast_collections"), {
                name: newCollectionName.trim(),
                description: "",
                thumbnail: "",
                createdAt: serverTimestamp()
            });
            setNewCollectionName("");
            setIsAddingCollection(false);
            fetchAll();
        } catch (err) { alert(err.message); }
    };

    const handleUploadImage = async (file) => {
        if (!file) return;
        setUploading(true);
        try {
            const path = `collection_covers/${Date.now()}_${file.name}`;
            const sRef = ref(storage, path);
            const metadata = { cacheControl: 'public, max-age=31536000' };
            const uploadTask = uploadBytesResumable(sRef, file, metadata);

            uploadTask.on(
                "state_changed",
                null,
                (err) => { alert(err.message); setUploading(false); },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    setEditingCol(prev => ({ ...prev, thumbnail: url }));
                    setUploading(false);
                }
            );
        } catch (err) {
            alert(err.message);
            setUploading(false);
        }
    };

    const handleUpdateCollection = async () => {
        if (!editingCol.name.trim()) return;
        try {
            const { id, ...data } = editingCol;
            await updateDoc(doc(db, "podcast_collections", id), data);
            setEditingCol(null);
            fetchAll();
        } catch (err) { alert(err.message); }
    };

    const deleteCollection = async (id) => {
        if (!window.confirm("To'plamni o'chirishni tasdiqlaysizmi?")) return;
        await deleteDoc(doc(db, "podcast_collections", id));
        fetchAll();
    };

    const assignToCollection = async (podcastId, collectionId) => {
        await updateDoc(doc(db, "podcasts", podcastId), {
            collectionId: collectionId === 'None' ? null : collectionId
        });
        fetchAll();
    };

    const filteredPodcasts = useMemo(() => {
        return podcasts.filter(p => {
            const matchesSearch = p.title?.toLowerCase().includes(search.toLowerCase());
            const matchesLevel = filterLevel === "All" || p.level === filterLevel;
            const matchesCollection = filterCollection === "All" || p.collectionId === filterCollection;
            return matchesSearch && matchesLevel && matchesCollection;
        });
    }, [podcasts, search, filterLevel, filterCollection]);

    const formatTime = (sec) => {
        if (!sec) return "--:--";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const formatDate = (ts) => {
        if (!ts) return "---";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="min-h-full bg-[#f5f5f7] flex font-sans text-zinc-900 relative">
            
            {/* COLLECTION EDIT MODAL */}
            {editingCol && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingCol(null)} />
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                            <h2 className="font-bold text-lg flex items-center gap-2 text-zinc-800">
                                <Folder className="text-emerald-600" size={20} /> Edit Collection
                            </h2>
                            <button onClick={() => setEditingCol(null)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Collection Name</label>
                                <input 
                                    className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl outline-none focus:border-emerald-500 transition-all font-bold text-sm"
                                    value={editingCol.name}
                                    onChange={e => setEditingCol({ ...editingCol, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Description</label>
                                <textarea 
                                    className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm min-h-[80px]"
                                    placeholder="What is this collection about?"
                                    value={editingCol.description || ""}
                                    onChange={e => setEditingCol({ ...editingCol, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Cover Image (URL or Upload)</label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1 space-y-2">
                                        <input 
                                            className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl outline-none focus:border-emerald-500 transition-all text-xs"
                                            placeholder="Paste image URL here..."
                                            value={editingCol.thumbnail || ""}
                                            onChange={e => setEditingCol({ ...editingCol, thumbnail: e.target.value })}
                                        />
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                id="col-upload" 
                                                hidden 
                                                accept="image/*"
                                                onChange={e => handleUploadImage(e.target.files[0])}
                                            />
                                            <label 
                                                htmlFor="col-upload"
                                                className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-dashed border-zinc-300 rounded-xl text-xs font-bold text-zinc-500 hover:border-emerald-500 hover:text-emerald-600 cursor-pointer transition-all"
                                            >
                                                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                                {uploading ? "Uploading..." : "Upload from Computer"}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="h-24 w-full sm:w-24 sm:h-24 rounded-xl bg-zinc-100 border border-zinc-200 shrink-0 overflow-hidden shadow-inner flex items-center justify-center">
                                        {editingCol.thumbnail ? <img src={editingCol.thumbnail} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-300"><ImageIcon size={24} /></div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            <button onClick={() => deleteCollection(editingCol.id)} className="px-4 py-3 text-rose-500 font-bold text-sm hover:bg-rose-50 rounded-xl transition-colors">Delete</button>
                            <button onClick={handleUpdateCollection} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MOBILE FINDER BACKDROP */}
            {isFinderOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] md:hidden"
                    onClick={() => setIsFinderOpen(false)}
                />
            )}

            {/* FINDER SIDEBAR */}
            <aside className={`fixed inset-y-0 left-0 z-[100] w-72 bg-[#fbfbfb] border-r border-zinc-200 flex flex-col transition-transform duration-300 md:static md:translate-x-0 md:w-64 md:h-[calc(100vh-64px)] md:z-0 ${isFinderOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 h-full flex flex-col overflow-y-auto">
                    <div className="flex items-center justify-between mb-8 md:block md:mb-8">
                        <h1 className="text-xl font-bold tracking-tight">Podcasts</h1>
                        <button 
                            onClick={() => setIsFinderOpen(false)} 
                            className="md:hidden p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-500"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="space-y-8 flex-1">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 px-2 flex justify-between items-center">
                                Collections
                                <button onClick={() => setIsAddingCollection(true)} className="hover:text-emerald-600 transition-colors">
                                    <Plus size={12} />
                                </button>
                            </h3>
                            <nav className="space-y-0.5">
                                <button 
                                    onClick={() => { setFilterCollection("All"); setIsFinderOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${filterCollection === 'All' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100'}`}
                                >
                                    <Folder size={16} /> All Podcasts
                                </button>
                                {collections.map(c => (
                                    <div key={c.id} className="group relative">
                                        <button 
                                            onClick={() => { setFilterCollection(c.id); setIsFinderOpen(false); }}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${filterCollection === c.id ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100'}`}
                                        >
                                            <span className="flex items-center gap-3 truncate pr-10">
                                                <div className="w-5 h-5 rounded bg-zinc-200 overflow-hidden shrink-0 flex items-center justify-center border border-black/5">
                                                    {c.thumbnail ? (
                                                        <img src={c.thumbnail} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Folder size={12} className="text-zinc-400" />
                                                    )}
                                                </div>
                                                {c.name}
                                            </span>
                                            <span className="text-[10px] font-bold opacity-40">{podcasts.filter(p => p.collectionId === c.id).length}</span>
                                        </button>
                                        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center transition-all bg-gradient-to-l from-[#fbfbfb] via-[#fbfbfb] to-transparent pl-4">
                                            <button onClick={(e) => { e.stopPropagation(); setEditingCol(c); }} className="p-1.5 hover:text-emerald-600 transition-colors">
                                                <Edit2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {isAddingCollection && (
                                    <div className="px-2 py-2">
                                        <input 
                                            autoFocus
                                            className="w-full bg-white border border-zinc-200 px-2 py-1 rounded text-xs outline-none focus:border-emerald-500"
                                            placeholder="Collection name..."
                                            value={newCollectionName}
                                            onChange={e => setNewCollectionName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleCreateCollection()}
                                            onBlur={() => !newCollectionName && setIsAddingCollection(false)}
                                        />
                                    </div>
                                )}
                            </nav>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 px-2">Levels</h3>
                            <nav className="space-y-0.5">
                                {LEVELS.map(l => (
                                    <button 
                                        key={l}
                                        onClick={() => { setFilterLevel(l); setIsFinderOpen(false); }}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${filterLevel === l ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100'}`}
                                    >
                                        <span className="flex items-center gap-3"><span className={`w-1.5 h-1.5 rounded-full ${l === 'All' ? 'bg-zinc-400' : 'bg-emerald-500'}`}></span> {l}</span>
                                        <span className="text-[10px] font-bold opacity-40">{l === 'All' ? podcasts.length : podcasts.filter(p => p.level === l).length}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* TOOLBAR */}
                <header className="min-h-16 py-3 md:py-0 md:h-16 bg-white border-b border-zinc-200 flex flex-col md:flex-row items-stretch md:items-center justify-between px-4 md:px-6 gap-3 shrink-0">
                    <div className="flex items-center gap-2 md:gap-4 flex-1">
                        {/* Mobile Filters Toggle Button */}
                        <button 
                            onClick={() => setIsFinderOpen(true)}
                            className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 rounded-lg text-xs font-bold text-zinc-600 transition-all active:scale-95 shrink-0"
                        >
                            <Filter size={14} />
                            <span>Filters</span>
                        </button>

                        <div className="flex bg-zinc-100 p-1 rounded-lg shrink-0">
                            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}><LayoutGrid size={16} /></button>
                            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}><List size={16} /></button>
                        </div>
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                            <input 
                                type="text"
                                placeholder="Search..."
                                className="w-full bg-zinc-100 border-none pl-9 pr-4 py-1.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                        <button 
                            onClick={() => navigate("/admin/create-podcast")} 
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold hover:bg-zinc-50 text-zinc-700 transition-all active:scale-95"
                        >
                            <Plus size={14} /> Classic
                        </button>
                        <button 
                            onClick={() => navigate("/admin/create-spotify-podcast")} 
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-all shadow-sm active:scale-95"
                        >
                            <Plus size={14} /> Spotify-Style
                        </button>
                    </div>
                </header>

                {/* CONTENT LISTING */}
                <main className="flex-1 overflow-y-auto bg-white p-4 md:p-6">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="animate-spin text-emerald-500" size={32} />
                        </div>
                    ) : filteredPodcasts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                            <FileAudio size={64} strokeWidth={1} />
                            <p className="mt-4 text-sm font-bold">No results matching your filters</p>
                        </div>
                    ) : viewMode === 'list' ? (
                        <>
                            {/* LIST (TABLE) VIEW FOR DESKTOP */}
                            <table className="w-full border-collapse text-left hidden md:table">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100">
                                        <th className="pb-3 pl-2 font-black">Title</th>
                                        <th className="pb-3 font-black">Level</th>
                                        <th className="pb-3 font-black">Collection</th>
                                        <th className="pb-3 font-black">Duration</th>
                                        <th className="pb-3 font-black">Date</th>
                                        <th className="pb-3 pr-2 text-right font-black">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50">
                                    {filteredPodcasts.map(p => (
                                        <tr key={p.id} className="group hover:bg-zinc-50/80 transition-colors">
                                            <td className="py-3 pl-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
                                                        {p.thumbnail ? <img src={p.thumbnail} className="w-full h-full object-cover" /> : <Headphones size={14} className="text-zinc-400" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-zinc-900 line-clamp-1">{p.title || "Untitled"}</div>
                                                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{p.status}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 text-xs font-bold text-zinc-600">
                                                <span className="px-2 py-0.5 bg-zinc-100 rounded text-zinc-500">{p.level || "---"}</span>
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-1.5 group/move">
                                                    <select 
                                                        className="bg-zinc-100/50 border border-transparent px-2 py-1 rounded text-[10px] font-bold text-zinc-500 uppercase tracking-tight outline-none cursor-pointer hover:border-zinc-200 hover:bg-white focus:bg-white focus:border-emerald-500 transition-all appearance-none"
                                                        value={p.collectionId || "None"}
                                                        onChange={(e) => assignToCollection(p.id, e.target.value)}
                                                    >
                                                        <option value="None">📦 No Collection</option>
                                                        {collections.map(c => <option key={c.id} value={c.id}>📁 {c.name}</option>)}
                                                    </select>
                                                    <ChevronRight size={10} className="text-zinc-300 group-hover/move:translate-x-0.5 transition-transform" />
                                                </div>
                                            </td>
                                            <td className="py-3 text-xs font-mono font-bold text-zinc-500">{formatTime(p.duration)}</td>
                                            <td className="py-3 text-xs font-medium text-zinc-400">{formatDate(p.createdAt)}</td>
                                            <td className="py-3 pr-2 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => navigate(p.mode === 'spotify' ? `/admin/edit-spotify-podcast/${p.id}` : `/admin/edit-podcast/${p.id}`)} className="p-2 hover:bg-white rounded-md text-zinc-400 hover:text-emerald-600 border border-transparent hover:border-zinc-200"><Edit2 size={14} /></button>
                                                    <button onClick={() => toggleStatus(p)} className="p-2 hover:bg-white rounded-md text-zinc-400 hover:text-zinc-900 border border-transparent hover:border-zinc-200">{p.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                                    <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-white rounded-md text-zinc-300 hover:text-rose-600 border border-transparent hover:border-zinc-200"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* LIST (CARD) VIEW FOR MOBILE */}
                            <div className="md:hidden flex flex-col divide-y divide-zinc-100">
                                {filteredPodcasts.map(p => (
                                    <div key={p.id} className="py-4 flex flex-col gap-3">
                                        {/* Top Row: Thumbnail + Title & Status */}
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                                {p.thumbnail ? <img src={p.thumbnail} className="w-full h-full object-cover" /> : <Headphones size={20} className="text-zinc-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-zinc-900 leading-snug break-words">{p.title || "Untitled"}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${p.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                                        {p.status}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-zinc-400">• {formatDate(p.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mid Row: Level, Duration, Collection select */}
                                        <div className="flex flex-wrap items-center gap-2 bg-zinc-50/50 p-2 rounded-lg border border-zinc-100">
                                            <div className="text-xs font-bold text-zinc-600">
                                                <span className="px-2 py-0.5 bg-white border border-zinc-200 rounded text-zinc-500 text-[10px]">{p.level || "---"}</span>
                                            </div>
                                            <div className="text-xs font-mono font-bold text-zinc-500 text-[10px]">{formatTime(p.duration)}</div>
                                            <div className="flex-1 min-w-[120px] flex items-center gap-1">
                                                <select 
                                                    className="w-full bg-white border border-zinc-200 px-2 py-1 rounded text-[10px] font-bold text-zinc-500 uppercase tracking-tight outline-none cursor-pointer focus:border-emerald-500 transition-all appearance-none"
                                                    value={p.collectionId || "None"}
                                                    onChange={(e) => assignToCollection(p.id, e.target.value)}
                                                >
                                                    <option value="None">📦 No Collection</option>
                                                    {collections.map(c => <option key={c.id} value={c.id}>📁 {c.name}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Bottom Row: Actions */}
                                        <div className="flex items-center justify-end gap-2 pt-1">
                                            <button 
                                                onClick={() => navigate(p.mode === 'spotify' ? `/admin/edit-spotify-podcast/${p.id}` : `/admin/edit-podcast/${p.id}`)} 
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-700 transition-colors"
                                            >
                                                <Edit2 size={12} /> Edit
                                            </button>
                                            <button 
                                                onClick={() => toggleStatus(p)} 
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-700 transition-colors"
                                            >
                                                {p.status === 'published' ? <><EyeOff size={12} /> Draft</> : <><Eye size={12} /> Publish</>}
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(p.id)} 
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-100 rounded-lg text-xs font-bold text-rose-600 transition-colors"
                                            >
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        /* GRID VIEW */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {filteredPodcasts.map(p => (
                                <div key={p.id} className="group bg-white border border-zinc-200 rounded-lg p-3 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
                                    <div className="aspect-square bg-zinc-50 rounded-md mb-3 relative overflow-hidden border border-zinc-100">
                                        {p.thumbnail ? <img src={p.thumbnail} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-200"><Headphones size={32} /></div>}
                                        <div className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
                                            <button onClick={() => navigate(p.mode === 'spotify' ? `/admin/edit-spotify-podcast/${p.id}` : `/admin/edit-podcast/${p.id}`)} className="p-2 md:p-1.5 bg-white rounded-lg shadow-xl text-zinc-900 hover:text-emerald-600 transition-all"><Edit2 size={16} className="md:w-[14px] md:h-[14px]" /></button>
                                            <button onClick={() => toggleStatus(p)} className="p-2 md:p-1.5 bg-white rounded-lg shadow-xl text-zinc-900 hover:text-emerald-600 transition-all">{p.status === 'published' ? <EyeOff size={16} className="md:w-[14px] md:h-[14px]" /> : <Eye size={16} className="md:w-[14px] md:h-[14px]" />}</button>
                                            <button onClick={() => handleDelete(p.id)} className="p-2 md:p-1.5 bg-white rounded-lg shadow-xl text-rose-500 hover:bg-rose-50 transition-all"><Trash2 size={16} className="md:w-[14px] md:h-[14px]" /></button>
                                        </div>
                                        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                                            <select 
                                                className="w-full bg-black/75 backdrop-blur-md text-white text-[10px] md:text-[9px] font-bold uppercase p-2 md:p-1.5 rounded-md outline-none cursor-pointer hover:bg-black/90 transition-colors border border-white/10"
                                                value={p.collectionId || "None"}
                                                onChange={(e) => assignToCollection(p.id, e.target.value)}
                                            >
                                                <option value="None" className="text-zinc-800">📦 No Collection</option>
                                                {collections.map(c => <option key={c.id} value={c.id} className="text-zinc-800">📁 {c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <h3 className="text-xs font-bold text-zinc-900 line-clamp-1 mb-1">{p.title || "Untitled"}</h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase text-zinc-400">{p.level} • {formatTime(p.duration)}</span>
                                        <span className={`w-2 h-2 rounded-full ${p.status === 'published' ? 'bg-emerald-500' : 'bg-zinc-300'}`}></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

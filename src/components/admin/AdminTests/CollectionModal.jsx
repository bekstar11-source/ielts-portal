import React, { useState, useEffect } from "react";
import { Folder, X, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../../firebase/firebase";
import toast from "react-hot-toast";

export default function CollectionModal({
    isOpen,
    onClose,
    editingCol,
    allAvailableTests,
    isDark,
    addCollection,
    updateCollection,
    onDelete
}) {
    // Local state for modal fields
    const [colName, setColName] = useState("");
    const [colThumbnail, setColThumbnail] = useState("");
    const [colType, setColType] = useState("reading");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isSavingCol, setIsSavingCol] = useState(false);

    // Sub-tests for mock packages
    const [colReadingId, setColReadingId] = useState("");
    const [colListeningId, setColListeningId] = useState("");
    const [colWritingId, setColWritingId] = useState("");

    // Initialize values when editingCol changes or modal opens
    useEffect(() => {
        if (isOpen) {
            if (editingCol) {
                setColName(editingCol.name || "");
                setColThumbnail(editingCol.thumbnail || "");
                setColType(editingCol.type || "reading");
                setColReadingId(editingCol.subTests?.readingId || "");
                setColListeningId(editingCol.subTests?.listeningId || "");
                setColWritingId(editingCol.subTests?.writingId || "");
            } else {
                setColName("");
                setColThumbnail("");
                setColType("reading");
                setColReadingId("");
                setColListeningId("");
                setColWritingId("");
            }
        }
    }, [isOpen, editingCol]);

    if (!isOpen) return null;

    const handleSaveCollection = async () => {
        if (!colName.trim()) return;
        setIsSavingCol(true);
        try {
            const subTests = colType === 'mock' 
                ? { readingId: colReadingId, listeningId: colListeningId, writingId: colWritingId }
                : null;

            if (editingCol) {
                const ok = await updateCollection(editingCol.id, colName.trim(), colThumbnail.trim(), colType, subTests);
                if (!ok) throw new Error("Database update failed");
                toast.success("To'plam muvaffaqiyatli yangilandi! 🎉");
            } else {
                const ok = await addCollection(colName.trim(), colThumbnail.trim(), colType, subTests);
                if (!ok) throw new Error("Database insert failed");
                toast.success("Yangi to'plam muvaffaqiyatli yaratildi! 🎉");
            }
            onClose();
        } catch (err) {
            toast.error("To'plamni saqlashda xatolik yuz berdi: " + err.message);
        } finally {
            setIsSavingCol(false);
        }
    };

    const handleUploadImage = async (file) => {
        if (!file) return;
        setUploadingImage(true);
        try {
            const path = `test_collection_covers/${Date.now()}_${file.name}`;
            const sRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(sRef, file);

            uploadTask.on(
                "state_changed",
                null,
                (err) => { 
                    toast.error("Rasm yuklashda xatolik: " + err.message); 
                    setUploadingImage(false); 
                },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    setColThumbnail(url);
                    setUploadingImage(false);
                    toast.success("Rasm muvaffaqiyatli yuklandi! 📸");
                }
            );
        } catch (err) {
            toast.error("Rasm yuklashda xatolik: " + err.message);
            setUploadingImage(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                onClick={onClose} 
            />
            <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border ${
                isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'
            }`}>
                <div className={`p-6 border-b flex justify-between items-center ${
                    isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'
                }`}>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Folder className={isDark ? 'text-blue-400' : 'text-blue-600'} size={20} />
                        {editingCol ? "Edit Collection" : "New Collection"}
                    </h2>
                    <button 
                        onClick={onClose} 
                        className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Collection Name
                        </label>
                        <input 
                            className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${
                                isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'
                            }`}
                            placeholder="Enter collection name..."
                            value={colName}
                            onChange={e => setColName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            To'plam Turi (Collection Type)
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {["reading", "listening", "mock"].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setColType(type)}
                                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border font-bold text-xs transition-all ${
                                        colType === type
                                            ? 'bg-blue-600 border-transparent text-white shadow-lg shadow-blue-500/10'
                                            : isDark 
                                                ? 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                                                : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                                    }`}
                                >
                                    {type === "reading" ? "📖 Reading" : type === "listening" ? "🎧 Listening" : "🎓 Mock"}
                                </button>
                            ))}
                        </div>
                    </div>
                    {colType === "mock" && (
                        <div className="space-y-4 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5 animate-in slide-in-from-top-2 duration-200">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Birlashtiriluvchi Skill Testlar</h4>
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    1. Reading Test
                                </label>
                                <select
                                    className={`w-full border p-2.5 rounded-lg outline-none text-xs font-semibold ${
                                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'
                                    }`}
                                    value={colReadingId}
                                    onChange={e => setColReadingId(e.target.value)}
                                >
                                    <option value="">Tanlang...</option>
                                    {(allAvailableTests?.reading || []).map(t => (
                                        <option key={t.id} value={t.id}>{t.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    2. Listening Test
                                </label>
                                <select
                                    className={`w-full border p-2.5 rounded-lg outline-none text-xs font-semibold ${
                                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'
                                    }`}
                                    value={colListeningId}
                                    onChange={e => setColListeningId(e.target.value)}
                                >
                                    <option value="">Tanlang...</option>
                                    {(allAvailableTests?.listening || []).map(t => (
                                        <option key={t.id} value={t.id}>{t.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    3. Writing Test
                                </label>
                                <select
                                    className={`w-full border p-2.5 rounded-lg outline-none text-xs font-semibold ${
                                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'
                                    }`}
                                    value={colWritingId}
                                    onChange={e => setColWritingId(e.target.value)}
                                >
                                    <option value="">Tanlang...</option>
                                    {(allAvailableTests?.writing || []).map(t => (
                                        <option key={t.id} value={t.id}>{t.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Cover Image (URL or Upload)
                        </label>
                        <div className="flex gap-3">
                            <div className="flex-1 space-y-2">
                                <input 
                                    className={`w-full border p-3 rounded-xl outline-none transition-all text-xs ${
                                        isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'
                                    }`}
                                    placeholder="Paste image URL here..."
                                    value={colThumbnail}
                                    onChange={e => setColThumbnail(e.target.value)}
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
                                        className={`flex items-center justify-center gap-2 w-full py-2 border border-dashed rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                            isDark ? 'bg-white/5 border-white/15 text-zinc-400 hover:border-blue-500 hover:text-blue-400' : 'bg-white border-zinc-300 text-zinc-500 hover:border-blue-500 hover:text-blue-600'
                                        }`}
                                    >
                                        {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        {uploadingImage ? "Uploading..." : "Upload from Computer"}
                                    </label>
                                </div>
                            </div>
                            <div className={`w-24 h-24 rounded-xl shrink-0 overflow-hidden shadow-inner border flex items-center justify-center ${
                                isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-zinc-200'
                            }`}>
                                {colThumbnail ? (
                                    <img src={colThumbnail} className="w-full h-full object-cover" alt="cover preview" />
                                ) : (
                                    <div className={isDark ? 'text-zinc-600' : 'text-zinc-300'}><ImageIcon size={24} /></div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className={`p-6 pt-0 flex gap-3 ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                    {editingCol && (
                        <button 
                            onClick={onDelete} 
                            className="px-4 py-3 text-rose-500 font-bold text-sm hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                        >
                            Delete
                        </button>
                    )}
                    <button 
                        onClick={handleSaveCollection} 
                        disabled={isSavingCol || !colName.trim()}
                        className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                            isSavingCol ? 'opacity-70 cursor-not-allowed' : ''
                        } ${
                            isDark ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                        }`}
                    >
                        {isSavingCol && <Loader2 size={16} className="animate-spin" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

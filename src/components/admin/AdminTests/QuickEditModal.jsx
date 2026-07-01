import React, { useState, useEffect } from "react";
import { Edit3, X, Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../../firebase/firebase";
import { useTheme } from "../../../context/ThemeContext";

export default function QuickEditModal({
    isOpen,
    onClose,
    editingTest,
    collections,
    updateTestMetadata,
    onSaved
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [quickEditTitle, setQuickEditTitle] = useState("");
    const [quickEditCollectionId, setQuickEditCollectionId] = useState("");
    const [quickEditIsFree, setQuickEditIsFree] = useState(false);
    const [quickEditThumbnail, setQuickEditThumbnail] = useState("");
    const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Iltimos, faqat rasm faylini tanlang!");
            return;
        }
        setIsUploading(true);
        setUploadProgress(0);
        try {
            const storageRef = ref(storage, `thumbnails/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file, { cacheControl: 'public,max-age=31536000' });
            uploadTask.on(
                "state_changed",
                (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
                (error) => { toast.error("Rasm yuklashda xatolik: " + error.message); setIsUploading(false); },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    setQuickEditThumbnail(url);
                    setIsUploading(false);
                    toast.success("Rasm muvaffaqiyatli yuklandi! 📸");
                }
            );
        } catch (err) {
            toast.error("Rasm yuklashda xatolik yuz berdi.");
            setIsUploading(false);
        }
    };

    useEffect(() => {
        if (isOpen && editingTest) {
            setQuickEditTitle(editingTest.title || "");
            setQuickEditCollectionId(editingTest.collectionId || "");
            setQuickEditIsFree(editingTest.isFree || false);
            setQuickEditThumbnail(editingTest.thumbnail || "");
        }
    }, [isOpen, editingTest]);

    if (!isOpen || !editingTest) return null;

    const handleSaveQuickEdit = async () => {
        if (!quickEditTitle.trim()) { toast.error("Test nomini kiriting!"); return; }
        setIsSavingQuickEdit(true);
        try {
            const ok = await updateTestMetadata(editingTest.id, quickEditTitle.trim(), quickEditCollectionId, quickEditIsFree, quickEditThumbnail.trim());
            if (ok) { toast.success("Test muvaffaqiyatli yangilandi! 🎉"); onSaved(); onClose(); }
            else toast.error("Saqlashda xatolik yuz berdi.");
        } catch (err) {
            toast.error("Saqlashda xatolik yuz berdi: " + err.message);
        } finally {
            setIsSavingQuickEdit(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-edit-modal-title"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border ${
                isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'
            }`}>
                <div className={`p-6 border-b flex justify-between items-center ${
                    isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'
                }`}>
                    <h2 id="quick-edit-modal-title" className="font-bold text-lg flex items-center gap-2">
                        <Edit3 className={isDark ? 'text-blue-400' : 'text-blue-600'} size={20} />
                        Quick Edit Test
                    </h2>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div>
                        <label htmlFor="qe-title" className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Test Title
                        </label>
                        <input
                            id="qe-title"
                            className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${
                                isDark ? 'bg-[#2a2a2a] border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'
                            }`}
                            placeholder="Enter test title..."
                            value={quickEditTitle}
                            onChange={e => setQuickEditTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="qe-collection" className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Collection
                        </label>
                        <select
                            id="qe-collection"
                            className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${
                                isDark ? 'bg-[#2a2a2a] border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'
                            }`}
                            value={quickEditCollectionId}
                            onChange={e => setQuickEditCollectionId(e.target.value)}
                        >
                            <option value="">No Collection</option>
                            {(collections || [])
                                .filter(c => c.type === editingTest.type)
                                .map(c => <option key={c.id} value={c.id}>📁 {c.name}</option>)
                            }
                        </select>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5">
                        <div className="space-y-0.5">
                            <label className={`text-xs font-bold block ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Is Free Test?</label>
                            <span className="text-[10px] text-zinc-400 block leading-tight">
                                Shown first for all users with FREE badge. Free-plan users can start it without daily limit.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setQuickEditIsFree(!quickEditIsFree)}
                            aria-checked={quickEditIsFree}
                            role="switch"
                            className={`w-10 h-5 rounded-full p-1 transition-all duration-300 shrink-0 ${quickEditIsFree ? 'bg-[#0066cc]' : 'bg-gray-400'}`}
                        >
                            <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${quickEditIsFree ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Thumbnail URL (rasm)
                        </label>
                        <div className="flex gap-2">
                            <input
                                className={`flex-1 border p-3 rounded-xl outline-none transition-all text-sm ${
                                    isDark ? 'bg-[#2a2a2a] border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'
                                }`}
                                placeholder="https://... yoki rasm yuklang"
                                value={quickEditThumbnail}
                                onChange={e => setQuickEditThumbnail(e.target.value)}
                            />
                            <label className={`cursor-pointer px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 select-none ${
                                isUploading
                                    ? 'opacity-70 cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                                    : isDark
                                        ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-white/5'
                                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200'
                            }`}>
                                {isUploading ? <><Loader2 size={14} className="animate-spin" /><span>{uploadProgress}%</span></> : <><Upload size={14} /><span>Rasm yuklash</span></>}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                            </label>
                        </div>
                        {quickEditThumbnail && (
                            <div className="relative mt-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 h-32 group">
                                <img src={quickEditThumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                                <button
                                    type="button"
                                    onClick={() => setQuickEditThumbnail("")}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                    aria-label="Rasmni o'chirish"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-6 pt-0 flex gap-3 bg-transparent">
                    <button
                        onClick={onClose}
                        className={`px-4 py-3 font-bold text-sm rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveQuickEdit}
                        disabled={isSavingQuickEdit || !quickEditTitle.trim()}
                        className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                            isSavingQuickEdit ? 'opacity-70 cursor-not-allowed' : ''
                        } bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20`}
                    >
                        {isSavingQuickEdit && <Loader2 size={16} className="animate-spin" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

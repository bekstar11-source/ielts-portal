import React, { useState, useEffect } from "react";
import { Edit3, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function QuickEditModal({
    isOpen,
    onClose,
    editingTest,
    collections,
    isDark,
    updateTestMetadata,
    onSaved
}) {
    const [quickEditTitle, setQuickEditTitle] = useState("");
    const [quickEditCollectionId, setQuickEditCollectionId] = useState("");
    const [quickEditIsFree, setQuickEditIsFree] = useState(false);
    const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);

    useEffect(() => {
        if (isOpen && editingTest) {
            setQuickEditTitle(editingTest.title || "");
            setQuickEditCollectionId(editingTest.collectionId || "");
            setQuickEditIsFree(editingTest.isFree || false);
        }
    }, [isOpen, editingTest]);

    if (!isOpen || !editingTest) return null;

    const handleSaveQuickEdit = async () => {
        if (!quickEditTitle.trim()) {
            toast.error("Test nomini kiriting!");
            return;
        }
        setIsSavingQuickEdit(true);
        try {
            const ok = await updateTestMetadata(editingTest.id, quickEditTitle.trim(), quickEditCollectionId, quickEditIsFree);
            if (ok) {
                toast.success("Test muvaffaqiyatli yangilandi! 🎉");
                onSaved();
                onClose();
            } else {
                toast.error("Saqlashda xatolik yuz berdi.");
            }
        } catch (err) {
            console.error("Quick edit save error:", err);
            toast.error("Saqlashda xatolik yuz berdi: " + err.message);
        } finally {
            setIsSavingQuickEdit(false);
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
                        <Edit3 className={isDark ? 'text-blue-400' : 'text-blue-600'} size={20} />
                        Quick Edit Test
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
                            Test Title
                        </label>
                        <input 
                            className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${
                                isDark ? 'bg-[#2a2a2a] border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'
                            }`}
                            placeholder="Enter test title..."
                            value={quickEditTitle}
                            onChange={e => setQuickEditTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Collection
                        </label>
                        <select 
                            className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${
                                isDark ? 'bg-[#2a2a2a] border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'
                            }`}
                            value={quickEditCollectionId}
                            onChange={e => setQuickEditCollectionId(e.target.value)}
                        >
                            <option value="">No Collection</option>
                            {(collections || [])
                                .filter(c => c.type === editingTest.type)
                                .map(c => (
                                    <option key={c.id} value={c.id}>📁 {c.name}</option>
                                ))
                            }
                        </select>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5">
                        <div className="space-y-0.5">
                            <label className={`text-xs font-bold block ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                Is Free Test?
                            </label>
                            <span className="text-[10px] text-zinc-400 block leading-tight">
                                Shown first for all users with FREE badge. Free-plan users can start it without daily limit.
                            </span>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setQuickEditIsFree(!quickEditIsFree)}
                            className={`w-10 h-5 rounded-full p-1 transition-all duration-300 shrink-0 ${quickEditIsFree ? 'bg-[#0066cc]' : 'bg-gray-400'}`}
                        >
                            <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${quickEditIsFree ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
                <div className="p-6 pt-0 flex gap-3 bg-transparent">
                    <button 
                        onClick={onClose} 
                        className={`px-4 py-3 font-bold text-sm rounded-xl transition-colors ${
                            isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                        }`}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveQuickEdit} 
                        disabled={isSavingQuickEdit || !quickEditTitle.trim()}
                        className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                            isSavingQuickEdit ? 'opacity-70 cursor-not-allowed' : ''
                        } ${
                            isDark ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                        }`}
                    >
                        {isSavingQuickEdit && <Loader2 size={16} className="animate-spin" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

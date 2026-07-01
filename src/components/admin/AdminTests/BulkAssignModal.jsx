import React, { useState, useEffect } from "react";
import { FolderPlus, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../../../context/ThemeContext";

export default function BulkAssignModal({
    isOpen,
    onClose,
    selectedTests,
    collections,
    bulkAssignToCollection,
    onSaved
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [targetCollectionId, setTargetCollectionId] = useState("");
    const [isAssigning, setIsAssigning] = useState(false);

    useEffect(() => {
        if (isOpen) setTargetCollectionId("");
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBulkAssign = async () => {
        if (!targetCollectionId) return;
        setIsAssigning(true);
        try {
            const ok = await bulkAssignToCollection(selectedTests, targetCollectionId);
            if (!ok) throw new Error("Bulk assign failed");
            toast.success("Testlar to'plamga muvaffaqiyatli ko'chirildi! 📁");
            onSaved();
            onClose();
        } catch (err) {
            toast.error("Xatolik yuz berdi: " + err.message);
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-assign-modal-title"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border ${
                isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'
            }`}>
                <div className={`p-6 border-b flex justify-between items-center ${
                    isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'
                }`}>
                    <h2 id="bulk-assign-modal-title" className="font-bold text-lg flex items-center gap-2">
                        <FolderPlus className={isDark ? 'text-blue-400' : 'text-blue-600'} size={20} />
                        Move {selectedTests.length} tests to Collection
                    </h2>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div>
                        <label htmlFor="ba-collection" className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Select Collection
                        </label>
                        <select
                            id="ba-collection"
                            className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${
                                isDark ? 'bg-[#2a2a2a] border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'
                            }`}
                            value={targetCollectionId}
                            onChange={e => setTargetCollectionId(e.target.value)}
                        >
                            <option value="" disabled>-- Select a Collection --</option>
                            <option value="None">📦 None (Remove from any Collection)</option>
                            {(collections || []).map(c => (
                                <option key={c.id} value={c.id}>📁 {c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className={`p-6 pt-0 flex gap-3 ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-3 font-bold text-sm rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBulkAssign}
                        disabled={isAssigning || !targetCollectionId}
                        className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                            isAssigning ? 'opacity-70 cursor-not-allowed' : ''
                        } bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20`}
                    >
                        {isAssigning && <Loader2 size={16} className="animate-spin" />}
                        Move Tests
                    </button>
                </div>
            </div>
        </div>
    );
}

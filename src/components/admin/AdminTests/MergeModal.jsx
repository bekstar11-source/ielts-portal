import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { useMergeTests } from "../../../hooks/useMergeTests";

export default function MergeModal({
    isOpen,
    onClose,
    selectedTests,
    tests,
    onSaved
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [mergeTitle, setMergeTitle] = useState("");

    const { isMerging, mergeTests } = useMergeTests({ onSaved, onClose });

    useEffect(() => {
        if (isOpen && selectedTests.length >= 2) {
            const selectedObjects = tests.filter(t => selectedTests.includes(t.id));
            setMergeTitle("Merged: " + selectedObjects.map(t => t.title || "Untitled").join(" + "));
        }
    }, [isOpen, selectedTests, tests]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="merge-modal-title"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-md max-h-[90dvh] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border ${
                isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'
            }`}>
                <div className={`p-4 sm:p-6 border-b flex justify-between items-center ${
                    isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'
                }`}>
                    <h2 id="merge-modal-title" className="font-bold text-lg flex items-center gap-2">
                        <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>🔗</span>
                        Merge {selectedTests.length} tests
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 sm:p-6 space-y-4 max-h-[60dvh] overflow-y-auto custom-scrollbar">
                    <div>
                        <label htmlFor="merge-title" className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Merged Test Title
                        </label>
                        <input
                            id="merge-title"
                            className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${
                                isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'
                            }`}
                            placeholder="Enter title for the merged test..."
                            value={mergeTitle}
                            onChange={e => setMergeTitle(e.target.value)}
                        />
                    </div>
                </div>
                <div className={`p-4 sm:p-6 pt-0 flex gap-3 ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-3 font-bold text-sm rounded-xl transition-colors ${
                            isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                        }`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => mergeTests(selectedTests, mergeTitle)}
                        disabled={isMerging || !mergeTitle.trim()}
                        className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                            isMerging ? 'opacity-70 cursor-not-allowed' : ''
                        } ${
                            isDark ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        }`}
                    >
                        {isMerging && <Loader2 size={16} className="animate-spin" />}
                        Merge Tests
                    </button>
                </div>
            </div>
        </div>
    );
}

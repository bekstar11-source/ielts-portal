import React, { useState, useRef, useEffect } from 'react';
import { X, FolderPlus, GitMerge, Globe, Lock, Award, Download, Trash2, ChevronUp } from 'lucide-react';

const BulkActionBar = ({
    selectedCount,
    onClear,
    onBulkAssign,
    onMerge,
    onBulkStatusChange,
    onBulkAccessChange,
    onExportJSON,
    onExportCSV,
    onBulkDelete
}) => {
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (exportRef.current && !exportRef.current.contains(e.target)) {
                setExportOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    if (selectedCount <= 0) return null;

    const iconBtnClass = "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-all";
    const segmentBtnClass = "flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-all";

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-dropdown">
            <div className="flex items-center gap-1 px-2 py-2 rounded-2xl border border-white/10 bg-[#1c1c1e] shadow-2xl shadow-black/40 backdrop-blur-xl flex-wrap justify-center max-w-[calc(100vw-2rem)]">
                <div className="flex items-center gap-2 pl-2 pr-3">
                    <button
                        onClick={onClear}
                        title="Tanlovni bekor qilish"
                        className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <X size={14} />
                    </button>
                    <span className="text-xs font-black text-white whitespace-nowrap">{selectedCount} ta tanlandi</span>
                </div>

                <div className="h-6 w-px bg-white/10" />

                <button onClick={onBulkAssign} title="Guruhli ko'chirish" className={iconBtnClass}>
                    <FolderPlus size={13} />
                    <span className="hidden sm:inline">Ko'chir</span>
                </button>

                {selectedCount >= 2 && (
                    <button onClick={onMerge} title="Testlarni birlashtirish" className={iconBtnClass}>
                        <GitMerge size={13} />
                        <span className="hidden sm:inline">Birlashtir</span>
                    </button>
                )}

                <div className="h-6 w-px bg-white/10" />

                {/* Status segmented control */}
                <div className="flex items-center rounded-lg overflow-hidden border border-white/10">
                    <button onClick={() => onBulkStatusChange(true)} title="Public qilish" className={segmentBtnClass}>
                        <Globe size={13} className="text-emerald-400" />
                        <span className="hidden sm:inline">Public</span>
                    </button>
                    <div className="h-6 w-px bg-white/10" />
                    <button onClick={() => onBulkStatusChange(false)} title="Private qilish" className={segmentBtnClass}>
                        <Lock size={13} className="text-zinc-400" />
                        <span className="hidden sm:inline">Private</span>
                    </button>
                </div>

                {/* Access segmented control */}
                <div className="flex items-center rounded-lg overflow-hidden border border-white/10">
                    <button onClick={() => onBulkAccessChange(true)} title="Bepul (Free) qilish" className={segmentBtnClass}>
                        <Globe size={13} className="text-emerald-400" />
                        <span className="hidden sm:inline">Free</span>
                    </button>
                    <div className="h-6 w-px bg-white/10" />
                    <button onClick={() => onBulkAccessChange(false)} title="Premium (Paid) qilish" className={segmentBtnClass}>
                        <Award size={13} className="text-blue-400" />
                        <span className="hidden sm:inline">Premium</span>
                    </button>
                </div>

                <div className="h-6 w-px bg-white/10" />

                <div className="relative" ref={exportRef}>
                    <button onClick={() => setExportOpen(v => !v)} className={iconBtnClass}>
                        <Download size={13} />
                        <span className="hidden sm:inline">Export</span>
                        <ChevronUp size={11} className={`opacity-60 transition-transform duration-200 ${exportOpen ? '' : 'rotate-180'}`} />
                    </button>
                    {exportOpen && (
                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 w-32 rounded-xl border border-white/10 bg-[#1e1e1e] shadow-xl p-1 space-y-0.5 animate-dropdown">
                            <button
                                onClick={() => { onExportJSON(); setExportOpen(false); }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition-all text-left"
                            >
                                JSON
                            </button>
                            <button
                                onClick={() => { onExportCSV(); setExportOpen(false); }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition-all text-left"
                            >
                                CSV
                            </button>
                        </div>
                    )}
                </div>

                <div className="h-6 w-px bg-white/10" />

                <button onClick={onBulkDelete} title="Guruhli o'chirish" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-500/80 transition-all">
                    <Trash2 size={13} />
                    <span className="hidden sm:inline">O'chir</span>
                </button>
            </div>
        </div>
    );
};

export default BulkActionBar;

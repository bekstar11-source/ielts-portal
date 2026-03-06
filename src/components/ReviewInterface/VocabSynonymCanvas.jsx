import React, { useState, useEffect, useCallback } from "react";
import { ArrowRightLeft, X, Minimize2, BookOpen, Save, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveSynonymPairs, getSynonymPairs, deleteSynonymPair, batchAddWordsToBank } from "../../utils/wordbankUtils";

/**
 * VocabSynonymCanvas
 * Props:
 *   captureData    – { word, context, source } | null
 *   onClearCapture – () => void
 *   userId         – string
 *   testId         – string
 *   testTitle      – string  (WordBank da nom uchun)
 */
export default function VocabSynonymCanvas({ captureData, onClearCapture, userId, testId, testTitle }) {
    const [isOpen, setIsOpen] = useState(true);
    const [step, setStep] = useState(0);
    const [passageData, setPassageData] = useState(null);
    const [questionData, setQuestionData] = useState(null);

    const [pairs, setPairs] = useState([]);
    const [unsavedIds, setUnsavedIds] = useState(new Set());

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Load saved pairs from Firestore on mount
    useEffect(() => {
        if (!userId || !testId) return;
        setIsLoading(true);
        getSynonymPairs(userId, testId)
            .then((data) => {
                setPairs(data);
                setUnsavedIds(new Set());
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [userId, testId]);

    // Handle incoming capture data
    useEffect(() => {
        if (!captureData) return;
        setIsOpen(true);
        if (captureData.source === "passage" || (!passageData && captureData.source !== "question")) {
            setPassageData(captureData);
            setStep(1);
        } else if (captureData.source === "question") {
            if (passageData) {
                setQuestionData(captureData);
                setStep(2);
            } else {
                setPassageData({ ...captureData, source: "passage" });
                setStep(1);
            }
        }
        onClearCapture();
    }, [captureData]); // eslint-disable-line

    const handleAddPair = (relation) => {
        const newPair = {
            id: `local_${Date.now()}`,
            passageWord: passageData?.word,
            questionWord: questionData?.word,
            type: relation,
            createdAt: Date.now(),
        };
        setPairs((prev) => [newPair, ...prev]);
        setUnsavedIds((prev) => new Set([...prev, newPair.id]));
        setPassageData(null);
        setQuestionData(null);
        setStep(0);
    };

    const handleCancelCapture = () => {
        setPassageData(null);
        setQuestionData(null);
        setStep(0);
    };

    // Save to synonymPairs (single source of truth)
    const handleSave = useCallback(async () => {
        if (!userId || !testId) {
            alert('userId yoki testId topilmadi!');
            return;
        }
        const toSave = pairs.filter((p) => unsavedIds.has(p.id));
        if (toSave.length === 0) return;

        setIsSaving(true);
        try {
            // Generate stable IDs for unsaved pairs
            const idMap = {};
            const withRealIds = toSave.map((p) => {
                const newId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                idMap[p.id] = newId;
                return { ...p, id: newId };
            });

            // Save to synonymPairs subcollection
            await saveSynonymPairs(userId, testId, withRealIds);

            // Also save to WordBank keywords for the Keywords tab
            const wordbankEntries = withRealIds.map((p) => ({
                passageWord: p.passageWord || '',
                questionWord: p.questionWord || '',
                type: p.type || 'synonym',
                testId: testId,
                testName: testTitle || testId,
            }));
            await batchAddWordsToBank(userId, wordbankEntries);

            // Update local state with new IDs — no extra re-fetch needed
            setPairs(prev => prev.map(p => {
                if (idMap[p.id]) return { ...p, id: idMap[p.id] };
                return p;
            }));
            setUnsavedIds(new Set());
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 2500);
        } catch (err) {
            console.error('Saqlashda xato:', err);
            alert('Saqlashda xatolik: ' + (err?.message || err));
        } finally {
            setIsSaving(false);
        }
    }, [userId, testId, testTitle, pairs, unsavedIds]);

    const handleRemovePair = useCallback(async (pair) => {
        const isUnsaved = unsavedIds.has(pair.id);
        if (isUnsaved) {
            setPairs((prev) => prev.filter((p) => p.id !== pair.id));
            setUnsavedIds((prev) => { const s = new Set(prev); s.delete(pair.id); return s; });
        } else {
            setDeletingId(pair.id);
            try {
                await deleteSynonymPair(userId, testId, pair.id);
                setPairs((prev) => prev.filter((p) => p.id !== pair.id));
            } catch (err) {
                console.error("O'chirishda xato:", err);
            } finally {
                setDeletingId(null);
            }
        }
    }, [userId, testId, unsavedIds]);

    // High-contrast type styles for dark background
    const typeConfig = {
        synonym: {
            label: "SYN",
            badgeClass: "bg-emerald-400/20 text-emerald-300 border-emerald-400/40",
            wordClass: "text-emerald-300 font-bold",
            rowBg: "rgba(4,120,87,0.18)",
            rowBorder: "rgba(52,211,153,0.25)",
        },
        antonym: {
            label: "ANT",
            badgeClass: "bg-rose-400/20 text-rose-300 border-rose-400/40",
            wordClass: "text-rose-300 font-bold",
            rowBg: "rgba(136,19,55,0.22)",
            rowBorder: "rgba(251,113,133,0.25)",
        },
        phrase: {
            label: "PHR",
            badgeClass: "bg-amber-400/20 text-amber-300 border-amber-400/40",
            wordClass: "text-amber-300 font-bold",
            rowBg: "rgba(120,53,15,0.22)",
            rowBorder: "rgba(251,191,36,0.25)",
        },
    };

    const hasActivity = step > 0 || pairs.length > 0;
    if (!isOpen && !hasActivity) return null;

    return (
        <AnimatePresence mode="wait">
            {!isOpen ? (
                <motion.div
                    key="mini"
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="fixed bottom-16 right-6 z-[2000]"
                >
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full text-white font-semibold shadow-2xl hover:opacity-90 transition-all text-sm"
                        style={{ background: '#0f172a', border: '1px solid rgba(100,116,139,0.5)' }}
                    >
                        <BookOpen className="w-4 h-4 text-violet-400" />
                        Sinonimlar
                        {pairs.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 bg-violet-500/30 rounded-full text-violet-300 text-xs font-bold">
                                {pairs.length}
                            </span>
                        )}
                        {unsavedIds.size > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                    </button>
                </motion.div>
            ) : (
                <motion.div
                    key="max"
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="fixed bottom-16 right-6 z-[2000] w-[480px] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
                    style={{ background: '#0d1526', border: '1px solid rgba(100,116,139,0.35)' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(100,116,139,0.25)', background: 'rgba(15,23,42,0.9)' }}>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)' }}>
                                <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                            </div>
                            <span className="text-sm font-bold text-white tracking-wide">Sinonimlar</span>
                            {isLoading && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
                            {pairs.length > 0 && !isLoading && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>
                                    {pairs.length}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: '#94a3b8', background: 'rgba(100,116,139,0.15)' }}
                        >
                            <Minimize2 className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Body — shows ~4 rows then scrolls */}
                    <div className="overflow-y-auto p-3 space-y-2 vocab-syn-scroll" style={{ maxHeight: '200px' }}>
                        <AnimatePresence mode="popLayout">

                            {/* Step 1 — Passage word locked */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-3 rounded-xl relative"
                                    style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(96,165,250,0.35)' }}
                                >
                                    <button onClick={handleCancelCapture} className="absolute top-2 right-2 transition-colors" style={{ color: 'rgba(96,165,250,0.5)' }}>
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                                        </span>
                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Qulflandi</span>
                                    </div>
                                    <p className="text-base font-bold text-white truncate">{passageData?.word}</p>
                                    <p className="text-xs mt-1" style={{ color: 'rgba(147,197,253,0.75)' }}>Savoldagi sinonim · antonimni belgilang →</p>
                                </motion.div>
                            )}

                            {/* Step 2 — Pick relation */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-3 rounded-xl relative"
                                    style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.35)' }}
                                >
                                    <button onClick={handleCancelCapture} className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="flex items-center justify-center gap-2 mb-3">
                                        <span className="text-sm font-bold text-white truncate max-w-[100px]">{passageData?.word}</span>
                                        <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="text-sm font-bold text-white truncate max-w-[100px]">{questionData?.word}</span>
                                    </div>
                                    <p className="text-[10px] text-center uppercase tracking-wider mb-2.5 font-semibold" style={{ color: '#64748b' }}>Bog'lanishni tanlang</p>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                            { key: "synonym", label: "Sinonim", bg: "rgba(4,120,87,0.2)", border: "rgba(52,211,153,0.35)", color: "#6ee7b7" },
                                            { key: "antonym", label: "Antonim", bg: "rgba(136,19,55,0.2)", border: "rgba(251,113,133,0.35)", color: "#fda4af" },
                                            { key: "phrase", label: "Ibora", bg: "rgba(120,53,15,0.2)", border: "rgba(251,191,36,0.35)", color: "#fcd34d" },
                                        ].map(({ key, label, bg, border, color }) => (
                                            <button
                                                key={key}
                                                onClick={() => handleAddPair(key)}
                                                className="py-2 rounded-xl text-xs font-bold transition-all"
                                                style={{ background: bg, border: `1px solid ${border}`, color }}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Empty state */}
                            {pairs.length === 0 && step === 0 && !isLoading && (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center py-10 text-center"
                                >
                                    <BookOpen className="w-8 h-8 mb-2" style={{ color: '#334155' }} />
                                    <p className="text-sm font-medium" style={{ color: '#64748b' }}>So'z belgilang</p>
                                    <p className="text-[11px] mt-1" style={{ color: '#475569' }}>Matndan so'z qulflang, keyin<br />savoldagi sinonimini tanlang</p>
                                </motion.div>
                            )}

                            {/* Pair rows */}
                            {pairs.map((pair) => {
                                const cfg = typeConfig[pair.type] || typeConfig.synonym;
                                const isUnsaved = unsavedIds.has(pair.id);
                                const isDeleting = deletingId === pair.id;

                                return (
                                    <motion.div
                                        layout
                                        key={pair.id}
                                        initial={{ opacity: 0, x: 16 }}
                                        animate={{ opacity: isDeleting ? 0.3 : 1, x: 0 }}
                                        exit={{ opacity: 0, x: -16 }}
                                        className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl group"
                                        style={{
                                            background: cfg.rowBg,
                                            border: `1px solid ${cfg.rowBorder}`,
                                        }}
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="text-[13px] font-bold text-white truncate">{pair.passageWord}</span>
                                            <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider border ${cfg.badgeClass}`}>
                                                {cfg.label}
                                            </span>
                                            <span className={`text-[13px] truncate ${cfg.wordClass}`}>{pair.questionWord}</span>
                                            {isUnsaved && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="Saqlanmagan" />}
                                        </div>
                                        <button
                                            onClick={() => handleRemovePair(pair)}
                                            disabled={isDeleting}
                                            className="shrink-0 p-1 opacity-0 group-hover:opacity-100 transition-all rounded-md disabled:cursor-wait"
                                            style={{ color: '#475569' }}
                                        >
                                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Footer: Save button */}
                    {unsavedIds.size > 0 && (
                        <div className="px-3 pb-3 pt-2 shrink-0" style={{ borderTop: '1px solid rgba(100,116,139,0.25)', background: 'rgba(15,23,42,0.85)' }}>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all text-white"
                                style={{ background: isSaving ? '#5b21b6' : '#7c3aed', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}
                            >
                                {isSaving
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saqlanmoqda...</>
                                    : <><Save className="w-4 h-4" /> Saqlash ({unsavedIds.size} ta yangi)</>
                                }
                            </button>
                        </div>
                    )}

                    {savedFlash && unsavedIds.size === 0 && (
                        <div className="px-3 pb-3 pt-2 shrink-0" style={{ borderTop: '1px solid rgba(100,116,139,0.25)', background: 'rgba(15,23,42,0.85)' }}>
                            <div className="flex items-center justify-center gap-2 py-1.5 text-sm font-bold" style={{ color: '#34d399' }}>
                                <CheckCircle2 className="w-4 h-4" /> Wordbank'ga ham saqlandi!
                            </div>
                        </div>
                    )}

                    <style>{`
                        .vocab-syn-scroll::-webkit-scrollbar { width: 3px; }
                        .vocab-syn-scroll::-webkit-scrollbar-track { background: transparent; }
                        .vocab-syn-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 10px; }
                        .vocab-syn-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.4); }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

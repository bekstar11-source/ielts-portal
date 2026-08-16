import React, { useState, useEffect, useMemo, useCallback } from "react";
import { X, Loader2, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { useMergeTests } from "../../../hooks/useMergeTests";
import { db } from "../../../firebase/firebase";
import { buildMergePlan } from "../../../utils/TestUtils";

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
    const [sourceTests, setSourceTests] = useState(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [order, setOrder] = useState([]);

    const { isMerging, mergeTests } = useMergeTests({ onSaved, onClose });

    useEffect(() => {
        if (isOpen && selectedTests.length >= 2) {
            const selectedObjects = tests.filter(t => selectedTests.includes(t.id));
            setMergeTitle("Merged: " + selectedObjects.map(t => t.title || "Untitled").join(" + "));
        }
    }, [isOpen, selectedTests, tests]);

    // Preview uchun to'liq test hujjatlarini yuklaymiz — admin ro'yxatidagi
    // metadata'da passage va savollar bo'lmaydi.
    useEffect(() => {
        if (!isOpen || selectedTests.length < 2) {
            setSourceTests(null);
            setOrder([]);
            setLoadError("");
            return;
        }
        let cancelled = false;
        setIsLoadingPlan(true);
        setLoadError("");
        (async () => {
            try {
                const { getDoc, doc } = await import("firebase/firestore");
                const snaps = await Promise.all(
                    selectedTests.map(id => getDoc(doc(db, "tests", id)))
                );
                if (cancelled) return;
                const missing = snaps.filter(s => !s.exists()).length;
                if (missing) throw new Error("Ba'zi testlarni yuklab bo'lmadi.");
                setSourceTests(snaps.map(s => ({ id: s.id, ...s.data() })));
            } catch (err) {
                if (!cancelled) {
                    setSourceTests(null);
                    setLoadError(err.message || "Yuklashda xatolik.");
                }
            } finally {
                if (!cancelled) setIsLoadingPlan(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isOpen, selectedTests]);

    const plan = useMemo(
        () => (sourceTests ? buildMergePlan(sourceTests) : null),
        [sourceTests]
    );

    useEffect(() => {
        if (plan) setOrder(plan.units.map(u => u.key));
    }, [plan]);

    const orderedUnits = useMemo(() => {
        if (!plan) return [];
        const byKey = new Map(plan.units.map(u => [u.key, u]));
        const picked = order.map(k => byKey.get(k)).filter(Boolean);
        const seen = new Set(picked.map(u => u.key));
        return [...picked, ...plan.units.filter(u => !seen.has(u.key))];
    }, [plan, order]);

    const move = useCallback((index, delta) => {
        setOrder(prev => {
            const next = [...prev];
            const target = index + delta;
            if (target < 0 || target >= next.length) return prev;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    }, []);

    if (!isOpen) return null;

    const hasTypeConflict = !!plan && plan.types.length > 1;
    const totalQuestions = orderedUnits.reduce((sum, u) => sum + (u.questionCount || 0), 0);
    const canMerge = !isMerging && !!mergeTitle.trim() && !!plan && !hasTypeConflict && orderedUnits.length >= 2;
    const unitLabel = plan?.type === 'listening' ? 'Part' : plan?.type === 'writing' ? 'Task' : 'Passage';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="merge-modal-title"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-lg max-h-[90dvh] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border ${
                isDark ? 'bg-[#1f1e1b] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'
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

                    <div>
                        <div className="flex items-baseline justify-between mb-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                Order &amp; renumbering
                            </span>
                            {!!plan && (
                                <span className={`text-[11px] font-bold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    {orderedUnits.length} {unitLabel.toLowerCase()} · {totalQuestions} questions
                                </span>
                            )}
                        </div>

                        {isLoadingPlan && (
                            <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${isDark ? 'bg-white/5 text-zinc-400' : 'bg-zinc-50 text-zinc-500'}`}>
                                <Loader2 size={14} className="animate-spin" />
                                Loading test content…
                            </div>
                        )}

                        {!!loadError && !isLoadingPlan && (
                            <div className="text-sm p-3 rounded-xl bg-red-500/10 text-red-500 font-semibold">
                                {loadError}
                            </div>
                        )}

                        {!isLoadingPlan && !loadError && orderedUnits.length > 0 && (
                            <ul className="space-y-2">
                                {orderedUnits.map((unit, idx) => (
                                    <li
                                        key={unit.key}
                                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                                            isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'
                                        }`}
                                    >
                                        <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                                            isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold truncate">{unit.title}</p>
                                            <p className={`text-[11px] truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                {unit.testTitle} · {unit.questionCount} q
                                                {unit.questionCount === 0 && (
                                                    <span className="text-amber-500 font-bold"> · savolsiz</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex flex-col shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => move(idx, -1)}
                                                disabled={idx === 0}
                                                aria-label={`Move ${unit.title} up`}
                                                className={`p-1 rounded disabled:opacity-25 ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}
                                            >
                                                <ArrowUp size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => move(idx, 1)}
                                                disabled={idx === orderedUnits.length - 1}
                                                aria-label={`Move ${unit.title} down`}
                                                className={`p-1 rounded disabled:opacity-25 ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}
                                            >
                                                <ArrowDown size={14} />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {!!plan?.warnings?.length && (
                            <ul className="mt-3 space-y-1.5">
                                {plan.warnings.map((w, i) => (
                                    <li key={i} className="flex gap-2 text-[12px] font-semibold text-amber-500">
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                        <span>{w}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {!isLoadingPlan && !loadError && plan && (
                            <p className={`mt-3 text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                Savollar shu tartibda 1 dan {totalQuestions} gacha qayta raqamlanadi.
                            </p>
                        )}
                    </div>
                </div>
                <div className={`p-4 sm:p-6 pt-0 flex gap-3 ${isDark ? 'bg-[#1f1e1b]' : 'bg-white'}`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-3 font-bold text-sm rounded-xl transition-colors ${
                            isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                        }`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => mergeTests(selectedTests, mergeTitle, {
                            order: orderedUnits.map(u => u.key),
                            sourceTests
                        })}
                        disabled={!canMerge}
                        className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                            !canMerge ? 'opacity-70 cursor-not-allowed' : ''
                        } ${
                            isDark ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        }`}
                    >
                        {isMerging && <Loader2 size={16} className="animate-spin" />}
                        {hasTypeConflict ? "Turlar mos emas" : "Merge Tests"}
                    </button>
                </div>
            </div>
        </div>
    );
}

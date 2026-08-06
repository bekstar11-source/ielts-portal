import React, { useMemo, useState } from "react";
import { parseAnswerText, applyAnswerEntries } from "./TestDoctor";

/**
 * Javoblarni matndan ommaviy kiritish.
 * Kitobdan ko'chirilgan "1. TRUE  2. FALSE ..." ro'yxatini to'g'ridan-to'g'ri qabul qiladi.
 */
export default function AnswerImportModal({ show, jsonInput, onApply, onClose, isDark }) {
    const [raw, setRaw] = useState("");

    const preview = useMemo(() => {
        if (!show || !raw.trim()) return null;
        const entries = parseAnswerText(raw);
        if (!entries.length) return { entries: [], error: "Javoblar aniqlanmadi" };
        try {
            const parsed = JSON.parse(jsonInput || "{}");
            const { result, applied, skipped } = applyAnswerEntries(parsed, entries);
            return { entries, result, applied, skipped };
        } catch (e) {
            return { entries, error: "JSON xato: " + e.message };
        }
    }, [show, raw, jsonInput]);

    if (!show) return null;

    const card = isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200';
    const applied = preview?.applied || [];
    const skipped = preview?.skipped || [];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden ${card}`}>
                <div className="p-6">
                    <h3 className="text-sm font-black tracking-tight">Javoblarni ommaviy kiritish</h3>
                    <p className="text-xs mt-0.5 mb-4 opacity-50">
                        Har bir qatorda bitta javob: <span className="font-mono">1. TRUE</span> · <span className="font-mono">2) glass</span> · <span className="font-mono">3 - museum</span>.
                        Raqamsiz ro'yxat 1 dan boshlab tartib bilan biriktiriladi.
                    </p>

                    <textarea
                        value={raw}
                        onChange={e => setRaw(e.target.value)}
                        autoFocus
                        spellCheck="false"
                        placeholder={"1. TRUE\n2. FALSE\n3. NOT GIVEN\n4. glass bottle"}
                        className={`w-full h-44 p-3 rounded-xl border outline-none font-mono text-[11px] leading-relaxed resize-y transition ${isDark ? 'bg-[#121212] border-white/5 focus:border-blue-500/50' : 'bg-gray-50 border-gray-200 focus:border-blue-400'}`}
                    />

                    {preview?.error ? (
                        <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] font-bold text-red-500">
                            {preview.error}
                        </div>
                    ) : preview ? (
                        <div className="mt-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black">
                                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                    {applied.length} ta javob yoziladi
                                </span>
                                {skipped.length > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        {skipped.length} ta savol topilmadi: {skipped.slice(0, 8).join(', ')}{skipped.length > 8 ? '…' : ''}
                                    </span>
                                )}
                            </div>
                            {applied.length > 0 && (
                                <div className={`max-h-32 overflow-y-auto custom-scrollbar rounded-xl p-2 space-y-1 ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
                                    {applied.slice(0, 40).map(a => (
                                        <div key={a.id} className="flex items-center gap-2 text-[10px] font-mono">
                                            <span className="opacity-40 tabular-nums w-6 shrink-0">{a.id}</span>
                                            <span className="opacity-40 line-through truncate max-w-[35%]">{a.before ?? '—'}</span>
                                            <span className="opacity-30">→</span>
                                            <span className="text-green-500 font-bold truncate">{a.after}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}

                    <div className="flex gap-3 mt-5">
                        <button
                            onClick={onClose}
                            className={`flex-1 h-10 rounded-xl text-sm font-bold border transition active:scale-95 ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                        >
                            Bekor qilish
                        </button>
                        <button
                            onClick={() => onApply(preview.result, applied.length)}
                            disabled={!preview || preview.error || applied.length === 0}
                            className="flex-1 h-10 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Kiritish
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

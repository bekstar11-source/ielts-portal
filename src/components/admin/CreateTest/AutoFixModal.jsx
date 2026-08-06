import React, { useMemo, useState } from "react";
import { autoFixTest, FIX_DEFS } from "./TestDoctor";

/**
 * Avto-tuzatish oynasi — nima o'zgarishini oldindan ko'rsatadi.
 * Qo'llangan o'zgarishlarni Ctrl+Z bilan bekor qilish mumkin (JSON tarixiga tushadi).
 */
export default function AutoFixModal({ show, jsonInput, testType, onApply, onClose, isDark }) {
    const [enabled, setEnabled] = useState(() =>
        FIX_DEFS.reduce((acc, f) => ({ ...acc, [f.key]: f.defaultOn !== false }), {})
    );

    const preview = useMemo(() => {
        if (!show || !jsonInput) return null;
        try {
            const parsed = JSON.parse(jsonInput);
            return autoFixTest(parsed, { type: testType, enabled });
        } catch (e) {
            return { error: e.message };
        }
    }, [show, jsonInput, testType, enabled]);

    if (!show) return null;

    const changes = preview?.changes || [];
    const total = changes.reduce((s, c) => s + c.count, 0);
    const card = isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden ${card}`}>
                <div className="p-6">
                    <div className="flex items-start gap-4 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-black tracking-tight">Avto-tuzatish</h3>
                            <p className="text-xs mt-0.5 opacity-50">
                                Mexanik xatolar bir bosishda tuzatiladi. Natija yoqmasa — Ctrl+Z.
                            </p>
                        </div>
                    </div>

                    {/* Tanlanadigan tuzatishlar */}
                    <div className="space-y-1.5 mb-4">
                        {FIX_DEFS.map(def => {
                            const hit = changes.find(c => c.key === def.key);
                            return (
                                <label
                                    key={def.key}
                                    className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={!!enabled[def.key]}
                                        onChange={e => setEnabled(p => ({ ...p, [def.key]: e.target.checked }))}
                                        className="mt-0.5 w-4 h-4 accent-violet-500 shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold">{def.label}</span>
                                            {hit && (
                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-500 border border-violet-500/20 shrink-0">
                                                    {hit.count} ta
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] opacity-40 mt-0.5">{def.hint}</p>
                                        {hit?.samples?.length > 0 && (
                                            <p className="text-[10px] font-mono opacity-50 mt-1 break-all">
                                                {hit.samples.join(" · ")}
                                                {hit.count > hit.samples.length && ` · +${hit.count - hit.samples.length}`}
                                            </p>
                                        )}
                                    </div>
                                </label>
                            );
                        })}
                    </div>

                    {preview?.error ? (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] font-bold text-red-500">
                            JSON xato — avval uni to'g'rilang: {preview.error}
                        </div>
                    ) : total === 0 ? (
                        <div className="mb-4 p-3 rounded-xl bg-green-500/5 border border-green-500/10 text-[11px] font-bold text-green-600 dark:text-green-500">
                            Tuzatiladigan mexanik xato topilmadi.
                        </div>
                    ) : null}

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className={`flex-1 h-10 rounded-xl text-sm font-bold border transition active:scale-95 ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                        >
                            Bekor qilish
                        </button>
                        <button
                            onClick={() => onApply(preview.result, changes)}
                            disabled={!preview || preview.error || total === 0}
                            className="flex-1 h-10 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {total > 0 ? `${total} ta xatoni tuzatish` : "Tuzatish"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

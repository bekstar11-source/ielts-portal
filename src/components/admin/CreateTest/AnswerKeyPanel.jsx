import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { buildAnswerKey } from "./TestDoctor";

/**
 * Javoblar kaliti — 40 ta javobni bitta ekranda ko'rish uchun.
 * Yetishmayotgan javob qizil, takrorlangan ID amber rangda.
 */
function AnswerKeyPanel({ testData, isDark, onJump, onOpenImport }) {
    const [isOpen, setIsOpen] = useState(false);
    const rows = useMemo(() => buildAnswerKey(testData), [testData]);

    const missing = rows.filter(r => r.missing).length;
    const duplicates = rows.filter(r => r.duplicate).length;

    const copyKey = async () => {
        const text = rows.map(r => `${r.id ?? '?'}. ${r.missing ? '' : r.answer}`).join("\n");
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Javoblar kaliti nusxalandi");
        } catch {
            toast.error("Nusxalab bo'lmadi");
        }
    };

    return (
        <div className={`rounded-2xl border ${isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="p-4 flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => setIsOpen(o => !o)}
                    className="flex items-center gap-3 min-w-0 text-left"
                >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${missing > 0 ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-black tracking-tight uppercase">Javoblar Kaliti</h3>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-0.5">
                            {rows.length} ta savol
                            {missing > 0 && ` · ${missing} ta javobsiz`}
                            {duplicates > 0 && ` · ${duplicates} ta takror`}
                        </p>
                    </div>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                    {onOpenImport && (
                        <button
                            type="button"
                            onClick={onOpenImport}
                            title="Javoblarni matndan kiritish"
                            className={`h-7 px-2.5 rounded-lg border text-[10px] font-black transition active:scale-95 ${isDark ? 'border-white/10 hover:bg-white/5 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                        >
                            Ommaviy kiritish
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={copyKey}
                        disabled={rows.length === 0}
                        title="Kalitni nusxalash"
                        className={`h-7 px-2.5 rounded-lg border text-[10px] font-black transition active:scale-95 disabled:opacity-30 ${isDark ? 'border-white/10 hover:bg-white/5 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                    >
                        Nusxalash
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsOpen(o => !o)}
                        aria-label={isOpen ? "Yopish" : "Ochish"}
                        className="w-7 h-7 flex items-center justify-center"
                    >
                        <svg className={`w-4 h-4 opacity-40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="px-4 pb-4">
                    {rows.length === 0 ? (
                        <p className="text-[11px] opacity-40 py-3 text-center">Savollar hali kiritilmagan.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                            {rows.map((r, i) => (
                                <button
                                    key={`${r.id}-${i}`}
                                    type="button"
                                    onClick={() => onJump?.(r.path)}
                                    title={`${r.type || 'savol'} — JSON'da ochish`}
                                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition hover:brightness-110 active:scale-95 ${
                                        r.missing
                                            ? 'bg-red-500/5 border-red-500/20'
                                            : r.duplicate
                                                ? 'bg-amber-500/5 border-amber-500/20'
                                                : (isDark ? 'bg-white/[0.03] border-white/5' : 'bg-gray-50 border-gray-100')
                                    }`}
                                >
                                    <span className={`text-[10px] font-black tabular-nums shrink-0 ${r.duplicate ? 'text-amber-500' : 'opacity-40'}`}>
                                        {r.id ?? '?'}
                                    </span>
                                    <span className={`text-[11px] font-mono truncate ${r.missing ? 'text-red-500 font-bold' : ''}`}>
                                        {r.missing ? "javob yo'q" : String(r.answer)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default React.memo(AnswerKeyPanel);

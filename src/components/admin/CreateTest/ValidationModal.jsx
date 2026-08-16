import React from 'react';

export default function ValidationModal({ show, errors, onConfirm, onCancel, onAutoFix, onJump, isDark }) {
    if (!show) return null;

    // Bloklovchi xatolar bilan test o'quvchida buzilishi mumkin — faqat ogohlantiramiz,
    // saqlashni to'smaymiz (admin o'zi qaror qiladi).
    const blocking = errors.filter(e => e.blocking);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md max-h-[90dvh] rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-[#1f1e1b] border-white/10' : 'bg-white border-gray-200'}`}>
                <div className="p-4 sm:p-6">
                    <div className="flex items-start gap-4 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-black tracking-tight">
                                {errors.length} ta kritik xato aniqlandi
                            </h3>
                            <p className={`text-xs mt-0.5 ${isDark ? 'opacity-50' : 'text-gray-500'}`}>
                                {blocking.length > 0
                                    ? `${blocking.length} tasi tuzatilmasa test o'quvchida buzilishi mumkin. Baribir saqlashingiz mumkin.`
                                    : "Baribir saqlashni xohlaysizmi?"}
                            </p>
                        </div>
                    </div>

                    <div className={`rounded-xl p-3 mb-5 max-h-[200px] overflow-y-auto space-y-2 ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
                        {errors.map((err, i) => (
                            <div key={err.id || i} className="flex items-start gap-2 text-xs">
                                <span className={`font-black shrink-0 mt-0.5 ${err.blocking ? 'text-red-500' : 'text-amber-500'}`}>
                                    {err.blocking ? '✗' : '!'}
                                </span>
                                <div className="min-w-0">
                                    <span className={`text-[9px] font-black uppercase tracking-wider opacity-50 mr-1`}>
                                        [{err.category}]
                                    </span>
                                    <span className={isDark ? 'text-red-300' : 'text-red-700'}>{err.message}</span>
                                    {onJump && err.path && (
                                        <button
                                            type="button"
                                            onClick={() => { onCancel(); onJump(err.path); }}
                                            className="ml-1.5 text-[10px] font-black text-blue-500 underline underline-offset-2 hover:opacity-80"
                                        >
                                            JSON'da ochish
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2">
                        {onAutoFix && (
                            <button
                                onClick={() => { onCancel(); onAutoFix(); }}
                                className="h-10 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white transition active:scale-95"
                            >
                                Avto-tuzatishni ochish
                            </button>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className={`flex-1 h-10 rounded-xl text-sm font-bold border transition active:scale-95 ${isDark ? 'border-white/10 hover:bg-white/5 text-white' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                            >
                                Qaytish va tuzatish
                            </button>
                            <button
                                onClick={onConfirm}
                                title={blocking.length > 0 ? "Diqqat: kritik xatolar bilan test o'quvchida buzilishi mumkin" : ""}
                                className="flex-1 h-10 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white transition active:scale-95"
                            >
                                Baribir saqlash
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

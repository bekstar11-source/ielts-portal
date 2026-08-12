import React from "react";

/**
 * Oddiy tasdiq oynasi — xavfli/qaytarib bo'lmaydigan amallar uchun.
 */
export default function ConfirmDialog({ show, title, message, confirmLabel = "Davom etish", cancelLabel = "Bekor qilish", tone = 'amber', onConfirm, onCancel, isDark }) {
    if (!show) return null;

    const toneCls = tone === 'red'
        ? 'bg-red-600 hover:bg-red-700'
        : tone === 'blue'
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-amber-500 hover:bg-amber-600';

    return (
        <div className="fixed inset-0 z-[205] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-2xl shadow-2xl border p-4 sm:p-6 ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}>
                <h3 className="text-sm font-black tracking-tight mb-1.5">{title}</h3>
                <p className="text-xs opacity-60 leading-relaxed mb-5">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className={`flex-1 h-10 rounded-xl text-sm font-bold border transition active:scale-95 ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 h-10 rounded-xl text-sm font-bold text-white transition active:scale-95 ${toneCls}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

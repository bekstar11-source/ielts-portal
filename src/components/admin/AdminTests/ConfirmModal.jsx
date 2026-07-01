import React from "react";
import { Trash2, Award, Folder } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";

export default function ConfirmModal({
    isOpen,
    onClose,
    title,
    message,
    confirmText = "Tasdiqlash",
    cancelText = "Bekor qilish",
    onConfirm,
    type = "danger" // 'danger' | 'info' | 'warning'
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
            <div className={`relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border p-6 space-y-5 ${
                isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'
            }`}>
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        type === 'danger'
                            ? 'bg-rose-500/10 text-rose-500'
                            : type === 'warning'
                                ? 'bg-amber-500/10 text-amber-500'
                                : 'bg-blue-500/10 text-blue-500'
                    }`}>
                        {type === 'danger' ? <Trash2 size={24} /> : type === 'warning' ? <Award size={24} /> : <Folder size={24} />}
                    </div>
                    <h3 id="confirm-modal-title" className="font-bold text-base leading-tight">{title}</h3>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{message}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition-colors ${
                            isDark ? 'bg-white/5 hover:bg-white/10 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                        }`}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 ${
                            type === 'danger'
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/15'
                                : type === 'warning'
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/15'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/15'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

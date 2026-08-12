// src/components/admin/keys/ConfirmModal.jsx
//
// Qaytarib bo'lmaydigan amallar uchun tasdiq oynasi. `window.confirm` o'rniga —
// u brauzer temasiga bo'ysunadi va matnni formatlab bo'lmaydi.

import React, { useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Davom etish",
  tone = "danger", // danger | warning
  busy,
  isDark,
  onConfirm,
  onCancel,
  children,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const accent =
    tone === "warning"
      ? { icon: "bg-amber-500/10 text-amber-500", btn: "bg-amber-500 hover:bg-amber-600" }
      : { icon: "bg-red-500/10 text-red-500", btn: "bg-red-600 hover:bg-red-700" };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onCancel?.()} />
      <div
        className={`relative w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-2xl border shadow-2xl p-4 sm:p-6 animate-content-in ${
          isDark ? "bg-[#141416] border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800"
        }`}
      >
        <div className="flex items-start gap-3 mb-4">
          <span className={`p-2 rounded-xl shrink-0 ${accent.icon}`}>
            <AlertTriangle size={16} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-black tracking-tight">{title}</h3>
            <p className="text-xs opacity-60 leading-relaxed mt-1">{message}</p>
          </div>
        </div>

        {children && <div className="mb-4">{children}</div>}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={`flex-1 h-10 rounded-xl text-xs font-bold border transition active:scale-95 disabled:opacity-50 ${
              isDark ? "border-zinc-800 hover:bg-zinc-800/60 text-zinc-300" : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"
            }`}
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 h-10 rounded-xl text-xs font-bold text-white transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${accent.btn}`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

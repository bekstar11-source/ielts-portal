// src/components/admin/keys/KeyRow.jsx

import React from "react";
import { Copy, Trash2, Calendar, User, FolderKanban, Check, CircleDashed } from "lucide-react";
import { formatDate, formatDateTime, formatRelative } from "./keyUtils";

export default function KeyRow({ item, index, isFresh, isSelected, isCopied, isDark, mockName, collectionName, onToggleSelect, onCopy, onDelete }) {
  const containerCls = isSelected
    ? isDark
      ? "bg-blue-500/5 border-blue-500/40"
      : "bg-blue-50/60 border-blue-300"
    : isFresh
      ? isDark
        ? "bg-emerald-500/5 border-emerald-500/30"
        : "bg-emerald-50/50 border-emerald-200"
      : item.isUsed
        ? isDark
          ? "bg-zinc-950/20 border-zinc-900"
          : "bg-zinc-50 border-zinc-200/60"
        : isDark
          ? "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
          : "bg-white border-zinc-200 hover:border-zinc-300";

  return (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3.5 rounded-xl border transition-all ${containerCls}`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded accent-blue-600 shrink-0 cursor-pointer"
          aria-label={`${item.key} kalitini tanlash`}
        />
        <span className={`text-[10px] font-black w-5 text-center shrink-0 tabular-nums ${isDark ? "text-zinc-700" : "text-zinc-300"}`}>
          {index + 1}
        </span>

        <button
          onClick={onCopy}
          className={`font-mono text-base font-black px-3.5 py-1.5 rounded-xl tracking-widest border transition-all active:scale-95 shrink-0 ${
            item.isUsed
              ? isDark
                ? "bg-zinc-900 border-zinc-800 text-zinc-600"
                : "bg-zinc-200 border-zinc-300 text-zinc-500"
              : isDark
                ? "bg-zinc-800 border-zinc-700 text-zinc-100 hover:border-zinc-600"
                : "bg-zinc-900 border-zinc-900 text-zinc-100 hover:bg-black"
          }`}
          title="Nusxalash uchun bosing"
        >
          {isCopied ? <Check size={16} className="mx-auto" /> : item.key || "??????"}
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
              title={formatDateTime(item.createdAt)}
            >
              <Calendar size={10} />
              {formatDate(item.createdAt)}
            </span>

            {mockName && (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border truncate max-w-[160px] ${
                  isDark ? "bg-zinc-800/60 border-zinc-700 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-600"
                }`}
                title={mockName}
              >
                {mockName}
              </span>
            )}

            {collectionName && (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${
                  isDark ? "bg-blue-500/10 border-blue-500/25 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-600"
                }`}
              >
                <FolderKanban size={9} /> {collectionName}
              </span>
            )}
          </div>

          <p
            className={`text-xs font-semibold mt-1 flex items-center gap-1.5 truncate ${
              item.isUsed ? (isDark ? "text-emerald-400" : "text-emerald-600") : isDark ? "text-zinc-400" : "text-zinc-500"
            }`}
            title={item.isUsed && item.usedAt ? `Faollashtirilgan: ${formatDateTime(item.usedAt)}` : undefined}
          >
            {item.isUsed ? (
              <>
                <User size={12} className="shrink-0" />
                <span className="truncate">{item.usedByName || "Noma'lum foydalanuvchi"}</span>
                {item.usedAt && (
                  <span className={`shrink-0 font-bold ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>• {formatRelative(item.usedAt)}</span>
                )}
              </>
            ) : (
              <>
                <CircleDashed size={12} className="shrink-0" />
                Faollashmagan
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex gap-2 self-end sm:self-center shrink-0">
        <button
          onClick={onCopy}
          className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
            isDark
              ? "border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              : "border-zinc-200 hover:border-zinc-300 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
          }`}
          title="Nusxalash"
        >
          {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
        <button
          onClick={onDelete}
          className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
            isDark
              ? "border-zinc-800 hover:border-red-500/40 text-zinc-500 hover:text-red-400 hover:bg-red-500/5"
              : "border-zinc-200 hover:border-red-300 text-zinc-400 hover:text-red-600 hover:bg-red-50"
          }`}
          title="O'chirish"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

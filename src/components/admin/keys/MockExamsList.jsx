// src/components/admin/keys/MockExamsList.jsx
//
// Mock imtihonlar ro'yxati: har biri uchun tarkib holati va kalit statistikasi.
// Admin ko'pincha "qaysi mock uchun nechta kalit tarqatildi, nechtasi
// ishlatildi" degan savolga javob izlaydi — shu panel aynan shuning uchun.

import React, { useMemo, useState } from "react";
import { Search, Pencil, Trash2, KeyRound, AlertTriangle, Check, Layers, X } from "lucide-react";
import { formatDate } from "./keyUtils";

export default function MockExamsList({ mocks, keys, collections, testsById, isDark, onGenerateKeys, onEdit, onDelete }) {
  const [search, setSearch] = useState("");

  const collectionNameById = useMemo(
    () => Object.fromEntries(collections.map((c) => [c.id, c.name])),
    [collections]
  );

  const statsByMock = useMemo(() => {
    const map = {};
    keys.forEach((k) => {
      if (!k.mockExamId) return;
      if (!map[k.mockExamId]) map[k.mockExamId] = { total: 0, used: 0 };
      map[k.mockExamId].total += 1;
      if (k.isUsed) map[k.mockExamId].used += 1;
    });
    return map;
  }, [keys]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mocks;
    return mocks.filter(
      (m) =>
        (m.title || "").toLowerCase().includes(q) ||
        (collectionNameById[m.collectionId] || "").toLowerCase().includes(q)
    );
  }, [mocks, search, collectionNameById]);

  const iconBtnCls = `p-2 rounded-lg border transition active:scale-95 ${
    isDark
      ? "border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
      : "border-zinc-200 hover:border-zinc-300 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
  }`;

  return (
    <div className="space-y-3">
      <div
        className={`flex items-center gap-2 border px-3 py-2 rounded-xl transition-all ${
          isDark ? "bg-zinc-950 border-zinc-800 focus-within:border-zinc-600" : "bg-white border-zinc-200 focus-within:border-zinc-400"
        }`}
      >
        <Search size={14} className="text-zinc-400 shrink-0" />
        <input
          type="text"
          placeholder="Mock imtihonni qidirish..."
          className="bg-transparent border-none outline-none text-xs font-semibold placeholder:text-zinc-500 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-zinc-400 hover:text-zinc-200 shrink-0">
            <X size={12} />
          </button>
        )}
      </div>

      {filtered.map((mock) => {
        const stats = statsByMock[mock.id] || { total: 0, used: 0 };
        const mods = [
          { label: "R", id: mock.subTests?.readingId },
          { label: "L", id: mock.subTests?.listeningId },
          { label: "W", id: mock.subTests?.writingId },
        ];
        const broken = mods.some((m) => !m.id || !testsById[m.id]);
        const colName = collectionNameById[mock.collectionId];

        return (
          <div
            key={mock.id}
            className={`p-4 rounded-xl border transition-all ${
              broken
                ? isDark
                  ? "bg-red-500/5 border-red-500/25"
                  : "bg-red-50/50 border-red-200"
                : isDark
                  ? "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                  : "bg-white border-zinc-200 hover:border-zinc-300"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{mock.title || "Nomsiz mock"}</p>
                <div className={`flex items-center gap-2 mt-1 text-[10px] font-bold ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                  {colName && (
                    <span className={`px-1.5 py-0.5 rounded border ${isDark ? "border-zinc-800 bg-zinc-800/40" : "border-zinc-200 bg-zinc-100"}`}>
                      🎓 {colName}
                    </span>
                  )}
                  <span>{formatDate(mock.createdAt)}</span>
                </div>
              </div>

              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => onGenerateKeys(mock)} className={iconBtnCls} title="Kalit yaratish">
                  <KeyRound size={14} />
                </button>
                <button onClick={() => onEdit(mock)} className={iconBtnCls} title="Tahrirlash">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => onDelete(mock, stats)}
                  className={`p-2 rounded-lg border transition active:scale-95 ${
                    isDark
                      ? "border-zinc-800 hover:border-red-500/40 text-zinc-500 hover:text-red-400 hover:bg-red-500/5"
                      : "border-zinc-200 hover:border-red-300 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                  }`}
                  title="O'chirish"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Modullar */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {mods.map((m) => {
                const ok = m.id && testsById[m.id];
                return (
                  <span
                    key={m.label}
                    title={ok ? testsById[m.id]?.title : "Test biriktirilmagan yoki o'chirilgan"}
                    className={`text-[10px] font-black px-2 py-1 rounded-lg border flex items-center gap-1 max-w-[150px] ${
                      ok
                        ? isDark
                          ? "border-zinc-800 bg-zinc-800/40 text-zinc-300"
                          : "border-zinc-200 bg-zinc-50 text-zinc-600"
                        : "border-red-500/30 bg-red-500/10 text-red-500"
                    }`}
                  >
                    {ok ? <Check size={10} className="shrink-0" /> : <AlertTriangle size={10} className="shrink-0" />}
                    {m.label}
                    <span className="font-semibold truncate opacity-70">{ok ? testsById[m.id]?.title : "yo'q"}</span>
                  </span>
                );
              })}
            </div>

            {/* Kalit statistikasi */}
            <div className="flex items-center gap-3 mt-3">
              <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-zinc-800" : "bg-zinc-200"}`}>
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: stats.total ? `${Math.round((stats.used / stats.total) * 100)}%` : "0%" }}
                />
              </div>
              <span className={`text-[10px] font-bold tabular-nums shrink-0 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                {stats.total === 0 ? "kalit yo'q" : `${stats.used}/${stats.total} ishlatilgan`}
              </span>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <div
            className={`w-11 h-11 rounded-2xl mx-auto flex items-center justify-center mb-3 ${
              isDark ? "bg-zinc-900 text-zinc-600" : "bg-zinc-100 text-zinc-400"
            }`}
          >
            <Layers size={18} />
          </div>
          <p className="text-xs font-bold">{search ? "Mos mock topilmadi" : "Hali mock imtihon yaratilmagan"}</p>
        </div>
      )}
    </div>
  );
}

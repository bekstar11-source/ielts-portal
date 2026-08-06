// src/components/admin/keys/SearchableTestSelect.jsx
//
// Test tanlash uchun qidiruvli dropdown. Testlar soni yuzlab bo'lishi mumkin,
// shuning uchun oddiy <select> yaramaydi.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Check, ChevronDown, X } from "lucide-react";
import { formatDate } from "./keyUtils";

const TYPE_ICONS = { reading: "📖", listening: "🎧", writing: "✍️", speaking: "🗣️" };

export default function SearchableTestSelect({
  label,
  type,
  options = [],
  value,
  onChange,
  placeholder,
  isDark,
  error,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const selectedTest = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => (o.title || "").toLowerCase().includes(q));
  }, [options, search]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setSearch("");
  }, []);

  const toggleOpen = () => (isOpen ? closeMenu() : setIsOpen(true));

  const pick = (id) => {
    onChange(id);
    closeMenu();
  };

  // Tashqariga bosish / Escape / strelkalar bilan boshqarish.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) closeMenu();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeMenu();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, closeMenu]);

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  const onSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) pick(opt.id);
    }
  };

  useEffect(() => {
    const node = listRef.current?.children?.[activeIndex];
    node?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  const borderCls = error
    ? "border-red-500/60"
    : isDark
      ? "border-zinc-800 hover:border-zinc-700"
      : "border-zinc-200 hover:border-zinc-300";

  return (
    <div className="relative space-y-1.5" ref={rootRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className={`block text-[10px] font-black uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            {label}
          </label>
          {selectedTest && (
            <button
              type="button"
              onClick={() => onChange("")}
              className={`text-[10px] font-bold ${isDark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-600"}`}
            >
              Tozalash
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between border rounded-xl text-left transition-all text-xs font-bold ${
          compact ? "p-2.5" : "p-3"
        } ${borderCls} ${isDark ? "bg-zinc-900 text-zinc-100" : "bg-zinc-50 text-zinc-800"}`}
      >
        {selectedTest ? (
          <div className="flex-1 min-w-0 pr-2">
            <p className="truncate text-sm">{selectedTest.title || "Nomsiz test"}</p>
            {!compact && (
              <div className="flex items-center gap-2 mt-1 text-[9px] font-bold opacity-60">
                <span className={`px-1.5 py-0.5 rounded uppercase ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-200/60 text-zinc-600"}`}>
                  {selectedTest.difficulty || "medium"}
                </span>
                {selectedTest.createdAt && <span>• {formatDate(selectedTest.createdAt)}</span>}
              </div>
            )}
          </div>
        ) : (
          <span className={isDark ? "text-zinc-500" : "text-zinc-400"}>{placeholder}</span>
        )}
        <ChevronDown size={16} className={`text-zinc-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 mt-1 z-50 border rounded-xl shadow-xl max-h-60 flex flex-col overflow-hidden animate-content-in ${
            isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800"
          }`}
        >
          <div className={`p-2 border-b flex items-center gap-2 ${isDark ? "border-zinc-800 bg-zinc-950/40" : "border-zinc-100 bg-zinc-50/50"}`}>
            <Search size={14} className="text-zinc-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              className="w-full bg-transparent outline-none text-xs font-semibold placeholder:text-zinc-500"
              placeholder="Qidirish..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onSearchKeyDown}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-zinc-400 hover:text-zinc-200">
                <X size={12} />
              </button>
            )}
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
            {filtered.map((opt, i) => {
              const isSelected = opt.id === value;
              const isActive = i === activeIndex;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => pick(opt.id)}
                  className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-center justify-between text-xs ${
                    isSelected
                      ? isDark
                        ? "bg-zinc-800 text-white font-bold"
                        : "bg-zinc-900 text-white font-bold"
                      : isActive
                        ? isDark
                          ? "bg-zinc-800/60 text-zinc-200 font-medium"
                          : "bg-zinc-100 text-zinc-800 font-medium"
                        : isDark
                          ? "text-zinc-300 font-medium"
                          : "text-zinc-700 font-medium"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate">
                      {TYPE_ICONS[type] || ""} {opt.title || "Nomsiz test"}
                    </p>
                    <p className={`text-[9px] mt-0.5 font-bold ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
                      Qiyinchilik: {opt.difficulty || "medium"} • {formatDate(opt.createdAt)}
                    </p>
                  </div>
                  {isSelected && <Check size={14} className="text-white shrink-0" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-zinc-500 py-6 text-xs italic">
                {options.length === 0 ? "Bu turdagi test hali yaratilmagan" : "Hech narsa topilmadi"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

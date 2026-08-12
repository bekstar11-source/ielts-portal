import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Ctrl+K buyruqlar paneli — sahifadagi barcha amallarni klaviaturadan bajarish uchun.
 * commands: [{ id, label, hint, shortcut, disabled, run }]
 */
export default function CommandPalette({ commands, onClose, isDark }) {
    const [queryText, setQueryText] = useState("");
    const [active, setActive] = useState(0);
    const listRef = useRef(null);

    const filtered = useMemo(() => {
        const q = queryText.trim().toLowerCase();
        const usable = commands.filter(c => !c.hidden);
        if (!q) return usable;
        return usable.filter(c => `${c.label} ${c.hint || ''}`.toLowerCase().includes(q));
    }, [commands, queryText]);

    useEffect(() => {
        const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
        el?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const run = (cmd) => {
        if (!cmd || cmd.disabled) return;
        onClose();
        cmd.run();
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(filtered.length - 1, i + 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
        if (e.key === 'Enter') { e.preventDefault(); run(filtered[active]); }
    };

    return (
        <div className="fixed inset-0 z-[210] flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                className={`w-full max-w-lg max-h-[90dvh] rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}
            >
                <input
                    autoFocus
                    value={queryText}
                    onChange={e => { setQueryText(e.target.value); setActive(0); }}
                    onKeyDown={onKeyDown}
                    placeholder="Buyruq qidirish..."
                    className={`w-full h-12 px-4 outline-none text-sm font-medium border-b ${isDark ? 'bg-transparent border-white/5 placeholder:text-gray-600' : 'bg-transparent border-gray-100 placeholder:text-gray-400'}`}
                />
                <div ref={listRef} className="max-h-[50dvh] overflow-y-auto custom-scrollbar p-1.5">
                    {filtered.length === 0 ? (
                        <p className="text-[11px] opacity-40 text-center py-6">Hech narsa topilmadi</p>
                    ) : filtered.map((cmd, idx) => (
                        <button
                            key={cmd.id}
                            data-idx={idx}
                            type="button"
                            onMouseEnter={() => setActive(idx)}
                            onClick={() => run(cmd)}
                            disabled={cmd.disabled}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition ${
                                idx === active ? (isDark ? 'bg-white/10' : 'bg-gray-100') : ''
                            } ${cmd.disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                            <div className="min-w-0">
                                <p className="text-[12px] font-bold truncate">{cmd.label}</p>
                                {cmd.hint && <p className="text-[10px] opacity-40 truncate">{cmd.hint}</p>}
                            </div>
                            {cmd.shortcut && (
                                <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded border ${isDark ? 'border-white/10 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                                    {cmd.shortcut}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

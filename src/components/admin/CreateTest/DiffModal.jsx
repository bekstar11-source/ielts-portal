import React, { useMemo } from "react";

/**
 * Serverdagi nusxa bilan hozirgi JSON o'rtasidagi farq.
 * Tirik testni tahrirlashda tasodifan o'chirilgan bloklarni saqlashdan oldin ko'rsatadi.
 */

// Qatorlar bo'yicha LCS — katta fayllarda sekinlashmasligi uchun cheklov bilan
const MAX_LINES = 4000;

function diffLines(oldText, newText) {
    const a = String(oldText || "").split("\n");
    const b = String(newText || "").split("\n");
    if (a.length > MAX_LINES || b.length > MAX_LINES) {
        return { tooBig: true, rows: [], added: 0, removed: 0 };
    }

    // LCS uzunliklari jadvali
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
    for (let i = m - 1; i >= 0; i--) {
        for (let j = n - 1; j >= 0; j--) {
            dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }

    const rows = [];
    let i = 0, j = 0, added = 0, removed = 0;
    while (i < m && j < n) {
        if (a[i] === b[j]) { rows.push({ type: 'same', text: a[i], line: j + 1 }); i++; j++; }
        else if (dp[i + 1][j] >= dp[i][j + 1]) { rows.push({ type: 'del', text: a[i] }); i++; removed++; }
        else { rows.push({ type: 'add', text: b[j], line: j + 1 }); j++; added++; }
    }
    while (i < m) { rows.push({ type: 'del', text: a[i++] }); removed++; }
    while (j < n) { rows.push({ type: 'add', text: b[j], line: j + 1 }); j++; added++; }

    return { rows, added, removed };
}

// O'zgarishlar atrofidagi 3 qatorni qoldirib, qolganini yashiramiz
function collapse(rows, context = 3) {
    const keep = new Array(rows.length).fill(false);
    rows.forEach((r, idx) => {
        if (r.type === 'same') return;
        for (let k = Math.max(0, idx - context); k <= Math.min(rows.length - 1, idx + context); k++) keep[k] = true;
    });
    const out = [];
    let skipped = 0;
    rows.forEach((r, idx) => {
        if (keep[idx]) {
            if (skipped) { out.push({ type: 'gap', text: `… ${skipped} ta o'zgarmagan qator` }); skipped = 0; }
            out.push(r);
        } else skipped++;
    });
    if (skipped) out.push({ type: 'gap', text: `… ${skipped} ta o'zgarmagan qator` });
    return out;
}

export default function DiffModal({ show, originalJson, currentJson, onClose, onConfirm, isDark }) {
    const diff = useMemo(() => {
        if (!show) return null;
        const d = diffLines(originalJson, currentJson);
        return { ...d, rows: d.tooBig ? [] : collapse(d.rows) };
    }, [show, originalJson, currentJson]);

    if (!show) return null;

    const rowCls = (type) => {
        if (type === 'add') return isDark ? 'bg-green-500/10 text-green-300' : 'bg-green-500/10 text-green-700';
        if (type === 'del') return isDark ? 'bg-red-500/10 text-red-300' : 'bg-red-500/10 text-red-700';
        if (type === 'gap') return 'opacity-30 italic';
        return 'opacity-40';
    };

    return (
        <div className="fixed inset-0 z-[205] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-2xl max-h-[90dvh] rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}>
                <div className="p-5">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                            <h3 className="text-sm font-black tracking-tight">O'zgarishlar</h3>
                            <p className="text-[11px] opacity-50">Serverdagi nusxaga nisbatan</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black shrink-0">
                            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">+{diff.added}</span>
                            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">−{diff.removed}</span>
                        </div>
                    </div>

                    <div className={`rounded-xl border overflow-auto max-h-[55dvh] custom-scrollbar ${isDark ? 'bg-[#121212] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                        {diff.tooBig ? (
                            <p className="p-4 text-[11px] opacity-50">JSON juda katta — farq hisoblanmadi.</p>
                        ) : diff.rows.length === 0 ? (
                            <p className="p-4 text-[11px] opacity-50">Farq yo'q.</p>
                        ) : (
                            diff.rows.map((r, idx) => (
                                <div key={idx} className={`flex gap-2 px-3 py-0.5 font-mono text-[10px] leading-relaxed ${rowCls(r.type)}`}>
                                    <span className="w-4 shrink-0 select-none">
                                        {r.type === 'add' ? '+' : r.type === 'del' ? '−' : ''}
                                    </span>
                                    <span className="whitespace-pre-wrap break-all">{r.text}</span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={onClose}
                            className={`flex-1 h-10 rounded-xl text-sm font-bold border transition active:scale-95 ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                        >
                            Yopish
                        </button>
                        {onConfirm && (
                            <button
                                onClick={onConfirm}
                                className="flex-1 h-10 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition active:scale-95"
                            >
                                Saqlashga o'tish
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

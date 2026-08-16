import React, { useRef, useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";

const UndoIcon = (p) => (
    <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
);
const RedoIcon = (p) => (
    <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
    </svg>
);
const TemplateIcon = (p) => (
    <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
);
const WandIcon = (p) => (
    <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
);
const FormatIcon = (p) => (
    <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h13" />
    </svg>
);
const CopyIcon = (p) => (
    <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-2m-6-12h6a2 2 0 012 2v6m-8-8V3.5L18.5 9H16" />
    </svg>
);

const JsonEditor = ({
    jsonInput,
    handleJsonChange,
    jsonError,
    isDark,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    onFormat,
    onOpenTemplate,
    onAutoFix,
    focusRequest,
}) => {
    const textareaRef = useRef(null);
    const [copied, setCopied] = useState(false);

    // Tashqaridan (validator / javoblar kaliti) kelgan "shu joyga o't" so'rovi
    useEffect(() => {
        if (!focusRequest || focusRequest.offset == null) return;
        const el = textareaRef.current;
        if (!el) return;
        const { offset, length = 0 } = focusRequest;
        const line = jsonInput.slice(0, offset).split("\n").length;
        const style = window.getComputedStyle(el);
        const lineHeight = parseFloat(style.lineHeight) || 18;
        el.focus({ preventScroll: true });
        el.setSelectionRange(offset, offset + length);
        el.scrollTop = Math.max(0, (line - 4) * lineHeight);
    }, [focusRequest, jsonInput]);

    const stats = useMemo(() => {
        const text = jsonInput || "";
        return { lines: text ? text.split("\n").length : 0, chars: text.length };
    }, [jsonInput]);

    // JSON xatosidagi qator raqamini topamiz ("position 123" → qator)
    const errorLine = useMemo(() => {
        if (!jsonError || !jsonInput) return null;
        const m = jsonError.match(/position (\d+)/);
        if (!m) return null;
        return jsonInput.slice(0, Number(m[1])).split("\n").length;
    }, [jsonError, jsonInput]);

    const jumpToError = () => {
        const el = textareaRef.current;
        if (!el || !errorLine) return;
        const pos = jsonInput.split("\n").slice(0, errorLine - 1).join("\n").length;
        el.focus();
        el.setSelectionRange(pos, pos);
        // Xato joyi ko'rinishi uchun taxminiy scroll
        el.scrollTop = Math.max(0, (errorLine - 5) * 17);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(jsonInput || "");
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error("Nusxalab bo'lmadi");
        }
    };

    const handleKeyDown = (e) => {
        // Tab fokusni ko'chirmasin — JSON ichida chekinish qo'shsin
        if (e.key === 'Tab') {
            e.preventDefault();
            const el = e.target;
            const { selectionStart: s, selectionEnd: en } = el;
            const next = `${jsonInput.slice(0, s)}  ${jsonInput.slice(en)}`;
            handleJsonChange({ target: { value: next } });
            requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            if (handleUndo && canUndo) {
                e.preventDefault();
                handleUndo();
            }
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            if (handleRedo && canRedo) {
                e.preventDefault();
                handleRedo();
            }
        }
    };

    const iconBtn = `w-7 h-7 flex items-center justify-center rounded-lg border transition active:scale-95 ${isDark ? 'border-white/10 hover:bg-white/5 text-gray-400' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`;

    return (
        <div className={`p-5 rounded-2xl border flex flex-col min-h-[500px] ${isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-baseline gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider opacity-50">JSON Ma'lumotlar</h3>
                    <span className="text-[10px] font-mono opacity-30 tabular-nums">{stats.lines} qator · {stats.chars} belgi</span>
                </div>

                <div className="flex items-center gap-1.5">
                    {onOpenTemplate && (
                        <button
                            type="button"
                            onClick={onOpenTemplate}
                            title="Shablon qo'llash"
                            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[10px] font-bold transition active:scale-95 ${isDark ? 'border-white/10 hover:bg-white/5 text-gray-400' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                        >
                            <TemplateIcon className="w-3.5 h-3.5" />
                            Shablon
                        </button>
                    )}

                    {onAutoFix && (
                        <button
                            type="button"
                            onClick={onAutoFix}
                            title="Avto-tuzatish (Ctrl+Shift+F)"
                            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[10px] font-bold transition active:scale-95 ${isDark ? 'border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/15 text-violet-400' : 'border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-600'}`}
                        >
                            <WandIcon className="w-3.5 h-3.5" />
                            Avto-tuzatish
                        </button>
                    )}

                    {onFormat && (
                        <button type="button" onClick={onFormat} title="JSON'ni chiroyli formatlash" aria-label="Formatlash" className={iconBtn}>
                            <FormatIcon className="w-3.5 h-3.5" />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleCopy}
                        title="JSON'dan nusxa olish"
                        aria-label="Nusxalash"
                        className={`${iconBtn} ${copied ? 'text-green-500 border-green-500/30' : ''}`}
                    >
                        <CopyIcon className="w-3.5 h-3.5" />
                    </button>

                    {(handleUndo || handleRedo) && (
                        <div className={`flex items-center gap-1 p-1 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                            <button
                                type="button"
                                onClick={handleUndo}
                                disabled={!canUndo}
                                title="Bekor qilish (Ctrl+Z)"
                                aria-label="Bekor qilish"
                                className={`w-6 h-6 flex items-center justify-center rounded transition active:scale-95 ${canUndo ? (isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-white text-gray-700') : 'opacity-25 cursor-not-allowed'}`}
                            >
                                <UndoIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={handleRedo}
                                disabled={!canRedo}
                                title="Qayta tiklash (Ctrl+Y)"
                                aria-label="Qayta tiklash"
                                className={`w-6 h-6 flex items-center justify-center rounded transition active:scale-95 ${canRedo ? (isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-white text-gray-700') : 'opacity-25 cursor-not-allowed'}`}
                            >
                                <RedoIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Xato paneli — qisqargan badge o'rniga to'liq o'qiladigan qator */}
            {jsonError ? (
                <div className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-red-500 break-words">{jsonError}</p>
                        {errorLine && (
                            <button
                                type="button"
                                onClick={jumpToError}
                                className="mt-1 text-[10px] font-black text-red-500 underline underline-offset-2 hover:opacity-80"
                            >
                                {errorLine}-qatorga o'tish
                            </button>
                        )}
                    </div>
                </div>
            ) : jsonInput ? (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <p className="text-[11px] font-bold text-green-600 dark:text-green-500">JSON to'g'ri — ko'rinish yangilandi</p>
                </div>
            ) : null}

            <div className="relative flex-1">
                <textarea
                    ref={textareaRef}
                    aria-label="Test JSON ma'lumotlari"
                    className={`w-full h-full min-h-[400px] p-5 rounded-2xl border outline-none font-mono text-[11px] leading-relaxed resize-y transition-all duration-300 ${isDark ? 'bg-[#181715] text-blue-400' : 'bg-gray-50 text-blue-600'} ${jsonError ? 'border-red-500/40 focus:border-red-500' : (isDark ? 'border-white/5 focus:border-blue-500/50' : 'border-gray-100 focus:border-blue-400')}`}
                    value={jsonInput}
                    onChange={handleJsonChange}
                    onKeyDown={handleKeyDown}
                    placeholder={'{\n  "title": "Cambridge 18 Test 1",\n  "passages": [],\n  "questions": []\n}'}
                    spellCheck="false"
                />
            </div>

            <div className="mt-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <p className={`text-[10px] font-medium leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span className="font-bold text-blue-500">Maslahat:</span> JSON o'zgarganda ko'rinish avtomatik yangilanadi.
                    <span className="opacity-70"> Ctrl+S — saqlash · Ctrl+K — buyruqlar · Ctrl+Shift+F — avto-tuzatish · Ctrl+Z / Ctrl+Y — bekor qilish · Tab — chekinish.</span>
                </p>
            </div>
        </div>
    );
};

export default React.memo(JsonEditor);

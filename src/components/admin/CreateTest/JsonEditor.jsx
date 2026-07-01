import React from "react";

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

const JsonEditor = ({
    jsonInput,
    handleJsonChange,
    jsonError,
    isDark,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    onOpenTemplate,
}) => {
    const handleKeyDown = (e) => {
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

    return (
        <div className={`p-5 rounded-2xl border mb-6 flex flex-col min-h-[500px] ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-50">JSON Ma'lumotlar</h3>

                <div className="flex items-center gap-2">
                    {jsonError && (
                        <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-md animate-pulse">
                            {jsonError}
                        </span>
                    )}

                    {onOpenTemplate && (
                        <button
                            onClick={onOpenTemplate}
                            title="Shablon qo'llash"
                            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[10px] font-bold transition active:scale-95 ${isDark ? 'border-white/10 hover:bg-white/5 text-gray-400' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                        >
                            <TemplateIcon className="w-3.5 h-3.5" />
                            Shablon
                        </button>
                    )}

                    {(handleUndo || handleRedo) && (
                        <div className={`flex items-center gap-1 p-1 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                            <button
                                onClick={handleUndo}
                                disabled={!canUndo}
                                title="Bekor qilish (Ctrl+Z)"
                                className={`w-6 h-6 flex items-center justify-center rounded transition active:scale-95 ${canUndo ? (isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-white text-gray-700') : 'opacity-25 cursor-not-allowed'}`}
                            >
                                <UndoIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleRedo}
                                disabled={!canRedo}
                                title="Qayta tiklash (Ctrl+Y)"
                                className={`w-6 h-6 flex items-center justify-center rounded transition active:scale-95 ${canRedo ? (isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-white text-gray-700') : 'opacity-25 cursor-not-allowed'}`}
                            >
                                <RedoIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="relative flex-1">
                <textarea
                    className={`w-full h-full min-h-[400px] p-5 rounded-2xl border outline-none font-mono text-[11px] leading-relaxed resize-none transition-all duration-300 ${isDark ? 'bg-[#121212] border-white/5 focus:border-blue-500/50 text-blue-400' : 'bg-gray-50 border-gray-100 focus:border-blue-400 text-blue-600'}`}
                    value={jsonInput}
                    onChange={handleJsonChange}
                    onKeyDown={handleKeyDown}
                    placeholder='{"title": "Test...", "passages": [], "questions": []}'
                    spellCheck="false"
                />
                <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                    </svg>
                </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <p className={`text-[10px] font-medium leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span className="font-bold text-blue-500">Maslahat:</span> JSON o'zgarganda test ma'lumotlari avtomatik yangilanadi.
                    Xato bo'lsa, yuqorida qizil ogohlantirish chiqadi. Ctrl+S — saqlash.
                </p>
            </div>
        </div>
    );
};

export default JsonEditor;

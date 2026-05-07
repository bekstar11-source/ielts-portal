import React from "react";

const JsonEditor = ({ jsonInput, handleJsonChange, jsonError, isDark }) => {
    return (
        <div className={`p-5 rounded-2xl border mb-6 flex flex-col min-h-[500px] ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-50">JSON Ma'lumotlar</h3>
                {jsonError && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-md animate-pulse">
                        {jsonError}
                    </span>
                )}
            </div>
            
            <div className="relative flex-1">
                <textarea
                    className={`w-full h-full min-h-[400px] p-5 rounded-2xl border outline-none font-mono text-[11px] leading-relaxed resize-none transition-all duration-300 ${isDark ? 'bg-[#121212] border-white/5 focus:border-blue-500/50 text-blue-400' : 'bg-gray-50 border-gray-100 focus:border-blue-400 text-blue-600'}`}
                    value={jsonInput}
                    onChange={handleJsonChange}
                    placeholder='{"title": "Test...", "passages": [], "questions": []}'
                    spellCheck="false"
                />
                
                {/* Visual indicator for focus */}
                <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <p className={`text-[10px] font-medium leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span className="font-bold text-blue-500">Maslahat:</span> JSON o'zgarganda test ma'lumotlari avtomatik yangilanadi. 
                    Structure xato bo'lsa, yuqorida qizil ogohlantirish chiqadi.
                </p>
            </div>
        </div>
    );
};

export default JsonEditor;

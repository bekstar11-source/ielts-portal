import React from 'react';
import { Code, AlertCircle } from 'lucide-react';

export const ProModeEditor = ({ jsonInput, setJsonInput }) => (
    <div className="bg-[#121212] rounded-xl border border-zinc-800 h-full flex flex-col overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Code size={16} className="text-zinc-500" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">JSON Source Code</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-bold italic">
                <AlertCircle size={12} />
                Be careful with JSON syntax
            </div>
        </div>
        <textarea 
            className="flex-1 w-full bg-transparent text-emerald-500 p-8 font-mono text-sm leading-relaxed outline-none resize-none"
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            spellCheck={false}
        />
    </div>
);

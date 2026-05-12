import React from "react";
import { X } from "lucide-react";

export default function GapFillTask({ 
    isDark, 
    podcast, 
    answers, 
    setAnswers, 
    showResults,
    attempts 
}) {
    const questions = podcast.questions?.filter(q => q.type === 'gapfill') || [];

    return (
        <div className="animate-in fade-in slide-in-from-right-4 flex flex-col gap-4">
            
            <div className="space-y-2">
                {questions.map((q, idx) => {
                    const qKey = `${q.time}-${idx}`;
                    const userVal = String(answers[q.time] || "").toLowerCase().trim();
                    const correctVal = q.data.answer.toLowerCase().trim();
                    const isCorrect = userVal === correctVal;
                    const stepResults = showResults[1];

                    return (
                        <div key={qKey} className={`border p-4 rounded-sm transition-all ${isDark ? 'bg-[#0a0a0c] border-neutral-800' : 'bg-zinc-50 border-zinc-100'} ${stepResults ? (isCorrect ? 'border-emerald-500/50' : 'border-rose-500/50') : (isDark ? 'hover:border-neutral-700' : 'hover:border-zinc-300')}`}>
                            <div className="flex items-start gap-4">
                                <div className={`w-7 h-7 shrink-0 border rounded-full flex items-center justify-center text-[12px] font-bold mt-0.5 ${isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-500' : 'bg-zinc-100 border-zinc-200 text-zinc-400'}`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <div className={`text-[16px] leading-relaxed ${isDark ? 'text-neutral-300' : 'text-zinc-800'}`}>
                                        {q.data.text.split(/\{\{([^}]+)\}\}/g).map((part, i) => {
                                            if (i % 2 === 1) {
                                                return (
                                                    <span key={i} className="inline-block mx-1">
                                                        <input 
                                                            type="text" 
                                                            disabled={stepResults}
                                                            placeholder="..." 
                                                            className={`min-w-[120px] max-w-[180px] border-b-2 px-2 py-0.5 outline-none transition-all text-center font-bold text-[16px] ${
                                                                isDark ? 'bg-neutral-900/50' : 'bg-white/50'
                                                            } ${
                                                                stepResults 
                                                                    ? (isCorrect ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-rose-500 text-rose-400 bg-rose-500/5') 
                                                                    : 'border-emerald-500/30 focus:border-emerald-500'
                                                            } ${isDark ? 'text-white' : 'text-zinc-900'}`}
                                                            style={{ width: `${Math.max(q.data.answer.length * 12, 80)}px` }}
                                                            value={answers[q.time] || ""}
                                                            onChange={(e) => setAnswers(prev => ({ ...prev, [q.time]: e.target.value }))}
                                                        />
                                                    </span>
                                                );
                                            }
                                            return <span key={i}>{part}</span>;
                                        })}
                                    </div>
                                    
                                    {stepResults && !isCorrect && attempts >= 2 && (
                                        <div className="mt-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-rose-400 animate-in fade-in slide-in-from-top-1">
                                            <X size={12} />
                                            <span>Correct: {q.data.answer}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

import React from "react";
import { Check, X, RotateCcw } from "lucide-react";

export default function CompletionTask({ 
    isDark, 
    podcast, 
    answers, 
    setAnswers, 
    showResults,
    isFullscreen,
    attempts 
}) {
    const questions = podcast.questions?.filter(q => q.type === 'completion') || [];
    const words = [...new Set(questions.map(q => q.data.answer))].sort();

    return (
        <div className="animate-in fade-in slide-in-from-right-4 flex flex-col gap-6">
            {/* Word Bank: Sticky Header */}
            <div className={`sticky -top-6 z-20 pb-3 pt-1 ${isDark ? 'bg-[#121214]' : 'bg-white'} ${isFullscreen && 'bg-transparent'}`}>
                <div className={`p-2 rounded-lg border flex flex-wrap gap-1.5 ${isDark ? 'bg-black/40 border-neutral-800' : 'bg-zinc-50 border-zinc-100 shadow-sm'}`}>
                    {words.map(word => (
                        <div key={word} className={`px-2 py-0.5 rounded text-[12px] font-bold border transition-all ${isDark ? 'bg-neutral-900 border-neutral-700 text-emerald-400' : 'bg-white border-zinc-200 text-emerald-600 shadow-sm'}`}>
                            {word}
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                {questions.map((q, idx) => {
                    const qKey = `completion-${q.time}-${idx}`;
                    const userVal = String(answers[qKey] || "").toLowerCase().trim();
                    const correctVal = q.data.answer.toLowerCase().trim();
                    const isCorrect = userVal === correctVal;
                    const parts = q.data.text.split(/\{\{.*?\}\}/);
                    const stepResults = showResults[3];

                    return (
                        <div key={qKey} className={`border p-3 rounded-sm transition-colors ${isDark ? 'bg-[#121214]' : 'bg-white'} ${stepResults ? (isCorrect ? 'border-emerald-500/50' : 'border-rose-500/50') : (isDark ? 'border-neutral-800' : 'border-zinc-100')}`}>
                            <div className={`text-[16px] leading-relaxed mb-3 ${isDark ? 'text-white' : 'text-zinc-800'}`}>
                                <span className={`font-bold mr-2 ${isDark ? 'text-neutral-500' : 'text-zinc-400'}`}>{idx + 1}.</span>
                                {parts[0]}
                                <input 
                                    type="text"
                                    disabled={stepResults}
                                    placeholder="..."
                                    className={`inline-block mx-1.5 border-b outline-none bg-transparent transition-all px-1 py-0.5 text-center min-w-[40px] text-[16px] ${
                                        stepResults 
                                            ? (isCorrect ? 'text-emerald-500 border-emerald-500' : 'text-rose-500 border-rose-500') 
                                            : 'text-emerald-600 border-emerald-500/30 focus:border-emerald-500'
                                    } font-bold`}
                                    value={answers[qKey] || ""}
                                    onChange={(e) => setAnswers(prev => ({ ...prev, [qKey]: e.target.value }))}
                                />
                                {parts[1]}
                            </div>

                            {stepResults && (
                                <div className={`mt-4 pt-4 border-t space-y-3 animate-in fade-in duration-500 ${isDark ? 'border-neutral-800' : 'border-zinc-50'}`}>
                                    <div className="flex items-center gap-2">
                                        {isCorrect ? (
                                            <div className="flex items-center gap-1.5 text-emerald-500 text-[11px] font-black uppercase">
                                                <Check size={14} strokeWidth={3} /> Correct
                                            </div>
                                        ) : (
                                            attempts >= 2 ? (
                                                <div className="flex items-center gap-1.5 text-rose-500 text-[11px] font-black uppercase">
                                                    <X size={14} strokeWidth={3} /> Incorrect: <span className="underline">{q.data.answer}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-amber-500 text-[11px] font-black uppercase">
                                                    <RotateCcw size={14} strokeWidth={3} /> Incorrect - Try again
                                                </div>
                                            )
                                        )}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex flex-col">
                                            <span className={`text-[11px] font-black uppercase tracking-tighter ${isDark ? 'text-neutral-500' : 'text-zinc-400'}`}>Definition:</span>
                                            <p className={`text-[14px] ${isDark ? 'text-neutral-300' : 'text-zinc-600'}`}>{q.data.definition}</p>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-[11px] font-black uppercase tracking-tighter ${isDark ? 'text-neutral-500' : 'text-zinc-400'}`}>Collocation:</span>
                                            <p className={`text-[14px] italic ${isDark ? 'text-emerald-400/80' : 'text-emerald-700'}`}>{q.data.collocation}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

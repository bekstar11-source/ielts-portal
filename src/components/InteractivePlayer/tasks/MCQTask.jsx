import React from "react";
import { Check, X } from "lucide-react";

export default function MCQTask({ 
    isDark, 
    podcast, 
    answers, 
    setAnswers, 
    showResults,
    attempts 
}) {
    const questions = podcast.questions?.filter(q => q.type === 'mcq') || [];

    return (
        <div className="animate-in fade-in slide-in-from-right-4 flex flex-col gap-2">
            {questions.map((q, idx) => {
                const qKey = `${q.time}-${idx}`;
                const isCorrect = answers[q.time] === q.data.correctIndex;
                const stepResults = showResults[2];
                
                return (
                    <div key={qKey} className={`border p-3 rounded-sm ${isDark ? 'bg-[#0a0a0c] border-neutral-800' : 'bg-zinc-50 border-zinc-100'}`}>
                        <p className={`text-[16px] mb-3 font-medium flex gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            <span className={`font-bold ${isDark ? 'text-neutral-500' : 'text-zinc-400'}`}>{idx + 1}.</span>
                            <span>{q.data.question}</span>
                        </p>
                        <div className="space-y-2">
                            {q.data.options.map((opt, oIdx) => (
                                <label 
                                    key={oIdx} 
                                    className={`flex items-center gap-3 p-3 rounded-sm border transition-all cursor-pointer relative ${
                                        answers[q.time] === oIdx 
                                            ? (stepResults ? (isCorrect ? (isDark ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : 'bg-emerald-50 border-emerald-500 text-emerald-900') : (isDark ? 'bg-rose-950 border-rose-500 text-rose-400' : 'bg-rose-50 border-rose-500 text-rose-900')) : (isDark ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.02]' : 'bg-emerald-600 border-emerald-500 text-white shadow-md scale-[1.02]')) 
                                            : (stepResults && !isCorrect && attempts >= 2 && oIdx === q.data.correctIndex 
                                                ? (isDark ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-emerald-50 border-emerald-500/30 text-emerald-700')
                                                : (isDark ? 'border-neutral-800 text-neutral-400 hover:bg-neutral-900 hover:border-neutral-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:border-zinc-300'))
                                    }`}
                                    onClick={() => !stepResults && setAnswers(prev => ({ ...prev, [q.time]: oIdx }))}
                                >
                                    <span className="text-[16px] font-medium leading-tight">{opt}</span>
                                    {stepResults && (
                                        <div className="ml-auto">
                                            {answers[q.time] === oIdx ? (
                                                isCorrect ? <Check size={14} className="text-emerald-500" /> : <X size={14} className="text-rose-500" />
                                            ) : (
                                                stepResults && !isCorrect && attempts >= 2 && oIdx === q.data.correctIndex && <Check size={14} className="text-emerald-500/50" />
                                            )}
                                        </div>
                                    )}
                                </label>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

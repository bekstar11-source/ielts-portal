import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TextCursorInput, List, Target, X, Check, Trophy, AlertCircle } from "lucide-react";
import GapFillTask from "./tasks/GapFillTask";
import MCQTask from "./tasks/MCQTask";
import CompletionTask from "./tasks/CompletionTask";

export default function TaskSection({ 
    isDark, 
    podcast, 
    isFullscreen, 
    isTasksVisible, 
    setIsTasksVisible, 
    currentStep, 
    setCurrentStep, 
    answers, 
    setAnswers, 
    attempts,
    setAttempts,
    showResults, 
    setShowResults,
    initialScore,
    savePodcastResult,
    isGrouped
}) {
    const [showRetryOverlay, setShowRetryOverlay] = React.useState(false);

    const handleCheckAnswers = () => {
        const currentQuestions = podcast.questions?.filter(q => {
            if (currentStep === 1) return q.type === 'gapfill';
            if (currentStep === 2) return q.type === 'mcq';
            if (currentStep === 3) return q.type === 'completion';
            return false;
        }) || [];

        // Private/individual students: show results immediately, no warnings
        if (!isGrouped) {
            setShowResults(prev => ({ ...prev, [currentStep]: true }));
            return;
        }

        // Grouped students: 2-attempt system
        const currentAttempts = attempts[currentStep] || 0;
        const nextAttempt = currentAttempts + 1;
        
        setAttempts(prev => ({ ...prev, [currentStep]: nextAttempt }));

        let allCorrect = true;
        currentQuestions.forEach((q, idx) => {
            const answerKey = currentStep === 3 ? `completion-${q.time}-${idx}` : q.time;
            const userVal = String(answers[answerKey] || "").toLowerCase().trim();
            const correctVal = String(q.data.answer || q.data.correctIndex).toLowerCase().trim();
            if (userVal !== correctVal) allCorrect = false;
        });

        if (allCorrect || nextAttempt >= 2) {
            setShowResults(prev => ({ ...prev, [currentStep]: true }));
            
            const finishedStepsCount = Object.values({ ...showResults, [currentStep]: true }).filter(Boolean).length;
            if (finishedStepsCount === 3) {
                savePodcastResult({ ...answers });
            }
        } else {
            setShowRetryOverlay(true);
        }
    };

    const handleResetStep = () => {
        setShowResults(prev => ({ ...prev, [currentStep]: false }));
        setAttempts(prev => ({ ...prev, [currentStep]: 0 }));
        
        const questions = podcast.questions?.filter(q => {
            if (currentStep === 1) return q.type === 'gapfill';
            if (currentStep === 2) return q.type === 'mcq';
            return q.type === 'completion';
        }) || [];
        setAnswers(prev => {
            const next = { ...prev };
            questions.forEach(q => delete next[q.time]);
            return next;
        });
    };

    // Calculate score for a specific step
    const getStepScore = (stepId) => {
        const typeMap = { 1: 'gapfill', 2: 'mcq', 3: 'completion' };
        const stepQuestions = podcast.questions?.filter(q => q.type === typeMap[stepId]) || [];
        if (stepQuestions.length === 0) return null;
        let correct = 0;
        stepQuestions.forEach((q, idx) => {
            const answerKey = stepId === 3 ? `completion-${q.time}-${idx}` : q.time;
            const userVal = String(answers[answerKey] || "").toLowerCase().trim();
            const correctVal = String(q.data.answer || q.data.correctIndex).toLowerCase().trim();
            if (userVal === correctVal) correct++;
        });
        return { correct, total: stepQuestions.length, percentage: Math.round((correct / stepQuestions.length) * 100) };
    };

    return (
        <AnimatePresence>
            {(isTasksVisible || !isFullscreen) && (
                <motion.section 
                    initial={isFullscreen ? { x: 350, opacity: 0 } : false}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 350, opacity: 0 }}
                    transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
                    className={`
                        ${isFullscreen && (podcast.mediaType === 'youtube' || podcast.mediaType === 'video')
                            ? 'absolute right-0 top-0 bottom-0 w-[350px] z-30 shadow-[-20px_0_50px_rgba(0,0,0,0.3)]' 
                            : 'lg:col-span-6 relative flex flex-col'}
                        overflow-hidden flex flex-col transition-all duration-500
                        ${isFullscreen 
                            ? (isDark ? 'bg-black/5 backdrop-blur-[80px] border-l border-white/5' : 'bg-white/5 backdrop-blur-[80px] border-l border-white/20 shadow-2xl') 
                            : (isDark ? 'bg-[#121214] border-neutral-800' : 'bg-white border-zinc-100')}
                    `}
                >
                    <div className={`h-14 md:h-16 shrink-0 px-4 md:px-8 flex items-center justify-between border-b ${isFullscreen ? (isDark ? 'border-white/5' : 'border-black/5') : (isDark ? 'border-white/5' : 'border-zinc-100')}`}>
                        {!isFullscreen ? (
                            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-neutral-500' : 'text-zinc-400'}`}>
                                {currentStep === 1 ? 'Gap Filling' : currentStep === 2 ? 'Multiple Choice' : 'Sentence Completion'}
                            </h3>
                        ) : (
                            <div className="flex items-center gap-2 p-1 rounded-lg bg-white/5 border border-white/5">
                                {[
                                    { id: 1, icon: <TextCursorInput size={14} />, label: 'Gap' },
                                    { id: 2, icon: <List size={14} />, label: 'MCQ' },
                                    { id: 3, icon: <Target size={14} />, label: 'Completion' }
                                ].map((step) => (
                                    <button
                                        key={step.id}
                                        onClick={() => setCurrentStep(step.id)}
                                        className={`p-2 rounded-md transition-all flex items-center gap-2 ${
                                            currentStep === step.id 
                                                ? 'bg-emerald-600 text-white shadow-lg' 
                                                : 'text-white/40 hover:text-white hover:bg-white/5'
                                        }`}
                                        title={step.label}
                                    >
                                        {step.icon}
                                        <span className="text-[9px] font-black uppercase tracking-tighter hidden md:block">{step.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            {isFullscreen && (
                                <button 
                                    onClick={() => setIsTasksVisible(false)}
                                    className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${isDark ? 'text-neutral-500' : 'text-zinc-400'}`}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Score Cards Row */}
                    {((initialScore && isGrouped) || showResults[currentStep]) && (
                        <div className="mx-4 md:mx-6 mt-3 flex flex-col sm:flex-row gap-2 shrink-0">
                            {/* Saved Result - only for grouped */}
                            {initialScore && isGrouped && (
                                <div className={`flex-1 p-2.5 rounded-sm border flex items-center justify-between ${isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-500/20 text-emerald-700'}`}>
                                    <div className="flex items-center gap-2">
                                        <Trophy size={14} />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Locked</span>
                                            <span className="text-[12px] font-bold">{initialScore.score}/{initialScore.total}</span>
                                        </div>
                                    </div>
                                    <div className="text-[14px] font-black">{Math.round(initialScore.percentage)}%</div>
                                </div>
                            )}

                            {/* Per-Step Score */}
                            {showResults[currentStep] && (() => {
                                const score = getStepScore(currentStep);
                                if (!score) return null;
                                const stepLabel = currentStep === 1 ? 'Gap Fill' : currentStep === 2 ? 'MCQ' : 'Completion';
                                const isGood = score.percentage >= 70;
                                return (
                                    <div className={`flex-1 p-2.5 rounded-sm border flex items-center justify-between ${isGood 
                                        ? (isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                                        : (isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700')
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-7 h-7 rounded-sm flex items-center justify-center ${isGood 
                                                ? (isDark ? 'bg-emerald-500/20' : 'bg-emerald-100') 
                                                : (isDark ? 'bg-amber-500/20' : 'bg-amber-100')}`}>
                                                {isGood ? <Check size={14} strokeWidth={3} /> : <AlertCircle size={14} strokeWidth={2} />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{stepLabel}</span>
                                                <span className="text-[12px] font-bold">{score.correct}/{score.total}</span>
                                            </div>
                                        </div>
                                        <div className="text-[14px] font-black">{score.percentage}%</div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-10 p-4 md:p-6">
                        {currentStep === 1 && (
                            <GapFillTask 
                                isDark={isDark} 
                                podcast={podcast} 
                                answers={answers} 
                                setAnswers={setAnswers} 
                                showResults={showResults} 
                                attempts={attempts[1] || 0}
                            />
                        )}
                        {currentStep === 2 && (
                            <MCQTask 
                                isDark={isDark} 
                                podcast={podcast} 
                                answers={answers} 
                                setAnswers={setAnswers} 
                                showResults={showResults} 
                                attempts={attempts[2] || 0}
                            />
                        )}
                        {currentStep === 3 && (
                            <CompletionTask 
                                isDark={isDark} 
                                podcast={podcast} 
                                answers={answers} 
                                setAnswers={setAnswers} 
                                showResults={showResults} 
                                isFullscreen={isFullscreen}
                                attempts={attempts[3] || 0}
                            />
                        )}
                    </div>

                    {/* Retry Overlay - only for grouped students */}
                    <AnimatePresence>
                        {showRetryOverlay && isGrouped && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-[8px] bg-black/40 transform-gpu"
                            >
                                <motion.div 
                                    initial={{ scale: 0.98, opacity: 0, y: 5 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.98, opacity: 0, y: 5 }}
                                    className={`w-full max-w-[280px] overflow-hidden rounded-2xl border shadow-2xl transform-gpu ${isDark ? 'bg-[#1a1a1c] border-white/10' : 'bg-white border-zinc-200'}`}
                                >
                                    <div className="p-7 flex flex-col items-center text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5">
                                            <AlertCircle size={28} className="text-amber-500" strokeWidth={2} />
                                        </div>
                                        
                                        <h4 className={`text-[17px] font-black tracking-tight mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                            Diqqat!
                                        </h4>
                                        
                                        <p className={`text-[13px] leading-relaxed font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                            Ba'zi javoblaringiz xato. Ularni tuzatish uchun sizda yana <span className="text-amber-500 font-bold underline underline-offset-4 decoration-amber-500/30">oxirgi imkoniyat</span> qoldi.
                                        </p>

                                        <button 
                                            onClick={() => setShowRetryOverlay(false)}
                                            className="w-full mt-6 py-3.5 bg-amber-500 text-white font-black text-[11px] uppercase tracking-[0.1em] rounded-xl hover:bg-amber-400 transition-all active:scale-[0.97] shadow-lg shadow-amber-500/20"
                                        >
                                            Hozir tuzatish
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Task Actions Footer */}
                    <div className={`p-4 md:p-6 border-t shrink-0 flex flex-col gap-3 ${isFullscreen ? 'bg-transparent border-white/5' : (isDark ? 'bg-[#0a0a0c]/80 border-neutral-800' : 'bg-zinc-50/80 border-zinc-100')}`}>
                        {!showResults[currentStep] ? (
                            <button 
                                onClick={handleCheckAnswers}
                                className="w-full py-3 bg-emerald-600 text-white font-black text-[11px] uppercase tracking-widest rounded-sm hover:bg-emerald-500 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Check size={14} />
                                {isGrouped && attempts[currentStep] === 1 ? 'Check Final Attempt' : 'Check Answers'}
                            </button>
                        ) : (
                            <button 
                                onClick={handleResetStep}
                                className="w-full py-3 bg-rose-600 text-white font-black text-[11px] uppercase tracking-widest rounded-sm hover:bg-rose-500 transition-all shadow-lg active:scale-[0.98]"
                            >
                                Reset This Step
                            </button>
                        )}
                    </div>
                </motion.section>
            )}
        </AnimatePresence>
    );
}

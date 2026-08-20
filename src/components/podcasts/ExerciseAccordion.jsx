import React from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatTime } from "../../utils/podcastUtils";

export default function ExerciseAccordion({ exercises, openSection, setOpenSection, isDark }) {
    if (!exercises || exercises.length === 0) return null;

    return (
        <div className={`border rounded-2xl overflow-hidden transition-colors ${isDark ? 'border-white/5 bg-white/[0.04]' : 'border-warm-hairline bg-white'}`}>
            <button 
                onClick={() => setOpenSection(openSection === 'exercises' ? null : 'exercises')}
                className={`w-full px-6 py-5 flex items-center justify-between transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-warm-surface'}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-warm-primary/15 text-warm-primary' : 'bg-warm-primary/10 text-warm-primary'}`}>
                        <HelpCircle size={20} />
                    </div>
                    <div className="text-left">
                        <h2 className={`text-lg font-bold leading-none ${isDark ? 'text-warm-on-dark' : 'text-warm-ink'}`}>Interactive Exercises</h2>
                        <p className={`text-xs mt-1 ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted'}`}>{exercises.length} challenges available</p>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: openSection === 'exercises' ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ChevronDown size={20} className={isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted'} />
                </motion.div>
            </button>

            <AnimatePresence>
                {openSection === 'exercises' && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                        <div className={`px-6 pb-6 pt-2 space-y-4 border-t ${isDark ? 'border-white/5' : 'border-warm-hairline'}`}>
                            {exercises.map((ex, i) => (
                                <div key={i} className={`border rounded-xl p-5 transition-colors ${isDark ? 'bg-black/20 border-white/5 hover:border-white/10' : 'bg-warm-surface border-warm-hairline hover:border-warm-primary/40'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-warm-primary">
                                            {ex.type === 'mcq' ? 'Multiple Choice' : 'Gap-fill'}
                                        </span>
                                        <span className={`text-[10px] px-2 py-1 rounded font-mono ${isDark ? 'text-warm-on-dark-soft bg-black/40' : 'text-warm-muted bg-warm-card'}`}>
                                            {formatTime(ex.time)}
                                        </span>
                                    </div>
                                    <p className={`font-medium text-base mb-4 ${isDark ? 'text-warm-on-dark' : 'text-warm-ink'}`}>
                                        {ex.type === 'mcq' ? ex.data.question : "Listen and fill the gap"}
                                    </p>
                                    
                                    {ex.type === 'mcq' && ex.data.options && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {ex.data.options.map((opt, oIdx) => (
                                                <div key={oIdx} className={`p-3 rounded-lg text-sm border border-transparent ${isDark ? 'bg-white/5 text-warm-on-dark-soft' : 'bg-white text-warm-body border-warm-hairline'}`}>
                                                    {opt}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {ex.type === 'gapfill' && (
                                        <div className={`p-4 rounded-lg text-sm italic border-l-2 ${isDark ? 'bg-white/5 text-warm-on-dark-soft border-warm-primary/60' : 'bg-white text-warm-body border-warm-primary/60'}`}>
                                            "{ex.data.text.replace(/\{\{([^}]+)\}\}/g, '_______')}"
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

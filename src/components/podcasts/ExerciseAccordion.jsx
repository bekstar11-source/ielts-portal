import React from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatTime } from "../../utils/podcastUtils";

export default function ExerciseAccordion({ exercises, openSection, setOpenSection }) {
    if (!exercises || exercises.length === 0) return null;

    return (
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5">
            <button 
                onClick={() => setOpenSection(openSection === 'exercises' ? null : 'exercises')}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <HelpCircle size={20} />
                    </div>
                    <div className="text-left">
                        <h2 className="text-lg font-bold text-white leading-none">Interactive Exercises</h2>
                        <p className="text-xs text-[#a7a7a7] mt-1">{exercises.length} challenges available</p>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: openSection === 'exercises' ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ChevronDown size={20} className="text-[#a7a7a7]" />
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
                        <div className="px-6 pb-6 pt-2 space-y-4 border-t border-white/5">
                            {exercises.map((ex, i) => (
                                <div key={i} className="bg-black/20 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                            {ex.type === 'mcq' ? 'Multiple Choice' : 'Gap-fill'}
                                        </span>
                                        <span className="text-[10px] text-[#a7a7a7] bg-black/40 px-2 py-1 rounded font-mono">
                                            {formatTime(ex.time)}
                                        </span>
                                    </div>
                                    <p className="text-white font-medium text-base mb-4">
                                        {ex.type === 'mcq' ? ex.data.question : "Listen and fill the gap"}
                                    </p>
                                    
                                    {ex.type === 'mcq' && ex.data.options && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {ex.data.options.map((opt, oIdx) => (
                                                <div key={oIdx} className="bg-white/5 p-3 rounded-lg text-sm text-[#a7a7a7] border border-transparent">
                                                    {opt}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {ex.type === 'gapfill' && (
                                        <div className="bg-white/5 p-4 rounded-lg text-sm text-[#a7a7a7] italic border-l-2 border-emerald-500/50">
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

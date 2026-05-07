import React from "react";
import { FileText, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatTime } from "../../utils/podcastUtils";

export default function TranscriptAccordion({ transcript, openSection, setOpenSection, isDark }) {
    if (!transcript || transcript.length === 0) return null;

    return (
        <div className={`border rounded-2xl overflow-hidden transition-colors ${isDark ? 'border-white/10 bg-white/5' : 'border-zinc-200 bg-white'}`}>
            <button 
                onClick={() => setOpenSection(openSection === 'transcript' ? null : 'transcript')}
                className={`w-full px-6 py-5 flex items-center justify-between transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-50'}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>
                        <FileText size={20} />
                    </div>
                    <div className="text-left">
                        <h2 className={`text-lg font-bold leading-none ${isDark ? 'text-white' : 'text-zinc-900'}`}>Transcript / Vocabulary</h2>
                        <p className={`text-xs mt-1 ${isDark ? 'text-[#a7a7a7]' : 'text-zinc-500'}`}>Full episode text available</p>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: openSection === 'transcript' ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ChevronDown size={20} className={isDark ? 'text-[#a7a7a7]' : 'text-zinc-400'} />
                </motion.div>
            </button>

            <AnimatePresence>
                {openSection === 'transcript' && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                        <div className={`px-6 pb-8 pt-2 border-t ${isDark ? 'border-white/5' : 'border-zinc-100'}`}>
                            <div className="space-y-5 mt-4">
                                {transcript.map((v, i) => (
                                    <div key={i} className="flex gap-4 group">
                                        <div className={`text-[10px] font-mono pt-1 w-12 shrink-0 transition-colors ${isDark ? 'text-[#a7a7a7] group-hover:text-emerald-400' : 'text-zinc-400 group-hover:text-emerald-600'}`}>
                                            {formatTime(v.time)}
                                        </div>
                                        <p className={`text-[15px] leading-relaxed transition-colors ${isDark ? 'text-white/80 group-hover:text-white' : 'text-zinc-600 group-hover:text-zinc-900'}`}>
                                            {v.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

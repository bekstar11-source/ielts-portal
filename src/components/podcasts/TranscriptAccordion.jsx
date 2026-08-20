import React from "react";
import { FileText, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatTime } from "../../utils/podcastUtils";

export default function TranscriptAccordion({ transcript, openSection, setOpenSection, isDark }) {
    if (!transcript || transcript.length === 0) return null;

    return (
        <div className={`border rounded-2xl overflow-hidden transition-colors ${isDark ? 'border-white/5 bg-white/[0.04]' : 'border-warm-hairline bg-white'}`}>
            <button 
                onClick={() => setOpenSection(openSection === 'transcript' ? null : 'transcript')}
                className={`w-full px-6 py-5 flex items-center justify-between transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-warm-surface'}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-warm-primary/15 text-warm-primary' : 'bg-warm-primary/10 text-warm-primary'}`}>
                        <FileText size={20} />
                    </div>
                    <div className="text-left">
                        <h2 className={`text-lg font-bold leading-none ${isDark ? 'text-warm-on-dark' : 'text-warm-ink'}`}>Transcript / Vocabulary</h2>
                        <p className={`text-xs mt-1 ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted'}`}>Full episode text available</p>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: openSection === 'transcript' ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ChevronDown size={20} className={isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted'} />
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
                        <div className={`px-6 pb-8 pt-2 border-t ${isDark ? 'border-white/5' : 'border-warm-hairline'}`}>
                            <div className="space-y-5 mt-4">
                                {transcript.map((v, i) => (
                                    <div key={i} className="flex gap-4 group">
                                        <div className={`text-[10px] font-mono pt-1 w-12 shrink-0 transition-colors ${isDark ? 'text-warm-on-dark-soft group-hover:text-warm-primary' : 'text-warm-muted group-hover:text-warm-primary'}`}>
                                            {formatTime(v.time)}
                                        </div>
                                        <p className={`text-[15px] leading-relaxed transition-colors ${isDark ? 'text-warm-on-dark/85 group-hover:text-warm-on-dark' : 'text-warm-body group-hover:text-warm-ink'}`}>
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

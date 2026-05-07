import React from "react";
import { FileText, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatTime } from "../../utils/podcastUtils";

export default function TranscriptAccordion({ transcript, openSection, setOpenSection }) {
    if (!transcript || transcript.length === 0) return null;

    return (
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5">
            <button 
                onClick={() => setOpenSection(openSection === 'transcript' ? null : 'transcript')}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <FileText size={20} />
                    </div>
                    <div className="text-left">
                        <h2 className="text-lg font-bold text-white leading-none">Transcript / Vocabulary</h2>
                        <p className="text-xs text-[#a7a7a7] mt-1">Full episode text available</p>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: openSection === 'transcript' ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ChevronDown size={20} className="text-[#a7a7a7]" />
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
                        <div className="px-6 pb-8 pt-2 border-t border-white/5">
                            <div className="space-y-5 mt-4">
                                {transcript.map((v, i) => (
                                    <div key={i} className="flex gap-4 group">
                                        <div className="text-[10px] text-[#a7a7a7] font-mono pt-1 w-12 shrink-0 group-hover:text-emerald-400 transition-colors">
                                            {formatTime(v.time)}
                                        </div>
                                        <p className="text-[15px] text-white/80 leading-relaxed group-hover:text-white transition-colors">
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

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookMarked, ChevronDown, Volume2 } from 'lucide-react';

const speakWord = (word) => {
    if (!window.speechSynthesis || !word) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
};

export default function ArticleVocabulary({ vocabulary = [], level }) {
    const [expanded, setExpanded] = useState(true);
    const [openIndex, setOpenIndex] = useState(null);

    if (!vocabulary?.length) return null;

    return (
        <section className="mt-16 mb-8 max-w-2xl mx-auto">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center justify-between gap-4 p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#F9F9F9] dark:bg-neutral-900/50 hover:bg-[#F2F2F2] dark:hover:bg-neutral-900 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <BookMarked size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[#242424] dark:text-neutral-100 font-sans">
                            Key vocabulary{level ? ` (${level})` : ''}
                        </h3>
                        <p className="text-[13px] text-[#6B6B6B] dark:text-neutral-400 font-sans">
                            {vocabulary.length} {vocabulary.length === 1 ? 'word' : 'words'} for this level
                        </p>
                    </div>
                </div>
                <ChevronDown
                    size={20}
                    className={`text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-3 space-y-2">
                            {vocabulary.map((item, idx) => {
                                const isOpen = openIndex === idx;
                                return (
                                    <div
                                        key={`${item.word}-${idx}`}
                                        className="rounded-xl border border-black/[0.05] dark:border-white/[0.06] bg-white dark:bg-neutral-950 overflow-hidden"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setOpenIndex(isOpen ? null : idx)}
                                            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-[11px] font-bold text-gray-400 w-5 shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-[#242424] dark:text-neutral-100 font-sans">
                                                            {item.word}
                                                        </span>
                                                        {item.partOfSpeech && (
                                                            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400">
                                                                {item.partOfSpeech}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.translation && (
                                                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate font-sans">
                                                            {item.translation}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        speakWord(item.word);
                                                    }}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                                                    title="Listen"
                                                >
                                                    <Volume2 size={16} />
                                                </button>
                                                <ChevronDown
                                                    size={16}
                                                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                                />
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {isOpen && (item.definition || item.example) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden border-t border-black/[0.04] dark:border-white/[0.05]"
                                                >
                                                    <div className="px-4 py-3 pl-12 space-y-2 text-sm font-sans">
                                                        {item.definition && (
                                                            <p className="text-[#6B6B6B] dark:text-neutral-400 leading-relaxed">
                                                                {item.definition}
                                                            </p>
                                                        )}
                                                        {item.example && (
                                                            <p className="text-[#242424] dark:text-neutral-300 italic border-l-2 border-blue-500/40 pl-3">
                                                                &ldquo;{item.example}&rdquo;
                                                            </p>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}

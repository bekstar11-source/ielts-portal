import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookMarked, ChevronDown, ChevronUp, Volume2, Trash2, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

const VocabularyList = ({ 
    words, searchTerm, filterTab, 
    onDelete, onUpdateStatus, onGenerateAI, 
    playingAudioId, playPronunciation, 
    generatingId, isDark 
}) => {
    const [expandedGroup, setExpandedGroup] = useState(null);
    const [expandedWord, setExpandedWord] = useState(null);
    const { t } = useTranslation();

    const filteredWords = useMemo(() => {
        return words.filter(w => {
            const matchesSearch = (w.word && w.word.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (w.testTitle && w.testTitle.toLowerCase().includes(searchTerm.toLowerCase()));

            if (!matchesSearch) return false;
            if (filterTab === 'mastered') return w.learningStatus === 'mastered';
            if (filterTab === 'review') return w.learningStatus !== 'mastered';
            if (filterTab === 'due') {
                if (!w.nextReviewDate) return w.learningStatus !== 'mastered';
                let reviewDate = w.nextReviewDate.toDate ? w.nextReviewDate.toDate() : new Date(w.nextReviewDate);
                return reviewDate <= new Date() && w.learningStatus !== 'mastered';
            }
            return true;
        });
    }, [words, searchTerm, filterTab]);

    const groupedWords = useMemo(() => {
        return filteredWords.reduce((acc, word) => {
            const key = word.sectionTitle && word.sectionTitle !== "Noma'lum Qism"
                ? word.sectionTitle
                : (word.testTitle || t('wordbank.generalWords'));
            if (!acc[key]) acc[key] = [];
            acc[key].push(word);
            return acc;
        }, {});
    }, [filteredWords, t]);

    if (filteredWords.length === 0) {
        return (
            <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
                <BookMarked className="w-8 h-8 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">{t('wordbank.emptyWordbank')}</h3>
                <p className="text-sm text-gray-500">{t('wordbank.emptyWordbankDesc')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {Object.entries(groupedWords).map(([testTitle, testWords]) => {
                const isTestExpanded = expandedGroup === testTitle;
                return (
                    <div key={testTitle} className={`rounded-2xl border transition-all overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                        <button 
                            onClick={() => setExpandedGroup(isTestExpanded ? null : testTitle)}
                            className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isTestExpanded ? (isDark ? 'bg-white/5' : 'bg-white border-b border-gray-100') : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5 text-blue-500' : 'bg-white text-blue-500 shadow-sm'}`}>
                                    <BookMarked className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">{testTitle}</h3>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{t('wordbank.newWordsCount').replace('{count}', testWords.length)}</p>
                                </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isTestExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isTestExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {testWords.map((item, index) => {
                                            const isItemExpanded = expandedWord === item.id;
                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, scale: 0.98 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: index * 0.02 }}
                                                    className={`p-4 rounded-xl border transition-all group relative ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 hover:shadow-sm'}`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <h3 className="font-bold text-base truncate">{item.word}</h3>
                                                                {item.learningStatus === 'mastered' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                                                            </div>
                                                            <p className="text-xs text-gray-500 truncate">{item.translation || t('wordbank.noTranslation')}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button onClick={() => playPronunciation(item.id, item.word)} className={`p-2 rounded-lg transition-all ${playingAudioId === item.id ? 'bg-[#FB5102]/10 text-[#FB5102]' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                                                                <Volume2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => { if(window.confirm(t('wordbank.confirmDelete'))) onDelete(item.id); }} className="p-2 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    const nextExpanded = isItemExpanded ? null : item.id;
                                                                    setExpandedWord(nextExpanded);
                                                                    if (nextExpanded && !item.hasAI) onGenerateAI(item);
                                                                }} 
                                                                className={`p-2 rounded-lg transition-colors ${isItemExpanded ? 'bg-[#FB5102] text-white' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                                                            >
                                                                {isItemExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <AnimatePresence>
                                                        {isItemExpanded && (
                                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3 pt-3 border-t border-gray-50 dark:border-white/5">
                                                                {!item.hasAI ? (
                                                                    <div className="space-y-3">
                                                                        <button onClick={() => onGenerateAI(item)} disabled={generatingId === item.id} className="w-full flex items-center justify-center gap-2 py-2 bg-[#FB5102]/10 text-[#FB5102] hover:bg-[#FB5102] hover:text-white transition-all rounded-lg text-xs font-bold">
                                                                            {generatingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                                            <span>{generatingId === item.id ? t('wordbank.analyzing') : t('wordbank.getAIInsights')}</span>
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-3">
                                                                        <div>
                                                                            <span className="text-[9px] uppercase font-bold text-[#FB5102] tracking-wider">{t('wordbank.definition')}</span>
                                                                            <p className="text-xs mt-1 leading-relaxed text-gray-600 dark:text-gray-300">{item.definition}</p>
                                                                        </div>
                                                                        {item.example && (
                                                                          <div className="p-3 rounded-lg bg-[#f5f5f7] dark:bg-black/20 italic text-xs text-gray-500 border-l-2 border-[#FB5102]/30">
                                                                              "{item.example}"
                                                                          </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
};

export default VocabularyList;

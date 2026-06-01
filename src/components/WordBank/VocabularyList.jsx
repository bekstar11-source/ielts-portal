import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookMarked, ChevronDown, ChevronUp, Volume2, Trash2, Sparkles, Loader2, CheckCircle2, Download } from 'lucide-react';
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

    const handleExportGroupPDF = (e, groupTitle, groupWords) => {
        e.stopPropagation();
        if (!groupWords || groupWords.length === 0) return;
        
        const printWindow = window.open('', '_blank');
        const docTitle = `${groupTitle} - Lug'at (WordBank)`;
        
        const rowsHtml = groupWords.map((w) => `
            <tr>
                <td style="font-weight: bold; width: 25%; font-size: 14px;">${w.word}</td>
                <td style="color: #fb5102; font-style: italic; width: 15%; font-size: 11px; font-weight: bold; text-transform: uppercase;">${w.partOfSpeech || 'noun'}</td>
                <td style="width: 25%; font-size: 13px;">${w.translation || ''}</td>
                <td style="width: 35%; font-size: 12px; color: #374151;">
                    ${w.definition ? `<strong>Def:</strong> ${w.definition}<br/>` : ''}
                    ${w.example ? `<span style="font-style: italic; color: #6b7280; font-size: 11px;">"${w.example}"</span>` : ''}
                </td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>${docTitle}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1f2937; }
                        .header-table { width: 100%; border-bottom: 2px solid #fb5102; padding-bottom: 15px; margin-bottom: 30px; }
                        h1 { font-size: 24px; color: #111827; margin: 0; }
                        p.subtitle { font-size: 12px; color: #6b7280; margin: 5px 0 0 0; }
                        table.vocab-table { width: 100%; border-collapse: collapse; }
                        th, td { border-bottom: 1px solid #e5e7eb; padding: 12px 15px; text-align: left; vertical-align: top; }
                        th { background-color: #f9fafb; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #4b5563; letter-spacing: 0.05em; border-top: 1px solid #e5e7eb; }
                        tr:nth-child(even) { background-color: #fafafa; }
                    </style>
                </head>
                <body>
                    <table class="header-table">
                        <tr>
                            <td>
                                <h1>Englev WordBank - ${groupTitle}</h1>
                                <p class="subtitle">Tanlangan guruh bo'yicha so'zlar ro'yxati</p>
                            </td>
                            <td style="text-align: right; vertical-align: bottom; font-size: 12px; color: #6b7280;">
                                Sana: ${new Date().toLocaleDateString()}<br/>
                                Jami so'zlar: ${groupWords.length} ta
                            </td>
                        </tr>
                    </table>
                    <table class="vocab-table">
                        <thead>
                            <tr>
                                <th>So'z</th>
                                <th>So'z turkumi</th>
                                <th>Tarjimasi</th>
                                <th>Ta'rifi va Misol</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        }
                    </script>
                </body>
           </html>
        `);
        printWindow.document.close();
    };

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
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(e) => handleExportGroupPDF(e, testTitle, testWords)}
                                    className={`p-2 px-3 rounded-xl border flex items-center gap-1.5 text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]
                                        ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm'}`}
                                >
                                    <Download className="w-3.5 h-3.5 text-[#FB5102]" />
                                    <span className="hidden sm:inline">PDF Yuklash</span>
                                </button>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isTestExpanded ? 'rotate-180' : ''}`} />
                            </div>
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
                                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3 pt-3 border-t border-gray-100 dark:border-white/5 space-y-3">
                                                                {!item.hasAI ? (
                                                                    <div className="space-y-3">
                                                                        <button onClick={() => onGenerateAI(item)} disabled={generatingId === item.id} className="w-full flex items-center justify-center gap-2 py-2 bg-[#FB5102]/10 text-[#FB5102] hover:bg-[#FB5102] hover:text-white transition-all rounded-lg text-xs font-bold">
                                                                            {generatingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                                            <span>{generatingId === item.id ? t('wordbank.analyzing') : t('wordbank.getAIInsights')}</span>
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-3 text-left">
                                                                        {/* Phonetics and Part of Speech */}
                                                                        {(item.phonetics || item.partOfSpeech) && (
                                                                            <div className="flex items-center gap-2">
                                                                                {item.partOfSpeech && (
                                                                                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-500/10 dark:bg-white/10 text-gray-500 dark:text-gray-300">
                                                                                        {item.partOfSpeech}
                                                                                    </span>
                                                                                )}
                                                                                {item.phonetics && (
                                                                                    <span className="text-xs text-gray-400 font-mono">
                                                                                        {item.phonetics}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Definition */}
                                                                        <div>
                                                                            <span className="text-[9px] uppercase font-bold text-[#FB5102] tracking-wider block mb-0.5">{t('wordbank.definition')}</span>
                                                                            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{item.definition}</p>
                                                                        </div>

                                                                        {/* Example */}
                                                                        {item.example && (
                                                                            <div className="p-2.5 rounded-lg bg-[#f5f5f7] dark:bg-black/20 italic text-xs text-gray-500 dark:text-gray-400 border-l-2 border-[#FB5102]/30">
                                                                                "{item.example}"
                                                                            </div>
                                                                        )}

                                                                        {/* Synonyms & Antonyms */}
                                                                        <div className="grid grid-cols-2 gap-3 pt-1">
                                                                            {item.synonyms && (Array.isArray(item.synonyms) ? item.synonyms : typeof item.synonyms === 'string' ? item.synonyms.split(',').map(s => s.trim()) : []).length > 0 && (
                                                                                <div>
                                                                                    <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Sinonimlar</span>
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {(Array.isArray(item.synonyms) ? item.synonyms : item.synonyms.split(',')).slice(0, 3).map((syn, idx) => (
                                                                                            <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/5 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/10 font-medium">
                                                                                                {syn.trim()}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {item.antonyms && (Array.isArray(item.antonyms) ? item.antonyms : typeof item.antonyms === 'string' ? item.antonyms.split(',').map(s => s.trim()) : []).length > 0 && (
                                                                                <div>
                                                                                    <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Antonimlar</span>
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {(Array.isArray(item.antonyms) ? item.antonyms : item.antonyms.split(',')).slice(0, 3).map((ant, idx) => (
                                                                                            <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/5 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10 font-medium">
                                                                                                {ant.trim()}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Collocations */}
                                                                        {item.collocations && (Array.isArray(item.collocations) ? item.collocations : typeof item.collocations === 'string' ? item.collocations.split(',').map(s => s.trim()) : []).length > 0 && (
                                                                            <div className="pt-1">
                                                                                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Birikmalar (Collocations)</span>
                                                                                <div className="space-y-0.5">
                                                                                    {(Array.isArray(item.collocations) ? item.collocations : item.collocations.split(',')).slice(0, 3).map((col, idx) => (
                                                                                        <p key={idx} className="text-xs italic text-gray-500 dark:text-gray-400">
                                                                                            • "{col.trim()}"
                                                                                        </p>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Pronunciation Speed Selector */}
                                                                        <div className="flex items-center justify-between p-2 rounded-xl dark:bg-black/25 bg-[#f5f5f7] border dark:border-white/5 border-gray-150 mt-2">
                                                                            <span className="text-[10px] font-bold text-gray-500">Talaffuz tezligi:</span>
                                                                            <div className="flex gap-1">
                                                                                <button 
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        playPronunciation(item.id, item.word, 0.95);
                                                                                    }}
                                                                                    className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all
                                                                                        ${(playingAudioId === item.id) 
                                                                                            ? 'bg-[#FB5102] text-white' 
                                                                                            : isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-white hover:bg-gray-50 text-gray-700 shadow-sm border border-gray-250'}`}
                                                                                >
                                                                                    Normal (1.0x)
                                                                                </button>
                                                                                <button 
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        playPronunciation(item.id, item.word, 0.65);
                                                                                    }}
                                                                                    className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all
                                                                                        ${(playingAudioId === item.id + '_slow') 
                                                                                            ? 'bg-[#FB5102] text-white' 
                                                                                            : isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-white hover:bg-gray-50 text-gray-700 shadow-sm border border-gray-250'}`}
                                                                                >
                                                                                    Sekin (0.7x)
                                                                                </button>
                                                                            </div>
                                                                        </div>
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

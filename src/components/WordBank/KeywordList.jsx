import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown, Trash2 } from 'lucide-react';

const KeywordList = ({ keywords, searchTerm, onDelete, isDark }) => {
    const [expandedGroup, setExpandedGroup] = useState(null);

    const filteredKeywords = useMemo(() => {
        return keywords.filter(k => {
            if (!searchTerm) return true;
            const s = searchTerm.toLowerCase();
            return (k.passageWord && k.passageWord.toLowerCase().includes(s)) || (k.questionWord && k.questionWord.toLowerCase().includes(s));
        });
    }, [keywords, searchTerm]);

    const groupedKeywords = useMemo(() => {
        return filteredKeywords.reduce((acc, kw) => {
            const key = kw.testName || "Unknown Test";
            if (!acc[key]) acc[key] = [];
            acc[key].push(kw);
            return acc;
        }, {});
    }, [filteredKeywords]);

    if (filteredKeywords.length === 0) {
        return (
            <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
                <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">No keywords yet</h3>
                <p className="text-sm text-gray-500">Keywords you highlight in reading tests will appear here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {Object.entries(groupedKeywords).map(([testName, kwList]) => {
                const isExpanded = expandedGroup === testName;
                return (
                    <div key={testName} className={`rounded-2xl border transition-all overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                        <button 
                            onClick={() => setExpandedGroup(isExpanded ? null : testName)}
                            className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isExpanded ? (isDark ? 'bg-white/5' : 'bg-white border-b border-gray-100') : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5 text-[#FB5102]' : 'bg-white text-[#FB5102] shadow-sm'}`}>
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">{testName}</h3>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{kwList.length} keywords</p>
                                </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="p-2">
                                        <div className={`overflow-x-auto rounded-xl ${isDark ? 'bg-black/20' : 'bg-white'}`}>
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className={`text-[10px] font-bold uppercase tracking-wider text-gray-400 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                                        <th className="text-left py-3 px-5">Passage Word</th>
                                                        <th className="text-center py-3 px-5">Type</th>
                                                        <th className="text-left py-3 px-5">Question Word</th>
                                                        <th className="text-right py-3 px-5"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                                    {kwList.map(kw => (
                                                        <tr key={kw.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                            <td className="py-3 px-5 font-semibold">{kw.passageWord}</td>
                                                            <td className="py-3 px-5 text-center">
                                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${kw.type === 'synonym' ? 'bg-emerald-500/10 text-emerald-500' : kw.type === 'antonym' ? 'bg-[#FB5102]/10 text-[#FB5102]' : 'bg-blue-500/10 text-blue-500'}`}>
                                                                    {kw.type === 'synonym' ? 'SYN' : kw.type === 'antonym' ? 'ANT' : 'PHR'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-5 text-gray-500">{kw.questionWord}</td>
                                                            <td className="py-3 px-5 text-right">
                                                                <button onClick={() => onDelete(kw.id)} className="p-1.5 rounded-md text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all sm:opacity-0 sm:group-hover:opacity-100">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
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

export default KeywordList;

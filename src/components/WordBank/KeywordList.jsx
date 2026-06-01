import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown, Trash2, Download } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

const KeywordList = ({ keywords, searchTerm, onDelete, isDark }) => {
    const [expandedGroup, setExpandedGroup] = useState(null);
    const { t } = useTranslation();

    const handleExportGroupPDF = (e, groupTitle, groupKws) => {
        e.stopPropagation();
        if (!groupKws || groupKws.length === 0) return;
        
        const printWindow = window.open('', '_blank');
        const docTitle = `${groupTitle} - Kalit so'zlar (Keywords)`;
        
        const rowsHtml = groupKws.map((k) => `
            <tr>
                <td style="font-weight: bold; width: 35%; font-size: 14px;">${k.passageWord}</td>
                <td style="color: #fb5102; font-style: italic; width: 20%; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                    ${k.type === 'synonym' ? 'SYN' : k.type === 'antonym' ? 'ANT' : 'PHR'}
                </td>
                <td style="width: 45%; font-size: 13px;">${k.questionWord}</td>
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
                                <h1>Englev Kalit so'zlar - ${groupTitle}</h1>
                                <p class="subtitle">Tanlangan test bo'yicha sinonim/antonimlar</p>
                            </td>
                            <td style="text-align: right; vertical-align: bottom; font-size: 12px; color: #6b7280;">
                                Sana: ${new Date().toLocaleDateString()}<br/>
                                Jami: ${groupKws.length} ta
                            </td>
                        </tr>
                    </table>
                    <table class="vocab-table">
                        <thead>
                            <tr>
                                <th>Matndagi so'z (Passage Word)</th>
                                <th>Turi (Type)</th>
                                <th>Savoldagi so'z (Question Word)</th>
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

    const filteredKeywords = useMemo(() => {
        return keywords.filter(k => {
            if (!searchTerm) return true;
            const s = searchTerm.toLowerCase();
            return (k.passageWord && k.passageWord.toLowerCase().includes(s)) || (k.questionWord && k.questionWord.toLowerCase().includes(s));
        });
    }, [keywords, searchTerm]);

    const groupedKeywords = useMemo(() => {
        return filteredKeywords.reduce((acc, kw) => {
            const key = kw.testName || t('wordbank.unknownTest');
            if (!acc[key]) acc[key] = [];
            acc[key].push(kw);
            return acc;
        }, {});
    }, [filteredKeywords, t]);

    if (filteredKeywords.length === 0) {
        return (
            <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
                <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">{t('wordbank.noKeywords')}</h3>
                <p className="text-sm text-gray-500">{t('wordbank.noKeywordsDesc')}</p>
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
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{t('wordbank.keywordsCount').replace('{count}', kwList.length)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(e) => handleExportGroupPDF(e, testName, kwList)}
                                    className={`p-2 px-3 rounded-xl border flex items-center gap-1.5 text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]
                                        ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm'}`}
                                >
                                    <Download className="w-3.5 h-3.5 text-[#FB5102]" />
                                    <span className="hidden sm:inline">PDF Yuklash</span>
                                </button>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </button>
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="p-2">
                                        <div className={`overflow-x-auto rounded-xl ${isDark ? 'bg-black/20' : 'bg-white'}`}>
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className={`text-[10px] font-bold uppercase tracking-wider text-gray-400 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                                        <th className="text-left py-3 px-5">{t('wordbank.passageWord')}</th>
                                                        <th className="text-center py-3 px-5">{t('wordbank.type')}</th>
                                                        <th className="text-left py-3 px-5">{t('wordbank.questionWord')}</th>
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

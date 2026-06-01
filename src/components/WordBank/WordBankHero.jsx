import React from 'react';
import { Sparkles, ArrowUpRight, BrainCircuit, Layers, Gamepad2, FileText, Download } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

const WordBankHero = ({ 
    wordsCount, todayAddedCount, dueForReviewCount,
    setFilterTab, setPracticeMode, onExportPDF,
    isDark 
}) => {
    const { t } = useTranslation();

    const learningModules = [
        { 
          title: t('wordbank.review'), 
          desc: t('wordbank.spacedRepetition'), 
          icon: <BrainCircuit className="w-5 h-5" />, 
          stats: `${dueForReviewCount} ${t('wordbank.due')}`,
          isPrimary: true,
          onClick: () => {
              setFilterTab('due');
              setPracticeMode('flashcards');
          }
        },
        { 
          title: t('wordbank.flashcards'), 
          desc: t('wordbank.studyAll'), 
          icon: <Layers className="w-5 h-5" />, 
          stats: t('wordbank.newWordsCount').replace('{count}', wordsCount),
          onClick: () => {
              setFilterTab('all');
              setPracticeMode('flashcards');
          }
        },
        { 
          title: "Quiz Testi", 
          desc: "4 variantli mashq", 
          icon: <FileText className="w-5 h-5" />, 
          stats: "Boshlash",
          onClick: () => {
              setPracticeMode('quiz');
          }
        },
        { 
          title: t('wordbank.matchGame'), 
          desc: t('wordbank.testSpeed'), 
          icon: <Gamepad2 className="w-5 h-5" />, 
          stats: t('wordbank.playNow'),
          onClick: () => {
              setPracticeMode('match');
          }
        }
    ];

    return (
        <div className="w-full">
            {/* Hero Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#FB5102]/10 rounded-full border border-[#FB5102]/20">
                        <Sparkles className="w-3 h-3 text-[#FB5102]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#FB5102]">{t('wordbank.personalLexicon')}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">{t('wordbank.title')}</h1>
                    <p className={`text-base max-w-xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {t('wordbank.subtitle')}
                    </p>
                </div>

                <div className="flex items-center gap-6 pb-1">
                    <button 
                        onClick={onExportPDF}
                        disabled={wordsCount === 0}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all mr-2 hover:scale-[1.02] active:scale-[0.98]
                            ${wordsCount === 0 ? 'opacity-40 cursor-not-allowed' : ''}
                            ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm'}`}
                    >
                        <Download className="w-3.5 h-3.5 text-[#FB5102]" />
                        <span>PDF Eksport</span>
                    </button>
                    <div className="text-right">
                        <p className="text-2xl font-semibold">{wordsCount}</p>
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{t('wordbank.totalWords')}</p>
                    </div>
                    <div className={`h-8 w-[1px] ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                    <div className="text-right">
                        <p className="text-2xl font-semibold text-[#FB5102]">+{todayAddedCount}</p>
                        <p className="text-[10px] uppercase tracking-widest text-[#FB5102]/70 font-bold">{t('wordbank.today')}</p>
                    </div>
                </div>
            </div>

            {/* Modules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
                {learningModules.map((module, idx) => (
                    <button 
                        key={idx}
                        onClick={module.onClick}
                        className={`group p-5 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden
                        ${module.isPrimary 
                          ? 'bg-[#1d1d1f] text-white border-transparent hover:bg-black' 
                          : isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-[#f5f5f7] border-transparent hover:bg-gray-200'}`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110
                            ${module.isPrimary ? 'bg-white/10' : isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                                {module.icon}
                            </div>
                            <ArrowUpRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${module.isPrimary ? 'text-white/40' : 'text-gray-400'}`} />
                        </div>
                        <h3 className="font-semibold text-lg">{module.title}</h3>
                        <p className={`text-xs ${module.isPrimary ? 'text-white/60' : 'text-gray-500'}`}>{module.desc}</p>
                        <div className={`mt-4 inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                        ${module.isPrimary ? 'bg-white/10 text-white' : isDark ? 'bg-white/10 text-gray-300' : 'bg-white text-gray-600 shadow-sm'}`}>
                            {module.stats}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WordBankHero;

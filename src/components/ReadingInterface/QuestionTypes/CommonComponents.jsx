import React from "react";
import { Lock, Zap } from 'lucide-react';

// --- UTILS ---
export const stripRomanNumerals = (text) => {
    if (!text || typeof text !== 'string') return text;
    const regex = /^([ivx\d]+)[\.\)\s]+(.*)$/i;
    const match = text.trim().match(regex);
    if (match && match[2]) {
        return match[2].trim();
    }
    return text.trim();
};

export const cleanStr = (s) => String(s || "").trim().toLowerCase();

export const cleanQuestionText = (text) => {
    if (!text) return "";
    return String(text)
        .replace(/(?:and\s+)?\d+\s+Choose\s+(?:ONE|TWO|THREE|FOUR|FIVE)\s+letters?,?\s*([A-Z]-[A-Z–])?/gi, '')
        .replace(/(?:Choose\s+the\s+correct\s+letter,?\s*(?:[A-Z](?:,\s*[A-Z])*\s*or\s*[A-Z]|[A-Z]-[A-Z]|[A-Z])\.?)/gi, '')
        .replace(/Write (?:your |the correct )?[^.]+?[\s]*in boxes? [\d\s\-–,and]+ on (?:your |the )?answer sheet\.?/gi, '')
        .replace(/<(b|strong)>\s*\d{1,2}\s*<\/\1>/gi, '')
        .replace(/^\s*\d{1,2}[\.\s]*/g, '')
        .trim();
};

export const cleanExplanation = (text) => {
    if (!text) return "";
    return String(text)
        .replace(/(?:and\s+)?\d+\s+Choose\s+(?:ONE|TWO|THREE|FOUR|FIVE)\s+letters?,?\s*([A-Z]-[A-Z–])?/gi, '')
        .replace(/(?:Choose\s+the\s+correct\s+letter,?\s*(?:[A-Z](?:,\s*[A-Z])*\s*or\s*[A-Z]|[A-Z]-[A-Z]|[A-Z])\.?)/gi, '')
        .replace(/Write (?:your |the correct )?[^.]+?[\s]*in boxes? [\d\s\-–,and]+ on (?:your |the )?answer sheet\.?/gi, '')
        .trim();
};

export const expandQuestionIds = (id) => {
    const idStr = String(id);
    if (idStr.includes('-') || idStr.includes('–') || idStr.includes('_')) {
        const parts = idStr.split(/[\-–_]/);
        if (parts.length === 2) {
            const start = parseInt(parts[0].trim());
            const end = parseInt(parts[1].trim());
            if (!isNaN(start) && !isNaN(end)) {
                const result = [];
                const min = Math.min(start, end);
                const max = Math.max(start, end);
                for (let i = min; i <= max; i++) result.push(String(i));
                return result;
            }
        }
    }
    return idStr.split(',').map(s => s.trim()).filter(Boolean);
};

export const getOptionValue = (text) => {
    if (!text) return "";
    const match = String(text).match(/^([A-Z]|[ivxIVX]+)[\.\)\s]/);
    return match ? match[1].trim() : text;
};

export const checkAnswer = (userVal, correctVal) => {
    if (!userVal || !correctVal) return false;
    const userClean = String(userVal).trim().toLowerCase();
    const correctOptions = String(correctVal).split('/').map(opt => opt.trim().toLowerCase());
    return correctOptions.includes(userClean);
};

// --- COMPONENTS ---

export const QuestionExplanation = ({ text, isPremium, titleId }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [lang, setLang] = React.useState('uz');

    if (!text) return null;
    
    const isObject = typeof text === 'object' && text !== null;
    let cleanedEn = "";
    let cleanedUz = "";

    if (isObject) {
        cleanedEn = cleanExplanation(text.en);
        cleanedUz = cleanExplanation(text.uz);
    } else {
        const str = String(text);
        if (str.includes("English:") && str.includes("Uzbek:")) {
            const parts = str.split("Uzbek:");
            cleanedEn = cleanExplanation(parts[0].replace("English:", "").trim());
            cleanedUz = cleanExplanation(parts[1].trim());
        } else if (str.includes("Uzbek:") && !str.includes("English:")) {
            cleanedUz = cleanExplanation(str.replace("Uzbek:", "").trim());
        } else if (str.includes("English:") && !str.includes("Uzbek:")) {
            cleanedEn = cleanExplanation(str.replace("English:", "").trim());
        } else {
            cleanedEn = cleanExplanation(str);
        }
    }

    if (!cleanedEn && !cleanedUz) return null;

    if (!isPremium) {
        return (
            <div className="mt-3 p-4 bg-[#F5F5F7] border border-gray-100 rounded-sm relative overflow-hidden group">
                <div className="flex items-center gap-2 mb-2 text-[#86868B] font-bold uppercase tracking-widest text-[10px]">
                    <Lock size={12} className="shrink-0" />
                    Explanation (Locked)
                </div>
                <div className="filter blur-sm select-none opacity-40 text-xs line-clamp-2" dangerouslySetInnerHTML={{ __html: cleanedEn || cleanedUz }} />
                <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-[1px]">
                    <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-pricing'))}
                        className="bg-white/90 border border-gray-200 px-4 py-2 rounded-sm text-[11px] font-bold text-[#0071E3] shadow-sm hover:scale-105 transition-all flex items-center gap-1.5"
                    >
                        <Zap size={12} fill="currentColor" />
                        Unlock Detailed Analysis
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className={`mt-2 transition-all duration-300 ease-out ${isOpen ? 'bg-sky-50/60 border border-sky-100 rounded-sm shadow-sm' : ''}`}>
            <div className="flex items-center gap-3 px-1 pt-1">
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-sm border transition-all duration-300
                        ${isOpen 
                            ? 'bg-sky-100 border-sky-200 text-sky-700 w-auto shadow-sm' 
                            : 'bg-sky-50/50 border-sky-100 text-sky-600 hover:border-sky-300 hover:text-sky-700 hover:bg-sky-100/50'
                        }
                    `}
                >
                    <span className="text-[12px] font-semibold">
                        {titleId ? `Q${titleId} Explanation` : 'Explanation'}
                    </span>
                    <svg className={`w-3 h-3 transition-transform duration-500 ease-in-out ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isOpen && cleanedEn && cleanedUz && (
                    <div className="flex bg-gray-200/50 p-0.5 rounded-sm border border-gray-300/30 animate-in fade-in slide-in-from-left-2 duration-300">
                        <button 
                            onClick={() => setLang('en')}
                            className={`px-3 py-1 rounded-sm text-[9px] font-black tracking-tight transition-all duration-200 ${lang === 'en' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            ENG
                        </button>
                        <button 
                            onClick={() => setLang('uz')}
                            className={`px-3 py-1 rounded-sm text-[9px] font-black tracking-tight transition-all duration-200 ${lang === 'uz' ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            UZB
                        </button>
                    </div>
                )}
            </div>
            
            <div className={`
                grid transition-all duration-500 ease-in-out
                ${isOpen ? 'grid-rows-[1fr] opacity-100 p-4 pt-2' : 'grid-rows-[0fr] opacity-0 p-0 pointer-events-none'}
            `}>
                <div className="overflow-hidden">
                    <div className="space-y-4">
                        {((lang === 'uz' && cleanedUz) || (!cleanedEn && cleanedUz)) && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                                {!cleanedEn && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-px flex-1 bg-sky-100"></div>
                                        <span className="text-[10px] font-bold text-sky-400 tracking-wide uppercase">O'zbekcha</span>
                                        <div className="h-px flex-1 bg-sky-100"></div>
                                    </div>
                                )}
                                <div className="text-gray-800 text-[14px] leading-relaxed selection:bg-sky-100" dangerouslySetInnerHTML={{ __html: cleanedUz }} />
                            </div>
                        )}
                        
                        {((lang === 'en' && cleanedEn) || (!cleanedUz && cleanedEn)) && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                                {!cleanedUz && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-px flex-1 bg-gray-100"></div>
                                        <span className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">English</span>
                                        <div className="h-px flex-1 bg-gray-100"></div>
                                    </div>
                                )}
                                <div className="text-gray-800 text-[14px] leading-relaxed selection:bg-sky-100" dangerouslySetInnerHTML={{ __html: cleanedEn }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const QuestionBadge = ({ id, isReviewMode, onClick, isCorrect }) => {
    let baseClass = "min-w-[20px] w-fit h-[24px] flex items-center justify-center text-[15px] font-bold shrink-0 unselectable transition-colors mt-0.5";
    
    let stateClass = "text-gray-900";
    if (isReviewMode) {
        stateClass = isCorrect 
            ? "text-green-600" 
            : "text-red-600";
    }

    return (
        <div 
            className={`${baseClass} ${stateClass} ${isReviewMode ? 'cursor-pointer hover:border-ielts-blue hover:text-ielts-blue' : 'cursor-default'}`} 
            onClick={onClick}
        >
            {id}
        </div>
    );
};

export const ReadingTextInput = ({ 
    id, value, answer, onChange, isReviewMode, isCorrect 
}) => {
    let inputBorderClass = "border-black focus:border-black focus:ring-black";
    let textClass = "text-black";

    if (isReviewMode) {
        if (isCorrect) {
            inputBorderClass = "border-green-500 bg-green-50 text-green-700 font-bold";
            textClass = "text-green-700";
        } else {
            inputBorderClass = "border-red-500 bg-red-50 text-red-700 font-bold";
            textClass = "text-red-700";
        }
    }

    return (
        <span className="inline-flex items-center align-middle whitespace-nowrap relative">
            <input
                className={`w-[145px] h-[26px] border rounded px-1 text-center font-semibold text-sm focus:outline-none focus:ring-1 transition-all bg-white disabled:bg-opacity-50 ${inputBorderClass} ${textClass} placeholder-black`}
                value={value}
                placeholder={!isReviewMode ? String(id) : ""}
                onChange={(e) => onChange(id, e.target.value)}
                disabled={isReviewMode}
                autoComplete="off"
                spellCheck={false}
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            />
            {isReviewMode && !isCorrect && (
                <span className="ml-1 text-[13px] font-bold text-green-600 bg-green-100 px-1 py-0.5 rounded border border-green-200 whitespace-nowrap">
                    ✓ {answer}
                </span>
            )}
        </span>
    );
};

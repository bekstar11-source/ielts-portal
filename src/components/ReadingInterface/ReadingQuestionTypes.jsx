import React from "react";
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Lock, Zap } from 'lucide-react';
import HighlightableText from './HighlightableText';
import { injectKeywordsToHTML } from '../../utils/highlightUtils';

// --- UTILS ---
const stripRomanNumerals = (text) => {
    if (!text || typeof text !== 'string') return text;
    // Rim raqamlarini (i, ii, iii, iv, v, vi, vii, viii, ix, x) 
    // yoki oddiy raqamlarni (1, 2, 3) va ulardan keyingi nuqta/joyni olib tashlaydi
    const regex = /^([ivx\d]+)[\.\)\s]+(.*)$/i;
    const match = text.trim().match(regex);
    if (match && match[2]) {
        return match[2].trim();
    }
    return text.trim();
};

const cleanStr = (s) => String(s || "").trim().toLowerCase();

const cleanQuestionText = (text) => {
    if (!text) return "";
    return String(text)
        .replace(/(?:and\s+)?\d+\s+Choose\s+(?:ONE|TWO|THREE|FOUR|FIVE)\s+letters?,?\s*([A-Z]-[A-Z–])?/gi, '')
        .replace(/(?:Choose\s+the\s+correct\s+letter,?\s*(?:[A-Z](?:,\s*[A-Z])*\s*or\s*[A-Z]|[A-Z]-[A-Z]|[A-Z])\.?)/gi, '')
        .replace(/Write (?:your |the correct )?[^.]+?[\s]*in boxes? [\d\s\-–,and]+ on (?:your |the )?answer sheet\.?/gi, '')
        .replace(/<(b|strong)>\s*\d+\s*<\/\1>/gi, '') // remove bolded numbers
        .replace(/^\s*\d+[\.\s]*/g, '') // remove pure leading number with dots or spaces
        .trim();
};

const cleanExplanation = (text) => {
    if (!text) return "";
    return String(text)
        .replace(/(?:and\s+)?\d+\s+Choose\s+(?:ONE|TWO|THREE|FOUR|FIVE)\s+letters?,?\s*([A-Z]-[A-Z–])?/gi, '')
        .replace(/(?:Choose\s+the\s+correct\s+letter,?\s*(?:[A-Z](?:,\s*[A-Z])*\s*or\s*[A-Z]|[A-Z]-[A-Z]|[A-Z])\.?)/gi, '')
        .replace(/Write (?:your |the correct )?[^.]+?[\s]*in boxes? [\d\s\-–,and]+ on (?:your |the )?answer sheet\.?/gi, '')
        .trim();
};

export const QuestionExplanation = ({ text, isPremium, titleId }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    if (!text) return null;
    
    const isObject = typeof text === 'object' && text !== null;
    const hasContent = isObject ? (text.en || text.uz) : text;
    if (!hasContent) return null;

    const cleanedEn = isObject ? cleanExplanation(text.en) : cleanExplanation(text);
    const cleanedUz = isObject ? cleanExplanation(text.uz) : "";

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
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-sm border transition-all duration-300
                    ${isOpen 
                        ? 'bg-sky-100 border-sky-200 text-sky-700 w-auto ml-1 mt-1 shadow-sm' 
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
            
            <div className={`
                grid transition-all duration-500 ease-in-out
                ${isOpen ? 'grid-rows-[1fr] opacity-100 p-4' : 'grid-rows-[0fr] opacity-0 p-0 pointer-events-none'}
            `}>
                <div className="overflow-hidden">
                    <div className="space-y-4">
                        {cleanedUz && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-px flex-1 bg-sky-100"></div>
                                    <span className="text-[10px] font-bold text-sky-400 tracking-wide">O'zbekcha tushuntirish</span>
                                    <div className="h-px flex-1 bg-sky-100"></div>
                                </div>
                                <div className="text-gray-800 text-[13.5px] leading-relaxed selection:bg-sky-100" dangerouslySetInnerHTML={{ __html: cleanedUz }} />
                            </div>
                        )}
                        {cleanedEn && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-500">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-px flex-1 bg-gray-100"></div>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-wide">English Explanation</span>
                                    <div className="h-px flex-1 bg-gray-100"></div>
                                </div>
                                <div className={`${cleanedUz ? 'text-gray-600 text-[12.5px]' : 'text-gray-800 text-[13.5px]'} leading-relaxed selection:bg-sky-100`} dangerouslySetInnerHTML={{ __html: cleanedEn }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MATCHING HEADINGS DND KOMPONENTLARI ---

export const ReadingDraggableHeading = ({ label, text, isUsed, isReviewMode }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `reading-heading-${label}`,
        disabled: isUsed || isReviewMode,
        data: { label, text }
    });

    const cleanText = stripRomanNumerals(text);

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`
                px-3 py-2 border select-none flex items-start gap-3 w-full rounded-none
                transition-all duration-150 group/heading
                ${isDragging 
                    ? 'opacity-0 pointer-events-none' 
                    : isUsed 
                        ? 'opacity-20 cursor-default pointer-events-none line-through bg-gray-50 border-gray-200' 
                        : 'bg-white border-gray-300 hover:border-blue-400 hover:shadow-sm cursor-grab active:cursor-grabbing hover:bg-blue-50/30 shadow-sm'
                }
                ${isReviewMode ? 'cursor-default' : ''}
            `}
        >
            {/* Label hide as requested: abcd kerak emas */}
            {/* <span className={`shrink-0 font-bold text-sm mt-0.5 ${isUsed ? 'text-gray-300' : 'text-blue-600'}`}>{label}.</span> */}
            <span className={`leading-snug text-[14.5px] font-medium ${isUsed ? 'text-gray-300' : 'text-gray-800'} group-hover/heading:text-blue-700`}>
                {cleanText}
            </span>
        </div>
    );
};

export const ReadingDroppableSlot = ({ id, questionId, value, options, isReviewMode, isCorrect, correctAnswer, onClear }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `reading-drop-${questionId}`,
        disabled: isReviewMode
    });

    // Clean comparison: ignore trailing dots and case
    const cleanStr = (s) => String(s || "").trim().toLowerCase().replace(/\.$/, '');

    // Find the option to get its text
    // Find the option to get its text
    const selectedOption = options?.find((opt, idx) => {
        const toRomanLocal = (n) => {
            const lookup = { m: 1000, cm: 900, d: 500, cd: 400, c: 100, xc: 90, l: 50, xl: 40, x: 10, ix: 9, v: 5, iv: 4, i: 1 };
            let roman = '', i;
            for (i in lookup) { while (n >= lookup[i]) { roman += i; n -= lookup[i]; } }
            return roman;
        };

        const optText = typeof opt === 'object' ? opt.text : opt;
        let optLabel = typeof opt === 'object' ? (opt.label || opt.id) : null;
        
        if (!optLabel) {
            const match = String(optText).trim().match(/^([ivx\d]+)[\.\)\s]+/i);
            optLabel = match ? match[1].toLowerCase() : toRomanLocal(idx + 1);
        }

        return cleanStr(optLabel) === cleanStr(value) || cleanStr(optText) === cleanStr(value);
    });

    const getOptionFullContent = () => {
        if (!value) return null;
        let text = selectedOption 
            ? (typeof selectedOption === 'object' ? selectedOption.text : selectedOption) 
            : "";
        
        if (text) {
            // Rim raqamlarini yashirish
            return stripRomanNumerals(text);
        }
        return value;
    };

    const displayFullText = getOptionFullContent();

    return (
        <div
            ref={setNodeRef}
            className={`
                min-h-[42px] w-full border-2 rounded-none flex flex-col justify-center relative
                transition-all duration-300 px-3 py-2 group/slot mb-3
                ${value 
                    ? (isReviewMode 
                        ? (isCorrect 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-red-500 bg-red-50')
                        : 'border-blue-500 bg-white shadow-sm ring-1 ring-blue-100'
                      )
                    : (isOver 
                        ? 'border-blue-400 bg-blue-50 border-dashed scale-[1.005]' 
                        : 'border-gray-200 bg-gray-50/30 border-dashed hover:border-gray-300'
                      )
                }
            `}
        >
            <div className="flex items-center gap-2 w-full">
                <span className="shrink-0 font-bold text-[15px] text-blue-600 w-auto">{questionId}.</span>
                {value ? (
                    <div className="flex items-center w-full gap-3 overflow-hidden">
                        <span className="text-[14px] font-semibold text-gray-900 flex-1 leading-snug">
                            {displayFullText}
                        </span>
                        {!isReviewMode && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onClear(); }}
                                className="shrink-0 w-6 h-6 bg-white border border-gray-100 shadow-sm hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-gray-400 rounded-none flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-all"
                                title="Remove heading"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                ) : (
                    <span className={`text-[12px] font-bold uppercase tracking-widest ${isOver ? 'text-blue-500' : 'text-gray-300'}`}>
                        {isOver ? 'Release to Drop' : 'Insert Heading Here'}
                    </span>
                )}
            </div>

            {isReviewMode && !isCorrect && correctAnswer && (
                <div className="mt-2 w-full bg-green-600 text-white text-[11px] px-2.5 py-1.5 rounded-none shadow-sm whitespace-normal font-bold border border-green-700 animate-in slide-in-from-top-1">
                    <span className="opacity-80 mr-1">Correct:</span>
                    {(() => {
                        const found = options?.find((o, idx) => {
                            const toRomanLocal = (n) => {
                                const lookup = { m: 1000, cm: 900, d: 500, cd: 400, c: 100, xc: 90, l: 50, xl: 40, x: 10, ix: 9, v: 5, iv: 4, i: 1 };
                                let roman = '', i;
                                for (i in lookup) { while (n >= lookup[i]) { roman += i; n -= lookup[i]; } }
                                return roman;
                            };
                            const optText = typeof o === 'object' ? o.text : o;
                            let optLabel = typeof o === 'object' ? (o.label || o.id) : null;
                            if (!optLabel) {
                                const match = String(optText).trim().match(/^([ivx\d]+)[\.\)\s]+/i);
                                optLabel = match ? match[1].toLowerCase() : toRomanLocal(idx + 1);
                            }
                            return cleanStr(optLabel) === cleanStr(correctAnswer) || cleanStr(optText) === cleanStr(correctAnswer);
                        });
                        const finalText = found ? (typeof found === 'object' ? found.text : found) : correctAnswer;
                        return stripRomanNumerals(finalText);
                    })()}
                </div>
            )}
        </div>
    );
};

// --- KICHIK YORDAMCHI KOMPONENTLAR ---

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
    id, value, answer, onChange, isReviewMode, isCorrect, onLocationClick, passageId 
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
            />
            {isReviewMode && !isCorrect && (
                <span className="ml-1 text-[13px] font-bold text-green-600 bg-green-100 px-1 py-0.5 rounded border border-green-200 whitespace-nowrap">
                    ✓ {answer}
                </span>
            )}
        </span>
    );
};

// --- HELPER FUNKSIYALAR ---

const expandQuestionIds = (id) => {
    const idStr = String(id);
    if (idStr.includes('-') || idStr.includes('–')) {
        const parts = idStr.split(/[\-–]/);
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

// --- ASOSIY SAVOL TURLARI ---

const getOptionValue = (text) => {
    if (!text) return "";
    const match = text.match(/^([A-Z]|[ivxIVX]+)[\.\)\s]/);
    return match ? match[1].trim() : text;
};

const checkAnswer = (userVal, correctVal) => {
    if (!userVal || !correctVal) return false;
    const userClean = String(userVal).trim().toLowerCase();
    const correctOptions = String(correctVal).split('/').map(opt => opt.trim().toLowerCase());
    return correctOptions.includes(userClean);
};



export const MatchingOptionsBox = ({ 
    group, activePassage, highlights, handlePartSelect, onRemoveHighlight, keywordTable, isReviewMode, onOpenNotes 
}) => {
    let boxTitle = "List of Options";
    if (group.type === 'summary_box') {
        boxTitle = "List of Words";
    } else {
        const inst = String(group.instruction || "").toLowerCase();
        const listMatch = inst.match(/list of\s+([a-zA-Z]+)/);
        if (listMatch && listMatch[1] && !['the', 'following', 'options'].includes(listMatch[1])) {
            boxTitle = `List of ${listMatch[1].charAt(0).toUpperCase() + listMatch[1].slice(1)}`;
        } else if (inst.includes("heading")) {
            boxTitle = "List of Headings";
        } else if (inst.includes("feature")) {
            boxTitle = "List of Features";
        } else if (inst.includes("researcher")) {
            boxTitle = "List of Researchers";
        } else if (inst.includes("people") || inst.includes("person")) {
            boxTitle = "List of People";
        } else if (inst.includes("countr")) {
            boxTitle = "List of Countries";
        } else if (inst.includes("cit")) {
            boxTitle = "List of Cities";
        } else if (inst.includes("name")) {
            boxTitle = "List of Names";
        }
    }

    return (
        <div className="bg-white p-4 rounded-lg mb-6 border border-gray-200 shadow-sm">
            <p className="text-xs font-bold mb-3 uppercase text-ielts-blue tracking-wider">{boxTitle}</p>
            <div className={group.type === 'matching' ? "flex flex-col gap-y-1.5" : "grid grid-cols-2 gap-x-4 gap-y-1.5"}>
                {group.options.map((opt, idx) => {
                    const optText = typeof opt === 'object' ? opt.text : opt;
                    const staticOptId = `p-${activePassage}-g-static-opt-${idx}`;
                    const injectedOptText = (isReviewMode && keywordTable?.length) ? injectKeywordsToHTML(optText, keywordTable, true, null) : optText;
                    return (
                        <div key={idx} className="flex items-start gap-2 p-1 rounded hover:bg-gray-50 transition-colors">
                            <HighlightableText
                                id={staticOptId}
                                content={injectedOptText}
                                highlights={highlights ? highlights[staticOptId] || [] : []}
                                onTextSelect={handlePartSelect}
                                onHighlightRemove={onRemoveHighlight}
                                onOpenNotes={onOpenNotes}
                                isReviewMode={isReviewMode}
                                className="text-gray-800 text-[14px] leading-relaxed select-text"
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const MatchingGridQuestion = ({ 
    group, activePassage, userAnswers, onAnswerChange, isReviewMode, highlights, handlePartSelect, onRemoveHighlight, keywordTable, handleLocationClick, onOpenNotes, isPremium 
}) => {
    const options = group.options || [];
    const items = group.items || group.questions || [];
    
    // Extract labels for header (e.g., A, B, C)
    const labels = options.map((opt, idx) => {
        const text = typeof opt === 'object' ? opt.text : opt;
        const match = String(text).trim().match(/^([A-Z])[\.\)\s]/i);
        return match ? match[1].toUpperCase() : String.fromCharCode(65 + idx);
    });

    const getOptionValue = (text) => {
        if (!text) return "";
        const match = String(text).match(/^([A-Z]|[ivxIVX]+)[\.\)\s]/);
        return match ? match[1].trim() : text;
    };

    return (
        <div className="mb-10 select-none">
            <div className="overflow-hidden border border-gray-400 mb-8 bg-white overflow-x-auto">
                <table className="w-full text-center border-collapse table-fixed min-w-[500px]">
                    <thead>
                        <tr className="bg-[#C6D9F1]">
                            <th className="p-2 border border-black/20 w-10"></th>
                            <th className="p-2 border border-black/20 min-w-[200px] w-auto"></th>
                            {labels.map((label, idx) => (
                                <th key={idx} className="p-2 font-bold text-gray-900 w-14 border border-black/20">
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((q, qIdx) => {
                            const val = String(userAnswers[q.id] || "").toUpperCase();
                            const isCorrect = checkAnswer(val, q.answer);
                            
                            // Clean text (remove [DROP] or [INPUT] markers)
                            const cleanText = String(q.text || "").replace(/\[DROP\]|\[INPUT\]/gi, "").trim();

                            return (
                                <tr key={q.id}>
                                    <td 
                                        className={`p-2 text-center align-middle border border-black/20 bg-white font-bold text-[15px] text-gray-900 ${isReviewMode ? 'cursor-pointer hover:text-blue-600 hover:bg-blue-50 transition-colors' : ''}`}
                                        onClick={() => isReviewMode && handleLocationClick(q.locationId, group.passageId)}
                                    >
                                        {q.id}
                                    </td>
                                    <td className="p-2 text-left align-middle border border-black/20 bg-white">
                                        <HighlightableText
                                            id={`p-${activePassage}-q-${q.id}-text`}
                                            content={isReviewMode && keywordTable?.length ? injectKeywordsToHTML(cleanText, keywordTable, true, q.id) : cleanText}
                                            highlights={highlights ? highlights[`p-${activePassage}-q-${q.id}-text`] || [] : []}
                                            onTextSelect={handlePartSelect}
                                            onHighlightRemove={onRemoveHighlight}
                                            onOpenNotes={onOpenNotes}
                                            isReviewMode={isReviewMode}
                                            className="text-gray-900 text-[15px] leading-snug"
                                        />
                                    </td>
                                    {labels.map((label, lIdx) => {
                                        const isSelected = val === label.toUpperCase();
                                        const isThisCorrect = String(q.answer).toUpperCase() === label.toUpperCase();
                                        
                                        let cellClass = "p-2 border border-black/20 transition-all cursor-pointer h-[42px]";
                                        
                                        if (isSelected) {
                                            cellClass += " bg-[#C6D9F1]"; 
                                        }

                                        if (isReviewMode) {
                                            if (isThisCorrect) {
                                                cellClass = "p-2 border border-black/20 bg-green-100 transition-all cursor-pointer h-[42px]";
                                            } else if (isSelected && !isThisCorrect) {
                                                cellClass = "p-2 border border-black/20 bg-red-100 transition-all cursor-pointer h-[42px]";
                                            }
                                        }

                                        return (
                                            <td 
                                                key={lIdx} 
                                                className={cellClass} 
                                                onClick={() => !isReviewMode && onAnswerChange(q.id, label)}
                                            >
                                                {/* No dot or tick inside, just background color as requested */}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* List of Descriptions / Groups - Styled like the second table in the image */}
            <div className="max-w-[400px]">
                <table className="w-full border-collapse border border-black/40 bg-[#E9E9E9]">
                    <thead>
                        <tr>
                            <th colSpan="2" className="border border-black/40 p-2 text-left font-bold text-[16px]">First invented or used by</th>
                        </tr>
                    </thead>
                    <tbody>
                        {options.map((opt, idx) => {
                            const optText = typeof opt === 'object' ? opt.text : opt;
                            const label = labels[idx];
                            const cleanDescription = optText.replace(new RegExp(`^${label}[\\.\\)\\s]+`, 'i'), '').trim();
                            
                            return (
                                <tr key={idx}>
                                    <td className="border border-black/40 p-2 font-black text-[15px] w-12 text-center bg-[#E9E9E9]">{label}</td>
                                    <td className="border border-black/40 p-2 text-gray-900 text-[15px] bg-[#E9E9E9]">{cleanDescription}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {isReviewMode && items?.some(q => q.explanation) && (
                <div className="mt-6 flex flex-col gap-2">
                    {items.filter(q => q.explanation).map(q => (
                        <QuestionExplanation 
                            key={`exp-${q.id}`} 
                            text={q.explanation} 
                            isPremium={isPremium} 
                            titleId={q.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const ChoiceQuestion = ({ 
    group, q, val, onAnswerChange, isReviewMode, isMultiSelect, highlights, handlePartSelect, onRemoveHighlight, keywordTable, activePassage, handleLocationClick, onOpenNotes, isPremium 
}) => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    let itemOptions = (q.options && q.options.length > 0) ? q.options : (group.options || []);
    
    const type = String(group.type || "").toLowerCase();
    const isTFNG = type.includes('tfng') || type.includes('true_false');
    const isYNNG = type.includes('yesno') || type.includes('yes_no');

    if (itemOptions.length === 0 && group.type) {
        if (isTFNG) itemOptions = ["TRUE", "FALSE", "NOT GIVEN"];
        else if (isYNNG) itemOptions = ["YES", "NO", "NOT GIVEN"];
    }

    const correctAnswersList = String(q.answer || "").split(',').map(s => s.trim().toLowerCase());
    const isCorrect = checkAnswer(val, q.answer);

    return (
        <div id={`q-${q.id}`} className="flex gap-3 items-start mb-5">
            {(!isReviewMode && expandQuestionIds(q.id).length > 1) ? null : (
                <div className="flex flex-col gap-1">
                    {(() => {
                        const ids = expandQuestionIds(q.id);
                        const isMulti = ids.length > 1;
                        
                        let correctCount = 0;
                        if (isReviewMode && isMulti) {
                            const userA = String(val).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                            const correctA = String(q.answer).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                            correctCount = userA.filter(a => correctA.includes(a)).length;
                        }

                        return ids.map((id, idx) => {
                            let indCorrect = isCorrect;
                            if (isReviewMode && isMulti) {
                                indCorrect = idx < correctCount;
                            }
                            return (
                                <QuestionBadge 
                                    key={idx}
                                    id={id} 
                                    isReviewMode={isReviewMode} 
                                    isCorrect={indCorrect}
                                    onClick={() => {
                                        if (!isReviewMode) return;
                                        let targetLoc = q.locationId;
                                        if (typeof q.locationId === 'string' && q.locationId.includes(',')) {
                                            targetLoc = q.locationId.split(',')[idx]?.trim();
                                        } else if (Array.isArray(q.locationId)) {
                                            targetLoc = q.locationId[idx];
                                        }
                                        handleLocationClick(targetLoc, group.passageId);
                                    }} 
                                />

                            );
                        });
                    })()}
                </div>
            )}
            <div className="flex-1">
                {(() => {
                    const cleanedHeader = cleanQuestionText(q.text);
                    return cleanedHeader ? (
                        <HighlightableText
                            id={`p-${activePassage}-q-${q.id}-text`}
                            content={isReviewMode && keywordTable?.length ? injectKeywordsToHTML(cleanedHeader, keywordTable, true, q.id) : cleanedHeader}
                            highlights={highlights ? highlights[`p-${activePassage}-q-${q.id}-text`] || [] : []}
                            onTextSelect={handlePartSelect}
                            onHighlightRemove={onRemoveHighlight}
                            onOpenNotes={onOpenNotes}
                            isReviewMode={isReviewMode}
                            className="text-black font-medium leading-relaxed"
                        />
                    ) : null;
                })()}
                
                <div className="mt-2 flex flex-col gap-1.5 pl-0">
                    {itemOptions.map((opt, idx) => {
                        const rawText = typeof opt === 'object' ? opt.text : opt;
                        const optId = typeof opt === 'object' ? (opt.id || rawText) : opt;
                        const currentLetter = letters[idx] || letters[0];
                        const finalValue = getOptionValue(String(optId));
                        const isSelected = isMultiSelect
                            ? (val ? String(val).split(',').includes(String(finalValue)) : false)
                            : (String(val) === String(finalValue));

                        // Strip leading letter from text if it exists (e.g. "A Evidence" -> "Evidence")
                        const cleanRawText = stripRomanNumerals(rawText.replace(new RegExp(`^${currentLetter}[\\.\\)\\s]+`, 'i'), '').trim());

                        let containerClass = "bg-transparent border-transparent";
                        let badgeClass = 'text-gray-600';
                        let checkContainerClass = isSelected ? "border-gray-400" : "border-gray-300";
                        let checkIconColor = "bg-orange-500";

                        if (isReviewMode) {
                            const isThisCorrect = correctAnswersList.includes(String(finalValue).toLowerCase());
                            if (isThisCorrect) {
                                containerClass = "bg-green-50/50 border-transparent";
                                badgeClass = "text-green-700 font-bold";
                                checkContainerClass = "border-green-600 bg-white ring-green-100";
                                checkIconColor = "text-green-600";
                            } else if (isSelected && !isThisCorrect) {
                                containerClass = "bg-red-50/50 border-transparent";
                                badgeClass = "text-red-700 font-bold";
                                checkContainerClass = "border-red-600 bg-white ring-red-100";
                                checkIconColor = "text-red-600";
                            } else {
                                containerClass = "opacity-60 border-transparent";
                            }
                        } else if (isSelected) {
                            containerClass = "border-transparent bg-[#D1E8FF]";
                        }

                        const partId = `p-${activePassage}-q-${q.id}-opt-${idx}`;

                        return (
                            <label key={idx} className={`flex items-center gap-3 cursor-pointer px-2 py-1.5 rounded-none border-transparent transition-all ${containerClass}`}>
                                <div className="relative flex items-center justify-center shrink-0">
                                    <input
                                        type={isMultiSelect ? "checkbox" : "radio"}
                                        className="sr-only"
                                        checked={isSelected}
                                        onChange={() => {
                                            if (isReviewMode) return;
                                            const cleanOptionValue = getOptionValue(String(optId));
                                            if (isMultiSelect) {
                                                const current = val ? String(val).split(',').filter(Boolean) : [];
                                                const limit = (group.type && group.type.includes('three')) ? 3 : 2;
                                                let newA;
                                                if (isSelected) newA = current.filter(a => a !== cleanOptionValue);
                                                else { if (current.length >= limit) return; newA = [...current, cleanOptionValue].sort(); }
                                                onAnswerChange(q.id, newA.join(','));
                                            } else {
                                                onAnswerChange(q.id, cleanOptionValue);
                                            }
                                        }}
                                        disabled={isReviewMode}
                                    />
                                    <div className={`w-4 h-4 border transition-all flex items-center justify-center bg-white ${isMultiSelect ? 'rounded-[2px]' : 'rounded-full'} ${checkContainerClass}`}>
                                        {isSelected && (
                                            <div className={`w-2 h-2 rounded-full ${checkIconColor} animate-in zoom-in-50 duration-200`}></div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-start flex-1">
                                    <HighlightableText
                                        id={partId}
                                        content={isReviewMode && keywordTable?.length ? injectKeywordsToHTML(cleanRawText, keywordTable, true, null) : cleanRawText}
                                        highlights={highlights ? highlights[partId] || [] : []}
                                        onTextSelect={handlePartSelect}
                                        onHighlightRemove={onRemoveHighlight}
                                        onOpenNotes={onOpenNotes}
                                        isReviewMode={isReviewMode}
                                        className="text-gray-800 font-medium text-[14.5px] leading-relaxed select-text flex-1"
                                    />
                                </div>
                            </label>
                        );
                    })}
                </div>
                {isReviewMode && q.explanation && <QuestionExplanation text={q.explanation} isPremium={isPremium} titleId={q.id} />}
            </div>
        </div>
    );
};

export const GapFillQuestion = ({ 
    group, q, val, onAnswerChange, isReviewMode, highlights, handlePartSelect, onRemoveHighlight, keywordTable, activePassage, handleLocationClick, isSummary, isFlowChart, isLast, onOpenNotes, isPremium
}) => {
    const itemOptions = (q.options && q.options.length > 0) ? q.options : (group.options || []);
    const parts = (q.text || "").split(/(\[INPUT\]|\[DROP\])/g);
    const isCorrect = checkAnswer(val, q.answer);

    const renderParts = () => {
        return parts.map((part, i) => {
            const hasOptions = itemOptions && itemOptions.length > 0;
            const isSelectDropdown = part === '[DROP]' || (part === '[INPUT]' && hasOptions && (isSummary || group.type === 'summary_box'));

            if (part === '[INPUT]' && !isSelectDropdown) {
                return (
                    <span key={i} className="inline-flex items-center align-middle mx-1 whitespace-nowrap">
                        {isReviewMode && (
                            <span 
                                className="inline-flex min-w-[24px] px-1 h-[24px] items-center justify-center rounded bg-white border border-gray-400 text-[13px] font-bold text-gray-700 mr-1 align-middle cursor-pointer hover:border-ielts-blue transition-colors shadow-sm"
                                onClick={() => handleLocationClick(q.locationId, group.passageId)}
                            >
                                {q.id}
                            </span>
                        )}
                        <ReadingTextInput 
                            id={q.id}
                            value={val}
                            answer={q.answer}
                            onChange={onAnswerChange}
                            isReviewMode={isReviewMode}
                            isCorrect={isCorrect}
                        />
                    </span>
                );
            }
            if (isSelectDropdown) {
                let inputBorderClass = isReviewMode ? (isCorrect ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "border-gray-300 focus:border-ielts-blue";
                return (
                    <span key={i} className="inline-flex items-center align-middle mx-1 whitespace-nowrap relative">
                        <span 
                            className={`inline-flex min-w-[24px] px-1 h-[24px] items-center justify-center rounded bg-white border border-gray-400 text-[13px] font-bold text-gray-700 mr-1 align-middle shadow-sm transition-all ${isReviewMode ? 'cursor-pointer hover:border-ielts-blue hover:text-ielts-blue' : 'cursor-default'}`}
                            onClick={() => isReviewMode && handleLocationClick(q.locationId, group.passageId)}
                        >
                            {q.id}
                        </span>
                        <select
                            className={`h-[26px] border rounded px-1 pr-5 font-semibold text-sm focus:outline-none focus:ring-1 transition-all cursor-pointer w-[92px] py-0 leading-none bg-white ${inputBorderClass}`}
                            value={val}
                            onChange={(e) => onAnswerChange(q.id, e.target.value)}
                            disabled={isReviewMode}
                        >
                            <option value="" disabled>Select...</option>
                            {itemOptions.map((opt, idx) => {
                                const optText = typeof opt === 'object' ? opt.text : opt;
                                const optionValue = getOptionValue(optText);
                                return <option key={idx} value={optionValue}>{optText}</option>;
                            })}
                        </select>
                        {isReviewMode && !isCorrect && (
                            <span className="ml-2 text-xs font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded border border-green-200">✓ {q.answer}</span>
                        )}
                    </span>
                );
            }

            const cleanPart = part
                .replace(/<\/?p>|<\/?div>/gi, "")
                .replace(/<(b|strong)>\s*\d+\s*<\/\1>/gi, "") // Remove bolded numbers
                .replace(/(\s|^)\d+[\.\s]*$/, "$1") // Remove trailing number before gap
                .replace(/^\s*\d+[\.\s]*/, "") // Remove leading numbers
                .trim();
            
            if (cleanPart === "" || cleanPart === ".") return null;

            const partId = `p-${activePassage}-q-${q.id}-part-${i}`;
            const injectedPart = (isReviewMode && keywordTable?.length) ? injectKeywordsToHTML(cleanPart, keywordTable, true, q.id) : cleanPart;

            return (
                <HighlightableText
                    key={i}
                    id={partId}
                    content={injectedPart}
                    highlights={highlights ? highlights[partId] || [] : []}
                    onTextSelect={handlePartSelect}
                    onHighlightRemove={onRemoveHighlight}
                    onOpenNotes={onOpenNotes}
                    isReviewMode={isReviewMode}
                    className="inline text-black leading-relaxed align-middle"
                />
            );
        });
    };

    let containerClass = "block mb-5";
    if (isSummary) containerClass = "inline leading-[2.2]";
    if (isFlowChart) containerClass = "block mb-0";

    if (isSummary) {
        return (
            <span id={`q-${q.id}`} className="group/item relative">
                {renderParts()}
            </span>
        );
    }

    return (
        <div id={`q-${q.id}`} className={`group/item relative ${containerClass}`}>
            <div className={`flex gap-3 items-start pl-2 ${isFlowChart ? 'mb-0' : 'mb-2'}`}>
                <span className="flex-1 text-black">{renderParts()}</span>
            </div>
            {isReviewMode && q.explanation && <QuestionExplanation text={q.explanation} isPremium={isPremium} titleId={q.id} />}
        </div>
    );
};

const FlowItem = ({ 
    item, index, total, group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, highlights, handlePartSelect, onRemoveHighlight, keywordTable, activePassage, onOpenNotes, isPremium 
}) => {
    const itemText = (typeof item.text === 'object' ? item.text.text : item.text) || "";
    const hasInput = itemText && (String(itemText).includes('[INPUT]') || String(itemText).includes('[DROP]'));
    
    // Detect bold-only header items (e.g. "<b>Title</b>")
    const strippedText = itemText.replace(/<[^>]*>/g, '').trim();
    const isBoldHeader = /^<b>/.test(itemText.trim()) && !hasInput;
    const isHeaderItem = (item._isHeader || (index === 0 && !item.isQuestion && !hasInput));
    
    let content = null;

    if (item.isQuestion || hasInput) {
        content = (
            <div className="font-normal text-gray-800 leading-[1.8] flex flex-wrap items-baseline justify-center text-center">
                <GapFillQuestion 
                    group={group}
                    q={item}
                    val={userAnswers[item.id] || ""}
                    onAnswerChange={onAnswerChange}
                    isReviewMode={isReviewMode}
                    highlights={highlights}
                    handlePartSelect={handlePartSelect}
                    onRemoveHighlight={onRemoveHighlight}
                    keywordTable={keywordTable}
                    activePassage={activePassage}
                    handleLocationClick={handleLocationClick}
                    onOpenNotes={onOpenNotes}
                    isPremium={isPremium}
                    isFlowChart={true}
                />
            </div>
        );
    } else {
        content = (
            <span 
                className={`text-gray-800 text-center inline-block w-full ${isHeaderItem || isBoldHeader ? 'font-bold text-[16.5px]' : 'font-medium text-[15px]'}`}
                dangerouslySetInnerHTML={{ __html: itemText }}
            />
        );
    }

    // Header items render without box styling
    if (isHeaderItem || isBoldHeader) {
        return (
            <React.Fragment>
                <div className="w-full bg-transparent pt-2 pb-2 text-center">
                    {content}
                </div>
                {index !== total - 1 && (
                    <div className="flex flex-col items-center py-1">
                        <div className="h-4 w-px bg-gray-300 relative">
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-gray-300 text-[10px]">▼</div>
                        </div>
                    </div>
                )}
            </React.Fragment>
        );
    }

    return (
        <React.Fragment>
            <div className="w-full transition-all border border-black rounded-none p-4 bg-white shadow-[2px_2px_0px_rgba(0,0,0,0.08)]">
                {content}
            </div>
            {index !== total - 1 && (
                <div className="flex flex-col items-center py-2">
                    <div className="h-8 w-px bg-gray-400 relative">
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-gray-400 text-[12px]">▼</div>
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

export const FlowChartQuestion = ({ 
    group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, highlights, handlePartSelect, onRemoveHighlight, keywordTable, activePassage, onOpenNotes, isPremium 
}) => {
    const allSubGroups = (group.groups || [{ items: group.items || group.questions || [] }]);

    // Pre-process: split items whose text contains <br/><br/> into separate flow steps
    const splitItemsIntoFlowSteps = (items) => {
        const result = [];
        items.forEach(item => {
            const rawText = (typeof item.text === 'object' ? item.text.text : item.text) || "";
            
            // Split by double <br/> (handles <br/>, <br>, <br />, and combinations)
            const segments = rawText.split(/<br\s*\/?>\s*<br\s*\/?>/gi).map(s => s.trim()).filter(Boolean);
            
            if (segments.length <= 1) {
                // No splitting needed — keep original
                result.push(item);
                return;
            }
            
            // Multiple segments: split into separate virtual items
            segments.forEach((seg, segIdx) => {
                const hasInput = seg.includes('[INPUT]') || seg.includes('[DROP]');
                const isBoldOnly = /^<b>/.test(seg.trim()) && !hasInput;
                
                if (hasInput) {
                    // This segment keeps the original question's id, answer, locationId
                    result.push({
                        ...item,
                        text: seg,
                        isQuestion: true,
                    });
                } else {
                    // Pure text/label segment
                    result.push({
                        id: `${item.id}_text_${segIdx}`,
                        text: seg,
                        isQuestion: false,
                        _isHeader: isBoldOnly,
                        _isTextOnly: true,
                    });
                }
            });
        });
        return result;
    };

    return (
        <div className="mb-10 flex flex-col items-center w-full max-w-2xl mx-auto py-4">
            {allSubGroups.map((sub, sIdx) => {
                const rawItems = (sub.items || sub.questions || []).filter(it => {
                    const itText = String(typeof it.text === 'object' ? it.text.text : it.text || "").trim();
                    return !["↓", "▼", "⬇", "arrow", "⇓"].includes(itText);
                });
                
                // Split multi-step items into individual flow boxes
                const processedItems = splitItemsIntoFlowSteps(rawItems);
                
                return (
                    <div key={sIdx} className="w-full flex flex-col items-center mb-8 last:mb-0">
                        {sub.header && (
                            <h4 className="text-[14px] font-black text-gray-900 mb-4 text-center w-full uppercase tracking-[0.15em] border-b border-gray-200 pb-2">
                                {typeof sub.header === 'object' ? sub.header.text : sub.header}
                            </h4>
                        )}
                        <div className="flex flex-col items-center w-full gap-0">
                            {processedItems.map((item, index) => (
                                <FlowItem 
                                    key={item.id || index}
                                    item={item} 
                                    index={index} 
                                    total={processedItems.length}
                                    group={group}
                                    userAnswers={userAnswers}
                                    onAnswerChange={onAnswerChange}
                                    isReviewMode={isReviewMode}
                                    handleLocationClick={handleLocationClick}
                                    highlights={highlights}
                                    handlePartSelect={handlePartSelect}
                                    onRemoveHighlight={onRemoveHighlight}
                                    keywordTable={keywordTable}
                                    activePassage={activePassage}
                                    onOpenNotes={onOpenNotes}
                                    isPremium={isPremium}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const DiagramLabelingQuestion = ({ 
    group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, highlights, handlePartSelect, onRemoveHighlight, keywordTable, activePassage, onOpenNotes, isPremium 
}) => {
    return (
        <div className="diagram-labeling-question flex flex-col gap-6 w-full mb-8">
            {group.image && (
                <div className="diagram-image-wrapper w-full bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col items-center justify-center">
                    <img 
                        src={group.image} 
                        alt="Diagram Labeling" 
                        className="max-w-full max-h-[500px] h-auto object-contain transition-transform duration-500 hover:scale-[1.01]" 
                    />
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                {(group.items || []).map((q) => {
                    const val = userAnswers[q.id] || "";
                    const isCorrect = checkAnswer(val, q.answer);
                    
                    return (
                        <div key={q.id} className="flex flex-col gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-gray-200 transition-all group/diag">
                            <div className="flex items-start gap-3">
                                {isReviewMode && (
                                    <span 
                                        className="inline-flex min-w-[26px] h-[26px] items-center justify-center rounded-lg bg-gray-50 border border-gray-300 text-[13px] font-bold text-gray-700 cursor-pointer hover:border-ielts-blue hover:text-ielts-blue transition-all shadow-sm mt-0.5"
                                        onClick={() => handleLocationClick(q.locationId, group.passageId)}
                                    >
                                        {q.id}
                                    </span>
                                )}
                                
                                <div className="flex-1">
                                    {q.text ? (
                                        <GapFillQuestion 
                                            group={group}
                                            q={q}
                                            val={val}
                                            onAnswerChange={onAnswerChange}
                                            isReviewMode={isReviewMode}
                                            highlights={highlights}
                                            handlePartSelect={handlePartSelect}
                                            onRemoveHighlight={onRemoveHighlight}
                                            keywordTable={keywordTable}
                                            activePassage={activePassage}
                                            handleLocationClick={handleLocationClick}
                                            onOpenNotes={onOpenNotes}
                                            isPremium={isPremium}
                                        />
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                {!isReviewMode && (
                                                    <span className="text-sm font-bold text-gray-500 min-w-[1.5em]">{q.id}.</span>
                                                )}
                                                <ReadingTextInput 
                                                    id={q.id}
                                                    value={val}
                                                    answer={q.answer}
                                                    onChange={onAnswerChange}
                                                    isReviewMode={isReviewMode}
                                                    isCorrect={isCorrect}
                                                />
                                            </div>
                                            {isReviewMode && q.explanation && (
                                                <QuestionExplanation 
                                                    text={q.explanation} 
                                                    isPremium={isPremium} 
                                                    titleId={q.id}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const TableQuestion = ({ 
    group, activePassage, userAnswers, onAnswerChange, isReviewMode, highlights, handlePartSelect, onRemoveHighlight, keywordTable, handleLocationClick, onOpenNotes, isPremium 
}) => {
    const rows = group.rows || group.items || [];
    return (
        <div className="mb-6">
            <div className="overflow-x-auto border border-gray-300 rounded-lg shadow-sm">
                <table className="w-full text-left border-collapse">
                    <tbody>
                        {rows.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50/50">
                                {row.cells && row.cells.map((cell, cIdx) => {
                                    const cellId = `p-${activePassage}-table-cell-${rIdx}-${cIdx}`;
                                    return (
                                        <td key={cIdx} className="border-r border-gray-200 last:border-r-0 p-3 align-top text-black leading-relaxed">
                                            {!cell.isMixed && (
                                                <HighlightableText
                                                    id={cellId}
                                                    content={(isReviewMode && keywordTable?.length) ? injectKeywordsToHTML(cell.text, keywordTable, true, null) : cell.text}
                                                    highlights={highlights ? highlights[cellId] || [] : []}
                                                    onTextSelect={handlePartSelect}
                                                    onHighlightRemove={onRemoveHighlight}
                                                    onOpenNotes={onOpenNotes}
                                                    isReviewMode={isReviewMode}
                                                    className="inline text-black select-text"
                                                />
                                            )}
                                            {cell.isMixed && cell.parts && cell.parts.map((part, pIdx) => {
                                                if (part.type === 'text') {
                                                    const partId = `${cellId}-part-${pIdx}`;
                                                    return (
                                                        <HighlightableText
                                                            key={pIdx}
                                                            id={partId}
                                                            content={(isReviewMode && keywordTable?.length) ? injectKeywordsToHTML(part.content, keywordTable, true, null) : part.content}
                                                            highlights={highlights ? highlights[partId] || [] : []}
                                                            onTextSelect={handlePartSelect}
                                                            onHighlightRemove={onRemoveHighlight}
                                                            onOpenNotes={onOpenNotes}
                                                            isReviewMode={isReviewMode}
                                                            className="inline text-black select-text"
                                                        />
                                                    );
                                                }
                                                if (part.type === 'input') {
                                                    const val = userAnswers[part.id] || "";
                                                    const isCorrect = checkAnswer(val, part.answer);
                                                    return (
                                                        <div key={pIdx} className="inline-flex items-center">
                                                            {isReviewMode && (
                                                                <span 
                                                                    className="inline-flex min-w-[22px] px-1 h-[22px] items-center justify-center rounded bg-gray-50 border border-gray-300 text-[12px] font-bold text-gray-600 mr-1 cursor-pointer hover:border-ielts-blue transition-all"
                                                                    onClick={() => handleLocationClick(part.locationId, group.passageId)}
                                                                >
                                                                    {part.id}
                                                                </span>
                                                            )}
                                                            <ReadingTextInput 
                                                                id={part.id}
                                                                value={val}
                                                                answer={part.answer}
                                                                onChange={onAnswerChange}
                                                                isReviewMode={isReviewMode}
                                                                isCorrect={isCorrect}
                                                            />
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isReviewMode && (() => {
                const tableItemsWithExplanation = [];
                rows.forEach(row => {
                    const cells = Array.isArray(row) ? row : (row.cells || []);
                    cells.forEach(cell => {
                        if (cell.explanation) tableItemsWithExplanation.push(cell);
                        if (cell.parts) {
                            cell.parts.forEach(part => {
                                if (part.explanation) tableItemsWithExplanation.push(part);
                            });
                        }
                    });
                });

                if (tableItemsWithExplanation.length === 0) return null;

                return (
                    <div className="mt-4 flex flex-col gap-2">
                        {tableItemsWithExplanation.map(q => (
                            <QuestionExplanation 
                                key={`exp-${q.id}`} 
                                text={q.explanation} 
                                isPremium={isPremium} 
                                titleId={q.id}
                            />
                        ))}
                    </div>
                );
            })()}
        </div>
    );
};

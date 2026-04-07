import React from "react";
import { useDraggable, useDroppable } from '@dnd-kit/core';
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
    let baseClass = "min-w-[26px] w-fit px-1.5 h-[26px] flex items-center justify-center rounded border text-[14px] font-bold shrink-0 shadow-sm unselectable transition-colors mt-1";
    
    let stateClass = "bg-gray-100 border-gray-300 text-black";
    if (isReviewMode) {
        stateClass = isCorrect 
            ? "border-green-500 bg-green-50 text-green-700" 
            : "border-red-500 bg-red-50 text-red-700";
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
    group, activePassage, highlights, handlePartSelect, onRemoveHighlight, keywordTable, isReviewMode 
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

export const ChoiceQuestion = ({ 
    group, q, val, onAnswerChange, isReviewMode, isMultiSelect, highlights, handlePartSelect, onRemoveHighlight, keywordTable, activePassage, handleLocationClick 
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
            <div className="flex flex-col gap-1">
                {(() => {
                    const ids = expandQuestionIds(q.id);
                    const isMulti = ids.length > 1;
                    
                    // Review mode uchun ranglar: nechtasi to'g'ri bo'lsa shuncha yashil badge
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
                                onClick={() => isReviewMode && handleLocationClick(q.locationId, group.passageId)} 
                            />
                        );
                    });
                })()}
            </div>
            <div className="flex-1">
                <HighlightableText
                    id={`p-${activePassage}-q-${q.id}-text`}
                    content={isReviewMode && keywordTable?.length ? injectKeywordsToHTML(q.text, keywordTable, true, q.id) : q.text}
                    highlights={highlights ? highlights[`p-${activePassage}-q-${q.id}-text`] || [] : []}
                    onTextSelect={handlePartSelect}
                    onHighlightRemove={onRemoveHighlight}
                    isReviewMode={isReviewMode}
                    className="text-black font-medium leading-relaxed"
                />
                
                <div className="mt-1.5 flex flex-col gap-1 pl-1">
                    {itemOptions.map((opt, idx) => {
                        const rawText = typeof opt === 'object' ? opt.text : opt;
                        const optId = typeof opt === 'object' ? (opt.id || rawText) : opt;
                        const finalValue = getOptionValue(String(optId));
                        const isSelected = isMultiSelect
                            ? (val ? String(val).split(',').includes(String(finalValue)) : false)
                            : (String(val) === String(finalValue));

                        let containerClass = "bg-transparent border-transparent hover:bg-gray-50";
                        let badgeClass = isSelected ? 'bg-ielts-blue text-white border-ielts-blue' : 'bg-gray-100 text-gray-500';
                        let radioClass = "border-gray-300";

                        if (isReviewMode) {
                            const isThisCorrect = correctAnswersList.includes(String(finalValue).toLowerCase());
                            if (isThisCorrect) {
                                containerClass = "bg-green-50 border-green-200 ring-1 ring-green-400";
                                badgeClass = "bg-green-600 text-white border-green-600";
                                radioClass = "border-green-600";
                            } else if (isSelected && !isThisCorrect) {
                                containerClass = "bg-red-50 border-red-200 ring-1 ring-red-400";
                                badgeClass = "bg-red-600 text-white border-red-600";
                                radioClass = "border-red-600";
                            } else {
                                containerClass = "opacity-50";
                            }
                        } else if (isSelected) {
                            containerClass = "bg-blue-50 border-blue-100";
                        }

                        const partId = `p-${activePassage}-q-${q.id}-opt-${idx}`;

                        return (
                            <label key={idx} className={`flex items-center gap-3 cursor-pointer p-1.5 rounded-lg border transition-all ${containerClass}`}>
                                {!(isTFNG || isYNNG) && (
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 shadow-sm border select-none ${badgeClass}`}>
                                        {letters[idx] || letters[0]}
                                    </div>
                                )}
                                <input
                                    type={isMultiSelect ? "checkbox" : "radio"}
                                    className={`peer appearance-none w-4 h-4 border rounded-full checked:bg-ielts-blue transition-all cursor-pointer ${radioClass}`}
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
                                <HighlightableText
                                    id={partId}
                                    content={isReviewMode && keywordTable?.length ? injectKeywordsToHTML(rawText, keywordTable, true, null) : rawText}
                                    highlights={highlights ? highlights[partId] || [] : []}
                                    onTextSelect={handlePartSelect}
                                    onHighlightRemove={onRemoveHighlight}
                                    isReviewMode={isReviewMode}
                                    className="text-black font-medium leading-relaxed grow select-text"
                                />
                            </label>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export const GapFillQuestion = ({ 
    group, q, val, onAnswerChange, isReviewMode, highlights, handlePartSelect, onRemoveHighlight, keywordTable, activePassage, handleLocationClick, isSummary, isFlowChart, isLast
}) => {
    const itemOptions = (q.options && q.options.length > 0) ? q.options : (group.options || []);
    const parts = q.text.split(/(\[INPUT\]|\[DROP\])/g);
    const isCorrect = checkAnswer(val, q.answer);

    const renderParts = () => {
        return parts.map((part, i) => {
            const hasOptions = itemOptions && itemOptions.length > 0;
            const isSelectDropdown = part === '[DROP]' || (part === '[INPUT]' && hasOptions && (isSummary || group.type === 'summary_box'));

            if (part === '[INPUT]' && !isSelectDropdown) {
                return (
                    <span key={i} className="inline-flex items-center align-middle mx-0 whitespace-nowrap">
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
                    <span key={i} className="inline-flex items-center align-middle mx-0 whitespace-nowrap relative">
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

            const cleanPart = part.replace(/<\/?p>|<\/?div>/gi, "");
            if (cleanPart === "") return null;

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
                    isReviewMode={isReviewMode}
                    className="inline text-black leading-relaxed align-middle"
                />
            );
        });
    };

    let containerClass = "block mb-5";
    if (isSummary) containerClass = "inline leading-[2.2]";
    if (isFlowChart) containerClass = "flex flex-col items-center justify-center w-full border border-gray-200 rounded-xl p-6 mb-10 bg-white relative shadow-sm text-center font-montserrat";

    if (isSummary && !isFlowChart) {
        return (
            <span id={`q-${q.id}`} className="group/item relative">
                {renderParts()}
            </span>
        );
    }

    return (
        <div id={`q-${q.id}`} className={`group/item relative ${containerClass}`}>
            {!isSummary && !isFlowChart && (
                <div className="flex gap-3 items-start mb-2 pl-2">
                    <span className="flex-1 text-black">{renderParts()}</span>
                </div>
            )}
            {isFlowChart && (
                <div className={`text-black w-full flex flex-col items-center`}>
                    <div className="text-[1.1em] font-medium leading-relaxed">
                        {renderParts()}
                    </div>
                    {!isLast && (
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-gray-300 text-2xl animate-bounce-subtle">↓</div>
                    )}
                </div>
            )}
        </div>
    );
};

export const DiagramLabelingQuestion = ({ 
    group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, highlights, handlePartSelect, onRemoveHighlight, keywordTable, activePassage 
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
                            <div className="flex items-center gap-3">
                                {isReviewMode && (
                                    <span 
                                        className="inline-flex min-w-[26px] h-[26px] items-center justify-center rounded-lg bg-gray-50 border border-gray-300 text-[13px] font-bold text-gray-700 cursor-pointer hover:border-ielts-blue hover:text-ielts-blue transition-all shadow-sm"
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
                                        />
                                    ) : (
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
    group, activePassage, userAnswers, onAnswerChange, isReviewMode, highlights, handlePartSelect, onRemoveHighlight, keywordTable, handleLocationClick 
}) => {
    const rows = group.rows || group.items || [];
    return (
        <div className="overflow-x-auto border border-gray-300 rounded-lg shadow-sm mb-6">
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
    );
};

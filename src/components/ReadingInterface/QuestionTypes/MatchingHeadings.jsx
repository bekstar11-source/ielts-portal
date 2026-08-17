import React from "react";
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Check } from 'lucide-react';
import { stripRomanNumerals } from './CommonComponents';
import { getHeadingOptionLabels } from '../RightPane/RightPaneUtils';
import { findOptionIndex } from '../../../utils/ieltsScoring';

export const ReadingDraggableHeading = ({ optionKey, label, text, isUsed, isReviewMode }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `reading-heading-${optionKey}`,
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
                px-3 py-1 border select-none flex items-start gap-2 w-fit rounded-md
                transition-all duration-150 group/heading mb-0.5
                ${isDragging 
                    ? 'opacity-0 pointer-events-none' 
                    : isUsed 
                        ? 'opacity-20 cursor-default pointer-events-none line-through bg-gray-50 border-gray-200' 
                        : 'bg-white border-gray-400 hover:border-blue-400 hover:shadow-sm cursor-grab active:cursor-grabbing hover:bg-blue-50/30 shadow-sm'
                }
                ${isReviewMode ? 'cursor-default' : ''}
            `}
        >
            <span className={`leading-snug text-[14px] font-bold ${isUsed ? 'text-gray-400' : 'text-black'} group-hover/heading:text-blue-700`}>
                {cleanText}
            </span>
        </div>
    );
};

export const ReadingDroppableSlot = ({ id, questionId, value, options, isReviewMode, isCorrect, correctAnswer, onClear, onAnswerChange, userAnswers }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `reading-drop-${questionId}`,
        disabled: isReviewMode
    });
    const [showPicker, setShowPicker] = React.useState(false);

    const cleanStr = (s) => String(s || "").trim().toLowerCase().replace(/\.$/, '');

    const headingLabels = React.useMemo(() => getHeadingOptionLabels(options), [options]);

    // Eski urinishlarda javob yorliq emas, sarlavha matni ko'rinishida saqlangan
    // bo'lishi mumkin — `findOptionIndex` ikkala ko'rinishni ham topadi.
    const findOption = React.useCallback((val) => {
        if (!val) return null;
        const direct = options?.find((opt, idx) => {
            const optText = typeof opt === 'object' ? opt.text : opt;
            return cleanStr(headingLabels[idx]) === cleanStr(val) || cleanStr(optText) === cleanStr(val);
        });
        if (direct) return direct;
        const idx = findOptionIndex(val, options || []);
        return idx === -1 ? null : options[idx];
    }, [options, headingLabels]);

    const selectedOption = findOption(value);

    const getOptionFullContent = () => {
        if (!value) return null;
        let text = selectedOption 
            ? (typeof selectedOption === 'object' ? selectedOption.text : selectedOption) 
            : "";
        
        if (text) {
            return stripRomanNumerals(text);
        }
        return value;
    };

    const displayFullText = getOptionFullContent();

    React.useEffect(() => {
        if (showPicker) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showPicker]);

    return (
        <div
            ref={setNodeRef}
            onClick={() => {
                if (window.innerWidth < 768 && !isReviewMode) {
                    setShowPicker(true);
                }
            }}
            className={`
                min-h-[25px] md:w-[500px] w-full max-w-[95%] border rounded-md flex flex-col justify-center relative
                transition-all duration-300 px-6 py-0 group/slot mb-0.5
                ${value 
                    ? (isReviewMode 
                        ? (isCorrect 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-red-500 bg-red-50')
                        : 'border-blue-500 bg-white shadow-sm ring-1 ring-blue-100'
                      )
                    : (isOver 
                        ? 'border-black bg-gray-50 border-dashed scale-[1.005]' 
                        : 'border-black/40 bg-gray-50/20 border-dashed hover:border-black'
                      )
                }
                ${window.innerWidth < 768 && !isReviewMode ? 'cursor-pointer active:bg-gray-100' : ''}
            `}
        >
            <div className={`flex items-center gap-2 w-full ${!value ? 'justify-center' : ''}`}>
                <span className={`shrink-0 font-bold text-[15px] ${value ? 'text-blue-600' : 'text-black'} w-auto ${!value ? 'text-center' : ''}`}>
                    {questionId}
                </span>
                {value ? (
                    <div className="flex items-center w-full gap-3 overflow-hidden">
                        <span className="text-[14px] font-semibold text-gray-900 flex-1 leading-snug">
                            {displayFullText}
                        </span>
                        {!isReviewMode && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onClear(); }}
                                className="shrink-0 w-5 h-5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-all duration-200"
                                title="Remove heading"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                ) : null}
            </div>

            {isReviewMode && !isCorrect && correctAnswer && (
                <div className="mt-2 w-full bg-green-600 text-white text-[11px] px-2.5 py-1.5 rounded-none shadow-sm whitespace-normal font-bold border border-green-700 animate-in slide-in-from-top-1">
                    <span className="opacity-80 mr-1">Correct:</span>
                    {(() => {
                        const found = findOption(correctAnswer);
                        const finalText = found ? (typeof found === 'object' ? found.text : found) : correctAnswer;
                        return stripRomanNumerals(finalText);
                    })()}
                </div>
            )}

            {showPicker && (
                <div className="fixed inset-0 z-[5000] flex items-end justify-center bg-black/50 p-4" onClick={(e) => { e.stopPropagation(); setShowPicker(false); }}>
                    <div className="bg-white w-full max-w-md rounded-t-2xl p-4 overflow-y-auto max-h-[80vh] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4 border-b pb-2">
                            <h4 className="font-bold text-lg">Select Heading</h4>
                            <button onClick={() => setShowPicker(false)} className="text-gray-500 text-2xl">&times;</button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {options?.map((opt, idx) => {
                                const optText = typeof opt === 'object' ? opt.text : opt;
                                const cleanText = stripRomanNumerals(optText);
                                const optLabel = headingLabels[idx];

                                // Check if this option is used elsewhere
                                const isUsedElsewhere = userAnswers && Object.entries(userAnswers).some(([qId, ans]) => qId !== questionId && cleanStr(ans) === cleanStr(optLabel));
                                
                                if (isUsedElsewhere) return null;

                                const isCurrent = cleanStr(value) === cleanStr(optLabel);

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(30);
                                            onAnswerChange(questionId, optLabel);
                                            setShowPicker(false);
                                        }}
                                        className={`text-left px-4 py-3 border rounded-lg transition-colors text-[14px] font-medium flex gap-3 ${isCurrent ? 'bg-blue-50 border-blue-400 text-blue-700' : 'hover:bg-gray-50 border-gray-200 text-gray-800'}`}
                                    >
                                        <span className={`font-bold shrink-0 ${isCurrent ? 'text-blue-600' : 'text-gray-400'}`}>{optLabel}</span>
                                        <span>{cleanText}</span>
                                        {isCurrent && <Check size={16} className="ml-auto text-blue-500" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

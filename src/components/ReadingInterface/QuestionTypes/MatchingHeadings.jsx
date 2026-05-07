import React from "react";
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { stripRomanNumerals } from './CommonComponents';

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

    const cleanStr = (s) => String(s || "").trim().toLowerCase().replace(/\.$/, '');

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

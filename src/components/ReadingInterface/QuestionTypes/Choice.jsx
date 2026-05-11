import React from "react";
import HighlightableText from '../HighlightableText';
import { injectKeywordsToHTML } from '../../../utils/highlightUtils';
import { 
    checkAnswer, 
    QuestionExplanation, 
    QuestionBadge, 
    expandQuestionIds, 
    cleanQuestionText, 
    getOptionValue, 
    stripRomanNumerals 
} from './CommonComponents';

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

                        const cleanRawText = stripRomanNumerals(rawText.replace(new RegExp(`^${currentLetter}[\\.\\)\\s]+`, 'i'), '').trim());

                        let containerClass = "bg-transparent border-transparent";
                        let badgeClass = 'text-gray-600';
                        let checkContainerClass = isSelected ? "border-blue-600" : "border-gray-300";
                        let checkIconColor = "bg-blue-600";

                        if (isReviewMode) {
                            const isThisCorrect = correctAnswersList.includes(String(finalValue).toLowerCase());
                            if (isThisCorrect) {
                                containerClass = "bg-green-50/50 border-transparent";
                                badgeClass = "text-green-700 font-bold";
                                checkContainerClass = "border-green-600 bg-white ring-green-100";
                                checkIconColor = "bg-green-600";
                            } else if (isSelected && !isThisCorrect) {
                                containerClass = "bg-red-50/50 border-transparent";
                                badgeClass = "text-red-700 font-bold";
                                checkContainerClass = "border-red-600 bg-white ring-red-100";
                                checkIconColor = "bg-red-600";
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
                                            <div className={`w-2 h-2 rounded-full ${checkIconColor}`}></div>
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

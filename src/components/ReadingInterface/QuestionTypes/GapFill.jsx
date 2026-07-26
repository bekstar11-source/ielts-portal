import React from "react";
import HighlightableText from '../HighlightableText';
import { injectKeywordsToHTML } from '../../../utils/highlightUtils';
import { 
    checkAnswer, 
    QuestionExplanation, 
    ReadingTextInput,
    getOptionValue,
    isChoiceContext
} from './CommonComponents';

export const GapFillQuestion = ({ 
    group, q, val, onAnswerChange, isReviewMode, highlights, handlePartSelect, onRemoveHighlight, keywordTable, activePassage, handleLocationClick, isSummary, isFlowChart, isLast, onOpenNotes, isPremium
}) => {
    const itemOptions = (Array.isArray(q.options) && q.options.length > 0) ? q.options : (Array.isArray(group.options) ? group.options : []);
    const parts = (q.text || "").split(/(\[INPUT\]|\[DROP\])/g);
    const isCorrect = checkAnswer(val, q.answer, isChoiceContext(group.type, itemOptions));

    const renderParts = () => {
        return parts.map((part, i) => {
            const hasOptions = Array.isArray(itemOptions) && itemOptions.length > 0;
            const isSelectDropdown = part === '[DROP]' || (part === '[INPUT]' && hasOptions && (isSummary || group.type === 'summary_box' || group.type?.includes('note')));

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

            let cleanPart = part.replace(/<\/?p>|<\/?div>/gi, "");
            const escapedId = String(q.id || "").replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            if (escapedId) {
                cleanPart = cleanPart
                    .replace(new RegExp(`<(b|strong)>\\s*${escapedId}[\\.\\s]*<\\/\\1>`, "gi"), "")
                    .replace(new RegExp(`(\\s|^)${escapedId}[\\.\\s]*$`), "$1")
                    .replace(new RegExp(`^\\s*${escapedId}[\\.\\s]*`), "");
            }
            cleanPart = cleanPart.trim();
            
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
                    className="inline text-black leading-relaxed align-middle whitespace-pre-wrap"
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
                <span className="flex-1 text-black whitespace-pre-wrap">{renderParts()}</span>
            </div>
            {isReviewMode && q.explanation && <QuestionExplanation text={q.explanation} isPremium={isPremium} titleId={q.id} />}
        </div>
    );
};

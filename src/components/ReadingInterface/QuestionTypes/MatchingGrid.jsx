import React from "react";
import HighlightableText from '../HighlightableText';
import { injectKeywordsToHTML } from '../../../utils/highlightUtils';
import { checkAnswer, QuestionExplanation } from './CommonComponents';

// Variantlar ro'yxati uchun sarlavhani guruh ko'rsatmasidan aniqlaydi.
// MatchingOptionsBox va MatchingGridQuestion ikkalasi ham shundan foydalanadi.
export const getOptionsBoxTitle = (group) => {
    if (group?.type === 'summary_box') return "List of Words";

    const inst = String(group?.instruction || "").toLowerCase();
    const listMatch = inst.match(/list of\s+([a-zA-Z]+)/);
    if (listMatch && listMatch[1] && !['the', 'following', 'options'].includes(listMatch[1])) {
        return `List of ${listMatch[1].charAt(0).toUpperCase() + listMatch[1].slice(1)}`;
    }
    if (inst.includes("heading")) return "List of Headings";
    if (inst.includes("feature")) return "List of Features";
    if (inst.includes("researcher")) return "List of Researchers";
    if (inst.includes("people") || inst.includes("person")) return "List of People";
    if (inst.includes("countr")) return "List of Countries";
    if (inst.includes("cit")) return "List of Cities";
    if (inst.includes("name")) return "List of Names";
    return "List of Options";
};

export const MatchingOptionsBox = ({
    group, activePassage, highlights, handlePartSelect, onRemoveHighlight, keywordTable, isReviewMode, onOpenNotes
}) => {
    const boxTitle = getOptionsBoxTitle(group);

    return (
        <div className="bg-white p-4 rounded-lg mb-6 border border-gray-200 shadow-sm">
            <p className="text-xs font-bold mb-3 uppercase text-ielts-blue tracking-wider">{boxTitle}</p>
            <div className={group.type === 'matching' ? "flex flex-col gap-y-1.5" : "grid grid-cols-2 gap-x-4 gap-y-1.5"}>
                {Array.isArray(group.options) && group.options.map((opt, idx) => {
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
    const options = Array.isArray(group.options) ? group.options : [];
    const items = group.items || group.questions || [];
    
    const labels = options.map((opt, idx) => {
        const text = typeof opt === 'object' ? opt.text : opt;
        const match = String(text).trim().match(/^([A-Z])[\.\)\s]/i);
        return match ? match[1].toUpperCase() : String.fromCharCode(65 + idx);
    });

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
                            const isCorrect = checkAnswer(val, q.answer, true);
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
                                        // Markazlashgan solishtirish: kalit "A" ham, "A. Some text"
                                        // ham, "A/B" ham to'g'ri ishlaydi. Ilgari qat'iy tenglik edi,
                                        // shuning uchun prefiksli kalitlarda yashil katak ko'rinmasdi
                                        // (ball esa berilardi).
                                        const isThisCorrect = checkAnswer(label, q.answer, true);
                                        
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
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="max-w-[400px]">
                <table className="w-full border-collapse border border-black/40 bg-[#E9E9E9]">
                    <thead>
                        <tr>
                            <th colSpan="2" className="border border-black/40 p-2 text-left font-bold text-[16px]">
                                {/* Ilgari bu yerda bitta konkret testdan qolib ketgan
                                    "First invented or used by" matni qotirib qo'yilgan edi
                                    va u BARCHA matching-grid savollarida ko'rinardi. */}
                                {getOptionsBoxTitle(group)}
                            </th>
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

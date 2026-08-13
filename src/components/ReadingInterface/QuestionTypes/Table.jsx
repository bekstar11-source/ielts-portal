import React from "react";
import HighlightableText from '../HighlightableText';
import { injectKeywordsToHTML } from '../../../utils/highlightUtils';
import { checkAnswer, ReadingTextInput, QuestionExplanation, isChoiceContext } from './CommonComponents';

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
                                                    const isCorrect = checkAnswer(val, part.answer, isChoiceContext(group.type, group.options), group.options);
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

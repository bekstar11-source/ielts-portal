import React from "react";
import HighlightableText from './HighlightableText';
import { injectKeywordsToHTML } from '../../utils/highlightUtils';

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
    let inputBorderClass = "border-gray-300 focus:border-ielts-blue focus:ring-ielts-blue";
    let textClass = "text-ielts-blue";

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
        <span className="inline-flex items-center align-middle mx-1 whitespace-nowrap relative">
            <input
                className={`w-[110px] h-[26px] border rounded px-1 text-center font-semibold text-sm focus:outline-none focus:ring-1 transition-all bg-white disabled:bg-opacity-50 ${inputBorderClass} ${textClass}`}
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

// --- ASOSIY SAVOL TURLARI ---

const getOptionValue = (text) => {
    if (!text) return "";
    const match = text.match(/^([A-Z]|[ivxIVX]+)[\.\)\s]/);
    return match ? match[1].trim() : text;
};

const checkAnswer = (userVal, correctVal) => {
    if (!userVal || !correctVal) return false;
    return String(userVal).trim().toLowerCase() === String(correctVal).trim().toLowerCase();
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
    
    if (itemOptions.length === 0 && group.type) {
        const t = group.type.toLowerCase();
        if (t.includes('tfng') || t.includes('true_false')) itemOptions = ["TRUE", "FALSE", "NOT GIVEN"];
        else if (t.includes('yesno') || t.includes('yes_no')) itemOptions = ["YES", "NO", "NOT GIVEN"];
    }

    const correctAnswersList = String(q.answer || "").split(',').map(s => s.trim().toLowerCase());
    const isCorrect = checkAnswer(val, q.answer);

    return (
        <div className="flex gap-3 items-start mb-5">
            <QuestionBadge 
                id={q.id} 
                isReviewMode={isReviewMode} 
                isCorrect={isCorrect}
                onClick={() => isReviewMode && handleLocationClick(q.locationId, group.passageId)} 
            />
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
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 shadow-sm border select-none ${badgeClass}`}>
                                    {letters[idx] || letters[0]}
                                </div>
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
    group, q, val, onAnswerChange, isReviewMode, highlights, handlePartSelect, onRemoveHighlight, keywordTable, activePassage, handleLocationClick, isSummary, isFlowChart
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
                            className="inline-flex min-w-[24px] px-1 h-[24px] items-center justify-center rounded bg-white border border-gray-400 text-[13px] font-bold text-gray-700 mr-1 align-middle cursor-pointer hover:border-ielts-blue transition-colors shadow-sm"
                            onClick={() => handleLocationClick(q.locationId, group.passageId)}
                        >
                            {q.id}
                        </span>
                        <select
                            className={`h-[26px] border rounded px-1 pr-6 font-semibold text-sm focus:outline-none focus:ring-1 transition-all cursor-pointer min-w-[90px] max-w-full py-0 leading-none bg-white ${inputBorderClass}`}
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
            if (!cleanPart.trim()) return null;

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
    if (isSummary) containerClass = "inline leading-[2.2] text-justify mr-1.5 whitespace-pre-wrap";
    if (isFlowChart) containerClass = "block w-full border border-gray-800 p-3 mb-4 bg-white relative shadow-sm text-center";

    return (
        <div id={`q-${q.id}`} className={`group/item relative ${containerClass}`}>
            {!isSummary && !isFlowChart && (
                <div className="flex gap-3 items-start mb-2 pl-2">
                    <div className="flex-1 text-black">{renderParts()}</div>
                </div>
            )}
            {(isSummary || isFlowChart) && (
                <div className="text-black">
                    {renderParts()}
                    {isFlowChart && <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-gray-400 text-xl">↓</div>}
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

import React, { memo, useState, useRef, useCallback } from "react";
import HighlightableText from './HighlightableText';
import HighlightMenu from './HighlightMenu';
import { getSelectionOffsets, injectKeywordsToHTML } from '../../utils/highlightUtils';
const ReadingRightPane = memo(({
    testData,
    activePassage,
    userAnswers,
    onAnswerChange,
    isReviewMode,
    textSize = "text-base",
    qRef, // Tashqaridan kelgan Ref (Scroll uchun)
    handleLocationClick,
    highlights,
    onAddHighlight,
    onRemoveHighlight,
    onAddToWordBank,
    pendingPassageWord,
    onClearPending,
    testId,
    testName,
    onSaveAllWords,
    isSavingWB,
    keywordTable = []
}) => {
    // 1. Ichki Ref (Menyu ishlashi uchun kafolat)
    const internalRef = useRef(null);
    const [tempSelection, setTempSelection] = useState(null);
    // 🔥 MUHIM: Ham ichki refni, ham tashqi qRefni bog'laymiz
    const setRefs = useCallback((node) => {
        // 1. O'zimiz uchun saqlaymiz
        internalRef.current = node;
        // 2. Agar tashqaridan ref kelsa, unga ham beramiz (Scroll buzilmasligi uchun)
        if (qRef) {
            if (typeof qRef === 'function') qRef(node);
            else qRef.current = node;
        }
    }, [qRef]);

    if (!testData || !testData.questions || !testData.passages) {
        return <div className="h-full flex items-center justify-center text-gray-400">Loading...</div>;
    }

    // 2. Selection Handler
    const handlePartSelect = useCallback((partId, selection, containerNode) => {
        const { start, end, text } = getSelectionOffsets(selection, containerNode);

        // Bo'sh joy yoki juda qisqa matn bo'lsa inkor qilamiz
        if (!text || text.trim().length < 1) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // 🔥 ENDI ICHKI REF ISHLATILADI (Bu har doim bor)
        const container = internalRef.current;

        if (container) {
            const containerRect = container.getBoundingClientRect();

            // Scroll va pozitsiyani hisoblash
            const relativeTop = rect.top - containerRect.top + container.scrollTop;
            const relativeLeft = rect.left - containerRect.left + container.scrollLeft + (rect.width / 2);

            setTempSelection({
                id: partId,
                start,
                end,
                position: {
                    top: relativeTop - 45, // Matndan 45px tepada
                    left: relativeLeft
                }
            });
        }
    }, []); // Dependency bo'sh - internalRef barqaror

    const applyColor = useCallback((color) => {
        if (tempSelection) {
            onAddHighlight(tempSelection.id, {
                start: tempSelection.start,
                end: tempSelection.end,
                color: color
            });
            setTempSelection(null);
            window.getSelection().removeAllRanges();
        }
    }, [tempSelection, onAddHighlight]);

    const clearSelectionMenu = useCallback(() => {
        setTempSelection(null);
        window.getSelection().removeAllRanges();
    }, []);

    // --- HELPERLAR ---
    const checkAnswer = (userVal, correctVal) => {
        if (!userVal || !correctVal) return false;
        return String(userVal).trim().toLowerCase() === String(correctVal).trim().toLowerCase();
    };

    const getOptionValue = (text) => {
        if (!text) return "";
        const match = text.match(/^([A-Z]|[ivxIVX]+)[\.\)\s]/);
        return match ? match[1].trim() : text;
    };

    // --- RENDER INPUT (Jadval uchun) ---
    const renderInput = (qId, answer, locationId, passageId, isInline = false) => {
        const val = userAnswers[qId] || "";

        let isCorrect = false;
        let inputBorderClass = "border-gray-300 focus:border-ielts-blue focus:ring-ielts-blue";
        let textClass = "text-ielts-blue";

        if (isReviewMode) {
            isCorrect = checkAnswer(val, answer);
            if (isCorrect) {
                inputBorderClass = "border-green-500 bg-green-50 text-green-700 font-bold";
                textClass = "text-green-700";
            } else {
                inputBorderClass = "border-red-500 bg-red-50 text-red-700 font-bold";
                textClass = "text-red-700";
            }
        }

        const inlineNumberClass = `
            inline-flex min-w-[24px] w-fit px-1 h-[24px] items-center justify-center rounded bg-white border border-gray-400 text-[10px] font-bold text-gray-700 mr-1 align-middle select-none shadow-sm transition-colors
            ${isReviewMode ? 'cursor-pointer hover:border-ielts-blue hover:text-ielts-blue' : 'cursor-default'}
        `;

        return (
            <span key={qId} className="inline-flex items-center align-middle mx-1 whitespace-nowrap relative">
                <span
                    className={inlineNumberClass}
                    onClick={() => isReviewMode && locationId && handleLocationClick(locationId, passageId)}
                >
                    {qId}
                </span>
                <input
                    className={`w-[110px] h-[26px] border rounded px-1 text-center font-semibold text-sm focus:outline-none focus:ring-1 transition-all bg-white disabled:bg-opacity-50 placeholder-transparent ${inputBorderClass} ${textClass}`}
                    value={val}
                    onChange={(e) => onAnswerChange(qId, e.target.value)}
                    disabled={isReviewMode}
                    autoComplete="off"
                />
                {isReviewMode && !isCorrect && (
                    <span className="ml-1 text-[10px] font-bold text-green-600 bg-green-100 px-1 py-0.5 rounded border border-green-200 whitespace-nowrap">
                        ✓ {answer}
                    </span>
                )}
            </span>
        );
    };

    // --- RENDER PARTS ---
    const renderParts = (parts, q, val, isInlineQuestion, isSummary, itemOptions, isMatching, isReviewMode, onAnswerChange, group) => {
        const inlineNumberClass = `
            inline-flex min-w-[26px] w-fit px-1 h-[26px] items-center justify-center rounded bg-white border border-gray-400 text-xs font-bold text-gray-700 mr-2 align-middle select-none shadow-sm transition-colors
            ${isReviewMode ? 'cursor-pointer hover:border-ielts-blue hover:text-ielts-blue' : 'cursor-default'}
        `;

        let isCorrect = false;
        let inputBorderClass = "border-gray-300 focus:border-ielts-blue focus:ring-ielts-blue";
        let textClass = "text-ielts-blue";

        if (isReviewMode) {
            isCorrect = checkAnswer(val, q.answer);
            if (isCorrect) { inputBorderClass = "border-green-500 bg-green-50 text-green-700 font-bold"; textClass = "text-green-700"; }
            else { inputBorderClass = "border-red-500 bg-red-50 text-red-700 font-bold"; textClass = "text-red-700"; }
        }

        return parts.map((part, i) => {
            if (part === '[INPUT]') {
                return (
                    <span key={i} className="inline-flex items-center align-middle mx-1 whitespace-nowrap relative">
                        {(isInlineQuestion || isSummary) && (
                            <span className={inlineNumberClass} onClick={() => isReviewMode && handleLocationClick(q.locationId, group.passageId)}>{q.id}</span>
                        )}
                        <input
                            className={`w-[120px] h-[26px] border rounded px-1 text-center font-semibold text-sm focus:outline-none focus:ring-1 transition-all bg-white disabled:bg-opacity-50 placeholder-transparent ${inputBorderClass} ${textClass}`}
                            value={val}
                            onChange={(e) => onAnswerChange(q.id, e.target.value)}
                            disabled={isReviewMode}
                            autoComplete="off"
                        />
                        {isReviewMode && !isCorrect && (
                            <span className="ml-2 text-xs font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded border border-green-200 whitespace-nowrap">✓ {q.answer}</span>
                        )}
                    </span>
                );
            }
            if (part === '[DROP]') {
                return (
                    <span key={i} className="inline-flex items-center align-middle mx-1 whitespace-nowrap relative">
                        {(isInlineQuestion || isSummary) && (
                            <span className={inlineNumberClass} onClick={() => isReviewMode && handleLocationClick(q.locationId, group.passageId)}>{q.id}</span>
                        )}
                        <select
                            className={`h-[26px] border rounded px-1 pr-6 font-semibold text-sm focus:outline-none focus:ring-1 transition-all cursor-pointer min-w-[90px] max-w-full py-0 leading-none ${inputBorderClass} ${textClass}`}
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
                            <span className="ml-2 text-xs font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded border border-green-200 whitespace-nowrap">✓ {q.answer}</span>
                        )}
                    </span>
                );
            }

            // TEXT QISMI (HighlightableText)
            const cleanPart = part.replace(/<\/?p>|<\/?div>/gi, "");
            if (!cleanPart.trim()) return null;

            const partId = `p-${activePassage}-q-${q.id}-part-${i}`;
            // Review rejimida item text ichiga questionWord inject qilamiz (q.id bo'yicha filter)
            const injectedPart = (isReviewMode && keywordTable?.length)
                ? injectKeywordsToHTML(cleanPart, keywordTable, true, q.id)
                : cleanPart;

            return (
                <HighlightableText
                    key={i}
                    id={partId}
                    content={injectedPart}
                    highlights={highlights ? highlights[partId] || [] : []}
                    onTextSelect={handlePartSelect}
                    onHighlightRemove={onRemoveHighlight}
                    isReviewMode={isReviewMode}
                    className="inline text-gray-800 leading-relaxed align-middle [&_strong]:font-bold [&_b]:font-bold"
                />
            );
        });
    };

    // --- RENDER CHOICES ---
    const renderChoices = (itemOptions, q, val, isMultiSelect, isReviewMode, onAnswerChange, group) => {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        const correctAnswersList = String(q.answer || "").split(',').map(s => s.trim().toLowerCase());
        return (
            <div className="mt-2 flex flex-col gap-1.5 pl-1">
                {itemOptions.map((opt, idx) => {
                    const rawText = typeof opt === 'object' ? opt.text : opt;
                    const optId = typeof opt === 'object' ? (opt.id || rawText) : opt;
                    const finalValue = getOptionValue(String(optId));
                    const key = `${q.id}-${idx}`;
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
                            radioClass = "border-green-600 checked:bg-green-600 checked:border-green-600";
                        } else if (isSelected && !isThisCorrect) {
                            containerClass = "bg-red-50 border-red-200 ring-1 ring-red-400";
                            badgeClass = "bg-red-600 text-white border-red-600";
                            radioClass = "border-red-600 checked:bg-red-600 checked:border-red-600";
                        } else {
                            containerClass = "opacity-50";
                        }
                    } else if (isSelected) {
                        containerClass = "bg-blue-50 border-blue-100";
                    }

                    const partId = `p-${activePassage}-q-${q.id}-opt-${idx}`;

                    return (
                        <label key={key} className={`flex items-center gap-3 cursor-pointer p-1.5 rounded-lg border transition-all ${containerClass}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm border select-none ${badgeClass}`}>{letters[idx] || letters[0]}</div>
                            <div className="relative flex items-center justify-center shrink-0 select-none">
                                <input
                                    type={isMultiSelect ? "checkbox" : "radio"}
                                    className={`peer appearance-none w-4 h-4 border rounded-full checked:bg-white transition-all cursor-pointer ${radioClass} ${!isReviewMode && 'checked:border-ielts-blue'}`}
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
                                <div className={`absolute w-2 h-2 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none ${isReviewMode && correctAnswersList.includes(String(finalValue).toLowerCase()) ? 'bg-white' : 'bg-ielts-blue'} ${isReviewMode && isSelected && !correctAnswersList.includes(String(finalValue).toLowerCase()) ? 'bg-white' : ''}`}></div>
                            </div>
                            <HighlightableText
                                id={partId}
                                content={isReviewMode && keywordTable?.length
                                    ? injectKeywordsToHTML(rawText, keywordTable, true, null)
                                    : rawText}
                                highlights={highlights ? highlights[partId] || [] : []}
                                onTextSelect={handlePartSelect}
                                onHighlightRemove={onRemoveHighlight}
                                isReviewMode={isReviewMode}
                                className="text-sm text-gray-700 font-medium leading-relaxed grow select-text"
                            />
                        </label>
                    );
                })}
            </div>
        );
    };

    // --- RENDER TABLE ---
    const renderTable = (group) => {
        const rows = group.rows || group.items || [];
        return (
            <div className="overflow-x-auto border border-gray-300 rounded-lg shadow-sm">
                <table className="w-full text-sm text-left border-collapse">
                    <tbody>
                        {rows.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50/50">
                                {row.cells && row.cells.map((cell, cIdx) => (
                                    <td key={cIdx} className="border-r border-gray-200 last:border-r-0 p-3 align-top text-gray-700 leading-relaxed">
                                        {!cell.isMixed && (
                                            <span dangerouslySetInnerHTML={{ __html: cell.text }} />
                                        )}
                                        {cell.isMixed && cell.parts && cell.parts.map((part, pIdx) => {
                                            if (part.type === 'text') {
                                                return <span key={pIdx} dangerouslySetInnerHTML={{ __html: part.content }} />;
                                            }
                                            if (part.type === 'input') {
                                                return renderInput(
                                                    part.id,
                                                    part.answer,
                                                    part.locationId,
                                                    group.passageId,
                                                    true
                                                );
                                            }
                                            return null;
                                        })}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // 3. REF ULANDI (setRefs orqali)
    return (
        <div
            className={`h-full overflow-y-auto p-6 pb-20 box-border relative select-text bg-white ${textSize}`}
            ref={setRefs} // 🔥 Dual Ref
        >
            <HighlightMenu
                position={tempSelection?.position}
                onHighlight={applyColor}
                onClear={clearSelectionMenu}
                isReviewMode={isReviewMode}
                onAddToWordBank={onAddToWordBank}
                source="question"
            />

            <>

                {testData.questions
                    .filter(g => g.passageId === testData.passages[activePassage].id)
                    .map((group, gIdx) => {
                        const isChoiceType = ['mcq', 'pick_two', 'pick_three', 'multi', 'tfng', 'yesno', 'true_false', 'yes_no'].some(t => group.type && group.type.toLowerCase().includes(t));
                        const isMultiSelect = group.type === 'pick_two' || group.type === 'pick_three' || (group.type && group.type.includes('multi'));
                        const isMatching = group.type === 'matching' || (group.items && group.items.some(i => i.text && i.text.includes('[DROP]')));
                        const isSummary = group.type === 'gap_fill' || (group.type && group.type.includes('summary')) || group.type === 'summary_box';
                        const isTable = group.type === 'table_completion' || group.type === 'table';

                        const isJustLetters = group.options && group.options.length > 0 && group.options.every(opt => {
                            const text = String(typeof opt === 'object' ? opt.text : opt).trim();
                            return text.length <= 3 || /^[A-Z][\.\)]?\s*$/i.test(text);
                        });

                        const showStaticOptions = (group.type === 'matching' || group.type === 'summary_box') && group.options && group.options.length > 0 && !isJustLetters;

                        let boxTitle = "List of Options";
                        if (group.type === 'summary_box') {
                            boxTitle = "List of Words";
                        } else {
                            const tempType = String(group.type || "").toLowerCase();
                            const inst = String(group.instruction || "").toLowerCase();

                            const listMatch = inst.match(/list of\s+([a-zA-Z]+)/);
                            if (listMatch && listMatch[1] && !['the', 'following', 'options'].includes(listMatch[1])) {
                                boxTitle = `List of ${listMatch[1].charAt(0).toUpperCase() + listMatch[1].slice(1)}`;
                            } else if (tempType.includes("heading") || inst.includes("heading")) {
                                boxTitle = "List of Headings";
                            } else if (tempType.includes("feature") || inst.includes("feature")) {
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
                            <div key={gIdx} className="mb-8 pb-8 border-b border-gray-200 border-dashed last:border-0">
                                <div
                                    className="bg-white border border-gray-200 p-4 mb-5 rounded-lg text-sm font-semibold text-gray-700 shadow-sm"
                                    dangerouslySetInnerHTML={{
                                        __html: isReviewMode && keywordTable?.length
                                            ? injectKeywordsToHTML(group.instruction, keywordTable, true)
                                            : group.instruction
                                    }}
                                />

                                {showStaticOptions && (
                                    <div className="bg-white p-4 rounded-lg mb-6 border border-gray-200 shadow-sm">
                                        <p className="text-xs font-bold mb-3 uppercase text-gray-500 tracking-wider">{boxTitle}</p>
                                        <div className={group.type === 'matching' ? "flex flex-col gap-y-2" : "grid grid-cols-2 gap-x-4 gap-y-2"}>
                                            {group.options.map((opt, idx) => {
                                                const optText = typeof opt === 'object' ? opt.text : opt;
                                                const staticOptId = `p-${activePassage}-g-${gIdx}-static-opt-${idx}`;
                                                // Review rejimida options textiga questionWord inject qilamiz
                                                // Static options uchun questionId yo'q — barcha questionWordlar qidiriladi
                                                const injectedOptText = (isReviewMode && keywordTable?.length)
                                                    ? injectKeywordsToHTML(optText, keywordTable, true, null)
                                                    : optText;
                                                return (
                                                    <HighlightableText
                                                        key={idx}
                                                        id={staticOptId}
                                                        content={injectedOptText}
                                                        highlights={highlights ? highlights[staticOptId] || [] : []}
                                                        onTextSelect={handlePartSelect}
                                                        onHighlightRemove={onRemoveHighlight}
                                                        isReviewMode={isReviewMode}
                                                        className="text-sm text-gray-700 py-1 px-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors select-text"
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    {isTable ? renderTable(group) : (
                                        group.items?.map(q => {
                                            const isInlineQuestion = q.text.includes('[INPUT]') || q.text.includes('[DROP]');
                                            let itemOptions = (q.options && q.options.length > 0) ? q.options : (group.options || []);

                                            if (itemOptions.length === 0 && group.type) {
                                                const t = group.type.toLowerCase();
                                                if (t.includes('tfng') || t.includes('true_false')) itemOptions = ["TRUE", "FALSE", "NOT GIVEN"];
                                                else if (t.includes('yesno') || t.includes('yes_no')) itemOptions = ["YES", "NO", "NOT GIVEN"];
                                            }

                                            const isFlowChart = group.type === 'flow_chart';
                                            let containerClass = "block mb-5";
                                            if (isSummary) containerClass = "inline leading-[2.2] text-justify";
                                            if (isFlowChart) containerClass = "block w-full border border-gray-800 p-2 mb-4 bg-white relative shadow-sm";

                                            return (
                                                <div key={q.id} id={`q-${q.id}`} className={`group/item relative ${containerClass}`}>
                                                    {!isInlineQuestion && !isSummary && !isFlowChart && (
                                                        <div className="flex gap-3 items-start">
                                                            <div className={`min-w-[26px] w-fit px-1 h-[26px] flex items-center justify-center rounded bg-white border border-gray-400 text-xs font-bold text-gray-700 shrink-0 shadow-sm unselectable transition-colors mt-0.5 ${isReviewMode ? 'cursor-pointer hover:border-ielts-blue hover:text-ielts-blue' : 'cursor-default'}`} onClick={() => isReviewMode && handleLocationClick(q.locationId, group.passageId)}>{q.id}</div>
                                                            <div className="flex-1">
                                                                {renderParts(q.text.split(/(\[INPUT\]|\[DROP\])/g), q, userAnswers[q.id] || "", isInlineQuestion, isSummary, itemOptions, isMatching, isReviewMode, onAnswerChange, group)}
                                                                {isChoiceType && !isMatching && renderChoices(itemOptions, q, userAnswers[q.id] || "", isMultiSelect, isReviewMode, onAnswerChange, group)}
                                                                {isReviewMode && !isChoiceType && !isInlineQuestion && !isSummary && !checkAnswer(userAnswers[q.id], q.answer) && (
                                                                    <div className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded border border-green-200 inline-block"><span className="font-bold mr-1">Correct Answer:</span> {q.answer}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(isInlineQuestion || isSummary || isFlowChart) && (
                                                        <>
                                                            {renderParts(q.text.split(/(\[INPUT\]|\[DROP\])/g), q, userAnswers[q.id] || "", isInlineQuestion, isSummary, itemOptions, isMatching, isReviewMode, onAnswerChange, group)}
                                                            {isFlowChart && <div className="absolute -bottom-3.5 left-1/2 transform -translate-x-1/2 text-gray-800 text-lg font-bold leading-none z-10">↓</div>}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
            </>
        </div>
    );
}, (prev, next) =>
    prev.textSize === next.textSize &&
    prev.userAnswers === next.userAnswers &&
    prev.activePassage === next.activePassage &&
    prev.isReviewMode === next.isReviewMode &&
    prev.highlights === next.highlights &&
    prev.pendingPassageWord === next.pendingPassageWord &&
    prev.keywordTable === next.keywordTable
);

export default ReadingRightPane;
import React, { memo, useState, useRef, useCallback } from "react";
import HighlightMenu from './HighlightMenu';
import { getSelectionOffsets } from '../../utils/highlightUtils';
import { 
    ChoiceQuestion, 
    GapFillQuestion, 
    TableQuestion, 
    MatchingOptionsBox,
    ReadingDraggableHeading
} from './ReadingQuestionTypes';

const ReadingRightPane = memo(({
    testData,
    activePassage,
    userAnswers,
    onAnswerChange,
    isReviewMode,
    textSize = "text-base",
    qRef, 
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
    const internalRef = useRef(null);
    const [tempSelection, setTempSelection] = useState(null);

    const setRefs = useCallback((node) => {
        internalRef.current = node;
        if (qRef) {
            if (typeof qRef === 'function') qRef(node);
            else qRef.current = node;
        }
    }, [qRef]);

    if (!testData || !testData.questions || !testData.passages) {
        return <div className="h-full flex items-center justify-center text-black">Loading...</div>;
    }

    const handlePartSelect = useCallback((partId, selection, containerNode) => {
        const { start, end, text } = getSelectionOffsets(selection, containerNode);
        if (!text || text.trim().length < 1) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const container = internalRef.current;

        if (container) {
            const containerRect = container.getBoundingClientRect();
            const relativeTop = rect.top - containerRect.top + container.scrollTop;
            const relativeLeft = rect.left - containerRect.left + container.scrollLeft + (rect.width / 2);

            setTempSelection({
                id: partId,
                start,
                end,
                position: {
                    top: relativeTop - 45,
                    left: relativeLeft
                }
            });
        }
    }, []);

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

    const toRoman = (num) => {
        const lookup = { m: 1000, cm: 900, d: 500, cd: 400, c: 100, xc: 90, l: 50, xl: 40, x: 10, ix: 9, v: 5, iv: 4, i: 1 };
        let roman = '', i;
        for (i in lookup) {
            while (num >= lookup[i]) {
                roman += i;
                num -= lookup[i];
            }
        }
        return roman;
    };

    const getRangeLabel = (group) => {
        let allItems = group.items ? [...group.items] : [];
        if (group.questions) allItems = [...allItems, ...group.questions];
        if (group.groups) {
            group.groups.forEach(sub => {
                if (sub.items) allItems = [...allItems, ...sub.items];
                if (sub.questions) allItems = [...allItems, ...sub.questions];
            });
        }
        // Also extract IDs from table rows/cells
        if (group.rows) {
            group.rows.forEach(row => {
                const cells = Array.isArray(row) ? row : (row.cells || []);
                cells.forEach(cell => {
                    if (cell.id) allItems.push(cell);
                    if (cell.content) cell.content.forEach(c => { if (c.id) allItems.push(c); });
                    if (cell.parts) cell.parts.forEach(p => { if (p.id) allItems.push(p); });
                });
            });
        }
        
        // Expand range IDs like "1–3" into individual numbers
        const qIds = [];
        allItems.forEach(it => {
            const idStr = String(it.id || "");
            if (/^\d+\s*[\-–]\s*\d+$/.test(idStr)) {
                const parts = idStr.split(/[\-–]/);
                const start = parseInt(parts[0].trim());
                const end = parseInt(parts[1].trim());
                if (!isNaN(start) && !isNaN(end)) {
                    for (let n = Math.min(start, end); n <= Math.max(start, end); n++) qIds.push(n);
                }
            } else {
                const num = parseInt(idStr);
                if (!isNaN(num)) qIds.push(num);
            }
        });
        qIds.sort((a, b) => a - b);
        // Deduplicate
        const uniqueIds = [...new Set(qIds)];
        return uniqueIds.length > 0 ? `Questions ${uniqueIds[0]}${uniqueIds.length > 1 ? '–' + uniqueIds[uniqueIds.length - 1] : ''}` : "";
    };

    const cleanInstructions = (group, isTFNG) => {
        let displayInstruction = group.instruction || "";
        // Strip leading "Questions X-Y" (supports hyphens, en-dashes, and "to")
        displayInstruction = displayInstruction.replace(/^(?:<[^>]*>)*Questions?\s+\d+(?:\s*(?:[\-–]|to)\s*\d+)?\s*/gi, '');
        // Also strip standalone range fragments like "–33" or "-30" at the start
        displayInstruction = displayInstruction.replace(/^(?:<[^>]*>)*[\-–]\d+\s*/g, '');
        
        // Bold word limits and important phrases
        displayInstruction = displayInstruction.replace(/(NO MORE THAN [^.]+(?:WORDS?|NUMBERS?|A NUMBER)|ONE WORD ONLY|AND\/OR A NUMBER|TWO WORDS|THREE WORDS)/gi, '<strong>$1</strong>');

        if (isTFNG) {
            displayInstruction = displayInstruction.replace(/In boxes \d+(?:\s*[\-–]\s*\d+)? on your answer sheet,? write:?\s*/gi, '');
            displayInstruction = displayInstruction.replace(/(TRUE|FALSE|NOT GIVEN|YES|NO)/g, '<br /><strong>$1</strong>');
            displayInstruction = displayInstruction.replace(/(<br\s*\/?>\s*)+<br\s*\/?>/g, '<br />');
        }
        return displayInstruction;
    };

    return (
        <div
            className={`h-full overflow-y-auto p-6 pb-20 box-border relative select-text bg-white text-black`}
            style={{
                fontSize: textSize === 'text-sm' ? '14px' : textSize === 'text-lg' ? '18px' : textSize === 'text-xl' ? '20px' : '16px',
                transition: 'font-size 0.3s ease-in-out'
            }}
            ref={setRefs}
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
                    .map((group, gIdx, filteredQuestions) => {
                        const type = String(group.type || "").toLowerCase();
                        const instr = String(group.instruction || "").toLowerCase();
                        const isChoiceType = ['mcq', 'pick_two', 'pick_three', 'multi', 'tfng', 'yesno', 'true_false', 'yes_no'].some(t => type.includes(t));
                        const isMultiSelect = type.includes('pick_two') || type.includes('pick_three') || type.includes('multi');
                        const isMatching = type.includes('matching') || (group.items && group.items.some(i => i.text && i.text.includes('[DROP]')));
                        const isSummary = type === 'gap_fill' || type.includes('summary') || type === 'summary_box' || type.includes('flow') || type.includes('note');
                        const isFlowChart = type.includes('flow') || instr.includes('flow-chart') || instr.includes('flow chart');
                        const isTable = type.includes('table');
                        const isDiagram = type.includes('diagram') || type.includes('labeling');
                        const isTFNG = type.includes('tfng') || type.includes('yesno') || type.includes('true_false') || type.includes('yes_no');

                        const rangeLabel = getRangeLabel(group);
                        const displayInstruction = cleanInstructions(group, isTFNG);

                        const isJustLetters = group.options && group.options.length > 0 && group.options.every(opt => {
                            const text = String(typeof opt === 'object' ? opt.text : opt).trim();
                            return text.length <= 3 || /^[A-Z][\.\)]?\s*$/i.test(text);
                        });
                        const isMatchingParagraph = (type.includes('matching') && (type.includes('paragraph') || (group.instruction && group.instruction.toLowerCase().includes('paragraph contains'))));
                        const showStaticOptions = ((type.includes('matching') && !isMatchingParagraph) || type === 'summary_box') && group.options && group.options.length > 0 && !isJustLetters;

                        const commonProps = {
                            group,
                            activePassage,
                            userAnswers,
                            onAnswerChange,
                            isReviewMode,
                            highlights,
                            handlePartSelect,
                            onRemoveHighlight,
                            keywordTable,
                            handleLocationClick
                        };

                        // Detect matching headings specifically
                        const isMatchingHeading = type.includes('matching') && (
                            instr.includes('heading') || 
                            type.includes('heading') ||
                            (group.options && group.options.some(opt => {
                                const t = String(typeof opt === 'object' ? opt.text : opt).toLowerCase();
                                return t.length > 15; // Headings are typically longer text
                            }) && instr.includes('paragraph'))
                        );

                        return (
                            <div key={gIdx} className="mb-6 pb-6 border-b border-gray-200 border-dashed last:border-0 font-montserrat">
                                {rangeLabel && <h3 className="text-[15.5px] font-bold text-black mb-4">{rangeLabel}</h3>}

                                {(!gIdx || (gIdx > 0 && String(filteredQuestions[gIdx - 1].instruction || "").replace(/<[^>]*>/g, '').trim().toLowerCase() !== String(group.instruction || "").replace(/<[^>]*>/g, '').trim().toLowerCase())) && group.instruction && (
                                    <div className="bg-transparent border-none p-0 mb-6 shadow-none font-normal text-black italic text-[15.5px]" dangerouslySetInnerHTML={{ __html: displayInstruction }} />
                                )}

                                {/* MATCHING HEADINGS — DnD mode */}
                                {isMatchingHeading && group.options && group.options.length > 0 ? (
                                    <div className="flex flex-col gap-4">
                                        {/* Draggable headings pool — No background, transparent wrapper */}
                                        <div className="bg-transparent p-0 border-none shadow-none">
                                            <p className="text-[14px] font-bold mb-4 uppercase text-slate-800 tracking-wide">
                                                List of Headings
                                            </p>
                                            <div className="flex flex-col gap-2">
                                                {group.options.map((opt, idx) => {
                                                    const optText = typeof opt === 'object' ? opt.text : opt;
                                                    
                                                    // Rim raqamini matndan qidiramiz (Label sifatida ishlatish uchun)
                                                    let optLabel = typeof opt === 'object' ? (opt.label || opt.id) : null;
                                                    
                                                    if (!optLabel) {
                                                        const match = String(optText).trim().match(/^([ivx\d]+)[\.\)\s]+/i);
                                                        if (match) {
                                                            optLabel = match[1].toLowerCase();
                                                        } else {
                                                            // Agar matnda bo'lmasa, Rim raqami generatsiya qilamiz
                                                            optLabel = toRoman(idx + 1);
                                                        }
                                                    }

                                                    const questions = group.items || [];
                                                    const isUsed = questions.some(q => userAnswers[q.id] === optLabel);

                                                    // Ishlatilgan headingni pooldan to'liq olib tashlaymiz
                                                    if (isUsed && !isReviewMode) return null;

                                                    return (
                                                        <ReadingDraggableHeading
                                                            key={idx}
                                                            label={optLabel}
                                                            text={optText}
                                                            isUsed={isUsed}
                                                            isReviewMode={isReviewMode}
                                                        />
                                                    );
                                                })}
                                                {/* Barcha headinglar joylashganda */}
                                                {!isReviewMode && (group.items || []).length > 0 && 
                                                 (group.items || []).every(q => userAnswers[q.id]) && (
                                                    <div className="text-center py-4 text-gray-400 text-[12px] border-2 border-dashed border-gray-100 rounded-lg italic">
                                                        ✓ All headings placed
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {showStaticOptions && <MatchingOptionsBox {...commonProps} />}

                                        <div className={isSummary || isDiagram ? "mt-4" : ""}>
                                            {isTable ? (
                                                <TableQuestion {...commonProps} />
                                            ) : isDiagram ? (
                                                <DiagramLabelingQuestion {...commonProps} />
                                            ) : isSummary && !isFlowChart ? (
                                                <p className="leading-[2.2] text-black">
                                                    {group.items?.map((q, qIdx) => {
                                                        const startsWithBold = q.text && q.text.trimStart().startsWith('<b>');
                                                        return (
                                                            <React.Fragment key={q.id}>
                                                                {qIdx > 0 && startsWithBold && <br />}
                                                                <GapFillQuestion 
                                                                    q={q} 
                                                                    val={userAnswers[q.id] || ""} 
                                                                    isSummary={isSummary} 
                                                                    isFlowChart={false}
                                                                    isLast={qIdx === (group.items.length - 1)}
                                                                    {...commonProps} 
                                                                />
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </p>
                                            ) : (
                                                group.items?.map((q, qIdx) => {
                                                    if (isChoiceType && !isMatching) {
                                                        return <ChoiceQuestion key={q.id} q={q} val={userAnswers[q.id] || ""} isMultiSelect={isMultiSelect} {...commonProps} />;
                                                    }
                                                    return (
                                                        <GapFillQuestion 
                                                            key={q.id} 
                                                            q={q} 
                                                            val={userAnswers[q.id] || ""} 
                                                            isSummary={isSummary} 
                                                            isFlowChart={isFlowChart}
                                                            isLast={qIdx === (group.items.length - 1)}
                                                            {...commonProps} 
                                                        />
                                                    );
                                                })
                                            )}
                                        </div>
                                    </>
                                )}
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
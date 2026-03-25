import React, { memo, useState, useRef, useCallback } from "react";
import HighlightMenu from './HighlightMenu';
import { getSelectionOffsets } from '../../utils/highlightUtils';
import { 
    ChoiceQuestion, 
    GapFillQuestion, 
    TableQuestion, 
    MatchingOptionsBox 
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

    const getRangeLabel = (group) => {
        const qIds = group.items?.map(it => parseInt(it.id)).filter(id => !isNaN(id)).sort((a, b) => a - b);
        return qIds && qIds.length > 0 ? `Questions ${qIds[0]}${qIds.length > 1 ? '-' + qIds[qIds.length - 1] : ''}` : "";
    };

    const cleanInstructions = (group, isTFNG) => {
        let displayInstruction = group.instruction || "";
        displayInstruction = displayInstruction.replace(/^(?:<[^>]*>)*Questions \d+(?:-\d+)?\s*/gi, '');
        
        // Bold word limits and important phrases
        displayInstruction = displayInstruction.replace(/(NO MORE THAN [^.]+(?:WORDS?|NUMBERS?|A NUMBER)|ONE WORD ONLY|AND\/OR A NUMBER|TWO WORDS|THREE WORDS)/gi, '<strong>$1</strong>');

        if (isTFNG) {
            displayInstruction = displayInstruction.replace(/In boxes \d+(?:-\d+)? on your answer sheet,? write:?\s*/gi, '');
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
                        const isChoiceType = ['mcq', 'pick_two', 'pick_three', 'multi', 'tfng', 'yesno', 'true_false', 'yes_no'].some(t => type.includes(t));
                        const isMultiSelect = type.includes('pick_two') || type.includes('pick_three') || type.includes('multi');
                        const isMatching = type.includes('matching') || (group.items && group.items.some(i => i.text && i.text.includes('[DROP]')));
                        const isSummary = type === 'gap_fill' || type.includes('summary') || type === 'summary_box' || type === 'flow_chart';
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

                        return (
                            <div key={gIdx} className="mb-6 pb-6 border-b border-gray-200 border-dashed last:border-0 font-montserrat">
                                {rangeLabel && <h3 className="text-xl font-bold text-black mb-4">{rangeLabel}</h3>}

                                {(!gIdx || (gIdx > 0 && String(filteredQuestions[gIdx - 1].instruction || "").replace(/<[^>]*>/g, '').trim().toLowerCase() !== String(group.instruction || "").replace(/<[^>]*>/g, '').trim().toLowerCase())) && group.instruction && (
                                    <div className="bg-transparent border-none p-0 mb-6 shadow-none font-normal text-black italic text-[15.5px]" dangerouslySetInnerHTML={{ __html: displayInstruction }} />
                                )}

                                {showStaticOptions && <MatchingOptionsBox {...commonProps} />}

                                <div className={isSummary || isDiagram ? "mt-4" : ""}>
                                    {isTable ? (
                                        <TableQuestion {...commonProps} />
                                    ) : isDiagram ? (
                                        <DiagramLabelingQuestion {...commonProps} />
                                    ) : (
                                        group.items?.map(q => {
                                            if (isChoiceType && !isMatching) {
                                                return <ChoiceQuestion key={q.id} q={q} val={userAnswers[q.id] || ""} isMultiSelect={isMultiSelect} {...commonProps} />;
                                            }
                                            return (
                                                <GapFillQuestion 
                                                    key={q.id} 
                                                    q={q} 
                                                    val={userAnswers[q.id] || ""} 
                                                    isSummary={isSummary} 
                                                    isFlowChart={type === 'flow_chart'}
                                                    {...commonProps} 
                                                />
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
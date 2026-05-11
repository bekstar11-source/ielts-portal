import React, { memo, useState, useRef, useCallback } from "react";
import HighlightMenu from './HighlightMenu';
import useTextSelection from "../../hooks/useTextSelection";
import { getSelectionOffsets } from '../../utils/highlightUtils';
import QuestionGroup from './RightPane/QuestionGroup';

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
    keywordTable = [],
    onAddNote,
    onOpenNotes,
    isPremium
}) => {
    const internalRef = useRef(null);
    const [tempSelection, setTempSelection] = useState(null);
    const { addToDictionary } = useTextSelection();

    const setRefs = useCallback((node) => {
        internalRef.current = node;
        if (qRef) {
            if (typeof qRef === 'function') qRef(node);
            else qRef.current = node;
        }
    }, [qRef]);

    const handlePartSelect = useCallback((partId, selection, containerNode) => {
        const { start, end, text } = getSelectionOffsets(selection, containerNode);
        if (!text || text.trim().length < 2) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setTempSelection({
            id: partId,
            start,
            end,
            position: {
                top: rect.top - 55,
                left: rect.left + (rect.width / 2)
            }
        });
    }, []);

    const applyAction = useCallback((action) => {
        if (tempSelection) {
            if (action === 'note') {
                const hlId = `hl-${Date.now()}`;
                const noteColor = '#bfdbfe'; 
                
                onAddHighlight(tempSelection.id, {
                    id: hlId,
                    start: tempSelection.start,
                    end: tempSelection.end,
                    color: noteColor,
                    isNote: true
                });
                
                const text = window.getSelection().toString();
                if (onAddNote) {
                    onAddNote({
                        id: `note-${Date.now()}`,
                        text: text,
                        hlId: hlId,
                        timestamp: Date.now(),
                        source: 'question',
                        partId: tempSelection.id,
                        start: tempSelection.start,
                        end: tempSelection.end
                    });
                }
            } else {
                onAddHighlight(tempSelection.id, {
                    start: tempSelection.start,
                    end: tempSelection.end,
                    color: action
                });
            }
            setTempSelection(null);
            window.getSelection().removeAllRanges();
        }
    }, [tempSelection, onAddHighlight, onAddNote]);

    const clearSelectionMenu = useCallback(() => {
        setTempSelection(null);
        window.getSelection().removeAllRanges();
    }, []);

    if (!testData || !testData.questions || !testData.passages) {
        return <div className="h-full flex items-center justify-center text-black">Loading...</div>;
    }

    const filteredQuestions = testData.questions.filter(g => g.passageId === testData.passages[activePassage].id);

    return (
        <div className="h-full relative flex flex-col">
            <HighlightMenu
                position={tempSelection?.position}
                onHighlight={applyAction}
                onClear={clearSelectionMenu}
                onAddDictionary={() => addToDictionary({ sectionTitle: `Questions`, testTitle: testName || "Reading Test" })}
                isReviewMode={isReviewMode}
                onAddToWordBank={onAddToWordBank}
                onAddNote={() => applyAction('note')}
                source="question"
            />

            <div
                className={`flex-1 overflow-y-auto pt-10 px-6 pb-20 box-border relative select-text bg-white text-black reading-pane-scroll`}
                style={{
                    fontSize: textSize === 'text-sm' ? '14px' : textSize === 'text-lg' ? '18px' : textSize === 'text-xl' ? '20px' : '16px',
                    transition: 'font-size 0.3s ease-in-out'
                }}
                ref={setRefs}
            >
                {filteredQuestions.map((group, gIdx) => (
                    <QuestionGroup 
                        key={gIdx}
                        group={group}
                        gIdx={gIdx}
                        filteredQuestions={filteredQuestions}
                        activePassage={activePassage}
                        userAnswers={userAnswers}
                        onAnswerChange={onAnswerChange}
                        isReviewMode={isReviewMode}
                        highlights={highlights}
                        handlePartSelect={handlePartSelect}
                        onRemoveHighlight={onRemoveHighlight}
                        keywordTable={keywordTable}
                        handleLocationClick={handleLocationClick}
                        onOpenNotes={onOpenNotes}
                        isPremium={isPremium}
                    />
                ))}
            </div>
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
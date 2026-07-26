import React from "react";
import { 
    ChoiceQuestion, 
    GapFillQuestion, 
    TableQuestion, 
    MatchingOptionsBox,
    MatchingGridQuestion,
    ReadingDraggableHeading,
    FlowChartQuestion,
    QuestionExplanation
} from '../ReadingQuestionTypes';
import { getRangeLabel, cleanInstructions, getHeadingOptionLabels } from './RightPaneUtils';

const QuestionGroup = ({ 
    group, 
    gIdx, 
    filteredQuestions, 
    activePassage, 
    userAnswers, 
    onAnswerChange, 
    isReviewMode, 
    highlights, 
    handlePartSelect, 
    onRemoveHighlight, 
    keywordTable, 
    handleLocationClick, 
    onOpenNotes, 
    isPremium 
}) => {
    const type = String(group.type || "").toLowerCase();
    const instr = String(group.instruction || "").toLowerCase();
    
    const isChoiceType = ['mcq', 'pick_two', 'pick_three', 'multi', 'tfng', 'yesno', 'true_false', 'yes_no'].some(t => type.includes(t));
    const isMultiSelect = type.includes('pick_two') || 
                          type.includes('pick_three') || 
                          (type.includes('multi') && 
                           !type.includes('multiple_choice') && 
                           !type.includes('multiple choice') && 
                           !type.includes('multi_choice') && 
                           !type.includes('multi choice'));
    const isMatching = type.includes('matching') || (group.items && group.items.some(i => i.text && i.text.includes('[DROP]')));
    const isSummary = (type === 'gap_fill' || type.includes('summary') || type === 'summary_box') && !type.includes('note') && !type.includes('flow');
    const isFlowChart = type.includes('flow') || instr.includes('flow-chart') || instr.includes('flow chart');
    const isTable = type.includes('table');
    const isDiagram = type.includes('diagram') || type.includes('labeling');
    const isTFNG = type.includes('tfng') || type.includes('yesno') || type.includes('true_false') || type.includes('yes_no');

    const rangeLabel = getRangeLabel(group);
    const displayInstruction = cleanInstructions(group, isTFNG);

    const isJustLetters = Array.isArray(group.options) && group.options.length > 0 && group.options.every(opt => {
        const text = String(typeof opt === 'object' ? opt.text : opt).trim();
        return text.length <= 3 || /^[A-Z][\.\)]?\s*$/i.test(text);
    });
    
    const isMatchingParagraph = (type.includes('matching') && (type.includes('paragraph') || instr.includes('paragraph') || instr.includes('contain') || instr.includes('mention')));
    const showStaticOptions = ((type.includes('matching') && !isMatchingParagraph) || isSummary || isFlowChart) && Array.isArray(group.options) && group.options.length > 0 && !isJustLetters;

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
        handleLocationClick,
        onOpenNotes,
        isPremium
    };

    const isMatchingHeading = type.includes('matching') && (
        instr.includes('heading') ||
        type.includes('heading') ||
        // Fallback heuristic for instructions that don't literally say "heading": long option text
        // + "paragraph" wording. Guarded with !isMatchingParagraph so genuine "match information/
        // features to paragraphs" questions (instr mentions "contain"/"mention"/"paragraph" with
        // long descriptive options) aren't misclassified as heading-matching — that mismatch caused
        // heading-style (roman-numeral) answers to be stored/compared against a letter-based answer
        // key, marking correct answers wrong.
        (!isMatchingParagraph && Array.isArray(group.options) && group.options.some(opt => {
            const t = String(typeof opt === 'object' ? opt.text : opt).toLowerCase();
            return t.length > 15;
        }) && instr.includes('paragraph'))
    );

    const isMatchingGrid = type.includes('matching') && !isMatchingHeading && !isMatchingParagraph && Array.isArray(group.options) && group.options.length > 0;

    const nextGroup = filteredQuestions[gIdx + 1];
    const nextType = nextGroup ? String(nextGroup.type || "").toLowerCase() : "";
    const isNextChoice = nextGroup && ['mcq', 'pick_two', 'pick_three', 'multi', 'tfng', 'yesno', 'true_false', 'yes_no'].some(t => nextType.includes(t));
    const hideBorder = isChoiceType && isNextChoice;

    return (
        <div className={`font-montserrat ${hideBorder ? 'mb-2 pb-2' : 'mb-6 pb-6 border-b border-gray-200 border-dashed last:border-0'}`}>
            {rangeLabel && <h3 className="text-[15.5px] font-bold text-black mb-4">{rangeLabel}</h3>}

            {(!gIdx || (gIdx > 0 && String(filteredQuestions[gIdx - 1].instruction || "").replace(/<[^>]*>/g, '').trim().toLowerCase() !== String(group.instruction || "").replace(/<[^>]*>/g, '').trim().toLowerCase())) && group.instruction && (
                <div className="bg-transparent border-none p-0 mb-6 shadow-none font-normal text-black text-[15.5px]" dangerouslySetInnerHTML={{ __html: displayInstruction }} />
            )}

            {isMatchingGrid ? (
                <MatchingGridQuestion {...commonProps} />
            ) : isMatchingHeading && group.options && group.options.length > 0 ? (
                <div className="flex flex-col gap-4">
                    <div className="bg-transparent p-0 border-none shadow-none">
                        <p className="text-[16px] font-bold mb-4 text-black">
                            List of Headings
                        </p>
                        <div className="flex flex-col gap-2">
                            {(() => {
                                const headingLabels = getHeadingOptionLabels(group.options);
                                return group.options.map((opt, idx) => {
                                    const optText = typeof opt === 'object' ? opt.text : opt;
                                    const optLabel = headingLabels[idx];

                                    const questions = group.items || [];
                                    const isUsed = questions.some(q => userAnswers[q.id] === optLabel);

                                    if (isUsed && !isReviewMode) return null;

                                    return (
                                        <ReadingDraggableHeading
                                            key={idx}
                                            optionKey={idx}
                                            label={optLabel}
                                            text={optText}
                                            isUsed={isUsed}
                                            isReviewMode={isReviewMode}
                                        />
                                    );
                                });
                            })()}
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
                            <>
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
                                {isReviewMode && group.items?.some(q => q.explanation) && (
                                    <div className="mt-4 flex flex-col gap-2">
                                        {group.items.filter(q => q.explanation).map(q => (
                                            <QuestionExplanation 
                                                key={`exp-${q.id}`} 
                                                text={q.explanation} 
                                                isPremium={isPremium} 
                                                titleId={q.id}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : isFlowChart ? (
                            <FlowChartQuestion {...commonProps} />
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
                                        isFlowChart={false}
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
};

export default QuestionGroup;

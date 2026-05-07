import React from "react";
import { 
    ChoiceQuestion, 
    GapFillQuestion, 
    TableQuestion, 
    MatchingOptionsBox,
    MatchingGridQuestion,
    ReadingDraggableHeading,
    FlowChartQuestion,
    QuestionExplanation,
    toRoman
} from '../ReadingQuestionTypes';
import { getRangeLabel, cleanInstructions } from './RightPaneUtils';

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
    
    const isMatchingParagraph = (type.includes('matching') && (type.includes('paragraph') || instr.includes('paragraph') || instr.includes('contain') || instr.includes('mention')));
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
        handleLocationClick,
        onOpenNotes,
        isPremium
    };

    const isMatchingHeading = type.includes('matching') && (
        instr.includes('heading') || 
        type.includes('heading') ||
        (group.options && group.options.some(opt => {
            const t = String(typeof opt === 'object' ? opt.text : opt).toLowerCase();
            return t.length > 15;
        }) && instr.includes('paragraph'))
    );

    const isMatchingGrid = type.includes('matching') && !isMatchingHeading && !isMatchingParagraph && group.options && group.options.length > 0;

    return (
        <div className="mb-6 pb-6 border-b border-gray-200 border-dashed last:border-0 font-montserrat">
            {rangeLabel && <h3 className="text-[15.5px] font-bold text-black mb-4">{rangeLabel}</h3>}

            {(!gIdx || (gIdx > 0 && String(filteredQuestions[gIdx - 1].instruction || "").replace(/<[^>]*>/g, '').trim().toLowerCase() !== String(group.instruction || "").replace(/<[^>]*>/g, '').trim().toLowerCase())) && group.instruction && (
                <div className="bg-transparent border-none p-0 mb-6 shadow-none font-normal text-black text-[15.5px]" dangerouslySetInnerHTML={{ __html: displayInstruction }} />
            )}

            {isMatchingGrid ? (
                <MatchingGridQuestion {...commonProps} />
            ) : isMatchingHeading && group.options && group.options.length > 0 ? (
                <div className="flex flex-col gap-4">
                    <div className="bg-transparent p-0 border-none shadow-none">
                        <p className="text-[14px] font-bold mb-4 uppercase text-slate-800 tracking-wide">
                            List of Headings
                        </p>
                        <div className="flex flex-col gap-2">
                            {group.options.map((opt, idx) => {
                                const optText = typeof opt === 'object' ? opt.text : opt;
                                let optLabel = typeof opt === 'object' ? (opt.label || opt.id) : null;
                                
                                if (!optLabel) {
                                    const match = String(optText).trim().match(/^([ivx\d]+)[\.\)\s]+/i);
                                    if (match) {
                                        optLabel = match[1].toLowerCase();
                                    } else {
                                        optLabel = toRoman(idx + 1);
                                    }
                                }

                                const questions = group.items || [];
                                const isUsed = questions.some(q => userAnswers[q.id] === optLabel);

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

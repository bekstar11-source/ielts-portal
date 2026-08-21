import React from "react";
import { 
    ChoiceQuestion, 
    GapFillQuestion, 
    TableQuestion, 
    MatchingOptionsBox,
    MatchingGridQuestion,
    ReadingDraggableHeading,
    FlowChartQuestion,
    DiagramLabelingQuestion,
    QuestionExplanation
} from '../ReadingQuestionTypes';
import { getRangeLabel, cleanInstructions, getHeadingOptionLabels } from './RightPaneUtils';
import { classifyReadingGroup, isReadingChoiceGroup, resolveReadingRenderer } from '../../../utils/questionTypeRegistry.js';
import { isMultiAnswerType } from '../../../utils/ieltsScoring';

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
    // Tasniflash `questionTypeRegistry.classifyReadingGroup` da — ilgari bu
    // mantiq shu yerda, JSX orasida yozilgan edi: testlab bo'lmasdi va
    // `nextGroup` uchun xuddi shu ro'yxat pastda ikkinchi marta takrorlanardi.
    // `isMultiAnswerType` tashqaridan uzatiladi, ya'ni render va ball hisobi
    // ayni bir predikatga tayanadi.
    const isMultiSelect = isMultiAnswerType(group.type);
    // Renderer TANLOVIGA aloqador bayroqlar (isTable, isFlowChart, isMatchingGrid…)
    // bu yerda kerak emas — ular `resolveReadingRenderer` ichida ishlatiladi.
    // Quyidagilar esa tanlovdan tashqari narsalarga ta'sir qiladi: chegara
    // chizig'i, bo'shliq, ko'rsatma matnini tozalash.
    const {
        isChoiceType,
        isSummary,
        isDiagram,
        isTFNG,
        showStaticOptions
    } = classifyReadingGroup(group, isMultiSelect);

    // Qaysi komponent chiziladi — USTUVORLIK TARTIBI ham registrda.
    // Ilgari u ichma-ich ternarylar ko'rinishida shu JSX ichida yashardi,
    // ya'ni golden corpus reading tomonida "savol chiziladimi?" degan
    // savolni umuman tekshira olmasdi.
    const renderer = resolveReadingRenderer(group, isMultiSelect);

    const rangeLabel = getRangeLabel(group);
    const displayInstruction = cleanInstructions(group, isTFNG);

    


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


    const nextGroup = filteredQuestions[gIdx + 1];
    // Bir xil qoida — ro'yxat ikkinchi marta qo'lda yozilmaydi.
    const isNextChoice = Boolean(nextGroup) && isReadingChoiceGroup(nextGroup, isMultiAnswerType(nextGroup.type));
    const hideBorder = isChoiceType && isNextChoice;

    return (
        <div className={`font-montserrat ${hideBorder ? 'mb-2 pb-2' : 'mb-6 pb-6 border-b border-gray-200 border-dashed last:border-0'}`}>
            {rangeLabel && <h3 className="text-[15.5px] font-bold text-black mb-4">{rangeLabel}</h3>}

            {(!gIdx || (gIdx > 0 && String(filteredQuestions[gIdx - 1].instruction || "").replace(/<[^>]*>/g, '').trim().toLowerCase() !== String(group.instruction || "").replace(/<[^>]*>/g, '').trim().toLowerCase())) && group.instruction && (
                <div className="bg-transparent border-none p-0 mb-6 shadow-none font-normal text-black text-[15.5px]" dangerouslySetInnerHTML={{ __html: displayInstruction }} />
            )}

            {renderer === 'MatchingGrid' ? (
                <MatchingGridQuestion {...commonProps} />
            ) : renderer === 'MatchingHeadings' ? (
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
                        {renderer === 'Table' ? (
                            <TableQuestion {...commonProps} />
                        ) : renderer === 'DiagramLabeling' ? (
                            <DiagramLabelingQuestion {...commonProps} />
                        ) : renderer === 'SummaryGapFill' ? (
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
                        ) : renderer === 'FlowChart' ? (
                            <FlowChartQuestion {...commonProps} />
                        ) : (
                            group.items?.map((q, qIdx) => {
                                if (renderer === 'Choice') {
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

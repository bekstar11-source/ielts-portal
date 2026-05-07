import React from "react";
import { GapFillQuestion } from './GapFill';
import { checkAnswer, ReadingTextInput, QuestionExplanation } from './CommonComponents';

export const DiagramLabelingQuestion = ({ 
    group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, highlights, handlePartSelect, onRemoveHighlight, keywordTable, activePassage, onOpenNotes, isPremium 
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
                            <div className="flex items-start gap-3">
                                {isReviewMode && (
                                    <span 
                                        className="inline-flex min-w-[26px] h-[26px] items-center justify-center rounded-lg bg-gray-50 border border-gray-300 text-[13px] font-bold text-gray-700 cursor-pointer hover:border-ielts-blue hover:text-ielts-blue transition-all shadow-sm mt-0.5"
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
                                            onOpenNotes={onOpenNotes}
                                            isPremium={isPremium}
                                        />
                                    ) : (
                                        <div className="flex flex-col gap-2">
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
                                            {isReviewMode && q.explanation && (
                                                <QuestionExplanation 
                                                    text={q.explanation} 
                                                    isPremium={isPremium} 
                                                    titleId={q.id}
                                                />
                                            )}
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

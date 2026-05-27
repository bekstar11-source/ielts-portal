import React, { memo } from 'react';
import { checkAnswer, getStatusStyles, stripLeadingId, stripLeadingOptionLabel } from '../ListeningUtils';
import { QuestionBadge } from '../ListeningComponents';

export const MultipleChoice = memo(({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, onSeekTo, activePart }) => {
    const renderQuestion = (q) => {
        const options = q.options || group.options || [];
        return (
            <div key={q.id} id={`q-${q.id}`} className="mb-3 p-1 rounded-xl">
                <div className="flex gap-2 mb-2 items-start">
                    <QuestionBadge 
                        id={q.id} isReviewMode={isReviewMode} onClick={() => isReviewMode && handleLocationClick(q.locationId)} 
                        onSeekTo={onSeekTo} timestamp={q.timestamp || q.timeStep} activePart={activePart}
                    />
                    {q.text && <div className="font-semibold text-gray-900 leading-relaxed pt-0.5" dangerouslySetInnerHTML={{ __html: stripLeadingId(q.text, q.id) }} />}
                </div>
                <div className="flex flex-col gap-0 pl-2 sm:pl-10">
                    {options.map((opt, idx) => {
                        const isSelected = String(userAnswers[q.id]) === String(opt.label);
                        const correctVal = q.answer || q.correct_answer || q.correctAnswer;
                        const isCorrect = isReviewMode ? checkAnswer(opt.label, correctVal) : false;
                        const containerStyle = getStatusStyles(isReviewMode, isCorrect, isSelected, 'container');

                        return (
                            <div key={idx} className={`flex items-center gap-3 p-1 rounded-none border transition-all ${containerStyle}`}>
                                <div className="relative flex items-center justify-center shrink-0">
                                    <input 
                                        type="radio" 
                                        className={`appearance-none w-5 h-5 border rounded-full transition-all cursor-pointer ${isSelected ? (isReviewMode ? (isCorrect ? 'bg-green-600 border-green-600' : 'bg-red-600 border-red-600') : 'bg-blue-600 border-blue-600') : (isReviewMode && isCorrect ? 'border-green-600 bg-white' : 'border-black bg-white')}`} 
                                        checked={isSelected} 
                                        onChange={() => !isReviewMode && onAnswerChange(q.id, String(opt.label))} 
                                        disabled={isReviewMode} 
                                    />
                                    <div className={`absolute w-2.5 h-2.5 rounded-full opacity-0 transition-opacity pointer-events-none ${isSelected ? 'opacity-100' : ''} bg-white`}></div>
                                </div>
                                <span className="text-gray-900 font-normal leading-tight">{stripLeadingOptionLabel(opt.text)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (group.groups && Array.isArray(group.groups)) {
        return (
            <div className="flex flex-col gap-6">
                {group.groups.map((sub, sIdx) => (
                    <div key={sIdx}>
                        {sub.text && <div className="font-bold text-gray-900 mb-3 px-1" dangerouslySetInnerHTML={{ __html: sub.text }} />}
                        {(sub.questions || sub.items || []).map(renderQuestion)}
                    </div>
                ))}
            </div>
        );
    }

    return <>{(group.questions || group.items || []).map(renderQuestion)}</>;
}, (prev, next) => {
    const prevItems = (prev.group.questions || prev.group.items || []);
    const nextItems = (next.group.questions || next.group.items || []);
    if (prevItems.length !== nextItems.length) return false;
    const anyAnswerChanged = prevItems.some(q => prev.userAnswers[q.id] !== next.userAnswers[q.id]);
    return !anyAnswerChanged && prev.group === next.group && prev.isReviewMode === next.isReviewMode;
});

import React from 'react';
import { getStatusStyles, stripLeadingOptionLabel } from '../ListeningUtils';

export const SelectionBox = ({ group, userAnswers, onAnswerChange, isReviewMode }) => {
    const questions = group.questions || group.items || [];
    const options = group.options || [];
    if (questions.length === 0 || options.length === 0) return null;

    const questionIds = questions.map((q) => q.id);
    const maxSelection = questionIds.length;
    const currentSelectedValues = questionIds.map((id) => userAnswers[id]).filter(Boolean);

    const handleToggle = (optionLabel) => {
        if (isReviewMode) return;
        let newSelection = [...currentSelectedValues];
        if (newSelection.includes(optionLabel)) newSelection = newSelection.filter((val) => val !== optionLabel);
        else {
            if (newSelection.length >= maxSelection) newSelection.shift();
            newSelection.push(optionLabel);
        }
        newSelection.sort();
        questionIds.forEach((id, index) => onAnswerChange(id, newSelection[index] || ""));
    };

    return (
        <div className="mb-6 py-2 px-1">
            <div className="flex flex-col gap-1">
                {options.map((opt, idx) => {
                    const isSelected = currentSelectedValues.includes(opt.label);
                    const isCorrectOption = questions.some(q => {
                        const ans = q.answer || q.correct_answer || q.correctAnswer || q.correct_answer_value;
                        return Array.isArray(ans) ? ans.includes(opt.label) : ans === opt.label;
                    });
                    const containerStyle = getStatusStyles(isReviewMode, isCorrectOption, isSelected, 'container');

                    return (
                        <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${containerStyle}`}>
                            <div className="relative flex items-center justify-center shrink-0">
                                <input 
                                    type="checkbox" 
                                    className="appearance-none w-5 h-5 border border-gray-400 rounded checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer" 
                                    checked={isSelected} 
                                    onChange={() => handleToggle(opt.label)} 
                                    disabled={isReviewMode} 
                                />
                                <svg className={`absolute w-3.5 h-3.5 text-white pointer-events-none ${isSelected ? 'block' : 'hidden'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <span className="text-gray-900 font-medium">{stripLeadingOptionLabel(opt.text)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

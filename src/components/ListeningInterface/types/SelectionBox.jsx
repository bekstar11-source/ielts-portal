import React from 'react';
import { getStatusStyles, stripLeadingOptionLabel } from '../ListeningUtils';

export const SelectionBox = ({ group, userAnswers, onAnswerChange, isReviewMode }) => {
    const questions = group.questions || group.items || [];
    const options = group.options || [];
    const questionIds = questions.map((q) => q.id);
    const maxSelection = questionIds.length;
    const currentSelectedValues = questionIds.map((id) => userAnswers[id]).filter(Boolean);

    // Tanlash tartibini alohida saqlaymiz — chunki javoblar slotlarga alifbo bo'yicha
    // saralangan holda yoziladi, shuning uchun userAnswers dan "birinchi tanlangan"ni bilib bo'lmaydi.
    // Bu FIFO eviction (max tanlovga yetganda eng eski tanlovni chiqarib tashlash) to'g'ri ishlashi uchun kerak.
    // Hook har doim (early returndan oldin) chaqirilishi kerak — Rules of Hooks talabi.
    const selectionOrderRef = React.useRef(null);
    if (selectionOrderRef.current === null) {
        selectionOrderRef.current = [...currentSelectedValues];
    }

    if (questions.length === 0 || options.length === 0) return null;

    const handleToggle = (optionLabel) => {
        if (isReviewMode) return;
        let newSelection = [...currentSelectedValues];
        if (newSelection.includes(optionLabel)) {
            newSelection = newSelection.filter((val) => val !== optionLabel);
            selectionOrderRef.current = selectionOrderRef.current.filter((v) => v !== optionLabel);
        } else {
            if (newSelection.length >= maxSelection) {
                let oldest = selectionOrderRef.current[0];
                if (oldest === undefined || !newSelection.includes(oldest)) oldest = newSelection[0];
                newSelection = newSelection.filter((v) => v !== oldest);
                selectionOrderRef.current = selectionOrderRef.current.filter((v) => v !== oldest);
            }
            newSelection.push(optionLabel);
            selectionOrderRef.current.push(optionLabel);
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

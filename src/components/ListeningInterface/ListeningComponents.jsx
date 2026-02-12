import React from 'react';
import { checkAnswer, getStatusStyles } from './ListeningUtils';

export const HighlighterIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${active ? "fill-yellow-400 text-yellow-600" : "text-gray-500"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
);

export const QuestionBadge = ({ id, isReviewMode, onClick }) => (
    <span 
        className={`min-w-[24px] h-[24px] flex items-center justify-center rounded bg-white border border-gray-400 text-[11px] font-bold text-gray-700 shrink-0 shadow-sm select-none mr-2 
        ${isReviewMode ? 'cursor-pointer hover:border-blue-600 hover:text-blue-600' : ''}`}
        onClick={onClick}
    >
        {id}
    </span>
);

export const CorrectAnswerTooltip = ({ answer }) => (
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-10 whitespace-nowrap bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded border border-green-300 font-bold shadow-sm animate-in fade-in zoom-in-95">
        ✓ {Array.isArray(answer) ? answer[0] : answer}
    </div>
);

export const SelectInput = ({ value, onChange, options, isReviewMode, isCorrect, correctAnswer, width = "w-[80px]" }) => {
    const styles = getStatusStyles(isReviewMode, isCorrect, false, 'input');
    return (
        <div className="relative shrink-0 ml-auto sm:ml-0">
            <select 
                value={value} 
                disabled={isReviewMode} 
                onChange={onChange} 
                className={`h-[30px] ${width} pl-2 pr-6 border rounded text-sm font-bold appearance-none cursor-pointer transition-all shadow-sm focus:outline-none ${styles}`}
            >
                <option value="">...</option>
                {options.map((opt, idx) => (
                    <option key={idx} value={opt.label}>{opt.label}</option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
            {isReviewMode && !isCorrect && <CorrectAnswerTooltip answer={correctAnswer} />}
        </div>
    );
};

// 🔥 REFACTORED: renderInput funksiyasi endi komponent
export const ListeningTextInput = ({ id, answer, locationId, userAnswers, onAnswerChange, isReviewMode, handleLocationClick }) => {
    const val = userAnswers[id] || "";
    const isCorrect = isReviewMode ? checkAnswer(val, answer) : false;
    const styles = getStatusStyles(isReviewMode, isCorrect, false, 'input');

    return (
        <span className="inline-flex items-center align-middle mx-1 whitespace-nowrap relative group/input">
            <QuestionBadge id={id} isReviewMode={isReviewMode} onClick={() => isReviewMode && locationId && handleLocationClick(locationId)} />
            <input 
                className={`w-[130px] h-[30px] border rounded px-2 text-center font-semibold text-sm focus:outline-none transition-all placeholder-transparent shadow-sm ${styles}`}
                value={val} 
                onChange={(e) => onAnswerChange(id, e.target.value)} 
                disabled={isReviewMode}
                autoComplete="off"
            />
            {isReviewMode && !isCorrect && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 hidden group-hover/input:block animate-in fade-in zoom-in-95 duration-200">
                    <span className="text-[10px] font-bold text-white bg-green-600 px-2 py-1 rounded shadow-lg whitespace-nowrap">✓ {answer}</span>
                    <div className="w-2 h-2 bg-green-600 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                </div>
            )}
        </span>
    );
};
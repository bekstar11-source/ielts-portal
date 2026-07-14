import React from 'react';
import { checkAnswer, getStatusStyles } from './ListeningUtils';

export const HighlighterIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${active ? "fill-yellow-400 text-yellow-600" : "text-gray-500"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
);

export const QuestionBadge = ({ id, isReviewMode, onClick, onSeekTo, timestamp, activePart }) => (
    <div className="flex items-center gap-1 group/q-badge mr-1">
        {/* Play Button - Only visible in review mode if timestamp exists */}
        {isReviewMode && (timestamp || timestamp === 0) && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (onSeekTo) onSeekTo(activePart, timestamp);
                }}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100 active:scale-90 shrink-0"
                title="Play from this point"
            >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                </svg>
            </button>
        )}
        
        <span
            className={`min-w-[20px] h-[26px] flex items-center justify-center text-[15px] font-bold text-gray-900 shrink-0 select-none px-1.5 rounded-md transition-all
            ${isReviewMode && onClick ? 'cursor-pointer hover:bg-zinc-100' : ''}`}
            onClick={onClick}
        >
            {id}
        </span>
    </div>
);

export const CorrectAnswerTooltip = ({ answer }) => (
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-10 whitespace-nowrap bg-emerald-50 text-emerald-700 text-[0.75em] px-2 py-0.5 rounded-[4px] border border-emerald-200 font-black shadow-sm select-none">
        ✓ {Array.isArray(answer) ? answer.join(' / ') : answer}
    </div>
);

export const SelectInput = ({ id, value, onChange, options, isReviewMode, isCorrect, correctAnswer, width = "w-[80px]" }) => {
    const styles = getStatusStyles(isReviewMode, isCorrect, false, 'input');
    return (
        <div className="relative shrink-0 ml-auto sm:ml-0">
            <select
                value={value}
                disabled={isReviewMode}
                onChange={onChange}
                className={`h-[26px] ${width} pl-2 pr-6 border rounded-none text-[0.875em] font-bold appearance-none cursor-pointer transition-all shadow-sm focus:outline-none ${styles}`}
            >
                <option value="">{!isReviewMode ? (id || "...") : "..."}</option>
                {options.map((opt, idx) => (
                    <option key={idx} value={opt.label}>{opt.label}</option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
            </div>
            {isReviewMode && !isCorrect && <CorrectAnswerTooltip answer={correctAnswer} />}
        </div>
    );
};

// 🔥 REFACTORED: renderInput funksiyasi endi komponent
export const ListeningTextInput = ({ id, answer, locationId, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, onSeekTo, timestamp, activePart }) => {
    const val = userAnswers[id] || "";
    const isCorrect = isReviewMode ? checkAnswer(val, answer) : false;
    const styles = getStatusStyles(isReviewMode, isCorrect, false, 'input');

    return (
        <span className="inline-flex items-center align-middle mx-1 whitespace-nowrap relative group/input">
            {isReviewMode && (
                <QuestionBadge 
                    id={id} 
                    isReviewMode={isReviewMode} 
                    onClick={() => locationId && handleLocationClick(locationId)} 
                    onSeekTo={onSeekTo}
                    timestamp={timestamp}
                    activePart={activePart}
                />
            )}
            <input
                className={`w-[150px] h-[24px] border border-gray-300 rounded-[4px] px-2 text-center font-bold text-[1em] focus:outline-none focus:border-blue-500 transition-all shadow-sm ${styles} ${!isReviewMode ? 'placeholder-black' : 'placeholder-transparent'}`}
                value={val}
                placeholder={!isReviewMode ? String(id) : ""}
                onChange={(e) => onAnswerChange(id, e.target.value)}
                disabled={isReviewMode}
                autoComplete="off"
                spellCheck={false}
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            />
            {isReviewMode && !isCorrect && (
                <span className="ml-1.5 px-2 py-0.5 text-[0.75em] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-[4px] whitespace-nowrap inline-flex items-center gap-1 shadow-sm select-none transition-all">
                    <span className="text-emerald-500 font-black">✓</span>
                    {Array.isArray(answer) ? answer.join(' / ') : answer}
                </span>
            )}
        </span>
    );
};
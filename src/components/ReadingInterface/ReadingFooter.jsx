// src/components/ReadingInterface/ReadingFooter.jsx
import React from "react";

export default function ReadingFooter({ 
    testData, 
    activePassage, 
    setActivePassage, 
    userAnswers, 
    scrollToQuestionDiv 
}) {
    if (!testData || !testData.passages) return null;

    const getDisplayLabel = (item) => item.id;

    const isRealQuestion = (item) => (!isNaN(item.id) && !isNaN(parseFloat(item.id))) || item.answer;

    const extractQuestionsFromGroup = (group) => {
        let questions = [];

        if (group.items && Array.isArray(group.items)) {
            questions = group.items;
        } else if ((group.type === 'table_completion' || group.type === 'table') && group.rows) {
            group.rows.forEach(row => {
                let cellsToIterate = [];
                if (Array.isArray(row)) {
                    cellsToIterate = row;
                } else if (row.cells && Array.isArray(row.cells)) {
                    cellsToIterate = row.cells;
                }
                cellsToIterate.forEach(cell => {
                    if (cell.id) questions.push(cell);
                    if (cell.isMultiQuestion && cell.content) {
                        questions.push(...cell.content);
                    }
                    if (cell.isMixed && cell.parts) {
                        cell.parts.forEach(part => {
                            if (part.type === 'input') questions.push(part);
                        });
                    }
                });
            });
        }

        return questions;
    };

    return (
        <div className="h-full w-full flex bg-white z-[2000]">
            <div className="flex w-full h-full">
                {testData.passages.map((passage, idx) => {
                    const isActive = activePassage === idx;
                    
                    const passageGroups = testData.questions 
                        ? testData.questions.filter(g => String(g.passageId) === String(passage.id)) 
                        : [];

                    const passageQuestions = passageGroups
                        .reduce((acc, g) => [...acc, ...extractQuestionsFromGroup(g)], [])
                        .filter(isRealQuestion);

                    const qCount = passageQuestions.length;
                    const answeredCount = passageQuestions.filter(q =>
                        userAnswers[q.id] && String(userAnswers[q.id]).trim() !== ""
                    ).length;

                    return (
                        <div 
                            key={passage.id} 
                            onClick={() => setActivePassage(idx)}
                            className={`
                                flex-1 h-full flex items-center px-3 cursor-pointer border-r border-gray-200 
                                transition-all duration-200 overflow-hidden
                                ${isActive 
                                    ? 'bg-white border-t-[3px] border-t-ielts-blue -mt-[1px]' 
                                    : 'bg-gray-50 hover:bg-gray-100'
                                }
                            `}
                        >
                            {/* Part nomi */}
                            <div className="flex items-center shrink-0 mr-2">
                                <span className={`font-bold text-xs whitespace-nowrap ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                                    Part {idx + 1}
                                </span>
                            </div>

                            {/* Aktiv: savol tugmachalari | Aktiv emas: "X of Y" label */}
                            {isActive ? (
                                qCount > 0 && (
                                    <div className="flex gap-1 h-full items-center overflow-x-auto hide-scrollbar w-full">
                                        {passageQuestions.map(q => {
                                            const label = getDisplayLabel(q);
                                            const isAnswered = userAnswers[q.id] && String(userAnswers[q.id]).trim() !== "";
                                            return (
                                                <button 
                                                    key={q.id} 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        scrollToQuestionDiv(q.id); 
                                                    }}
                                                    className={`
                                                        min-w-[22px] w-auto px-1 h-[22px] flex items-center justify-center rounded 
                                                        text-[10px] font-bold shrink-0 transition-all border shadow-sm
                                                        ${isAnswered 
                                                            ? 'bg-ielts-blue text-white border-ielts-blue' 
                                                            : 'bg-white border-gray-300 text-gray-700 hover:border-ielts-blue hover:text-ielts-blue hover:-translate-y-[1px]' 
                                                        }
                                                    `}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )
                            ) : (
                                <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                                    {answeredCount} of {qCount}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* O'ng pastki burchakdagi Next/Prev tugmalari */}
            <div className="fixed bottom-[70px] right-6 flex gap-2 z-[2100]">
                <button
                    onClick={() => activePassage > 0 && setActivePassage(activePassage - 1)}
                    disabled={activePassage === 0}
                    className={`w-11 h-11 flex items-center justify-center rounded-[12px] transition-all shadow-md ${
                        activePassage === 0 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-ielts-blue text-white hover:opacity-90 hover:-translate-y-0.5'
                    }`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <button
                    onClick={() => activePassage < testData.passages.length - 1 && setActivePassage(activePassage + 1)}
                    disabled={activePassage === testData.passages.length - 1}
                    className={`w-11 h-11 flex items-center justify-center rounded-[12px] transition-all shadow-md ${
                        activePassage === testData.passages.length - 1 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-ielts-blue text-white hover:opacity-90 hover:-translate-y-0.5'
                    }`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
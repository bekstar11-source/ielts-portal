// src/components/ReadingInterface/ReadingFooter.jsx
import React from "react";

export default function ReadingFooter({ 
    testData, 
    activePassage, 
    setActivePassage, 
    userAnswers, 
    scrollToQuestionDiv,
    isMobile,
    setMobileActiveTab,
    partNumber = null
}) {
    if (!testData || !testData.passages) return null;

    const getDisplayLabel = (item) => item.id;

    const isRealQuestion = (item) => {
        if (!item || item.id == null) return false;
        if (item.answer) return true;
        const idStr = String(item.id).trim();
        if (idStr.includes('-') || idStr.includes('–')) return false; // Don't count ranges as single questions here
        return !isNaN(idStr) && idStr !== "";
    };

    const checkIfAnswered = (q, answers) => {
        if (q.isMulti && q.parentQuestionId) {
            const val = answers[q.parentQuestionId];
            if (!val) return false;
            const choices = String(val).split(',').filter(Boolean);
            return choices.length > q.multiIndex;
        }
        return answers[q.id] && String(answers[q.id]).trim() !== "";
    };

    const extractQuestionsFromGroup = (group) => {
        let questions = [];
        const type = String(group.type || "").toLowerCase();
        const isMultiTwo = type.includes('pick_two') || type.includes('multi_two');
        const isMultiThree = type.includes('pick_three') || type.includes('multi_three');

        let rawItems = [];

        if (group.items && Array.isArray(group.items)) {
            rawItems = group.items;
        } else if (group.questions && Array.isArray(group.questions)) {
            rawItems = group.questions;
        } else if ((group.type === 'table_completion' || group.type === 'table') && group.rows) {
            group.rows.forEach(row => {
                let cellsToIterate = [];
                if (Array.isArray(row)) {
                    cellsToIterate = row;
                } else if (row.cells && Array.isArray(row.cells)) {
                    cellsToIterate = row.cells;
                }
                cellsToIterate.forEach(cell => {
                    if (cell.id && !cell.isMultiQuestion && !cell.isMixed) rawItems.push(cell);
                    
                    if (cell.isMultiQuestion && cell.content) {
                        rawItems.push(...cell.content);
                    }
                    if (cell.isMixed && cell.parts) {
                        cell.parts.forEach(part => {
                            if (part.type === 'input') rawItems.push(part);
                        });
                    }
                });
            });
        }

        const parseMultiIds = (rawId, count) => {
            const str = String(rawId);
            if (str.includes('-') || str.includes('–')) {
                const parts = str.split(/[\-–]/).map(Number).filter(n => !isNaN(n));
                if (parts.length >= 2) {
                    const ids = [];
                    const min = Math.min(parts[0], parts[parts.length - 1]);
                    const max = Math.max(parts[0], parts[parts.length - 1]);
                    for (let n = min; n <= max; n++) ids.push(String(n));
                    return ids;
                }
            }
            if (!isNaN(rawId)) {
                return Array.from({ length: count }, (_, i) => String(Number(rawId) + i));
            }
            return [str];
        };

        if ((isMultiTwo || isMultiThree)) {
            rawItems.forEach(q => {
                const count = isMultiThree ? 3 : 2;
                const ids = parseMultiIds(q.id, count);
                ids.forEach((splitId, i) => {
                    questions.push({
                        ...q,
                        id: splitId,
                        displayId: splitId,
                        multiIndex: i,
                        isMulti: true,
                        parentQuestionId: q.id
                    });
                });
            });
        } else {
            questions = [...rawItems];
        }

        return questions;
    };

    return (
        <div className="h-full w-full flex bg-white z-[2000]">
            <div className="flex w-full h-full">
                {testData.passages.map((passage, idx) => {
                    if (partNumber && idx !== partNumber - 1) return null;
                    const isActive = activePassage === idx;
                    
                    const passageGroups = testData.questions 
                        ? testData.questions.filter(g => String(g.passageId) === String(passage.id)) 
                        : [];

                    const passageQuestions = passageGroups
                        .reduce((acc, g) => [...acc, ...extractQuestionsFromGroup(g)], [])
                        .filter(isRealQuestion)
                        .filter((q, index, self) => 
                            index === self.findIndex((t) => String(t.id) === String(q.id))
                        );

                    const qCount = passageQuestions.length;
                    const answeredCount = passageQuestions.filter(q => checkIfAnswered(q, userAnswers)).length;

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
                            <div className="flex items-center shrink-0 mr-2">
                                <span className={`font-bold text-xs whitespace-nowrap ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                                    Part {passage.partNumber ?? (idx + 1)}
                                </span>
                            </div>

                            {isActive ? (
                                qCount > 0 && (
                                    <div className="flex gap-1 h-full items-center overflow-x-auto hide-scrollbar w-full">
                                        {passageQuestions.map(q => {
                                            const label = getDisplayLabel(q);
                                            const isAnswered = checkIfAnswered(q, userAnswers);
                                            return (
                                                <button 
                                                    key={q.id} 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if (isMobile && setMobileActiveTab) {
                                                            setMobileActiveTab('questions');
                                                        }
                                                        scrollToQuestionDiv(q.parentQuestionId || q.id); 
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


        </div>
    );
}
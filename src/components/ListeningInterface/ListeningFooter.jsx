import React from "react";

export default function ListeningFooter({ 
    testData, 
    activePart, 
    setActivePart, 
    userAnswers, 
    scrollToQuestionDiv
}) {
    if (!testData || !testData.passages) return null;

    // --- YORDAMCHI FUNKSIYA (O'ZGARISHSIZ) ---
    const extractQuestionsFromGroup = (group) => {
        let questions = [];
        if (group.questions && Array.isArray(group.questions)) questions.push(...group.questions);
        else if (group.items && Array.isArray(group.items)) questions.push(...group.items);
        
        if (group.groups && Array.isArray(group.groups)) {
            group.groups.forEach(subGroup => {
                if (subGroup.items) questions.push(...subGroup.items);
                if (subGroup.questions) questions.push(...subGroup.questions);
            });
        }
        if ((group.type === 'table_completion' || group.type === 'table') && group.rows) {
            group.rows.forEach(row => {
                let cellsToIterate = Array.isArray(row) ? row : (row.cells || []);
                cellsToIterate.forEach(cell => {
                    if (cell.id) questions.push(cell); 
                    if (cell.isMixed && cell.parts) { 
                        cell.parts.forEach(part => { if (part.type === 'input') questions.push(part); });
                    }
                });
            });
        }
        return questions;
    };

    return (
        <div className="h-full w-full flex bg-white z-[2000]">
            
            {/* 1. SCROLLABLE PARTS (Chap tomon - egiluvchan) */}
            <div className="flex-1 h-full overflow-x-auto hide-scrollbar flex">
                {testData.passages.map((passage, idx) => {
                    const isActive = activePart === idx;
                    
                    const partGroups = testData.questions 
                        ? testData.questions.filter(g => String(g.passageId) === String(passage.id)) 
                        : [];

                    const partQuestions = partGroups
                        .reduce((acc, g) => [...acc, ...extractQuestionsFromGroup(g)], [])
                        .filter(q => q.id !== undefined && q.id !== null)
                        .filter((q, index, self) => 
                            index === self.findIndex((t) => String(t.id) === String(q.id))
                        );

                    const qCount = partQuestions.length;

                    return (
                        <div 
                            key={passage.id || idx} 
                            onClick={() => setActivePart(idx)}
                            className={`
                                h-full flex items-center px-2 cursor-pointer border-r border-gray-200 
                                transition-all duration-200 shrink-0 select-none
                                ${isActive 
                                    ? 'bg-white min-w-[140px] border-t-[3px] border-t-blue-600 -mt-[1px]' // Kenglik ham ixchamlashdi
                                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100 min-w-[60px]'
                                }
                            `}
                        >
                            {/* Chap tomon: Faqat Part Nomi (Kichikroq shrift) */}
                            <div className="flex items-center justify-center mr-2 shrink-0">
                                {/* 👇 text-xs ga o'zgartirildi */}
                                <span className={`font-bold text-xs ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                                    Part {idx + 1}
                                </span>
                            </div>

                            {/* O'ng tomon: Savol tugmachalari */}
                            {isActive && qCount > 0 && (
                                <div className="flex gap-1 h-full items-center overflow-x-auto px-0 hide-scrollbar w-full flex-nowrap whitespace-nowrap">
                                    {partQuestions.map(q => {
                                        const isAnswered = userAnswers[q.id] && String(userAnswers[q.id]).trim() !== "";
                                        
                                        return (
                                            <button 
                                                key={q.id} 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    scrollToQuestionDiv(q.id); 
                                                }}
                                                // 👇 TUGMALAR JUDAYAM IXCHAM (22px)
                                                className={`
                                                    w-[22px] h-[22px] flex items-center justify-center rounded 
                                                    text-[10px] font-bold shrink-0 transition-all border shadow-sm
                                                    ${isAnswered 
                                                        ? 'bg-blue-600 text-white border-blue-600' 
                                                        : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                                                    }
                                                `}
                                            >
                                                {q.id}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
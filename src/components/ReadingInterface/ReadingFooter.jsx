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

    // ... (Yordamchi funksiyalar: getDisplayLabel, isRealQuestion o'zgarishsiz qoladi) ...
    const getDisplayLabel = (item) => (!isNaN(item.id) && !isNaN(parseFloat(item.id))) ? item.id : item.id;
    const isRealQuestion = (item) => (!isNaN(item.id) && !isNaN(parseFloat(item.id))) || item.answer;

    return (
        <div className="h-full w-full flex bg-white z-[2000]">
            <div className="flex w-full h-full overflow-x-auto hide-scrollbar">
                {testData.passages.map((passage, idx) => {
                    const isActive = activePassage === idx;
                    
                    const passageGroups = testData.questions ? testData.questions.filter(g => String(g.passageId) === String(passage.id)) : [];
                    const passageQuestions = passageGroups.reduce((acc, g) => [...acc, ...g.items], []).filter(isRealQuestion);
                    const qCount = passageQuestions.length;

                    let rangeLabel = "No Questions";
                    if (qCount > 0) {
                        const firstID = getDisplayLabel(passageQuestions[0]);
                        const lastID = getDisplayLabel(passageQuestions[qCount - 1]);
                        rangeLabel = `Qs ${firstID}–${lastID}`; // "Questions" -> "Qs" (joy tejash uchun)
                    }

                    return (
                        <div 
                            key={passage.id} 
                            onClick={() => setActivePassage(idx)}
                            className={`
                                h-full flex items-center px-3 cursor-pointer border-r border-gray-200 
                                transition-all duration-200 shrink-0
                                ${isActive 
                                    ? 'bg-white min-w-[260px] border-t-[3px] border-t-ielts-blue -mt-[1px] opacity-100' 
                                    : 'bg-gray-50 opacity-70 hover:opacity-100 hover:bg-gray-100 min-w-[100px]'
                                }
                            `}
                        >
                            {/* Label Qismi */}
                            <div className="flex flex-col mr-3 justify-center shrink-0">
                                {/* Matn o'lchami: text-[13px] -> text-xs (12px) */}
                                <span className="font-bold text-xs text-gray-900 leading-none mb-0.5 whitespace-nowrap">
                                    Passage {idx + 1}
                                </span>
                                {/* Matn o'lchami: text-[10px] -> text-[9px] */}
                                <small className="text-[9px] text-gray-500 font-medium whitespace-nowrap">
                                    {rangeLabel}
                                </small>
                            </div>

                            {/* Savol Tugmachalari */}
                            {isActive && qCount > 0 && (
                                <div className="flex gap-1 h-full items-center overflow-x-auto px-1 hide-scrollbar w-full">
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
                                                // 🔥 O'ZGARISH: w-[28px] -> w-[24px], text-[11px] -> text-[10px]
                                                className={`
                                                    w-[24px] h-[24px] flex items-center justify-center rounded 
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
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
// src/components/ListeningInterface/ListeningFooter.jsx
import React from "react";

export default function ListeningFooter({ 
    testData, 
    activeSection, 
    setActiveSection, 
    userAnswers, 
    flaggedQuestions, 
    scrollToQuestion 
}) {
    // Agar data hali yuklanmagan bo'lsa
    if (!testData || !testData.passages) return null;

    // --- LOGIKA: Hozirgi bo'lim (Part) ichidagi barcha savollarni yig'ib olish ---
    // Listeningda savollar "groups" ichida bo'lishi mumkin, shuning uchun "flat" qilish kerak.
    const currentPartQuestions = testData.questions
        .filter(g => g.passageId === testData.passages?.[activeSection]?.id)
        .reduce((acc, g) => {
            let currentItems = [];
            if (g.items && Array.isArray(g.items)) {
                // Oddiy savollar (MCQ, Matching)
                currentItems = g.items;
            } else if (g.groups && Array.isArray(g.groups)) {
                // Ichma-ich savollar (Note/Table Completion)
                currentItems = g.groups.flatMap(subGroup => subGroup.items || []);
            }
            return [...acc, ...currentItems];
        }, []);

    return (
        <div className="h-full w-full flex bg-white">
            
            {/* 1. LEFT SIDE: PART SWITCHER (Part 1, Part 2...) */}
            <div className="flex border-r border-gray-200 bg-gray-50 h-full">
                {testData.passages.map((p, idx) => {
                    const isActive = activeSection === idx;
                    return (
                        <button 
                            key={idx} 
                            onClick={() => setActiveSection(idx)}
                            className={`
                                px-6 h-full text-sm font-bold border-r border-gray-200 transition-all
                                ${isActive 
                                    ? 'bg-white text-ielts-blue border-t-[3px] border-t-ielts-blue -mt-[1px]' 
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                }
                            `}
                        >
                            Part {idx + 1}
                        </button> 
                    );
                })}
            </div>

            {/* 2. RIGHT SIDE: NAVIGATION BUTTONS (1, 2, 3...) */}
            <div className="flex-1 flex items-center px-4 overflow-x-auto gap-2 hide-scrollbar">
                {currentPartQuestions.map(q => {
                    const isAnswered = userAnswers[q.id] && String(userAnswers[q.id]).trim() !== "";
                    const isFlagged = flaggedQuestions && flaggedQuestions.has(q.id);

                    return ( 
                        <button 
                            key={q.id} 
                            onClick={() => scrollToQuestion(q.id)}
                            className={`
                                w-[28px] h-[28px] flex shrink-0 items-center justify-center rounded border text-xs font-bold transition-all relative
                                ${isAnswered 
                                    ? 'bg-ielts-blue text-white border-ielts-blue' // Javob berilgan
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-ielts-blue hover:text-ielts-blue' // Bo'sh
                                }
                                /* Flagged (Sariq halqa) */
                                ${isFlagged ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}
                            `}
                        >
                            {q.id}
                            
                            {/* Flag Icon (Kichkina nuqta shaklida) */}
                            {isFlagged && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full border border-white"></span>
                            )}
                        </button> 
                    );
                })}
            </div>
        </div>
    );
}
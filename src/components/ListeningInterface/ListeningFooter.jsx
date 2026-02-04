import React from "react";

export default function ListeningFooter({ 
    testData, 
    activePart,       // O'ZGARD: activeSection -> activePart
    setActivePart,    // O'ZGARD
    userAnswers, 
    scrollToQuestionDiv, // Parentdan kelgan scroll funksiyasi
    isReviewMode      // Review rejimida ekanligini bilish uchun
}) {
    if (!testData || !testData.passages) return null;

    // Hozirgi "Part"ga tegishli barcha savollarni yig'ib olish
    const currentPassageId = testData.passages[activePart]?.id;
    
    // Flat list of questions for current part
    const currentPartQuestions = testData.questions
        .filter(g => g.passageId === currentPassageId)
        .reduce((acc, g) => {
            if (g.items && Array.isArray(g.items)) return [...acc, ...g.items];
            if (g.groups && Array.isArray(g.groups)) return [...acc, ...g.groups.flatMap(sub => sub.items)];
            return acc;
        }, [])
        .sort((a, b) => a.id - b.id); // Tartiblash muhim

    return (
        <div className="h-full w-full flex bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
            
            {/* PART SWITCHER (Tabs) */}
            <div className="flex border-r border-gray-200 bg-gray-50 h-full shrink-0">
                {testData.passages.map((p, idx) => {
                    const isActive = activePart === idx;
                    return (
                        <button 
                            key={idx} 
                            onClick={() => setActivePart(idx)}
                            className={`
                                px-6 h-full text-sm font-bold border-r border-gray-200 transition-all flex flex-col justify-center items-center min-w-[100px]
                                ${isActive 
                                    ? 'bg-white text-blue-600 border-t-[3px] border-t-blue-600 -mt-[1px]' 
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                                }
                            `}
                        >
                            <span>Part {idx + 1}</span>
                        </button> 
                    );
                })}
            </div>

            {/* QUESTIONS NAVIGATION GRID */}
            <div className="flex-1 flex items-center px-4 overflow-x-auto gap-2 hide-scrollbar py-2">
                {currentPartQuestions.map(q => {
                    const val = userAnswers[q.id];
                    const isAnswered = val && String(val).trim() !== "";
                    
                    // REVIEW MODE LOGIC
                    let statusColor = "bg-white border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-500"; // Default
                    
                    if (isReviewMode) {
                        const correctStr = Array.isArray(q.answer) ? q.answer.join(',') : String(q.answer);
                        const isCorrect = String(val||"").toLowerCase() === correctStr.toLowerCase();
                        
                        if (isCorrect) statusColor = "bg-green-500 text-white border-green-600";
                        else statusColor = "bg-red-500 text-white border-red-600";
                    } else if (isAnswered) {
                        statusColor = "bg-blue-600 text-white border-blue-600 shadow-sm";
                    }

                    return ( 
                        <button 
                            key={q.id} 
                            onClick={() => scrollToQuestionDiv(q.id)} // Parent funksiyasi
                            className={`
                                w-[32px] h-[32px] flex shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-all transform active:scale-95
                                ${statusColor}
                            `}
                        >
                            {q.id}
                        </button> 
                    );
                })}
            </div>
            
            {/* Navigatsiya tugmalari (Oldingi / Keyingi Part) */}
            <div className="flex items-center px-4 border-l border-gray-200 bg-gray-50 gap-2">
                <button 
                    disabled={activePart === 0}
                    onClick={() => setActivePart(p => p - 1)}
                    className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button 
                    disabled={activePart === testData.passages.length - 1}
                    onClick={() => setActivePart(p => p + 1)}
                    className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
    );
}
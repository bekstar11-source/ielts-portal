import React from "react";

export default function ListeningFooter({
    testData,
    activePart,
    setActivePart,
    userAnswers,
    scrollToQuestionDiv,
    playingPartIndex,
    isPlaying
}) {
    if (!testData || !testData.passages) return null;

    const extractQuestionsFromGroup = (group) => {
        let questions = [];
        if (group.questions && Array.isArray(group.questions)) questions.push(...group.questions);
        else if (group.items && Array.isArray(group.items)) questions.push(...group.items);
        else if (group.id != null && !group.groups && !group.rows) questions.push(group);

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
            <div className="flex-1 h-full flex">
                {testData.passages.map((passage, idx) => {
                    const isActive = activePart === idx;
                    const isAudioPlaying = playingPartIndex === idx && isPlaying;

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
                    const answeredCount = partQuestions.filter(q =>
                        userAnswers[q.id] && String(userAnswers[q.id]).trim() !== ""
                    ).length;

                    return (
                        <div
                            key={passage.id || idx}
                            onClick={() => setActivePart(idx)}
                            className={`
                                flex-1 h-full flex items-center px-3 cursor-pointer border-r border-gray-200
                                transition-all duration-200 select-none overflow-hidden
                                ${isActive
                                    ? 'bg-white border-t-[3px] border-t-blue-600 -mt-[1px]'
                                    : 'bg-gray-50 hover:bg-gray-100'
                                }
                            `}
                        >
                            {/* Part nomi + indikator */}
                            <div className="flex items-center gap-1.5 shrink-0 mr-2">
                                <span className={`font-bold text-xs whitespace-nowrap ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                                    Part {idx + 1}
                                </span>
                                {isAudioPlaying && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                )}
                            </div>

                            {/* Aktiv: savol tugmachalari | Aktiv emas: "X of Y" label */}
                            {isActive ? (
                                qCount > 0 && (
                                    <div className="flex gap-1 h-full items-center overflow-x-auto hide-scrollbar flex-nowrap whitespace-nowrap">
                                        {partQuestions.map(q => {
                                            const isAnswered = userAnswers[q.id] && String(userAnswers[q.id]).trim() !== "";
                                            return (
                                                <button
                                                    key={q.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        scrollToQuestionDiv(q.id);
                                                    }}
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
                    onClick={() => activePart > 0 && setActivePart(activePart - 1)}
                    disabled={activePart === 0}
                    className={`w-11 h-11 flex items-center justify-center rounded-[12px] transition-all shadow-md ${
                        activePart === 0 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5'
                    }`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <button
                    onClick={() => activePart < testData.passages.length - 1 && setActivePart(activePart + 1)}
                    disabled={activePart === testData.passages.length - 1}
                    className={`w-11 h-11 flex items-center justify-center rounded-[12px] transition-all shadow-md ${
                        activePart === testData.passages.length - 1 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5'
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
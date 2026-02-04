import React, { memo } from "react";

const ListeningRightPane = memo(({ 
    testData, 
    activePart, 
    userAnswers, 
    onAnswerChange, 
    isReviewMode, 
    textSize = "text-base", 
    handleLocationClick 
}) => {

    // --- GUARD CLAUSE: Ma'lumot yo'q bo'lsa ---
    if (!testData || !testData.questions || !testData.passages) {
        return <div className="p-10 text-center text-gray-500">Loading questions...</div>;
    }

    // =========================================================
    // 1. HELPER FUNCTIONS (Yordamchi funksiyalar)
    // =========================================================

    // --- Review Mode uchun ranglar (Yashil/Qizil) ---
    const getInputStatusClass = (id, correct) => { 
        if (!isReviewMode) return ""; 
        const userAns = String(userAnswers[id]||"").trim().toLowerCase();
        const correctAnsList = Array.isArray(correct) ? correct.map(c => String(c).toLowerCase()) : [String(correct).toLowerCase()];
        const isCorrect = correctAnsList.includes(userAns);
        return isCorrect 
            ? "border-green-600 bg-green-50 text-green-700 font-bold" 
            : "border-red-600 bg-red-50 text-red-700 decoration-red-500 line-through"; 
    };

    // --- INPUT RENDER (Gap Fill / Note Completion uchun) ---
    const renderQuestionInput = (q, val) => ( 
        <span className="inline-flex flex-col mx-1 align-middle relative group">
            <input 
                className={`
                    h-[30px] w-[140px] px-2 rounded-none border border-black text-sm text-center font-semibold text-black bg-white
                    transition-all outline-none focus:ring-1 focus:ring-black
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                    ${getInputStatusClass(q.id, q.answer)}
                `} 
                value={val} 
                onChange={(e)=>onAnswerChange(q.id, e.target.value)} 
                disabled={isReviewMode} 
                autoComplete="off" 
            />
            {/* Review Mode Tooltip */}
            {isReviewMode && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    {Array.isArray(q.answer) ? q.answer[0] : q.answer}
                </span>
            )}
        </span> 
    );

    // --- TABLE CELL RENDER (Jadval ichidagi inputlar) ---
    const renderTableCell = (cellData, group) => {
        if (!cellData.isMixed && cellData.text) return <span className="text-gray-800">{cellData.text}</span>;

        if (cellData.isMixed && cellData.parts) {
            return (
                <div className="flex flex-wrap items-center gap-1 leading-loose">
                    {cellData.parts.map((part, index) => {
                        if (part.type === 'text') return <span key={index} className="text-gray-800">{part.content}</span>;
                        if (part.type === 'input') {
                            const qId = part.id;
                            // Savol javobini topish
                            let questionItem = group.items ? group.items.find(i => i.id === qId) : null;
                            if (!questionItem && group.groups) {
                                group.groups.forEach(sub => {
                                    const found = sub.items && sub.items.find(i => i.id === qId);
                                    if (found) questionItem = found;
                                });
                            }
                            const finalQ = questionItem || { id: qId, answer: "" };
                            const val = userAnswers[qId] || "";

                            return (
                                <span key={qId} className="inline-flex items-center">
                                    <span 
                                        className="w-[24px] h-[24px] flex shrink-0 items-center justify-center bg-gray-100 border border-black text-xs font-bold text-black mr-1 cursor-pointer hover:bg-black hover:text-white transition-colors select-none"
                                        onClick={() => handleLocationClick && handleLocationClick(finalQ.locationId)}
                                    >
                                        {qId}
                                    </span>
                                    <input 
                                        className={`h-[30px] min-w-[100px] px-2 border border-black bg-white text-black text-sm font-semibold text-center rounded-none outline-none focus:ring-1 focus:ring-black disabled:bg-gray-100 ${getInputStatusClass(qId, finalQ.answer)}`} 
                                        value={val} 
                                        onChange={(e)=>onAnswerChange(qId, e.target.value)} 
                                        disabled={isReviewMode} 
                                        autoComplete="off" 
                                    />
                                </span>
                            );
                        }
                        return null;
                    })}
                </div>
            );
        }
        return null;
    };

    // --- SELECTION BOX (Pick Two / Multi Choice Box) ---
    // TUZATILDI: Instruction takrorlanmaydi, 2 ta tanlash to'g'ri ishlaydi
    const renderSelectionBox = (group) => {
        const questionIds = group.questions.map((q) => q.id);
        const maxSelection = questionIds.length; 
        const currentSelectedValues = questionIds.map((id) => userAnswers[id]).filter(Boolean); 

        const handleToggle = (optionLabel) => {
            if (isReviewMode) return;
            let newSelection = [...currentSelectedValues];

            if (newSelection.includes(optionLabel)) {
                newSelection = newSelection.filter((val) => val !== optionLabel);
            } else {
                if (newSelection.length >= maxSelection) newSelection.shift(); 
                newSelection.push(optionLabel);
            }
            newSelection.sort(); 
            questionIds.forEach((id, index) => {
                onAnswerChange(id, newSelection[index] || "");
            });
        };

        return (
            <div className="mb-6 border border-black p-4 bg-white">
                {/* Faqat savol raqamlarini ko'rsatish (Instruction Parentda bor) */}
                <div className="mb-3 border-b border-gray-200 pb-2">
                    <p className="text-sm text-gray-500 italic font-medium">
                        Questions {questionIds.join(" and ")}
                    </p>
                </div>

                <div className="space-y-2">
                    {group.options.map((opt, idx) => {
                        const isSelected = currentSelectedValues.includes(opt.label);
                        // Style Logic
                        let containerStyle = "border-transparent hover:bg-gray-50"; 
                        let checkboxStyle = "border-black bg-white";
                        let textStyle = "text-gray-800";

                        if (isReviewMode) {
                            const allCorrect = group.questions.map(q => q.answer);
                            const isActuallyCorrect = allCorrect.includes(opt.label);
                            if (isActuallyCorrect) {
                                containerStyle = "bg-green-50 border-green-200"; 
                                checkboxStyle = "border-green-600 bg-green-100"; textStyle = "text-green-900 font-bold";
                            } else if (isSelected && !isActuallyCorrect) {
                                containerStyle = "bg-red-50 border-red-200";
                                checkboxStyle = "border-red-500 bg-red-50"; textStyle = "text-red-700 line-through";
                            } else { containerStyle = "opacity-50"; }
                        } else if (isSelected) {
                            containerStyle = "bg-gray-900 text-white border-black"; 
                            checkboxStyle = "border-white bg-white"; textStyle = "text-white font-medium";
                        } else { containerStyle = "border border-transparent hover:border-gray-300"; }

                        return (
                            <div key={idx} onClick={() => handleToggle(opt.label)} className={`flex items-start gap-3 p-3 cursor-pointer select-none transition-all border ${containerStyle} ${isReviewMode ? "cursor-default" : ""}`}>
                                <div className={`mt-0.5 w-5 h-5 flex items-center justify-center shrink-0 border ${checkboxStyle}`}>
                                    {isSelected && <div className={`w-2.5 h-2.5 ${isReviewMode && !textStyle.includes('text-white') ? "bg-current" : "bg-black"}`}></div>}
                                </div>
                                <div className={`text-[15px] leading-tight ${textStyle}`}>
                                    <span className="font-bold mr-3">{opt.label}.</span><span>{opt.text}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- MATCHING (Accordion / Dropdown) ---
    const renderMatching = (group) => {
        const options = group.options || []; 
        return (
            <div className="mb-8">
                {options.length > 0 && (
                    <div className="border border-black p-3 mb-6 bg-white w-full md:w-2/3">
                        <h3 className="font-bold mb-2 text-sm uppercase text-gray-800">Options</h3>
                        <ul className="grid grid-cols-1 gap-2 text-sm">
                            {options.map((opt, idx) => (
                                <li key={idx} className="flex gap-2 items-start"><span className="font-bold min-w-[20px]">{opt.label}</span><span>{opt.text}</span></li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="space-y-3">
                    {(group.questions || group.items || []).map((q) => {
                        const userAnswer = userAnswers[q.id] || "";
                        const correctAns = Array.isArray(q.answer) ? q.answer[0] : q.answer;
                        const isCorrect = isReviewMode && String(userAnswer).trim().toLowerCase() === String(correctAns || "").trim().toLowerCase();
                        let borderColor = isReviewMode ? (isCorrect ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50") : "border-black";

                        return (
                            <div key={q.id} className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-center justify-center w-8 h-8 border border-black font-bold bg-gray-100 shrink-0 text-sm">{q.id}</div>
                                <div className="text-sm md:text-[15px] font-medium min-w-fit">{q.text}</div>
                                <div className="relative w-40"> 
                                    <select value={userAnswer} disabled={isReviewMode} onChange={(e) => onAnswerChange(q.id, e.target.value)} className={`w-full h-[35px] px-2 appearance-none border ${borderColor} rounded-none bg-white text-black text-sm focus:outline-none ${isReviewMode ? "cursor-not-allowed opacity-100" : "cursor-pointer"}`}>
                                        <option value="" disabled>Select...</option>
                                        {options.map((opt, idx) => (<option key={idx} value={opt.label}>{opt.label}</option>))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none"><svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></div>
                                </div>
                                {isReviewMode && !isCorrect && <div className="text-red-600 text-xs font-bold whitespace-nowrap">(Javob: {correctAns})</div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- STANDARD MCQ (Radio Buttons A/B/C) ---
    const renderStdMCQ = (group) => {
        const questionItems = group.questions || group.items || [];
        return questionItems.map(q => {
            const options = q.options || group.options || [];
            const val = userAnswers[q.id];
            
            return (
                <div key={q.id} className="mb-8">
                    <div className="flex gap-3 mb-3 items-start">
                        <span className="w-[30px] h-[30px] flex shrink-0 items-center justify-center bg-white border border-black text-sm font-bold text-black cursor-pointer hover:bg-black hover:text-white transition-colors" onClick={() => handleLocationClick && handleLocationClick(q.locationId)}>{q.id}</span>
                        {q.text && <div className="font-semibold text-gray-900 pt-1 text-sm md:text-[15px]" dangerouslySetInnerHTML={{ __html: q.text }} />}
                    </div>
                    <div className="flex flex-col gap-2 pl-1">
                        {options.map((opt, idx) => {
                            const optLabel = opt.label;
                            const isSelected = String(val) === String(optLabel);
                            let containerClass = "bg-white border-transparent hover:bg-gray-50";
                            let circleClass = isSelected ? "bg-black text-white border-black" : "bg-white text-black border-black";
                            
                            if (isReviewMode) {
                                if (q.answer === optLabel) { containerClass = "bg-green-50 border-green-200"; circleClass = "bg-green-600 text-white border-green-600"; }
                                else if (isSelected) { containerClass = "bg-red-50 border-red-200 opacity-70"; circleClass = "bg-red-500 text-white border-red-500"; }
                            } else if (isSelected) { containerClass = "bg-gray-100 border-gray-300"; }

                            return (
                                <label key={idx} className={`flex items-start gap-3 p-2 rounded cursor-pointer border transition-all select-none ${containerClass}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${circleClass}`}>{optLabel}</div>
                                    <input type="radio" className="hidden" checked={isSelected} onChange={() => !isReviewMode && onAnswerChange(q.id, String(optLabel))} disabled={isReviewMode} />
                                    <span className="text-sm text-black pt-0.5 font-medium leading-tight">{opt.text}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            );
        });
    };

    // =========================================================
    // 2. MAIN LOGIC DISPATCHER (Asosiy Mantiq)
    // =========================================================
    const renderGroupContent = (group) => {
        // A) Matching
        if (group.type === 'matching') return renderMatching(group);
        
        // B) Selection / Pick Two
        if (group.type === 'selection' || group.type === 'pick_two' || group.type === 'multi_choice_box') return renderSelectionBox(group);

        // C) Table Completion
        if (group.type === 'table_completion') {
            return (
                <div className="overflow-x-auto mb-6">
                    <table className="min-w-full border-collapse border border-black text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                {group.headers.map((h, i) => (<th key={i} className="px-2 py-2 text-left font-bold text-gray-700 border border-black uppercase tracking-wider">{h}</th>))}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {group.rows.map((row, rIdx) => (
                                <tr key={rIdx}>
                                    {(row.cells || row).map((cell, cIdx) => (<td key={cIdx} className="px-2 py-2 border border-black align-top">{renderTableCell(cell, group)}</td>))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        // D) Note Completion / Gap Fill (with Sub-groups)
        if ((group.type === 'note_completion' || group.type === 'gap_fill') && group.groups) {
            return (
                <div className="mb-6">
                    {group.groups.map((subGroup, sIdx) => (
                        <div key={sIdx} className="mb-6 last:mb-0">
                            {subGroup.header && <h3 className="text-base font-bold text-gray-800 mb-3 uppercase">{subGroup.header}</h3>}
                            <div className="space-y-3">
                                {subGroup.items.map(q => {
                                    const val = userAnswers[q.id] || "";
                                    const parts = q.text.split('[INPUT]');
                                    return (
                                        <div key={q.id} className="leading-loose text-gray-800 text-sm md:text-[15px]">
                                            <span className="mr-2 font-medium">{parts[0]}</span>
                                            <span className="inline-flex items-center">
                                                <span className="w-[24px] h-[24px] flex shrink-0 items-center justify-center bg-gray-100 border border-black text-xs font-bold text-black mr-2 cursor-pointer hover:bg-black hover:text-white transition-colors" onClick={() => handleLocationClick && handleLocationClick(q.locationId)}>{q.id}</span>
                                                {renderQuestionInput(q, val)}
                                            </span>
                                            <span>{parts[1]}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        // E) Default fallback (Standard MCQ)
        return renderStdMCQ(group);
    };

    // =========================================================
    // 3. MAIN RENDER (Asosiy ko'rinish)
    // =========================================================
    
    // Hozirgi part uchun savollarni filtrlash
    const currentPassage = testData.passages[activePart];
    const questionsForPart = testData.questions.filter(g => g.passageId === currentPassage?.id);

    return (
        <div className={`p-6 pb-32 bg-white ${textSize} select-text w-full`}>
            {/* Header */}
            <div className="mb-6 border-b border-black pb-4">
                 <h2 className="text-xl md:text-2xl font-bold text-gray-900">{currentPassage?.title}</h2>
                 <p className="text-sm text-gray-600 mt-1">Listen carefully and answer the questions.</p>
            </div>

            {/* Savollar Loop */}
            {questionsForPart.map((group, gIdx) => (
                <div key={gIdx} className="mb-10 animate-in fade-in duration-500">
                    {/* Instruction (Agar bo'lsa) */}
                    {group.instruction && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-5 text-sm font-medium text-gray-800 shadow-sm">
                            <span dangerouslySetInnerHTML={{__html: group.instruction}} />
                        </div>
                    )}
                    
                    {/* Guruh Mantiqi (Yuqoridagi funksiya) */}
                    {renderGroupContent(group)}
                </div>
            ))}
        </div>
    );
}, (prev, next) => {
    // Re-render optimizatsiyasi
    return prev.activePart === next.activePart && 
           prev.userAnswers === next.userAnswers && 
           prev.isReviewMode === next.isReviewMode &&
           prev.textSize === next.textSize;
});

export default ListeningRightPane;
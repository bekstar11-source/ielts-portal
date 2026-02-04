// src/components/ReadingInterface/ReadingRightPane.jsx
import React, { memo } from "react";

const ReadingRightPane = memo(({ 
    testData, 
    activePassage, 
    userAnswers, 
    onAnswerChange, 
    isReviewMode, 
    textSize = "text-base", 
    qRef,
    handleLocationClick
}) => {

    if (!testData || !testData.questions || !testData.passages) {
        return <div className="h-full flex items-center justify-center text-gray-400">Loading...</div>;
    }

    // --- 1. JAVOBNI TEKSHIRISH LOGIKASI ---
    const checkAnswer = (userVal, correctVal) => {
        if (!userVal || !correctVal) return false;
        const u = String(userVal).trim().toLowerCase();
        const c = String(correctVal).trim().toLowerCase();
        return u === c;
    };

    // --- 2. OPTION VALUE AJRATIB OLISH (ASOSIY TUZATISH) ---
    const getOptionValue = (text) => {
        if (!text) return "";
        // Regex: Matn boshidagi "A.", "B.", "A)", "viii." kabi belgilarni qidiradi
        // Masalan: "B. Gareth Williams" -> "B" ni qaytaradi
        const match = text.match(/^([A-Z]|[ivxIVX]+)[\.\)\s]/);
        if (match) {
            return match[1].trim(); // Faqat "A", "B", "viii" qaytadi
        }
        return text; // Agar topilmasa, matnni o'zini qaytaradi
    };

    const renderParts = (parts, q, val, isInlineQuestion, isSummary, itemOptions, isMatching, isReviewMode, onAnswerChange, group) => {
        const inlineNumberClass = `
            inline-flex w-[26px] h-[26px] items-center justify-center rounded bg-white border border-gray-400 text-xs font-bold text-gray-700 mr-2 align-middle select-none shadow-sm transition-colors
            ${isReviewMode ? 'cursor-pointer hover:border-ielts-blue hover:text-ielts-blue' : 'cursor-default'}
        `;

        // Validation Styles
        let isCorrect = false;
        let inputBorderClass = "border-gray-300 focus:border-ielts-blue focus:ring-ielts-blue";
        let textClass = "text-ielts-blue";
        
        if (isReviewMode) {
            isCorrect = checkAnswer(val, q.answer);
            if (isCorrect) {
                inputBorderClass = "border-green-500 bg-green-50 text-green-700 font-bold";
                textClass = "text-green-700";
            } else {
                inputBorderClass = "border-red-500 bg-red-50 text-red-700 font-bold";
                textClass = "text-red-700";
            }
        }

        return parts.map((part, i) => {
            if (part === '[INPUT]') {
                return (
                    <span key={i} className="inline-flex items-center align-middle mx-1 whitespace-nowrap relative">
                        {(isInlineQuestion || isSummary) && (
                            <span className={inlineNumberClass} onClick={() => isReviewMode && handleLocationClick(q.locationId, group.passageId)}>{q.id}</span>
                        )}
                        <input 
                            className={`w-[120px] h-[26px] border rounded px-1 text-center font-semibold text-sm focus:outline-none focus:ring-1 transition-all bg-white disabled:bg-opacity-50 placeholder-transparent ${inputBorderClass} ${textClass}`}
                            value={val} 
                            onChange={(e) => onAnswerChange(q.id, e.target.value)} 
                            disabled={isReviewMode}
                            autoComplete="off"
                        />
                        {isReviewMode && !isCorrect && (
                            <span className="ml-2 text-xs font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded border border-green-200 whitespace-nowrap">✓ {q.answer}</span>
                        )}
                    </span>
                );
            }
            
            if (part === '[DROP]') {
                return (
                    <span key={i} className="inline-flex items-center align-middle mx-1 whitespace-nowrap relative">
                        {(isInlineQuestion || isSummary) && (
                            <span className={inlineNumberClass} onClick={() => isReviewMode && handleLocationClick(q.locationId, group.passageId)}>{q.id}</span>
                        )}
                        <select 
                            className={`h-[26px] border rounded px-1 pr-6 font-semibold text-sm focus:outline-none focus:ring-1 transition-all cursor-pointer min-w-[90px] max-w-full py-0 leading-none ${inputBorderClass} ${textClass}`}
                            value={val} 
                            onChange={(e) => onAnswerChange(q.id, e.target.value)} 
                            disabled={isReviewMode}
                        >
                            <option value="" disabled>Select...</option>
                            {itemOptions.map((opt, idx) => {
                                const optText = typeof opt === 'object' ? opt.text : opt;
                                // 🔥🔥🔥 TUZATISH SHU YERDA 🔥🔥🔥
                                // "B. Gareth Williams" dan "B" ni value sifatida olamiz
                                const optionValue = getOptionValue(optText);

                                return <option key={idx} value={optionValue}>{optText}</option>;
                            })}
                        </select>
                        {isReviewMode && !isCorrect && (
                            <span className="ml-2 text-xs font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded border border-green-200 whitespace-nowrap">✓ {q.answer}</span>
                        )}
                    </span>
                );
            }

            const cleanPart = part.replace(/<\/?p>|<\/?div>/gi, ""); 
            if (!cleanPart.trim()) return null;
            return <span key={i} dangerouslySetInnerHTML={{ __html: cleanPart }} className="inline text-gray-800 leading-relaxed align-middle [&_strong]:font-bold [&_b]:font-bold" />;
        });
    };

    const renderChoices = (itemOptions, q, val, isMultiSelect, isReviewMode, onAnswerChange, group) => {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        const correctAnswersList = String(q.answer || "").split(',').map(s => s.trim().toLowerCase());

        return (
            <div className="mt-2 flex flex-col gap-1.5 pl-1">
                {itemOptions.map((opt, idx) => {
                    // Bu yerda ham value ni to'g'rilaymiz, garchi choice larda odatda ID kelsa ham
                    const rawText = typeof opt === 'object' ? opt.text : opt;
                    const optId = typeof opt === 'object' ? (opt.id || rawText) : opt;
                    
                    // Agar optId ham "A. Matn" shaklida bo'lsa, uni tozalaymiz
                    const finalValue = getOptionValue(String(optId));

                    const key = `${q.id}-${idx}`;
                    
                    const isSelected = isMultiSelect 
                        ? (val ? String(val).split(',').includes(String(finalValue)) : false)
                        : (String(val) === String(finalValue));

                    let containerClass = "bg-transparent border-transparent hover:bg-gray-50";
                    let badgeClass = isSelected ? 'bg-ielts-blue text-white border-ielts-blue' : 'bg-gray-100 text-gray-500';
                    let radioClass = "border-gray-300";

                    if (isReviewMode) {
                        const isThisCorrect = correctAnswersList.includes(String(finalValue).toLowerCase());
                        if (isThisCorrect) {
                            containerClass = "bg-green-50 border-green-200 ring-1 ring-green-400";
                            badgeClass = "bg-green-600 text-white border-green-600";
                            radioClass = "border-green-600 checked:bg-green-600 checked:border-green-600";
                        } else if (isSelected && !isThisCorrect) {
                            containerClass = "bg-red-50 border-red-200 ring-1 ring-red-400";
                            badgeClass = "bg-red-600 text-white border-red-600";
                            radioClass = "border-red-600 checked:bg-red-600 checked:border-red-600";
                        } else {
                            containerClass = "opacity-50";
                        }
                    } else if (isSelected) {
                        containerClass = "bg-blue-50 border-blue-100";
                    }

                    return (
                        <label key={key} className={`flex items-center gap-3 cursor-pointer p-1.5 rounded-lg border transition-all select-none ${containerClass}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm border ${badgeClass}`}>{letters[idx] || letters[0]}</div>
                            <div className="relative flex items-center justify-center shrink-0">
                                <input 
                                    type={isMultiSelect ? "checkbox" : "radio"}
                                    className={`peer appearance-none w-4 h-4 border rounded-full checked:bg-white transition-all cursor-pointer ${radioClass} ${!isReviewMode && 'checked:border-ielts-blue'}`}
                                    checked={isSelected} 
                                    onChange={() => { 
                                        if (isReviewMode) return; 
                                        if (isMultiSelect) {
                                            const current = val ? String(val).split(',') : [];
                                            const limit = (group.type && group.type.includes('three')) ? 3 : 2; 
                                            let newA; 
                                            if (isSelected) newA = current.filter(a => a !== String(finalValue)); 
                                            else { if (current.length >= limit) return; newA = [...current, String(finalValue)].sort(); } 
                                            onAnswerChange(q.id, newA.join(',')); 
                                        } else {
                                            onAnswerChange(q.id, String(finalValue));
                                        }
                                    }} 
                                    disabled={isReviewMode} 
                                />
                                <div className={`absolute w-2 h-2 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none ${isReviewMode && correctAnswersList.includes(String(finalValue).toLowerCase()) ? 'bg-white' : 'bg-ielts-blue'} ${isReviewMode && isSelected && !correctAnswersList.includes(String(finalValue).toLowerCase()) ? 'bg-white' : ''}`}></div>
                            </div>
                            <span className="text-sm text-gray-700 font-medium" dangerouslySetInnerHTML={{__html: rawText}} />
                        </label>
                    );
                })}
            </div>
        );
    }

    return (
        <div className={`h-full overflow-y-auto p-6 pb-20 box-border relative select-text bg-white ${textSize}`} ref={qRef}>
            {testData.questions
                .filter(g => g.passageId === testData.passages[activePassage].id)
                .map((group, gIdx) => {
                    const isChoiceType = ['mcq', 'pick_two', 'pick_three', 'multi', 'tfng', 'yesno', 'true_false', 'yes_no'].some(t => group.type && group.type.toLowerCase().includes(t));
                    const isMultiSelect = group.type === 'pick_two' || group.type === 'pick_three' || (group.type && group.type.includes('multi'));
                    const isMatching = group.type === 'matching' || (group.items && group.items.some(i => i.text.includes('[DROP]')));
                    const isSummary = group.type === 'gap_fill' || (group.type && group.type.includes('summary'));
                    const showStaticOptions = isMatching && group.options && group.options.length > 0 && group.options.some(opt => (typeof opt === 'object' ? opt.text : opt).length > 4);

                    return (
                        <div key={gIdx} className="mb-8 pb-8 border-b border-gray-200 border-dashed last:border-0">
                            <div className="bg-white border border-gray-200 p-4 mb-5 rounded-lg text-sm font-semibold text-gray-700 shadow-sm" dangerouslySetInnerHTML={{__html: group.instruction}} />
                            
                            {showStaticOptions && (
                                <div className="bg-white p-4 rounded-lg mb-6 border border-gray-200 shadow-sm">
                                    <p className="text-xs font-bold mb-3 uppercase text-gray-500 tracking-wider">List of Headings / Features</p>
                                    <div className="flex flex-col">
                                        {group.options.map((opt, idx) => (
                                            <div key={idx} className="text-sm text-gray-700 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 rounded">
                                                {typeof opt === 'object' ? opt.text : opt}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                {group.items.map(q => {
                                    const isInlineQuestion = q.text.includes('[INPUT]') || q.text.includes('[DROP]');
                                    let itemOptions = (q.options && q.options.length > 0) ? q.options : (group.options || []);
                                    if (itemOptions.length === 0 && group.type) {
                                        const t = group.type.toLowerCase();
                                        if (t.includes('tfng') || t.includes('true_false')) itemOptions = ["TRUE", "FALSE", "NOT GIVEN"];
                                        else if (t.includes('yesno') || t.includes('yes_no')) itemOptions = ["YES", "NO", "NOT GIVEN"];
                                    }
                                    
                                    // Flow Chart Logic
                                    const isFlowChart = group.type === 'flow_chart';
                                    let containerClass = "block mb-5";
                                    if (isSummary) containerClass = "inline leading-[2.2] text-justify";
                                    if (isFlowChart) containerClass = "block w-full border border-gray-800 p-2 mb-4 bg-white relative shadow-sm"; 

                                    return (
                                        <div key={q.id} id={`q-${q.id}`} className={`group/item relative ${containerClass}`}>
                                            {!isInlineQuestion && !isSummary && !isFlowChart && (
                                                <div className="flex gap-3 items-start">
                                                    <div className={`w-[26px] h-[26px] flex items-center justify-center rounded bg-white border border-gray-400 text-xs font-bold text-gray-700 shrink-0 shadow-sm unselectable transition-colors mt-0.5 ${isReviewMode ? 'cursor-pointer hover:border-ielts-blue hover:text-ielts-blue' : 'cursor-default'}`} onClick={() => isReviewMode && handleLocationClick(q.locationId, group.passageId)}>{q.id}</div>
                                                    <div className="flex-1">
                                                        {renderParts(q.text.split(/(\[INPUT\]|\[DROP\])/g), q, userAnswers[q.id] || "", isInlineQuestion, isSummary, itemOptions, isMatching, isReviewMode, onAnswerChange, group)}
                                                        {isChoiceType && !isMatching && renderChoices(itemOptions, q, userAnswers[q.id] || "", isMultiSelect, isReviewMode, onAnswerChange, group)}
                                                        {isReviewMode && !isChoiceType && !isInlineQuestion && !isSummary && !checkAnswer(userAnswers[q.id], q.answer) && (
                                                            <div className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded border border-green-200 inline-block"><span className="font-bold mr-1">Correct Answer:</span> {q.answer}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {(isInlineQuestion || isSummary || isFlowChart) && (
                                                <>
                                                    {renderParts(q.text.split(/(\[INPUT\]|\[DROP\])/g), q, userAnswers[q.id] || "", isInlineQuestion, isSummary, itemOptions, isMatching, isReviewMode, onAnswerChange, group)}
                                                    {isFlowChart && <div className="absolute -bottom-3.5 left-1/2 transform -translate-x-1/2 text-gray-800 text-lg font-bold leading-none z-10">↓</div>}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
        </div>
    );
}, (prev, next) => prev.textSize === next.textSize && prev.userAnswers === next.userAnswers && prev.activePassage === next.activePassage && prev.isReviewMode === next.isReviewMode);

export default ReadingRightPane;
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

    // 🔥🔥🔥 1. QOROVUL (GUARD CLAUSE) QO'SHAMIZ 🔥🔥🔥
    // Agar testData yo'q bo'lsa yoki ichida questions bo'lmasa, Loading ko'rsat
    if (!testData || !testData.questions || !testData.passages) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400">
                Loading questions...
            </div>
        );
    }
    
    // --- YORDAMCHI FUNKSIYA: Savollarni render qilish ---
    const renderQuestionParts = (q, itemOptions, isMatching, isInlineQuestion, isChoiceType, isMultiSelect, group, isSummary) => {
        const val = userAnswers[q.id] || "";
        const parts = q.text.split(/(\[INPUT\]|\[DROP\])/g);

        // 🔥 YANGI: Flow Chart ekanligini aniqlash
        const isFlowChart = group.type === 'flow_chart';

        // Agar Summary bo'lsa line-height katta, FlowChart bo'lsa quti ko'rinishi, bo'lmasa oddiy blok
        let containerClass = "block mb-5";
        if (isSummary) containerClass = "inline leading-[2.2] text-justify";
        
        // 🔥 YANGI: Flow Chart uchun maxsus Container Dizayni (Ramka)
        if (isFlowChart) {
            containerClass = "block w-full border border-gray-800 p-2 mb-4 bg-white relative shadow-sm"; 
            // mb-4 berdik, chunki o'rtasiga strelka sig'ishi kerak
        }

        return (
            <div key={q.id} id={`q-${q.id}`} className={`group/item relative ${containerClass}`}>
                
                {/* 1. Savol Raqami (Chap tomonda turadigan - STANDART) */}
                {/* FlowChartda raqam matn ichida keladi odatda, lekin agar tashqarida bo'lsa: */}
                {!isInlineQuestion && !isSummary && !isFlowChart && (
                    <div className="flex gap-3 items-start">
                        <div 
                            // 🔥 O'ZGARISH: cursor-pointer faqat Review Mode da bo'ladi
                            className={`
                                w-[26px] h-[26px] flex items-center justify-center rounded bg-white border border-gray-400 text-xs font-bold text-gray-700 shrink-0 shadow-sm unselectable transition-colors mt-0.5
                                ${isReviewMode ? 'cursor-pointer hover:border-ielts-blue hover:text-ielts-blue' : 'cursor-default'}
                            `}
                            onClick={() => { if (isReviewMode) handleLocationClick(q.locationId, group.passageId); }}
                        >
                            {q.id}
                        </div>
                        <div className="flex-1">
                            {renderParts(parts, q, val, isInlineQuestion, isSummary, itemOptions, isMatching, isReviewMode, onAnswerChange, group)}
                            {isChoiceType && !isMatching && renderChoices(itemOptions, q, val, isMultiSelect, isReviewMode, onAnswerChange, group)}
                        </div>
                    </div>
                )}

                {/* Inline savollar, Summary VA FlowChart uchun */}
                {(isInlineQuestion || isSummary || isFlowChart) && (
                    <>
                        {renderParts(parts, q, val, isInlineQuestion, isSummary, itemOptions, isMatching, isReviewMode, onAnswerChange, group)}
                        
                        {/* 🔥 YANGI: Flow Chart o'rtasidagi Strelka (oxirgi elementdan tashqari) */}
                        {isFlowChart && (
                            <div className="absolute -bottom-3.5 left-1/2 transform -translate-x-1/2 text-gray-800 text-lg font-bold leading-none z-10">
                                ↓
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    // --- LOGIKA: Matn bo'laklarini va Inputlarni chizish ---
    const renderParts = (parts, q, val, isInlineQuestion, isSummary, itemOptions, isMatching, isReviewMode, onAnswerChange, group) => {
        // Inline raqam uchun umumiy class
        const inlineNumberClass = `
            inline-flex w-[26px] h-[26px] items-center justify-center rounded bg-white border border-gray-400 text-xs font-bold text-gray-700 mr-2 align-middle select-none shadow-sm transition-colors
            ${isReviewMode ? 'cursor-pointer hover:border-ielts-blue hover:text-ielts-blue' : 'cursor-default'}
        `;

        return parts.map((part, i) => {
            // A) INPUT (Yozma javob)
            if (part === '[INPUT]') {
                return (
                    <span key={i} className="inline-flex items-center align-middle mx-1 whitespace-nowrap">
                        {(isInlineQuestion || isSummary) && (
                            <span 
                                className={inlineNumberClass}
                                onClick={() => { if (isReviewMode) handleLocationClick(q.locationId, group.passageId); }}
                            >
                                {q.id}
                            </span>
                        )}
                        <input 
                            // O'ZGARD: h-[26px] (tenglashdi), w-[120px] (ixchamlashdi), px-1
                            className="w-[120px] h-[26px] border border-gray-300 rounded px-1 text-center font-semibold text-ielts-blue text-sm focus:outline-none focus:border-ielts-blue focus:ring-1 focus:ring-ielts-blue transition-all bg-white disabled:bg-gray-100 disabled:text-gray-500 placeholder-transparent"
                            value={val} 
                            onChange={(e) => onAnswerChange(q.id, e.target.value)} 
                            disabled={isReviewMode}
                            autoComplete="off"
                        />
                    </span>
                );
            }
            
            // B) DROPDOWN (Tanlash)
            if (part === '[DROP]') {
                return (
                    <span key={i} className="inline-flex items-center align-middle mx-1 whitespace-nowrap">
                        {(isInlineQuestion || isSummary) && (
                            <span 
                                className={inlineNumberClass}
                                onClick={() => { if (isReviewMode) handleLocationClick(q.locationId, group.passageId); }}
                            >
                                {q.id}
                            </span>
                        )}
                        <select 
                            // O'ZGARD: h-[26px], py-0 (yozuv o'rtada turishi uchun), min-w-[90px]
                            className="h-[26px] border border-gray-300 rounded px-1 pr-6 font-semibold text-sm bg-white focus:outline-none focus:border-ielts-blue focus:ring-1 focus:ring-ielts-blue transition-all cursor-pointer min-w-[90px] max-w-full disabled:bg-gray-100 py-0 leading-none"
                            value={val} 
                            onChange={(e) => onAnswerChange(q.id, e.target.value)} 
                            disabled={isReviewMode}
                        >
                            <option value="" disabled>Select...</option>
                            {itemOptions.map((opt, idx) => {
                                const optVal = typeof opt === 'object' ? (opt.id || opt.text) : opt;
                                const optText = typeof opt === 'object' ? opt.text : opt;
                                // Matching Heading uchun uzun matnni qisqartirish (i, ii, iii...)
                                const displayVal = (isMatching && optText.length > 5 && (optText.match(/^[ivx]+\s/i) || optText.includes('.'))) 
                                    ? optText.split(/[\.\s]/)[0] 
                                    : optText;
                                return <option key={idx} value={optVal}>{displayVal}</option>;
                            })}
                        </select>
                    </span>
                );
            }

            // C) ODDIY MATN
            const cleanPart = part.replace(/<\/?p>|<\/?div>/gi, ""); 
            if (!cleanPart.trim()) return null;

            return (
                <span 
                    key={i} 
                    dangerouslySetInnerHTML={{ __html: cleanPart }} 
                    className="inline text-gray-800 leading-relaxed align-middle [&_strong]:font-bold [&_b]:font-bold"
                />
            );
        });
    };

    // --- LOGIKA: Multiple Choice (Radio/Checkbox) ---
    const renderChoices = (itemOptions, q, val, isMultiSelect, isReviewMode, onAnswerChange, group) => {
        // Harflar (A, B, C...) uchun massiv
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

        return (
            <div className="mt-2 flex flex-col gap-1.5 pl-1">
                {itemOptions.map((opt, idx) => {
                    const optVal = typeof opt === 'object' ? (opt.id || opt.text) : opt;
                    const optText = typeof opt === 'object' ? opt.text : opt;
                    const key = `${q.id}-${optVal}-${idx}`;
                    
                    // Javob tanlanganligini tekshirish
                    const isSelected = isMultiSelect 
                        ? (val ? String(val).split(',').includes(String(optVal)) : false)
                        : (String(val) === String(optVal));

                    return (
                        <label 
                            key={key} 
                            className={`
                                flex items-center gap-3 cursor-pointer p-1.5 rounded-lg border transition-all select-none
                                ${isSelected ? 'bg-blue-50 border-blue-100' : 'bg-transparent border-transparent hover:bg-gray-50'}
                            `}
                        >
                            {/* 1. Harf (A, B, C) - Dumaloq shaklda */}
                            <div className={`
                                w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm border border-gray-100
                                ${isSelected ? 'bg-ielts-blue text-white border-ielts-blue' : 'bg-gray-100 text-gray-500'}
                            `}>
                                {letters[idx] || letters[0]}
                            </div>

                            {/* 2. Input (Radio yoki Checkbox) - Custom Design */}
                            <div className="relative flex items-center justify-center shrink-0">
                                <input 
                                    type={isMultiSelect ? "checkbox" : "radio"}
                                    className="peer appearance-none w-4 h-4 border border-gray-300 rounded-full checked:border-ielts-blue checked:bg-white transition-all cursor-pointer"
                                    checked={isSelected} 
                                    onChange={() => { 
                                        // 🔥 QOROVUL: Review Mode bo'lsa o'zgartirish mumkin emas
                                        if (isReviewMode) return; 
                                        
                                        if (isMultiSelect) {
                                            const currentAnswers = val ? String(val).split(',') : [];
                                            const limit = (group.type && group.type.includes('three')) ? 3 : 2; 
                                            let newAnswers; 
                                            
                                            if (isSelected) {
                                                // Olib tashlash
                                                newAnswers = currentAnswers.filter(a => a !== String(optVal)); 
                                            } else { 
                                                // Qo'shish (limitdan oshmasa)
                                                if (currentAnswers.length >= limit) return; 
                                                newAnswers = [...currentAnswers, String(optVal)].sort(); 
                                            } 
                                            onAnswerChange(q.id, newAnswers.join(',')); 
                                        } else {
                                            // Oddiy Radio (Single Select)
                                            onAnswerChange(q.id, String(optVal));
                                        }
                                    }} 
                                    disabled={isReviewMode} 
                                />
                                {/* Radio button ichidagi nuqta (faqat tanlanganda chiqadi) */}
                                <div className="absolute w-2 h-2 bg-ielts-blue rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                            </div>

                            {/* 3. Variant Matni (TRUE / FALSE...) */}
                            <span className="text-sm text-gray-700 font-medium" dangerouslySetInnerHTML={{__html: optText}} />
                        </label>
                    );
                })}
            </div>
        );
    }
    

    // --- MAIN RENDER ---
    return (
        <div 
            className={`h-full overflow-y-auto p-6 pb-32 box-border relative select-text bg-white ${textSize}`} 
            ref={qRef}
        >
            {testData.questions
                .filter(g => g.passageId === testData.passages[activePassage].id)
                .map((group, gIdx) => {
                    // Type Detection
                    const isChoiceType = ['mcq', 'pick_two', 'pick_three', 'multi', 'tfng', 'yesno', 'true_false', 'yes_no'].some(t => group.type && group.type.toLowerCase().includes(t));
                    const instructionText = (group.instruction || "").toUpperCase();
                    const isMultiSelect = group.type === 'pick_two' || group.type === 'pick_three' || (group.type && group.type.includes('multi')) || instructionText.includes("CHOOSE TWO") || instructionText.includes("CHOOSE 2");
                    const isMatching = group.type === 'matching' || (group.items && group.items.some(i => i.text.includes('[DROP]')));
                    const isSummary = group.type === 'gap_fill' || (group.type && group.type.includes('summary'));

                    // Check if we need to show Static Options Box (List of Headings)
                    const showStaticOptions = isMatching && group.options && group.options.length > 0 && group.options.some(opt => {
                         const txt = typeof opt === 'object' ? opt.text : opt;
                         return txt.length > 4; 
                    });

                    return (
                        <div key={gIdx} className="mb-8 pb-8 border-b border-gray-200 border-dashed last:border-0">
                            
                            {/* Instruction Box */}
                            <div 
                                className="bg-white border border-gray-200 p-4 mb-5 rounded-lg text-sm font-semibold text-gray-700 shadow-sm"
                                dangerouslySetInnerHTML={{__html: group.instruction}} 
                            />
                            
                            {/* Static Options Box (Headings) */}
                            {showStaticOptions && (
                                <div className="bg-white p-4 rounded-lg mb-6 border border-gray-200 shadow-sm">
                                    <p className="text-xs font-bold mb-3 uppercase text-gray-500 tracking-wider">
                                        List of Headings
                                    </p>
                                    <div className="flex flex-col">
                                        {group.options.map((opt, idx) => (
                                            <div key={idx} className="text-sm text-gray-700 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 rounded">
                                                {typeof opt === 'object' ? opt.text : opt}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Questions Container */}
                            <div>
                                {group.items.map(q => {
                                    const isInlineQuestion = q.text.includes('[INPUT]') || q.text.includes('[DROP]');
                                    let itemOptions = (q.options && q.options.length > 0) ? q.options : (group.options || []);
                                    
                                    // Agar variantlar yo'q bo'lsa (TFNG/YESNO uchun avtomatik to'ldirish)
                                    if (itemOptions.length === 0 && group.type) {
                                        const t = group.type.toLowerCase();
                                        if (t.includes('tfng') || t.includes('true_false')) {
                                            itemOptions = ["TRUE", "FALSE", "NOT GIVEN"];
                                        } else if (t.includes('yesno') || t.includes('yes_no')) {
                                            itemOptions = ["YES", "NO", "NOT GIVEN"];
                                        }
                                    }
                                    
                                    return renderQuestionParts(q, itemOptions, isMatching, isInlineQuestion, isChoiceType, isMultiSelect, group, isSummary);
                                })}
                            </div>
                        </div>
                    )
                })}
        </div>
    );
}, (prev, next) => 
    prev.textSize === next.textSize && 
    prev.userAnswers === next.userAnswers && 
    prev.activePassage === next.activePassage &&
    prev.isReviewMode === next.isReviewMode
);

export default ReadingRightPane;
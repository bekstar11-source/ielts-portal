// src/components/ListeningInterface/ListeningRightPane.jsx
import React, { memo } from "react";

const ListeningRightPane = memo(({ 
    testData, 
    activeSection, 
    userAnswers, 
    onAnswerChange, 
    isReviewMode, 
    textSize = "text-base", 
    qRef, 
    onMouseUp,
    handleQuestionClick,
    introFinished,
    testMode,
    hasStarted,
    audioCurrentTime
}) => {

    // --- GUARD CLAUSE ---
    if (!testData || !testData.questions || !testData.passages) {
        return <div className="p-10 text-center text-gray-500">Loading questions...</div>;
    }

    // --- HELPER: Javobni tekshirish (Rang berish uchun) ---
    const getInputStatusClass = (id, correct) => { 
        if (!isReviewMode) return "border-gray-300 focus:border-ielts-blue focus:ring-ielts-blue"; 
        
        const userAns = String(userAnswers[id]||"").trim().toLowerCase();
        const correctAns = Array.isArray(correct) ? correct.join(',').toLowerCase() : String(correct||"").trim().toLowerCase();
        
        // Agar javob to'g'ri bo'lsa: Yashil, Xato bo'lsa: Qizil
        return userAns === correctAns 
            ? "border-green-500 bg-green-50 text-green-700 font-bold" 
            : "border-red-400 bg-red-50 text-red-700 decoration-red-500 line-through"; 
    };

    // --- HELPER: Input Render ---
    const renderQuestionInput = (q, val) => ( 
        <span className="inline-flex items-center mx-1 align-middle">
            <input 
                className={`
                    h-[26px] w-[120px] px-1 rounded border text-sm text-center font-semibold transition-all outline-none focus:ring-1
                    disabled:bg-gray-100 disabled:text-gray-500
                    ${getInputStatusClass(q.id, q.answer)}
                `} 
                value={val} 
                onChange={(e)=>onAnswerChange(q.id, e.target.value)} 
                disabled={isReviewMode} 
                autoComplete="off" 
            />
            {isReviewMode && (
                <span className="ml-2 text-xs font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                    {Array.isArray(q.answer) ? q.answer[0] : q.answer}
                </span>
            )}
        </span> 
    );

    // --- HELPER: Multi-Select Logic ---
    const handleMultiSelect = (qId, option, limit = 2) => {
        const currentVal = userAnswers[qId] || "";
        let selectedArr = currentVal ? currentVal.split(',') : [];
        
        if (selectedArr.includes(option)) { 
            selectedArr = selectedArr.filter(item => item !== option); 
        } else { 
            if (selectedArr.length < limit) { 
                selectedArr.push(option); 
            } else { 
                selectedArr.shift(); 
                selectedArr.push(option); 
            } 
        }
        onAnswerChange(qId, selectedArr.sort().join(','));
    };

    // --- HELPER: Table Cell Renderer (Regex Logic) ---
    const renderTableCell = (cellContent, group) => {
        const match = typeof cellContent === 'string' ? cellContent.match(/\{q:(\d+)\}/) : null;
        if (match) {
            const qId = parseInt(match[1]);
            let questionItem = group.items ? group.items.find(i => i.id === qId) : null;
            
            // Agar items ichidan topilmasa, sub-grouplarni qidiramiz
            if (!questionItem && group.groups) {
                group.groups.forEach(sub => {
                    const found = sub.items.find(i => i.id === qId);
                    if (found) questionItem = found;
                });
            }

            if (questionItem) {
                const val = userAnswers[qId] || "";
                return ( 
                    <div key={qId} id={`q-${qId}`} className="flex items-center justify-center gap-2">
                        <span 
                            className="w-[20px] h-[20px] flex items-center justify-center bg-gray-100 border border-gray-300 rounded text-[10px] font-bold text-gray-600 cursor-pointer hover:bg-ielts-blue hover:text-white transition-colors"
                            onClick={() => handleQuestionClick(questionItem.locationId, group.passageId)}
                        >
                            {qId}
                        </span>
                        {renderQuestionInput(questionItem, val)}
                    </div> 
                );
            }
        }
        return <span dangerouslySetInnerHTML={{__html: cellContent}}></span>;
    };

    return (
        <div 
            className={`min-h-full relative p-6 pb-20 box-border selectable-text ${textSize}`} 
            ref={qRef} 
            onMouseUp={onMouseUp} 
        >
            <div className="animate-in fade-in duration-500">
                
                {/* --- INTRO OVERLAY (Please Wait) --- */}
                {testMode === 'exam' && !introFinished && !isReviewMode && hasStarted && ( 
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg h-[80vh]">
                        <div className="text-5xl mb-6 animate-bounce">🎧</div>
                        <div className="text-2xl font-bold text-gray-800">Please wait...</div>
                        <div className="text-sm text-gray-500 mt-2 font-medium">Instructions are being read</div>
                        <div className="mt-6 text-sm font-mono bg-gray-100 px-4 py-2 rounded-full border border-gray-200 text-gray-600">
                            00:{String(Math.floor(audioCurrentTime)).padStart(2, '0')}
                        </div>
                    </div>
                )}

                {/* --- MAIN CONTENT (Blur if intro is playing) --- */}
                <div className={(testMode === 'exam' && !introFinished && !isReviewMode && hasStarted) ? "opacity-30 pointer-events-none filter blur-[2px] select-none" : ""}>
                    
                    {/* Section Header */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-2">
                        {testData.passages?.[activeSection]?.title || `Part ${activeSection + 1}`}
                    </h2>

                    {testData.questions
                        .filter(g => g.passageId === testData.passages?.[activeSection]?.id)
                        .map((group, gIdx) => {
                        
                        // --- 1. Groups (Note Completion / Gap Fill) ---
                        if ((group.type === 'note_completion' || group.type === 'gap_fill') && group.groups) {
                            return (
                                <div key={gIdx} className="mb-8">
                                    {group.instruction && (
                                        <div className="bg-white border border-gray-200 p-3 mb-4 rounded text-sm font-semibold text-gray-700 shadow-sm" dangerouslySetInnerHTML={{__html: group.instruction}} />
                                    )}
                                    
                                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                        {group.groups.map((subGroup, sIdx) => (
                                            <div key={sIdx} className="mb-6 last:mb-0">
                                                {subGroup.header && (
                                                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                                                        {subGroup.header}
                                                    </h3>
                                                )}
                                                {subGroup.items.map(q => {
                                                    const val = userAnswers[q.id] || "";
                                                    const renderTextParts = q.text.split(/(\[INPUT\]|\[DROP\])/g).map((part, i) => {
                                                        if(part==='[INPUT]') return (
                                                            <span key={i} className="inline-flex items-center align-middle whitespace-nowrap">
                                                                <span 
                                                                    className="inline-flex w-[22px] h-[22px] items-center justify-center bg-gray-100 border border-gray-300 rounded text-[11px] font-bold text-gray-600 mr-2 cursor-pointer hover:bg-ielts-blue hover:text-white"
                                                                    onClick={() => handleQuestionClick(q.locationId, group.passageId)}
                                                                >
                                                                    {q.id}
                                                                </span>
                                                                {renderQuestionInput(q, val)}
                                                            </span>
                                                        );
                                                        return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
                                                    });
                                                    
                                                    return (
                                                        <div key={q.id} id={`q-${q.id}`} className="mb-3 leading-loose text-gray-800">
                                                            {renderTextParts}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        // --- 2. Other Types ---
                        return (
                            <div key={gIdx} className="mb-10 animate-in fade-in slide-in-from-bottom-2">
                                {/* Instruction */}
                                {group.instruction && (
                                    <div className="bg-white border border-gray-200 p-3 mb-5 rounded text-sm font-semibold text-gray-700 shadow-sm" dangerouslySetInnerHTML={{__html: group.instruction}} />
                                )}
                                
                                {/* Image / Map */}
                                {group.image && ( 
                                    <div className="mb-6 text-center border p-2 rounded bg-white inline-block">
                                        <img src={group.image} className="max-w-full h-auto rounded" alt="Map" />
                                        <p className="text-xs text-gray-500 mt-2 italic">(Refer to the diagram above)</p>
                                    </div> 
                                )}
                                
                                {/* Matching Options Box */}
                                {group.type === 'matching' && group.options && (
                                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6">
                                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Options</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {group.options.map(opt => (
                                                <div key={opt.id || opt} className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-100 shadow-sm">
                                                    {typeof opt === 'object' ? opt.text : opt}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* TABLE COMPLETION */}
                                {group.type === 'table_completion' && group.headers && group.rows ? ( 
                                    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm mb-6">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    {group.headers.map((h, i) => (
                                                        <th key={i} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-r last:border-r-0 border-gray-200">
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {group.rows.map((rowItem, rIdx) => { 
                                                    const cells = rowItem.cells || rowItem; 
                                                    return ( 
                                                        <tr key={rIdx} className="hover:bg-gray-50 transition-colors">
                                                            {Array.isArray(cells) && cells.map((cell, cIdx) => ( 
                                                                <td key={cIdx} className="px-4 py-3 whitespace-normal border-r last:border-r-0 border-gray-200 text-gray-700">
                                                                    {renderTableCell(cell, group)}
                                                                </td> 
                                                            ))}
                                                        </tr> 
                                                    ); 
                                                })}
                                            </tbody>
                                        </table>
                                    </div> 
                                ) : (
                                    // STANDARD QUESTIONS (MCQ, Summary, etc.)
                                    group.items && group.items.map(q => {
                                        if (group.type === 'table_completion') return null;
                                        
                                        // 🔥 YANGI: Flow Chart ekanligini aniqlash
                                        const isFlowChart = group.type === 'flow_chart';
                                        
                                        const val = userAnswers[q.id] || "";
                                        
                                        // Text parsing logic (Split by [INPUT] or [DROP])
                                        const renderText = () => q.text.split(/(\[INPUT\]|\[DROP\])/g).map((part, i) => {
                                            if(part==='[INPUT]') return (
                                                <span key={i} className="inline-flex items-center whitespace-nowrap align-middle">
                                                    <span 
                                                        className="w-[24px] h-[24px] flex items-center justify-center bg-white border border-gray-300 rounded text-xs font-bold text-gray-600 mr-2 cursor-pointer hover:border-ielts-blue hover:text-ielts-blue shadow-sm"
                                                        onClick={() => handleQuestionClick(q.locationId, group.passageId)}
                                                    >
                                                        {q.id}
                                                    </span>
                                                    {renderQuestionInput(q, val)}
                                                </span>
                                            );
                                            if (part === '[DROP]') {
                                                const dropOptions = q.options || group.options || [];
                                                return (
                                                    <span key={i} className="inline-flex items-center whitespace-nowrap align-middle mx-1">
                                                        <select 
                                                            className={`
                                                                h-[26px] px-1 py-0 rounded border text-sm font-semibold focus:ring-1 outline-none cursor-pointer bg-white min-w-[90px] leading-none
                                                                ${getInputStatusClass(q.id, q.answer)}
                                                            `} 
                                                            value={val} 
                                                            onChange={(e) => onAnswerChange(q.id, e.target.value)} 
                                                            disabled={isReviewMode}
                                                        >
                                                            <option value="" disabled>Select...</option>
                                                            {dropOptions.map((opt, idx) => {
                                                                const optValue = typeof opt === 'object' ? opt.id : opt.charAt(0);
                                                                return <option key={idx} value={optValue}>{optValue}</option>;
                                                            })}
                                                        </select>
                                                        {isReviewMode && <span className="ml-2 text-xs font-bold text-green-600">({q.answer})</span>}
                                                    </span>
                                                );
                                            }
                                            return <span key={i} className="align-middle" dangerouslySetInnerHTML={{ __html: part }} />;
                                        });

                                        // 🔥 YANGI: Container Class (Flow Chart uchun ramka)
                                        const containerClass = isFlowChart 
                                            ? "block w-full border border-gray-800 p-2 mb-4 bg-white relative shadow-sm" 
                                            : "mb-4";

                                        return ( 
                                            <div key={q.id} id={`q-${q.id}`} className={containerClass}>
                                                <div className="text-gray-800">
                                                    {(() => {
                                                        const instructionText = (group.instruction || "").toUpperCase();
                                                        const availableOptions = q.options || group.options || [];
                                                        const hasDrop = q.text.includes('[DROP]');
                                                        const isChoiceType = !hasDrop && availableOptions.length > 0 && 
                                                            (['mcq', 'pick_two', 'pick_three', 'multi', 'checkbox'].some(t => (group.type || "").toLowerCase().includes(t)) ||
                                                            instructionText.includes("CHOOSE") || instructionText.includes("SELECT"));

                                                        if (isChoiceType) {
                                                            // --- MCQ / MULTI SELECT ---
                                                            return (
                                                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                                    <div className="flex gap-3 mb-3">
                                                                        <span 
                                                                            className="w-[28px] h-[28px] flex shrink-0 items-center justify-center bg-white border border-gray-300 rounded text-sm font-bold text-gray-700 hover:border-ielts-blue hover:text-ielts-blue cursor-pointer shadow-sm"
                                                                            onClick={() => handleQuestionClick(q.locationId, group.passageId)}
                                                                        >
                                                                            {q.id}
                                                                        </span>
                                                                        <div className="font-semibold text-gray-900 pt-1" dangerouslySetInnerHTML={{ __html: q.text }}></div>
                                                                    </div>
                                                                    
                                                                    <div className="flex flex-col gap-2 pl-2">
                                                                        {availableOptions.map((opt, idx) => {
                                                                            const optText = typeof opt === 'object' ? opt.text : opt;
                                                                            const optVal = typeof opt === 'object' ? (opt.id || opt.text.charAt(0)) : opt.charAt(0);
                                                                            const isMulti = group.type !== 'mcq' && (group.type === 'pick_two' || group.type === 'pick_three' || (group.type && group.type.includes('multi')) || instructionText.includes("CHOOSE TWO") || instructionText.includes("WHICH TWO") || instructionText.includes("CHOOSE 2") || instructionText.includes("CHOOSE THREE"));
                                                                            const limit = (instructionText.includes("THREE") || instructionText.includes("CHOOSE 3")) ? 3 : 2;
                                                                            const currentVal = userAnswers[q.id] || "";
                                                                            const isSelected = isMulti ? currentVal.split(',').includes(optVal) : currentVal === optVal;
                                                                            
                                                                            // Highlight logic for Review
                                                                            let isCorrectHighlight = false;
                                                                            if (isReviewMode && q.answer) {
                                                                                const correctStr = Array.isArray(q.answer) ? q.answer.join(',') : q.answer;
                                                                                isCorrectHighlight = correctStr.toLowerCase().includes(optVal.toLowerCase());
                                                                            }

                                                                            return (
                                                                                <label 
                                                                                    key={idx} 
                                                                                    className={`
                                                                                        flex items-start gap-3 p-2 rounded cursor-pointer border transition-all
                                                                                        ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50 border-transparent'}
                                                                                        ${isCorrectHighlight ? 'bg-green-50 border-green-300 ring-1 ring-green-300' : ''}
                                                                                    `}
                                                                                >
                                                                                    <input 
                                                                                        type={isMulti ? 'checkbox' : 'radio'} 
                                                                                        name={`q_${q.id}`} 
                                                                                        checked={isSelected} 
                                                                                        onChange={() => isMulti ? handleMultiSelect(q.id, optVal, limit) : onAnswerChange(q.id, optVal)} 
                                                                                        disabled={isReviewMode} 
                                                                                        className="mt-1 w-4 h-4 text-ielts-blue border-gray-300 focus:ring-ielts-blue accent-ielts-blue" 
                                                                                    /> 
                                                                                    <span className="text-sm text-gray-700 leading-relaxed pt-0.5">{optText}</span>
                                                                                    {isCorrectHighlight && <span className="ml-auto text-green-600 text-xs font-bold">✓ Correct</span>}
                                                                                </label> 
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div> 
                                                            );
                                                        } else {
                                                            // --- STANDARD INLINE QUESTION (FLOW CHART SHU YERGA TUSHADI) ---
                                                            return (
                                                                <div className="flex items-center leading-loose">
                                                                    {hasDrop && !isFlowChart && (
                                                                        <span 
                                                                            className="w-[26px] h-[26px] flex items-center justify-center bg-white border border-gray-300 rounded text-xs font-bold text-gray-600 mr-2 cursor-pointer hover:border-ielts-blue hover:text-ielts-blue shadow-sm shrink-0"
                                                                            onClick={() => handleQuestionClick(q.locationId, group.passageId)}
                                                                        >
                                                                            {q.id}
                                                                        </span>
                                                                    )}
                                                                    <div className="flex-1">{renderText()}</div>
                                                                </div>
                                                            ); 
                                                        }
                                                    })()}
                                                    
                                                    {/* Explanation Box */}
                                                    {isReviewMode && q.explanation && (
                                                        <div className="mt-2 bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded text-sm flex gap-2">
                                                            <span>💡</span>
                                                            <span>{q.explanation}</span>
                                                        </div>
                                                    )}

                                                    {/* 🔥 YANGI: Flow Chart Strelkasi (↓) */}
                                                    {isFlowChart && (
                                                        <div className="absolute -bottom-3.5 left-1/2 transform -translate-x-1/2 text-gray-800 text-lg font-bold leading-none z-10">
                                                            ↓
                                                        </div>
                                                    )}
                                                </div>
                                            </div> 
                                        )
                                    })
                                )}
                            </div> 
                        );
                    })}
                </div>
            </div>
        </div>
    );
}, (prev, next) => 
    prev.textSize === next.textSize && 
    prev.userAnswers === next.userAnswers && 
    prev.activeSection === next.activeSection &&
    prev.introFinished === next.introFinished &&
    prev.isReviewMode === next.isReviewMode
);

export default ListeningRightPane;
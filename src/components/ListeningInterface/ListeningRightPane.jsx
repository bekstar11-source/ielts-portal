import React, { memo } from "react";

// =========================================================
// 1. PURE FUNCTIONS & UI COMPONENTS (Reusable)
// =========================================================

const checkAnswer = (userVal, correctVal) => {
    if (!userVal && !correctVal) return true;
    if (!userVal || !correctVal) return false;
    const u = String(userVal).trim().toLowerCase();
    const correctList = Array.isArray(correctVal) 
        ? correctVal.map(c => String(c).trim().toLowerCase()) 
        : [String(correctVal).trim().toLowerCase()];
    return correctList.includes(u);
};

const getStatusStyles = (isReviewMode, isCorrect, isSelected = false, type = 'border') => {
    if (!isReviewMode) {
        if (type === 'badge') return "bg-white border-gray-400 text-gray-700";
        if (type === 'container') return isSelected ? "bg-blue-50 border-blue-200" : "bg-white border-transparent";
        return "border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white text-gray-900";
    }
    if (isCorrect) {
        if (type === 'badge') return "bg-green-600 text-white border-green-600";
        if (type === 'container') return "bg-green-50 border-green-200";
        return "border-green-500 bg-green-50 text-green-700 font-bold ring-1 ring-green-500";
    } else {
        if (type === 'badge') return isSelected ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-500 border-gray-300";
        if (type === 'container') return isSelected ? "bg-red-50 border-red-200 opacity-80" : "opacity-50 grayscale";
        return "border-red-500 bg-red-50 text-red-700 font-bold ring-1 ring-red-500";
    }
};

const QuestionBadge = ({ id, isReviewMode, onClick }) => (
    <span 
        className={`min-w-[24px] h-[24px] flex items-center justify-center rounded bg-white border border-gray-400 text-[11px] font-bold text-gray-700 shrink-0 shadow-sm select-none mr-2 
        ${isReviewMode ? 'cursor-pointer hover:border-blue-600 hover:text-blue-600' : ''}`}
        onClick={onClick}
    >
        {id}
    </span>
);

const CorrectAnswerTooltip = ({ answer }) => (
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-10 whitespace-nowrap bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded border border-green-300 font-bold shadow-sm animate-in fade-in zoom-in-95">
        ✓ {Array.isArray(answer) ? answer[0] : answer}
    </div>
);

// 🔥 YANGI: Dropdown (Select) komponenti (Map va Matching uchun umumiy)
const SelectInput = ({ value, onChange, options, isReviewMode, isCorrect, correctAnswer, width = "w-[80px]" }) => {
    const styles = getStatusStyles(isReviewMode, isCorrect, false, 'input');
    return (
        <div className="relative shrink-0 ml-auto sm:ml-0">
            <select 
                value={value} 
                disabled={isReviewMode} 
                onChange={onChange} 
                className={`h-[30px] ${width} pl-2 pr-6 border rounded text-sm font-bold appearance-none cursor-pointer transition-all shadow-sm focus:outline-none ${styles}`}
            >
                <option value="">...</option>
                {options.map((opt, idx) => (
                    <option key={idx} value={opt.label}>{opt.label}</option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
            {isReviewMode && !isCorrect && <CorrectAnswerTooltip answer={correctAnswer} />}
        </div>
    );
};

// =========================================================
// 2. MAIN COMPONENT
// =========================================================

const ListeningRightPane = memo(({ 
    testData, 
    activePart, 
    userAnswers, 
    onAnswerChange, 
    isReviewMode, 
    textSize = "text-base", 
    handleLocationClick 
}) => {

    if (!testData?.questions || !testData?.passages) {
        return <div className="p-10 text-center text-gray-400">Loading questions...</div>;
    }

    // --- RENDERERS ---

    const renderInput = (qId, answer, locationId) => {
        const val = userAnswers[qId] || "";
        const isCorrect = isReviewMode ? checkAnswer(val, answer) : false;
        const styles = getStatusStyles(isReviewMode, isCorrect, false, 'input');

        return (
            <span key={qId} className="inline-flex items-center align-middle mx-1 whitespace-nowrap relative group/input">
                <QuestionBadge id={qId} isReviewMode={isReviewMode} onClick={() => isReviewMode && locationId && handleLocationClick(locationId)} />
                <input 
                    className={`w-[130px] h-[30px] border rounded px-2 text-center font-semibold text-sm focus:outline-none transition-all placeholder-transparent shadow-sm ${styles}`}
                    value={val} 
                    onChange={(e) => onAnswerChange(qId, e.target.value)} 
                    disabled={isReviewMode}
                    autoComplete="off"
                />
                {isReviewMode && !isCorrect && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 hidden group-hover/input:block animate-in fade-in zoom-in-95 duration-200">
                        <span className="text-[10px] font-bold text-white bg-green-600 px-2 py-1 rounded shadow-lg whitespace-nowrap">✓ {answer}</span>
                        <div className="w-2 h-2 bg-green-600 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                    </div>
                )}
            </span>
        );
    };

    const renderTableCell = (cell, group) => {
        if (!cell.isMixed && cell.text) {
            return <span className="text-gray-800 leading-relaxed text-[15px]" dangerouslySetInnerHTML={{ __html: cell.text }} />;
        }
        return (
            <div className="leading-[2.2] text-gray-800 text-[15px]">
                {cell.parts?.map((p, i) => {
                    if (p.type === 'text') return <span key={i} dangerouslySetInnerHTML={{ __html: p.content }} />;
                    if (p.type === 'input') return renderInput(p.id, group.items?.find(it => it.id === p.id)?.answer || "", null);
                    return null;
                })}
            </div>
        );
    };

    const renderSelectionBox = (group) => {
        const questions = group.questions || group.items || [];
        const options = group.options || [];
        if (questions.length === 0 || options.length === 0) return null;

        const questionIds = questions.map((q) => q.id);
        const maxSelection = questionIds.length; 
        const currentSelectedValues = questionIds.map((id) => userAnswers[id]).filter(Boolean); 

        const handleToggle = (optionLabel) => {
            if (isReviewMode) return;
            let newSelection = [...currentSelectedValues];
            if (newSelection.includes(optionLabel)) newSelection = newSelection.filter((val) => val !== optionLabel);
            else {
                if (newSelection.length >= maxSelection) newSelection.shift(); 
                newSelection.push(optionLabel);
            }
            newSelection.sort(); 
            questionIds.forEach((id, index) => onAnswerChange(id, newSelection[index] || ""));
        };

        return (
            <div className="mb-6 border border-gray-200 rounded-lg p-3 bg-gray-50/50 shadow-sm">
                <div className="mb-2 border-b border-gray-200 pb-2">
                    <p className="text-sm text-gray-500 italic font-medium">Select <strong>{maxSelection}</strong> correct options (Questions {questionIds.join(", ")})</p>
                </div>
                <div className="flex flex-col gap-1">
                    {options.map((opt, idx) => {
                        const isSelected = currentSelectedValues.includes(opt.label);
                        const isCorrectOption = questions.some(q => Array.isArray(q.answer) ? q.answer.includes(opt.label) : q.answer === opt.label);
                        const containerStyle = getStatusStyles(isReviewMode, isCorrectOption, isSelected, 'container');
                        const badgeStyle = getStatusStyles(isReviewMode, isCorrectOption, isSelected, 'badge');

                        return (
                            <div key={idx} onClick={() => handleToggle(opt.label)} className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer select-none ${containerStyle}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border transition-colors ${badgeStyle}`}>{opt.label}</div>
                                <div className="relative flex items-center justify-center shrink-0">
                                    <input type="checkbox" className="appearance-none w-5 h-5 border border-gray-400 rounded checked:bg-blue-600 checked:border-blue-600 transition-all" checked={isSelected} readOnly disabled={isReviewMode} />
                                    <svg className={`absolute w-3.5 h-3.5 text-white pointer-events-none ${isSelected ? 'block' : 'hidden'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <span className="text-[15px] text-gray-900 font-medium">{opt.text}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderMapLabeling = (group) => {
        const options = group.options || []; 
        return (
            <div className="mb-6">
                {group.image && (
                    <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex justify-center py-2">
                        <img src={group.image} alt="Map" className="max-w-full max-h-[400px] w-auto h-auto object-contain" />
                    </div>
                )}
                <div className="flex flex-col gap-1">
                    {(group.questions || group.items || []).map((q) => {
                        const isCorrect = checkAnswer(userAnswers[q.id], q.answer);
                        return (
                            <div key={q.id} className="flex items-center gap-2 py-1 hover:bg-gray-50 rounded transition-colors">
                                <QuestionBadge id={q.id} isReviewMode={isReviewMode} onClick={() => isReviewMode && handleLocationClick(q.locationId)} />
                                <div className="text-base font-semibold text-gray-900 leading-snug shrink-0 min-w-[120px]">{q.text}</div>
                                <SelectInput 
                                    value={userAnswers[q.id] || ""} 
                                    onChange={(e) => onAnswerChange(q.id, e.target.value)} 
                                    options={options} 
                                    isReviewMode={isReviewMode} 
                                    isCorrect={isCorrect} 
                                    correctAnswer={q.answer} 
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderMatching = (group) => {
        const options = group.options || []; 
        return (
            <div className="mb-5">
                {options.length > 0 && (
                    <div className="mb-6 border border-gray-300 p-4 rounded-lg bg-gray-50/30">
                        <h4 className="font-bold text-xs text-gray-500 uppercase mb-3 tracking-widest">Options</h4>
                        <div className="flex flex-col gap-2">
                            {options.map((opt, idx) => (
                                <div key={idx} className="text-base font-bold text-gray-800 flex items-start gap-2 leading-tight">
                                    <span className="min-w-[20px] text-gray-900">{opt.label}</span><span>{opt.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="flex flex-col gap-0.5">
                    {(group.questions || group.items || []).map((q) => {
                        const isCorrect = isReviewMode ? checkAnswer(userAnswers[q.id], q.answer) : false;
                        const cleanText = q.text ? q.text.replace('[DROP]', '').trim() : "";
                        return (
                            <div key={q.id} className="flex items-center gap-2 py-1 hover:bg-gray-50 rounded transition-colors">
                                <QuestionBadge id={q.id} isReviewMode={isReviewMode} onClick={() => isReviewMode && handleLocationClick(q.locationId)} />
                                <div className="text-base font-normal text-gray-900 leading-snug shrink-0 mr-2" dangerouslySetInnerHTML={{ __html: cleanText }} />
                                <SelectInput 
                                    value={userAnswers[q.id] || ""} 
                                    onChange={(e) => onAnswerChange(q.id, e.target.value)} 
                                    options={options} 
                                    isReviewMode={isReviewMode} 
                                    isCorrect={isCorrect} 
                                    correctAnswer={q.answer} 
                                    width="w-[100px]"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderStdMCQ = (group) => {
        return (group.questions || group.items || []).map(q => {
            const options = q.options || group.options || [];
            return (
                <div key={q.id} className="mb-6 p-1 rounded-xl">
                    <div className="flex gap-2 mb-2 items-start">
                        <QuestionBadge id={q.id} isReviewMode={isReviewMode} onClick={() => isReviewMode && handleLocationClick(q.locationId)} />
                        {q.text && <div className="text-base font-semibold text-gray-900 leading-relaxed pt-0.5" dangerouslySetInnerHTML={{ __html: q.text }} />}
                    </div>
                    <div className="flex flex-col gap-1 pl-2 sm:pl-10">
                        {options.map((opt, idx) => {
                            const isSelected = String(userAnswers[q.id]) === String(opt.label);
                            const isCorrect = isReviewMode ? checkAnswer(opt.label, q.answer) : false;
                            const containerStyle = getStatusStyles(isReviewMode, isCorrect, isSelected, 'container');
                            const badgeStyle = getStatusStyles(isReviewMode, isCorrect, isSelected, 'badge');

                            return (
                                <label key={idx} className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer select-none ${containerStyle}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border transition-colors ${badgeStyle}`}>{opt.label}</div>
                                    <div className="relative flex items-center justify-center shrink-0">
                                        <input type="radio" className="appearance-none w-5 h-5 border border-gray-300 rounded-full checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer" checked={isSelected} onChange={() => !isReviewMode && onAnswerChange(q.id, String(opt.label))} disabled={isReviewMode} />
                                        <div className={`absolute w-2.5 h-2.5 rounded-full opacity-0 transition-opacity pointer-events-none ${isSelected ? 'opacity-100' : ''} bg-white`}></div>
                                    </div>
                                    <span className="text-[15px] text-gray-900 font-medium leading-tight">{opt.text}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            );
        });
    };

    // --- MAIN DISPATCHER ---
    const renderGroupContent = (group) => {
        if (group.type === 'map_labeling') return renderMapLabeling(group);
        if (group.type === 'matching') return renderMatching(group);
        if (['selection', 'pick_two', 'multi_choice_box', 'multiple_choice_multiple_answer'].includes(group.type)) return renderSelectionBox(group);
        if (group.type === 'table_completion') {
            return (
                <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm mb-6 bg-white">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-100 text-gray-700 uppercase font-bold text-xs">
                            <tr>{group.headers.map((h, i) => (<th key={i} className="px-4 py-3 border-b border-gray-200">{h}</th>))}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {group.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                                    {(row.cells || row).map((cell, cIdx) => (
                                        <td key={cIdx} className="px-4 py-3 border-r border-gray-100 last:border-r-0 align-top">
                                            {renderTableCell(cell, group)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }
        if ((group.type === 'note_completion' || group.type === 'gap_fill') && group.groups) {
            return (
                <div className="mb-6 space-y-6">
                    {group.groups.map((sub, sIdx) => (
                        <div key={sIdx} className="bg-gray-50/30 p-4 rounded-xl border border-gray-100">
                            {sub.header && <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide border-b border-gray-200 pb-2">{sub.header}</h3>}
                            <div className="space-y-3">
                                {sub.items.map((q, qIdx) => {
                                    if (q.isMixed && q.parts) {
                                        return (
                                            <div key={q.id || qIdx} className="text-gray-800 text-[15px] leading-[2.4]">
                                                {q.parts.map((p, pIdx) => {
                                                    if (p.type === 'text') return <span key={pIdx} dangerouslySetInnerHTML={{ __html: p.content }} />;
                                                    if (p.type === 'input') return renderInput(p.id, q.answer, q.locationId, true);
                                                    return null;
                                                })}
                                            </div>
                                        );
                                    }
                                    if (q.text) {
                                        const parts = q.text.split('[INPUT]');
                                        return (
                                            <div key={q.id} className="text-gray-800 text-[15px] leading-[2.4]">
                                                <span className="font-medium mr-1">{parts[0]}</span>
                                                {renderInput(q.id, q.answer, q.locationId, true)}
                                                <span className="ml-1">{parts[1]}</span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        if (group.type === 'flow_chart') {
            return (
                <div className="mb-8 flex flex-col items-center">
                    <div className="flex flex-col gap-3 w-full max-w-lg">
                        {group.items.map((item, index) => (
                            <div key={item.id || index} className="relative flex flex-col items-center">
                                <div className="w-full border border-gray-300 rounded-lg p-4 bg-white text-center shadow-sm relative z-10 hover:shadow-md transition-shadow">
                                    {item.isQuestion ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Step {index + 1}</span>
                                            <div className="flex items-center justify-center w-full gap-2">{renderInput(item.id, item.answer, item.locationId)}</div>
                                            {item.text && <span className="text-sm mt-1 text-gray-600">{item.text.replace('[INPUT]', '')}</span>}
                                        </div>
                                    ) : <span className="text-gray-800 font-semibold text-sm">{item.text}</span>}
                                </div>
                                {index !== group.items.length - 1 && <div className="h-6 w-px bg-gray-300 my-1 relative"><div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 text-gray-400">▼</div></div>}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return renderStdMCQ(group);
    };

    const currentPassage = testData.passages[activePart];
    const questionsForPart = testData.questions.filter(g => g.passageId === currentPassage?.id);

    return (
        <div className={`p-6 pb-5 bg-white ${textSize} select-text w-full`}>
            <div className="mb-6 border-b border-gray-200 pb-4">
                 <h2 className="text-xl md:text-2xl font-bold text-gray-900">{currentPassage?.title}</h2>
                 <p className="text-sm text-gray-500 mt-1 font-medium">Listen carefully and answer the questions.</p>
            </div>
            {questionsForPart.map((group, gIdx) => {
                const allItems = group.questions || group.items || [];
                const firstId = allItems.length > 0 ? allItems[0].id : null;
                const lastId = allItems.length > 0 ? allItems[allItems.length - 1].id : null;
                const questionRange = (firstId && lastId && firstId !== lastId) ? `Questions ${firstId}–${lastId}` : (firstId ? `Question ${firstId}` : "");

                return (
                    <div key={gIdx} className="mb-10 animate-in fade-in duration-500">
                        <div className="mb-5 flex flex-col gap-3">
                            {questionRange && <h3 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-1 inline-block w-fit">{questionRange}</h3>}
                            {group.instruction && <div className="text-base font-bold text-black"><span dangerouslySetInnerHTML={{__html: group.instruction}} /></div>}
                            {group.text && <div className="text-base font-bold text-black leading-relaxed"><span dangerouslySetInnerHTML={{__html: group.text}} /></div>}
                        </div>
                        {renderGroupContent(group)}
                    </div>
                );
            })}
        </div>
    );
}, (prev, next) => prev.activePart === next.activePart && prev.userAnswers === next.userAnswers && prev.isReviewMode === next.isReviewMode && prev.textSize === next.textSize);

export default ListeningRightPane;
import React from 'react';
import { checkAnswer, getStatusStyles } from './ListeningUtils';
import { QuestionBadge, SelectInput, ListeningTextInput } from './ListeningComponents';

export const MapLabeling = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick }) => {
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

export const Matching = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick }) => {
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

export const SelectionBox = ({ group, userAnswers, onAnswerChange, isReviewMode }) => {
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
                        <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${containerStyle}`}>    
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border transition-colors ${badgeStyle}`}>{opt.label}</div>
                            <div className="relative flex items-center justify-center shrink-0">
                                <input type="checkbox" className="appearance-none w-5 h-5 border border-gray-400 rounded checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer" checked={isSelected} onChange={() => handleToggle(opt.label)} disabled={isReviewMode} />
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

export const TableCompletion = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick }) => {
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
                                    {!cell.isMixed && cell.text ? (
                                        <span className="text-gray-800 leading-relaxed text-[15px]" dangerouslySetInnerHTML={{ __html: cell.text }} />
                                    ) : (
                                        <div className="leading-[2.2] text-gray-800 text-[15px]">
                                            {cell.parts?.map((p, i) => {
                                                if (p.type === 'text') return <span key={i} dangerouslySetInnerHTML={{ __html: p.content }} />;
                                                if (p.type === 'input') {
                                                    const item = group.items?.find(it => it.id === p.id);
                                                    return <ListeningTextInput key={p.id} id={p.id} answer={item?.answer} locationId={item?.locationId} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />;
                                                }
                                                return null;
                                            })}
                                        </div>
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const NoteCompletion = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick }) => {
    return (
        <div className="mb-6 space-y-6">
            {group.groups.map((sub, sIdx) => (
                <div key={`sub-${sIdx}`} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    {sub.header && (
                        <h3 className="text-xl font-black text-gray-900 mb-4 uppercase tracking-wide border-b border-gray-300 pb-2">{sub.header}</h3>
                    )}
                    <div className="space-y-3">
                        {sub.items.map((q, qIdx) => {
                            // 🔥 O'ZGARISH: Har bir key unikal bo'lishi uchun prefiks qo'shildi
                            
                            if (q.type === 'heading') return <div key={`head-${qIdx}`} className="font-bold text-black text-lg mt-4 mb-2">{q.text}</div>;
                            
                            const hasInput = q.text && q.text.includes('[INPUT]');
                            
                            if (q.type === 'text' || (q.text && !hasInput && !q.parts)) {
                                return (
                                    <div key={`text-${qIdx}`} className="font-normal text-gray-800 text-[16px] pl-4 leading-relaxed">
                                        <span dangerouslySetInnerHTML={{ __html: q.text }} />
                                    </div>
                                );
                            }

                            if (q.text && hasInput) {
                                const parts = q.text.split('[INPUT]');
                                return (
                                    <div key={`q-${q.id}`} className="font-normal text-gray-800 text-[16px] leading-[2.6] pl-4 flex flex-wrap items-baseline">
                                        {parts[0] && <span className="mr-2" dangerouslySetInnerHTML={{ __html: parts[0] }} />}
                                        <ListeningTextInput id={q.id} answer={q.answer} locationId={q.locationId} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />
                                        {parts[1] && <span className="ml-2" dangerouslySetInnerHTML={{ __html: parts[1] }} />}
                                    </div>
                                );
                            }
                            
                            if (q.isMixed && q.parts) {
                                return (
                                    <div key={`mixed-${q.id}`} className="font-normal text-gray-800 text-[16px] leading-[2.6] pl-4">
                                         {q.parts.map((p, pIdx) => {
                                            if (p.type === 'text') return <span key={`p-text-${pIdx}`} dangerouslySetInnerHTML={{ __html: p.content }} />;
                                            if (p.type === 'input') return <ListeningTextInput key={`p-input-${p.id}`} id={p.id} answer={q.answer} locationId={q.locationId} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />;
                                            return null;
                                        })}
                                    </div>
                                )
                            }
                            return null;
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export const FlowChart = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick }) => {
    return (
        <div className="mb-8 flex flex-col items-center">
            <div className="flex flex-col gap-3 w-full max-w-lg">
                {group.items.map((item, index) => (
                    <div key={item.id || index} className="relative flex flex-col items-center">
                        <div className="w-full border border-gray-300 rounded-lg p-4 bg-white text-center shadow-sm relative z-10 hover:shadow-md transition-shadow">
                            {item.isQuestion ? (
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Step {index + 1}</span>
                                    <div className="flex items-center justify-center w-full gap-2">
                                        <ListeningTextInput id={item.id} answer={item.answer} locationId={item.locationId} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />
                                    </div>
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
};

export const StandardMCQ = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick }) => {
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
                            <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${containerStyle}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border transition-colors ${badgeStyle}`}>{opt.label}</div>
                                <div className="relative flex items-center justify-center shrink-0">
                                    <input type="radio" className="appearance-none w-5 h-5 border border-gray-300 rounded-full checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer" checked={isSelected} onChange={() => !isReviewMode && onAnswerChange(q.id, String(opt.label))} disabled={isReviewMode} />
                                    <div className={`absolute w-2.5 h-2.5 rounded-full opacity-0 transition-opacity pointer-events-none ${isSelected ? 'opacity-100' : ''} bg-white`}></div>
                                </div>
                                <span className="text-[15px] text-gray-900 font-medium leading-tight">{opt.text}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    });
};
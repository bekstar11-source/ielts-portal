import React from 'react';
import {
    DndContext,
    useDraggable,
    useDroppable,
    PointerSensor,
    useSensor,
    useSensors,
    TouchSensor
} from '@dnd-kit/core';
import { checkAnswer, getStatusStyles } from './ListeningUtils';
import { QuestionBadge, SelectInput, ListeningTextInput } from './ListeningComponents';

/**
 * Matn oxiridagi savol raqamini olib tashlaydi.
 * Masalan: "Visual research with 34 " + id=34 => "Visual research with "
 * Badge allaqachon raqamni ko'rsatadi, qayta ko'rsatmaslik uchun.
 */
const stripLeadingId = (text, id) => {
    if (!text || id == null) return text;
    // Matn oxirida yoki boshida savol raqami turishi mumkin (masalan "34 " yoki " 34")
    return text
        .replace(new RegExp(`\\b${id}\\s*$`), '')   // oxirida: "... 34 "
        .replace(new RegExp(`^\\s*${id}\\b\.?\\s*`), '') // boshida: "34. ..."
        .trim();
};

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
                            <div className="font-semibold text-gray-900 leading-snug shrink-0 min-w-[120px]">{stripLeadingId(q.text, q.id)}</div>
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

const DraggableOption = ({ label, text, isReviewMode, isUsed }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `option-${label}`,
        disabled: isReviewMode,
        data: { label, text }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
        transition: 'none', // Siltanishni oldini olish uchun drag paytida transitionni o'chiramiz
    } : {
        transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease'
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`
                px-4 py-3 border rounded-xl cursor-grab active:cursor-grabbing
                select-none flex items-center gap-3 w-full
                ${isDragging ? 'opacity-40 ring-2 ring-blue-500 shadow-2xl scale-105 z-[1000] border-blue-400 bg-white' : ''}
                ${isUsed && !isDragging ? 'bg-gray-50 border-gray-200 opacity-60 grayscale-[0.5]' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'}
                ${isReviewMode ? 'cursor-default opacity-100 grayscale-0' : ''}
            `}
        >
            <span className={`w-6 h-6 flex items-center justify-center rounded text-xs shrink-0 font-bold ${isUsed ? 'bg-gray-200 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>{label}</span>
            <span className={`flex-1 leading-tight text-[0.95em] font-medium ${isUsed ? 'text-gray-400' : 'text-gray-700'}`}>{text}</span>
            {isUsed && !isDragging && <div className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">Placed</div>}
        </div>
    );
};

const DroppableSlot = ({ id, value, options, isReviewMode, isCorrect, correctAnswer, onClear }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `slot-${id}`,
        disabled: isReviewMode
    });

    const selectedOption = options.find(opt => opt.label === value);

    return (
        <div
            ref={setNodeRef}
            className={`
                min-w-[140px] md:min-w-[180px] min-h-[44px] border-2 rounded-xl flex items-center justify-center relative
                transition-all duration-300 px-3 py-1 group/slot
                ${isOver ? 'bg-blue-50 border-blue-400 border-solid scale-[1.02] shadow-md' : 'border-dashed border-gray-200 bg-gray-50/20'}
                ${value ? 'border-solid border-gray-300 bg-white ring-1 ring-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]' : ''}
                ${isReviewMode ? (isCorrect ? 'border-green-500 bg-green-50 ring-green-100' : 'border-red-500 bg-red-50 ring-red-100') : ''}
            `}
        >
            {value ? (
                <div className="flex items-center gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
                    <span className="w-5 h-5 flex items-center justify-center bg-gray-800 text-white text-[10px] rounded shrink-0 font-bold">{value}</span>
                    <span className="text-[0.9em] font-bold text-gray-900 truncate flex-1">{selectedOption?.text || value}</span>
                    {!isReviewMode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="bg-gray-100 hover:bg-red-100 hover:text-red-500 text-gray-400 rounded-full p-0.5 opacity-0 group-hover/slot:opacity-100 transition-opacity"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            ) : (
                <span className="text-gray-300 text-[10px] font-bold uppercase tracking-widest">Drop here</span>
            )}

            {isReviewMode && !isCorrect && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] px-2 py-1 rounded-md shadow-lg whitespace-nowrap z-20 font-bold animate-in slide-in-from-top-1">
                    Correct: {options.find(o => o.label === correctAnswer)?.text || correctAnswer}
                </div>
            )}
        </div>
    );
};

const PoolDroppable = ({ children, isDragging }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'pool-zone'
    });

    return (
        <div
            ref={setNodeRef}
            className={`
                p-6 md:p-8 rounded-[32px] min-h-[300px] flex flex-col transition-colors duration-300
                ${isOver && isDragging ? 'bg-red-50/50' : 'bg-gray-50/50'}
            `}
        >
            {children}
        </div>
    );
};

export const Matching = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick }) => {
    const [activeId, setActiveId] = React.useState(null);
    const options = group.options || [];
    const questions = group.questions || group.items || [];

    // JSON'dan sarlavhalarni o'qiymiz, agar yo'q bo'lsa standart nomlarni ishlatamiz
    const questionTitle = group.questionHeader || "Targets";
    const optionTitle = group.optionHeader || "Options pool";

    // Sensorlarni sozlaymiz (sichqoncha tezroq ishlashi uchun)
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 3, // 3px harakat qilganda drag boshlanadi
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;

        const optionLabel = active.id.replace('option-', '');

        // Agar poolga qaytarib tashlasak (return to pool)
        if (over.id === 'pool-zone') {
            // Ushbu variant qaysi savolga tegishli bo'lsa o'shani o'chiramiz
            const slotToClear = Object.entries(userAnswers).find(([_, val]) => val === optionLabel);
            if (slotToClear) {
                onAnswerChange(slotToClear[0], "");
            }
            return;
        }

        // Slotga tashlasak
        const slotId = over.id.replace('slot-', '');
        onAnswerChange(slotId, optionLabel);
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={isReviewMode ? undefined : handleDragEnd}
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 mb-10 mt-4 items-start">
                {/* LEFT: QUESTIONS */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-[0.85em] font-black text-gray-400 uppercase tracking-[0.15em] mb-2 px-1">{questionTitle}</h4>
                    <div className="flex flex-col gap-2">
                        {questions.map((q) => {
                            const isCorrect = isReviewMode ? checkAnswer(userAnswers[q.id], q.answer) : false;
                            const cleanText = q.text ? q.text.replace('[DROP]', '').trim() : "";
                            return (
                                <div key={q.id} className="flex items-center justify-between gap-6 p-3 rounded-2xl transition-all">
                                    <div className="flex items-center gap-4 flex-1">
                                        <QuestionBadge id={q.id} isReviewMode={isReviewMode} onClick={() => isReviewMode && handleLocationClick(q.locationId)} />
                                        <div className="font-bold text-gray-800 text-[1.1em]" dangerouslySetInnerHTML={{ __html: stripLeadingId(cleanText, q.id) }} />
                                    </div>
                                    <DroppableSlot
                                        id={q.id}
                                        value={userAnswers[q.id]}
                                        options={options}
                                        isReviewMode={isReviewMode}
                                        isCorrect={isCorrect}
                                        correctAnswer={q.answer}
                                        onClear={() => onAnswerChange(q.id, "")}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: OPTIONS */}
                <PoolDroppable isDragging={!!activeId}>
                    <h4 className="text-[0.85em] font-black text-gray-400 uppercase tracking-[0.15em] mb-6 text-center">{optionTitle}</h4>
                    <div className="flex flex-col gap-3">
                        {options.map((opt, idx) => {
                            const isUsed = Object.values(userAnswers).includes(opt.label);
                            return (
                                <DraggableOption
                                    key={idx}
                                    label={opt.label}
                                    text={opt.text}
                                    isReviewMode={isReviewMode}
                                    isUsed={isUsed}
                                />
                            );
                        })}
                    </div>
                    {!isReviewMode && (
                        <div className="mt-auto pt-8">
                            <p className="text-[0.65em] text-gray-400 font-bold uppercase tracking-widest text-center animate-pulse">
                                {activeId ? 'Drop here to remove' : ''}
                            </p>
                        </div>
                    )}
                </PoolDroppable>
            </div>
        </DndContext>
    );
};

export const SelectionBox = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick }) => {
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
            <div className="mb-3 border-b border-gray-200 pb-3">
                <div className="text-[0.875em] text-gray-600 font-medium flex flex-wrap items-center gap-2">
                    <span>Select <strong>{maxSelection}</strong> correct options for:</span>
                    <div className="flex items-center gap-1.5">
                        {questions.map((q) => (
                            <QuestionBadge
                                key={q.id}
                                id={q.id}
                                isReviewMode={isReviewMode}
                                onClick={() => isReviewMode && handleLocationClick(q.locationId)}
                            />
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-1">
                {options.map((opt, idx) => {
                    const isSelected = currentSelectedValues.includes(opt.label);
                    const isCorrectOption = questions.some(q => Array.isArray(q.answer) ? q.answer.includes(opt.label) : q.answer === opt.label);
                    const containerStyle = getStatusStyles(isReviewMode, isCorrectOption, isSelected, 'container');
                    const badgeStyle = getStatusStyles(isReviewMode, isCorrectOption, isSelected, 'badge');

                    return (
                        <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${containerStyle}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.75em] font-bold shrink-0 border transition-colors ${badgeStyle}`}>{opt.label}</div>
                            <div className="relative flex items-center justify-center shrink-0">
                                <input type="checkbox" className="appearance-none w-5 h-5 border border-gray-400 rounded checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer" checked={isSelected} onChange={() => handleToggle(opt.label)} disabled={isReviewMode} />
                                <svg className={`absolute w-3.5 h-3.5 text-white pointer-events-none ${isSelected ? 'block' : 'hidden'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <span className="text-gray-900 font-medium">{opt.text}</span>
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
            <table className="w-full text-[0.875em] text-left border-collapse">
                <thead className="bg-gray-100 text-gray-700 uppercase font-bold text-[0.75em]">
                    <tr>{(group.headers || []).map((h, i) => (<th key={i} className="px-4 py-3 border-b border-gray-200">{h}</th>))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {(group.rows || []).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                            {(row.cells || (Array.isArray(row) ? row : [])).map((cell, cIdx) => (
                                <td key={cIdx} className="px-4 py-3 border-r border-gray-100 last:border-r-0 align-top">
                                    {!cell.isMixed && cell.text ? (
                                        <span className="text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: cell.text }} />
                                    ) : (
                                        <div className="leading-[2.2] text-gray-800">
                                            {cell.parts?.map((p, i) => {
                                                if (p.type === 'text') {
                                                    // Keyingi part input bo'lsa, undagi id ni matn oxiridan olib tashlash
                                                    const nextPart = cell.parts[i + 1];
                                                    const cleanContent = (nextPart?.type === 'input')
                                                        ? stripLeadingId(p.content, nextPart.id)
                                                        : p.content;
                                                    return <span key={i} dangerouslySetInnerHTML={{ __html: cleanContent }} />;
                                                }
                                                if (p.type === 'input') {
                                                    const lookupItems = (group.items || group.questions || []);
                                                    const item = lookupItems.find(it => String(it.id) === String(p.id));

                                                    // Muhim: Ayrim hollarda javob "cell" obyektining o'zida bo'ladi
                                                    const answer = item?.answer || cell.answer;
                                                    const locationId = item?.locationId || cell.locationId;

                                                    return <ListeningTextInput key={p.id} id={p.id} answer={answer} locationId={locationId} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />;
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
                        <h3 className="text-[1.25em] font-black text-gray-900 mb-4 uppercase tracking-wide border-b border-gray-300 pb-2">{sub.header}</h3>
                    )}
                    <div className="space-y-3">
                        {(sub.items || sub.questions || []).map((q, qIdx) => {
                            // 🔥 O'ZGARISH: Har bir key unikal bo'lishi uchun prefiks qo'shildi

                            if (q.type === 'heading') return <div key={`head-${qIdx}`} className="font-bold text-black text-[1.125em] mt-4 mb-2">{q.text}</div>;

                            const hasInput = q.text && q.text.includes('[INPUT]');

                            if (q.type === 'text' || (q.text && !hasInput && !q.parts)) {
                                return (
                                    <div key={`text-${qIdx}`} className="font-normal text-gray-800 pl-4 leading-relaxed">
                                        <span dangerouslySetInnerHTML={{ __html: q.text }} />
                                    </div>
                                );
                            }

                            if (q.text && hasInput) {
                                const parts = q.text.split('[INPUT]');
                                // Badge allaqachon id ni ko'rsatadi — matn oxiridagi takroriy raqamni olib tashlash
                                const cleanBefore = stripLeadingId(parts[0], q.id);
                                return (
                                    <div key={`q-${q.id}`} className="font-normal text-gray-800 leading-[2.6] pl-4 flex flex-wrap items-baseline">
                                        {cleanBefore && <span className="mr-2" dangerouslySetInnerHTML={{ __html: cleanBefore }} />}
                                        <ListeningTextInput id={q.id} answer={q.answer} locationId={q.locationId} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />
                                        {parts[1] && <span className="ml-2" dangerouslySetInnerHTML={{ __html: parts[1] }} />}
                                    </div>
                                );
                            }

                            if (q.isMixed && q.parts) {
                                return (
                                    <div key={`mixed-${q.id}`} className="font-normal text-gray-800 leading-[2.6] pl-4">
                                        {q.parts.map((p, pIdx) => {
                                            if (p.type === 'text') {
                                                const nextPart = q.parts[pIdx + 1];
                                                const cleanContent = (nextPart?.type === 'input')
                                                    ? stripLeadingId(p.content, nextPart.id)
                                                    : p.content;
                                                return <span key={`p-text-${pIdx}`} dangerouslySetInnerHTML={{ __html: cleanContent }} />;
                                            }
                                            if (p.type === 'input') {
                                                return <ListeningTextInput key={`p-input-${p.id}`} id={p.id} answer={q.answer} locationId={q.locationId} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />;
                                            }
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
    const options = group.options || [];

    return (
        <div className="mb-6 flex flex-col items-center w-full">
            {options.length > 0 && (
                <div className="mb-5 border border-gray-300 p-3 rounded-xl bg-gray-50/50 w-full shadow-sm">
                    <h4 className="font-bold text-[0.75em] text-gray-500 uppercase mb-3 tracking-widest text-center">Options</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {options.map((opt, idx) => (
                            <div key={idx} className="font-bold text-gray-800 flex items-start gap-2 leading-tight">
                                <span className="min-w-[20px] text-gray-900">{opt.label}</span>
                                <span className="font-normal text-gray-700">{opt.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-2 w-full max-w-2xl">
                {(group.items || group.questions || []).map((item, index) => {
                    const hasInput = item.text && item.text.includes('[INPUT]');
                    let content = null;

                    if (item.isQuestion || hasInput) {
                        const parts = item.text ? item.text.split('[INPUT]') : ['', ''];
                        const cleanBefore = stripLeadingId(parts[0], item.id);
                        const isCorrect = isReviewMode ? checkAnswer(userAnswers[item.id], item.answer) : false;

                        content = (
                            <div className="font-normal text-gray-800 leading-[2.2] flex flex-wrap items-baseline justify-center text-center">
                                {cleanBefore && <span className="mr-2" dangerouslySetInnerHTML={{ __html: cleanBefore }} />}

                                {options.length > 0 ? (
                                    <div className="inline-block mx-1">
                                        <SelectInput
                                            value={userAnswers[item.id] || ""}
                                            onChange={(e) => onAnswerChange(item.id, e.target.value)}
                                            options={options}
                                            isReviewMode={isReviewMode}
                                            isCorrect={isCorrect}
                                            correctAnswer={item.answer}
                                            width="min-w-[100px]"
                                        />
                                    </div>
                                ) : (
                                    <ListeningTextInput
                                        id={item.id}
                                        answer={item.answer}
                                        locationId={item.locationId}
                                        userAnswers={userAnswers}
                                        onAnswerChange={onAnswerChange}
                                        isReviewMode={isReviewMode}
                                        handleLocationClick={handleLocationClick}
                                    />
                                )}

                                {parts[1] && <span className="ml-2" dangerouslySetInnerHTML={{ __html: parts[1] }} />}
                            </div>
                        );
                    } else {
                        content = <span className="text-gray-900 font-medium text-center inline-block w-full">{item.text}</span>;
                    }

                    return (
                        <div key={item.id || index} className="relative flex flex-col items-center">
                            <div className={`w-full border border-gray-300 rounded-lg p-3 shadow-sm relative z-10 hover:shadow-md transition-shadow ${!item.isQuestion && !hasInput ? 'bg-gray-50' : 'bg-white'}`}>
                                {content}
                            </div>
                            {index !== group.items.length - 1 && (
                                <div className="h-5 w-px bg-gray-400 my-1 relative">
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[6px] text-gray-500 text-[10px]">▼</div>
                                </div>
                            )}
                        </div>
                    );
                })}
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
                    {q.text && <div className="font-semibold text-gray-900 leading-relaxed pt-0.5" dangerouslySetInnerHTML={{ __html: stripLeadingId(q.text, q.id) }} />}
                </div>
                <div className="flex flex-col gap-1 pl-2 sm:pl-10">
                    {options.map((opt, idx) => {
                        const isSelected = String(userAnswers[q.id]) === String(opt.label);
                        const isCorrect = isReviewMode ? checkAnswer(opt.label, q.answer) : false;
                        const containerStyle = getStatusStyles(isReviewMode, isCorrect, isSelected, 'container');
                        const badgeStyle = getStatusStyles(isReviewMode, isCorrect, isSelected, 'badge');

                        return (
                            <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${containerStyle}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.75em] font-bold shrink-0 border transition-colors ${badgeStyle}`}>{opt.label}</div>
                                <div className="relative flex items-center justify-center shrink-0">
                                    <input type="radio" className="appearance-none w-5 h-5 border border-gray-300 rounded-full checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer" checked={isSelected} onChange={() => !isReviewMode && onAnswerChange(q.id, String(opt.label))} disabled={isReviewMode} />
                                    <div className={`absolute w-2.5 h-2.5 rounded-full opacity-0 transition-opacity pointer-events-none ${isSelected ? 'opacity-100' : ''} bg-white`}></div>
                                </div>
                                <span className="text-gray-900 font-medium leading-tight">{opt.text}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    });
};
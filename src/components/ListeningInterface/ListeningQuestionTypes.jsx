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
const stripLeadingId = (val, id) => {
    if (!val) return "";
    const text = (typeof val === 'object') ? (val.text || val.label || val.content || "") : val;
    if (id == null) return text;
    // Matn oxirida yoki boshida savol raqami turishi mumkin (masalan "34 " yoki " 34")
    return String(text)
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
                                id={q.id}
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
        transition: 'none',
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
                px-3 py-1.5 border border-gray-300 rounded-lg cursor-grab active:cursor-grabbing
                select-none flex items-center justify-start w-fit transition-all
                ${isDragging ? 'opacity-40 ring-2 ring-blue-500 shadow-2xl scale-105 z-[1000] bg-white border-blue-400' : ''}
                ${isUsed && !isDragging ? 'bg-gray-50 border-gray-200 opacity-40 grayscale' : 'bg-white hover:border-gray-400 hover:shadow-sm'}
                ${isReviewMode ? 'cursor-default opacity-100 grayscale-0' : ''}
            `}
        >
            <span className={`leading-tight text-[1em] font-medium text-black ${isUsed ? 'text-gray-400' : 'text-gray-800'}`}>{text}</span>
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
                min-w-[140px] md:min-w-[180px] min-h-[38px] border-2 rounded-xl flex items-center justify-center relative
                transition-all duration-300 px-3 py-1 group/slot
                ${isOver ? 'bg-blue-50 border-blue-400 border-solid scale-[1.02] shadow-md' : 'border-dashed border-gray-300 bg-gray-50/50'}
                ${value ? 'border-solid border-gray-400 bg-white shadow-sm' : ''}
                ${isReviewMode ? (isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : ''}
            `}
        >
            {value ? (
                <div className="flex items-center justify-center w-full animate-in fade-in zoom-in-95 duration-200">
                    <span className="text-[0.85em] font-semibold text-gray-900 text-center leading-tight">
                        {selectedOption?.text || value}
                    </span>
                    {!isReviewMode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="absolute -top-1 -right-1 bg-white border border-gray-200 shadow-sm hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-full p-0.5 opacity-0 group-hover/slot:opacity-100 transition-opacity z-10"
                        >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            ) : (
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest animate-pulse opacity-50">Drop here</span>
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
            id="pool-zone"
            className={`
                p-4 md:p-5 h-auto flex flex-col transition-colors duration-300 rounded-2xl
                ${isOver && isDragging ? 'bg-blue-50/30' : 'bg-gray-50/10'}
                border-2 border-dashed border-gray-100/50
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
    const questionTitle = (group.questionHeader?.text || group.questionHeader) || "Targets";
    const optionTitle = (group.optionHeader?.text || group.optionHeader) || "Options pool";

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
            // Faqat ushbu guruhdagi savollarni tekshiramiz (Object.entries emas)
            const questionToClear = questions.find(q => userAnswers[q.id] === optionLabel);
            if (questionToClear) {
                onAnswerChange(questionToClear.id, "");
            }
            return;
        }

        // Slotga tashlasak
        const slotId = over.id.replace('slot-', '');
        onAnswerChange(slotId, optionLabel);
    };

    return (
        <DndContext
            id={`dnd-matching-${group.id || (questions[0] && questions[0].id) || 'default'}`}
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={isReviewMode ? undefined : handleDragEnd}
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 mb-10 mt-4 items-start">
                {/* LEFT: QUESTIONS */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-[20px] font-bold text-black uppercase tracking-wide mb-1 px-1 text-center">{questionTitle}</h4>
                    <div className="flex flex-col gap-0.5">
                        {questions.map((q) => {
                            const isCorrect = isReviewMode ? checkAnswer(userAnswers[q.id], q.answer) : false;
                            const qText = (typeof q.text === 'object' ? q.text.text : q.text) || "";
                            const cleanText = String(qText).replace('[DROP]', '').trim();
                            return (
                                <div key={q.id} className="flex items-center justify-between gap-6 py-1.5 px-3 rounded-2xl transition-all hover:bg-gray-50/50">
                                    <div className="flex items-center gap-4 flex-1">
                                        <QuestionBadge id={q.id} isReviewMode={isReviewMode} onClick={() => isReviewMode && handleLocationClick(q.locationId)} />
                                        <div className="font-bold text-gray-800 text-[1em]" dangerouslySetInnerHTML={{ __html: stripLeadingId(cleanText, q.id) }} />
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
                    <h4 className="text-[20px] font-bold text-black uppercase tracking-wide mb-4 text-center">{optionTitle}</h4>
                    <div className="flex flex-col gap-2 items-start justify-center">
                        {options.map((opt, idx) => {
                            const label = opt.label || String.fromCharCode(65 + idx);
                            const text = opt.text || (typeof opt === 'string' ? opt : "");
                            const isUsed = questions.some(q => userAnswers[q.id] === label);

                            return (
                                <div
                                    key={label}
                                    className={`${isUsed ? 'invisible pointer-events-none' : 'visible'} w-fit`}
                                >
                                    <DraggableOption
                                        label={label}
                                        text={text}
                                        isUsed={false}
                                        isReviewMode={isReviewMode}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    {options.length > 0 && questions.filter(q => userAnswers[q.id]).length === options.length && (
                        <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl italic">
                            All options placed
                        </div>
                    )}
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
        <div className="mb-6 py-2 px-1">
            <div className="mb-3 border-b border-gray-100 pb-3">
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
                            <span className="text-gray-900 font-medium">{typeof opt.text === 'object' ? opt.text.text : opt.text}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const TableCompletion = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick }) => {
    return (
        <div className="overflow-x-auto mb-8 bg-white">
            <table className="w-full text-[1em] text-left border-collapse border border-black">
                <thead className="bg-gray-100 text-gray-700 uppercase font-black text-[0.8em] tracking-wider">
                    <tr>
                        {(group.headers || []).map((h, i) => (
                            <th key={i} className="px-4 py-3 border border-black">
                                {typeof h === 'object' ? h.text : h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {(group.rows || []).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                            {(row.cells || (Array.isArray(row) ? row : [])).map((cell, cIdx) => (
                                <td key={cIdx} className="px-4 py-3 border border-black align-top">
                                    {!cell.isMixed && (cell.text || typeof cell !== 'object') ? (
                                        <div className="text-gray-800 font-semibold leading-relaxed pt-0.5 w-full" dangerouslySetInnerHTML={{ __html: cell.text || cell }} />
                                    ) : (
                                        <div className="leading-[2.2] text-gray-900 font-semibold">
                                            {cell.parts?.map((p, i) => {
                                                if (p.type === 'text') {
                                                    const nextPart = cell.parts[i + 1];
                                                    const cleanContent = (nextPart?.type === 'input')
                                                        ? stripLeadingId(p.content, nextPart.id)
                                                        : p.content;
                                                    return <span key={i} dangerouslySetInnerHTML={{ __html: cleanContent }} />;
                                                }
                                                if (p.type === 'input') {
                                                    const lookupItems = (group.items || group.questions || []);
                                                    const item = lookupItems.find(it => String(it.id) === String(p.id));
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
        <div className="mb-2 space-y-8">
            {group.groups.map((sub, sIdx) => (
                <div key={`note-${sub.id ?? ''}-${sIdx}`} className="bg-white py-2 rounded-xl">
                    {sub.header && (
                        <h3 className="text-[1.1em] font-black text-gray-900 mb-4 mt-2 pt-3 uppercase tracking-wider border-t border-gray-100">{typeof sub.header === 'object' ? sub.header.text : sub.header}</h3>
                    )}
                    <div className="space-y-1">
                        {(sub.items || sub.questions || []).map((q, qIdx) => {
                            // 🔥 O'ZGARISH: Har bir key unikal bo'lishi uchun prefiks qo'shildi

                            if (q.type === 'heading') return <div key={`head-${qIdx}`} className={`font-bold text-black text-[1.125em] ${qIdx > 0 ? '!mt-6' : 'mt-1'} mb-1`}>{typeof q.text === 'object' ? q.text.text : q.text}</div>;

                            const qText = (typeof q.text === 'object' ? q.text.text : q.text) || "";
                            const hasInput = qText && String(qText).includes('[INPUT]');

                            if (q.type === 'text' || (q.text && !hasInput && !q.parts)) {
                                return (
                                    <div key={`text-${qIdx}`} className="font-normal text-gray-800 pl-4 leading-relaxed">
                                        <span dangerouslySetInnerHTML={{ __html: qText }} />
                                    </div>
                                );
                            }

                            if (q.text && hasInput) {
                                const parts = String(qText).split('[INPUT]');
                                // Badge allaqachon id ni ko'rsatadi — matn oxiridagi takroriy raqamni olib tashlash
                                const cleanBefore = stripLeadingId(parts[0], q.id);
                                return (
                                    <div key={`q-${q.id}`} className="font-normal text-gray-800 leading-[1.8] pl-4 flex flex-wrap items-baseline">
                                        {cleanBefore && <span className="mr-2" dangerouslySetInnerHTML={{ __html: cleanBefore }} />}
                                        <ListeningTextInput id={q.id} answer={q.answer} locationId={q.locationId} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />
                                        {parts[1] && <span className="ml-2" dangerouslySetInnerHTML={{ __html: parts[1] }} />}
                                    </div>
                                );
                            }

                            if (q.isMixed && q.parts) {
                                return (
                                    <div key={`mixed-${q.id}`} className="font-normal text-gray-800 leading-[1.8] pl-4">
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

// --- FLOWCHART DRAGGABLE OPTION (flow-option- prefix, separate from Matching) ---
const FlowDraggableOption = ({ label, text, isReviewMode }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `flow-option-${label}`,
        disabled: isReviewMode,
        data: { label, text }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
        transition: 'none',
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
                w-full px-2 py-1.5 border border-gray-300 rounded-none cursor-grab active:cursor-grabbing
                select-none flex items-start gap-1 transition-all
                ${isDragging ? 'opacity-40 ring-1 ring-blue-500 shadow-xl scale-105 z-[1000] bg-white border-blue-400' : 'bg-white hover:border-gray-400 hover:shadow-sm'}
            `}
        >
            <span className="w-4 h-4 shrink-0 bg-ielts-blue/5 text-ielts-blue rounded-none flex items-center justify-center font-bold text-[10px] border border-ielts-blue/10 mt-0.5">{label}</span>
            <span className="leading-tight text-[13px] font-medium text-gray-800">{text}</span>
        </div>
    );
};

const DroppableFlowSlot = ({ id, value, options, isReviewMode, isCorrect, correctAnswer, onClear }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `flow-slot-${id}`,
    });

    const selectedOption = options?.find(opt => opt.label === value);

    return (
        <div
            ref={setNodeRef}
            className={`
                relative min-h-[34px] w-full flex items-center justify-center border-2 border-dashed transition-all rounded-none
                ${isOver ? 'border-ielts-blue bg-ielts-blue/5 scale-[1.01]' : 'border-gray-200 bg-gray-50/50'}
                ${value ? 'border-none bg-transparent' : ''}
                ${isReviewMode && value ? (isCorrect ? 'ring-2 ring-emerald-500' : 'ring-2 ring-rose-500') : ''}
            `}
        >
            {value ? (
                <div className="relative w-full group">
                    <div className={`
                        w-full px-2 py-1 border-2 rounded-none bg-white shadow-sm flex items-center gap-2
                        ${isReviewMode ? (isCorrect ? 'border-emerald-500' : 'border-rose-500') : 'border-ielts-blue'}
                    `}>
                        {selectedOption && (
                            <span className="w-4 h-4 shrink-0 bg-ielts-blue text-white rounded-none flex items-center justify-center font-bold text-[10px]">
                                {selectedOption.label}
                            </span>
                        )}
                        <span className="text-[13px] font-semibold text-gray-800">{value}</span>
                    </div>
                    {!isReviewMode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg hover:bg-rose-600 z-10"
                        >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            ) : (
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Drop {id} here</span>
            )}
        </div>
    );
};

// --- FLOWCHART POOL DROPPABLE (return zone) ---
const FlowPoolDroppable = ({ children, isDragging }) => {
    const { setNodeRef, isOver } = useDroppable({ id: 'flow-pool-zone' });
    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col gap-1.5 transition-colors duration-200 rounded-none p-2 min-h-[50px]
                ${isOver && isDragging ? 'bg-blue-50/30 border-blue-200' : 'bg-gray-50/30'}
                border border-dashed border-gray-200
            `}
        >
            {children}
        </div>
    );
};

export const FlowChart = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick }) => {
    const options = group.options || [];
    const hasOptions = options.length > 0;
    const [activeId, setActiveId] = React.useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    // Filter out items that are just arrows to avoid double arrows with automatic ones
    const isArrow = (text) => {
        const t = String(text).trim();
        return ["↓", "▼", "⬇", "arrow", "⇓"].includes(t);
    };

    // Collect all question items across all sub-groups
    const allSubGroups = (group.groups || [{ items: group.items || group.questions || [] }]);
    const allQuestionItems = allSubGroups.flatMap(sub =>
        (sub.items || sub.questions || []).filter(it => {
            const itText = (typeof it.text === 'object' ? it.text.text : it.text) || "";
            return !isArrow(itText);
        })
    );

    const handleDragStart = (event) => setActiveId(event.active.id);

    const handleDragEnd = (event) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;

        const optionLabel = active.id.replace('flow-option-', '');

        if (over.id === 'flow-pool-zone') {
            // Return to pool: clear wherever this option was placed
            const qToClear = allQuestionItems.find(q => userAnswers[q.id] === optionLabel);
            if (qToClear) onAnswerChange(qToClear.id, "");
            return;
        }

        const slotId = over.id.replace('flow-slot-', '');

        // Swap: if target slot already has a value, put the dragged option's previous owner in target's old slot
        const prevOwner = allQuestionItems.find(q => userAnswers[q.id] === optionLabel);
        const targetCurrentValue = userAnswers[slotId];

        if (prevOwner && targetCurrentValue) {
            onAnswerChange(prevOwner.id, targetCurrentValue);
        } else if (prevOwner) {
            onAnswerChange(prevOwner.id, "");
        }

        onAnswerChange(slotId, optionLabel);
    };

    // Render a single flow item (used by both dnd and non-dnd modes)
    const renderFlowItem = (item, index, subItems) => {
        const itemText = (typeof item.text === 'object' ? item.text.text : item.text) || "";
        const hasInput = itemText && String(itemText).includes('[INPUT]');
        const isCorrect = isReviewMode ? checkAnswer(userAnswers[item.id], item.answer) : false;
        let content = null;

        if (item.isQuestion || hasInput) {
            const parts = itemText ? String(itemText).split('[INPUT]') : ['', ''];
            const cleanBefore = stripLeadingId(parts[0], item.id);

            content = (
                <div className="font-semibold text-gray-800 leading-[1.8] flex flex-wrap items-baseline justify-center text-center">
                    {cleanBefore && <span className="mr-2" dangerouslySetInnerHTML={{ __html: cleanBefore }} />}

                    {hasOptions ? (
                        <DroppableFlowSlot
                            id={item.id}
                            value={userAnswers[item.id] || ""}
                            options={options}
                            isReviewMode={isReviewMode}
                            isCorrect={isCorrect}
                            correctAnswer={item.answer}
                            onClear={() => onAnswerChange(item.id, "")}
                        />
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

                    {parts[1] && <span className="ml-1" dangerouslySetInnerHTML={{ __html: parts[1] }} />}
                </div>
            );
        } else {
            content = <span className="text-gray-800 font-bold text-center inline-block w-full text-[14px]">{itemText}</span>;
        }

        return (
            <React.Fragment key={item.id || index}>
                <div className={`w-full border-2 rounded-none p-2.5 transition-all ${!item.isQuestion && !hasInput ? 'bg-gray-50/40 border-gray-100' : 'bg-white border-gray-200 shadow-sm'}`}>
                    {content}
                </div>
                {index !== subItems.length - 1 && (
                    <div className="flex flex-col items-center py-0.5">
                        <div className="h-4 w-px bg-gray-300 relative">
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-gray-300 text-[8px]">▼</div>
                        </div>
                    </div>
                )}
            </React.Fragment>
        );
    };

    const FlowChartBody = () => (
        <div className="flex flex-col gap-2 w-full">
            {allSubGroups.map((sub, sIdx) => {
                const subItems = (sub.items || sub.questions || []).filter(it => {
                    const itText = (typeof it.text === 'object' ? it.text.text : it.text) || "";
                    return !isArrow(itText);
                });
                return (
                    <div key={`fc-sub-${sub.id ?? ''}-${sIdx}`} className="w-full flex flex-col items-center">
                        {sub.header && (
                            <h4 className="text-[0.9em] font-black text-gray-900 mb-2 text-center w-full uppercase tracking-[0.1em] border-b border-gray-100 pb-1.5">
                                {typeof sub.header === 'object' ? sub.header.text : sub.header}
                            </h4>
                        )}
                        <div className="flex flex-col items-center w-full gap-0">
                            {subItems.map((item, index) => renderFlowItem(item, index, subItems))}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // --- DND MODE: Options exist ---
    if (hasOptions) {
        const usedLabels = allQuestionItems.map(q => userAnswers[q.id]).filter(Boolean);

        return (
            <DndContext
                id={`dnd-flowchart-${group.id || (allQuestionItems[0]?.id) || 'fc'}`}
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={isReviewMode ? undefined : handleDragEnd}
            >
                <div className="mb-6 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6 w-full items-start">
                    {/* LEFT: Flow Chart */}
                    <div className="flex flex-col items-center w-full">
                        <FlowChartBody />
                    </div>

                    {/* RIGHT: Options Pool */}
                    <div className="flex flex-col gap-3 lg:sticky lg:top-4">
                        <h4 className="text-[0.7em] font-bold text-gray-400 uppercase tracking-[0.2em] text-center mb-1">Options</h4>
                        <FlowPoolDroppable isDragging={!!activeId}>
                            {options.map((opt) => {
                                const label = opt.label;
                                const text = typeof opt.text === 'object' ? opt.text.text : opt.text;
                                const isUsed = usedLabels.includes(label);

                                if (isReviewMode) {
                                    // In review mode show all options statically
                                    return (
                                        <div key={label} className="bg-white rounded-none border border-gray-100 shadow-sm p-1.5 flex items-start gap-2">
                                            <span className="w-5 h-5 shrink-0 bg-ielts-blue/5 text-ielts-blue rounded-none flex items-center justify-center font-bold text-[10px] border border-ielts-blue/10">{label}</span>
                                            <span className="text-gray-700 text-[12px] font-medium leading-tight pt-0.5">{text}</span>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={label} className={`${isUsed ? 'invisible pointer-events-none h-0 overflow-hidden p-0 m-0' : 'visible'}`}>
                                        <FlowDraggableOption
                                            label={label}
                                            text={text}
                                            isReviewMode={isReviewMode}
                                        />
                                    </div>
                                );
                            })}
                            {!isReviewMode && usedLabels.length === options.length && (
                                <div className="text-center py-3 text-gray-400 text-[0.65em] border border-dashed border-gray-200 rounded-none italic">
                                    All options placed
                                </div>
                            )}
                        </FlowPoolDroppable>
                        {!isReviewMode && (
                            <p className="text-[0.6em] text-gray-400 font-bold uppercase tracking-widest text-center">
                                {activeId ? 'Drop here to remove' : 'Drag to flowchart →'}
                            </p>
                        )}
                    </div>
                </div>
            </DndContext>
        );
    }

    // --- INPUT MODE: No options (flow chart completion) ---
    return (
        <div className="mb-6 flex flex-col items-center w-full">
            <div className="flex flex-col gap-2 w-full max-w-2xl">
                <FlowChartBody />
            </div>
        </div>
    );
};

export const StandardMCQ = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick }) => {
    const renderQuestion = (q) => {
        const options = q.options || group.options || [];
        return (
            <div key={q.id} id={`q-${q.id}`} className="mb-3 p-1 rounded-xl">
                <div className="flex gap-2 mb-2 items-start">
                    <QuestionBadge id={q.id} isReviewMode={isReviewMode} onClick={() => isReviewMode && handleLocationClick(q.locationId)} />
                    {q.text && <div className="font-semibold text-gray-900 leading-relaxed pt-0.5" dangerouslySetInnerHTML={{ __html: stripLeadingId(q.text, q.id) }} />}
                </div>
                <div className="flex flex-col gap-0 pl-2 sm:pl-10">
                    {options.map((opt, idx) => {
                        const isSelected = String(userAnswers[q.id]) === String(opt.label);
                        const isCorrect = isReviewMode ? checkAnswer(opt.label, q.answer) : false;
                        const containerStyle = getStatusStyles(isReviewMode, isCorrect, isSelected, 'container');
                        const badgeStyle = getStatusStyles(isReviewMode, isCorrect, isSelected, 'badge');

                        return (
                            <div key={idx} className={`flex items-center gap-3 p-1 rounded-lg border transition-all ${containerStyle}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.75em] font-bold shrink-0 border transition-colors ${badgeStyle}`}>{opt.label}</div>
                                <div className="relative flex items-center justify-center shrink-0">
                                    <input type="radio" className="appearance-none w-5 h-5 border border-gray-300 rounded-full checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer" checked={isSelected} onChange={() => !isReviewMode && onAnswerChange(q.id, String(opt.label))} disabled={isReviewMode} />
                                    <div className={`absolute w-2.5 h-2.5 rounded-full opacity-0 transition-opacity pointer-events-none ${isSelected ? 'opacity-100' : ''} bg-white`}></div>
                                </div>
                                <span className="text-gray-900 font-normal leading-tight">{typeof opt.text === 'object' ? opt.text.text : opt.text}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (group.groups && Array.isArray(group.groups)) {
        return (
            <div className="flex flex-col gap-6">
                {group.groups.map((sub, sIdx) => (
                    <div key={`mcq-sub-${sub.id ?? ''}-${sIdx}`}>
                        {sub.text && <div className="font-bold text-gray-900 mb-3 px-1" dangerouslySetInnerHTML={{ __html: sub.text }} />}
                        {(sub.questions || sub.items || []).map(renderQuestion)}
                    </div>
                ))}
            </div>
        );
    }

    return <>{(group.questions || group.items || []).map(renderQuestion)}</>;
};
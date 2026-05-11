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
import { checkAnswer, stripLeadingId, stripLeadingOptionLabel } from '../ListeningUtils';
import { QuestionBadge } from '../ListeningComponents';

const DraggableOption = ({ label, text, isReviewMode }) => {
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
                px-3 h-[26px] border border-gray-400 rounded-[4px] cursor-grab active:cursor-grabbing
                select-none flex items-center justify-start w-fit transition-all shadow-sm
                ${isDragging ? 'opacity-40 ring-2 ring-blue-500 shadow-xl scale-105 z-[1000] bg-white border-transparent' : 'bg-white hover:border-gray-600'}
                ${isReviewMode ? 'cursor-default opacity-100 grayscale-0' : ''}
            `}
        >
            <span className="leading-tight text-[1em] font-normal text-black">{stripLeadingOptionLabel(text)}</span>
        </div>
    );
};

const DroppableSlot = ({ id, value, options, isReviewMode, isCorrect, correctAnswer, onClear }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `slot-${id}`,
        disabled: isReviewMode
    });

    const selectedOption = options.find((opt, idx) => {
        const resLabel = opt.label || String.fromCharCode(65 + idx);
        return resLabel === value;
    });

    return (
        <div
            ref={setNodeRef}
            className={`
                min-w-[150px] w-fit max-w-[400px] h-[26px] border rounded-[4px] flex items-center justify-center relative
                px-3 py-0 group/slot
                ${value 
                    ? (isReviewMode 
                        ? (isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50 font-bold')
                        : 'border-blue-500 bg-white shadow-sm'
                      )
                    : (isOver 
                        ? 'border-blue-500 bg-blue-50 border-dashed scale-[1.02]' 
                        : 'border-gray-500 bg-transparent border-dashed'
                      )
                }
            `}
        >
            {value ? (
                <div className="flex items-center w-full px-1">
                    <span className="text-[1em] font-normal text-black flex-1 leading-tight text-center whitespace-normal">
                        {stripLeadingOptionLabel(selectedOption?.text || value)}
                    </span>
                    {!isReviewMode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="bg-white border border-gray-200 shadow-sm hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-full p-0.5 opacity-0 group-hover/slot:opacity-100 transition-opacity z-10 absolute right-1"
                        >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            ) : (
                <span className="text-black text-[1em] font-bold tracking-wider">{id}</span>
            )}

            {isReviewMode && !isCorrect && (
                <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-emerald-600 text-white text-[14px] px-3 py-1 rounded shadow-lg whitespace-nowrap z-50 font-bold animate-in fade-in slide-in-from-left-2 duration-300 ring-2 ring-emerald-600/30">
                    {(() => {
                        if (!correctAnswer) return "N/A";
                        const answers = String(correctAnswer).split(/[\/|,]/).map(a => a.trim()).filter(Boolean);
                        return answers.map(ans => {
                            const foundIdx = options.findIndex((o, idx) => {
                                const l = (o.label || String.fromCharCode(65 + idx));
                                return String(l).trim().toLowerCase() === String(ans).trim().toLowerCase();
                            });
                            if (foundIdx !== -1) return options[foundIdx].label || String.fromCharCode(65 + foundIdx);
                            return ans;
                        }).join(' / ');
                    })()}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-emerald-600 rotate-45"></div>
                </div>
            )}
        </div>
    );
};

const PoolDroppable = ({ children, isDragging }) => {
    const { setNodeRef, isOver } = useDroppable({ id: 'pool-zone' });
    return (
        <div
            ref={setNodeRef}
            id="pool-zone"
            className={`p-4 md:p-5 h-auto flex flex-col transition-colors duration-300 rounded-none ${isOver && isDragging ? 'bg-blue-50/30' : 'bg-gray-50/10'} border-2 border-dashed border-gray-100/50`}
        >
            {children}
        </div>
    );
};

export const Matching = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, onSeekTo, activePart }) => {
    const [activeId, setActiveId] = React.useState(null);
    const options = group.options || [];
    const questions = group.questions || group.items || [];
    const allowReuse = group.allowReuse || 
                       (group.instruction && group.instruction.toLowerCase().includes("more than once")) ||
                       (questions.length > options.length);

    const questionTitle = (group.questionHeader?.text || group.questionHeader) || "Targets";
    const optionTitle = (group.optionHeader?.text || group.optionHeader) || "Options pool";

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const handleDragStart = (event) => setActiveId(event.active.id);
    const handleDragEnd = (event) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;
        const optionLabel = active.id.replace('option-', '');
        if (over.id === 'pool-zone') {
            if (allowReuse) return;
            const questionToClear = questions.find(q => userAnswers[q.id] === optionLabel);
            if (questionToClear) onAnswerChange(questionToClear.id, "");
            return;
        }
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 mb-10 mt-4 items-start ielts-font">
                <div className="flex flex-col gap-4">
                    <h4 className="text-[1.2em] font-bold text-black mb-1 px-1">{questionTitle}</h4>
                    <div className="flex flex-col gap-2">
                        {questions.map((q) => {
                            const isCorrect = isReviewMode ? checkAnswer(userAnswers[q.id], q.answer || q.correct_answer || q.correctAnswer) : false;
                            const qText = (typeof q.text === 'object' ? q.text.text : q.text) || "";
                            const cleanText = String(qText).replace('[DROP]', '').trim();
                            return (
                                <div key={q.id} className={`flex items-center gap-3 py-1.5 transition-all ${isReviewMode ? 'pr-24' : ''}`}>
                                    <div className="font-normal text-black text-[1.1em] shrink-0" dangerouslySetInnerHTML={{ __html: stripLeadingId(cleanText, q.id) }} />
                                    <DroppableSlot
                                        id={q.id} value={userAnswers[q.id]} options={options} isReviewMode={isReviewMode} isCorrect={isCorrect}
                                        correctAnswer={q.answer || q.correct_answer || q.correctAnswer} onClear={() => onAnswerChange(q.id, "")}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <PoolDroppable isDragging={!!activeId}>
                    <h4 className="text-[1.2em] font-bold text-black mb-4 px-1">{optionTitle}</h4>
                    <div className="flex flex-col gap-2 items-start justify-center">
                        {options.map((opt, idx) => {
                            const label = opt.label || String.fromCharCode(65 + idx);
                            const text = opt.text || opt.label || opt.content || (typeof opt === 'string' ? opt : "");
                            const isUsed = questions.some(q => userAnswers[q.id] === label);
                            return (
                                <div key={label} className={`${(isUsed && !allowReuse) ? 'invisible pointer-events-none' : 'visible'} w-fit`}>
                                    <DraggableOption label={label} text={text} isReviewMode={isReviewMode} />
                                </div>
                            );
                        })}
                    </div>
                </PoolDroppable>
            </div>
        </DndContext>
    );
};

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

const MapDraggableOption = ({ label, text, isReviewMode }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `map-option-${label}`,
        disabled: isReviewMode,
        data: { label, text }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
        transition: 'none',
    } : {
        transition: 'box-shadow 200ms ease, border-color 200ms ease'
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`
                px-3 py-0.5 min-h-[24px] h-[24px] border border-gray-400 rounded-[4px] cursor-grab active:cursor-grabbing
                select-none flex items-center justify-start w-fit transition-all
                ${isDragging ? 'opacity-40 ring-1 ring-blue-500 shadow-xl scale-105 z-[1000] bg-white border-blue-400' : 'bg-white hover:border-gray-800 hover:shadow-sm'}
                ${isReviewMode ? 'cursor-default opacity-100 grayscale-0' : ''}
            `}
        >
            <span className="leading-tight text-[15px] font-medium text-gray-800">{stripLeadingOptionLabel(text)}</span>
        </div>
    );
};

const MapDroppableSlot = ({ id, value, options, isReviewMode, isCorrect, correctAnswer, onClear, onSelect, isMenuOpen, onToggleMenu, allowReuse, userAnswers, questions }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `map-slot-${id}`,
        disabled: isReviewMode
    });

    const selectedOption = options.find((opt, idx) => {
        const label = opt.label || String.fromCharCode(65 + idx);
        return label === value;
    });

    return (
        <div
            ref={setNodeRef}
            onClick={(e) => {
                e.stopPropagation();
                if (!isReviewMode) onToggleMenu();
            }}
            className={`
                min-w-[140px] md:min-w-[180px] min-h-[24px] h-[24px] border rounded-[4px] flex items-center justify-center relative
                px-3 py-0.5 group/slot cursor-pointer
                ${value 
                    ? (isReviewMode 
                        ? (isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50 font-bold')
                        : 'border-sky-500 bg-white shadow-sm'
                      )
                    : (isOver 
                        ? 'border-black bg-gray-50 border-dashed scale-[1.01]' 
                        : 'border-black/30 bg-gray-50/50 border-dashed'
                      )
                }
            `}
        >
            {value ? (
                <div className="flex items-center w-full px-2">
                    <span className="text-[14px] font-normal text-gray-900 line-clamp-1 flex-1 leading-tight text-center">
                        {stripLeadingOptionLabel(selectedOption?.text || value)}
                    </span>
                    {!isReviewMode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="bg-white border border-gray-200 shadow-sm hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-full p-0.5 opacity-0 group-hover/slot:opacity-100 transition-opacity z-10"
                        >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            ) : (
                <span className="text-gray-600 text-[13px] font-bold tracking-wider">{id}</span>
            )}

            {isMenuOpen && !isReviewMode && (
                <div className="absolute top-full left-0 mt-1 w-max min-w-full max-w-[280px] xs:max-w-[320px] sm:max-w-[400px] bg-white border border-gray-200 rounded-md shadow-lg z-[2000] overflow-hidden">
                    <div className="max-h-60 overflow-y-auto py-1">
                        {options.map((opt, idx) => {
                            const label = opt.label || String.fromCharCode(65 + idx);
                            const text = opt.text || opt.label || opt.content || (typeof opt === 'string' ? opt : "");
                            const isUsed = !allowReuse && questions.some(q => userAnswers[q.id] === label);
                            
                            if (isUsed) return null;
                            
                            return (
                                <button
                                    key={label}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(label);
                                    }}
                                    className="w-full text-left px-4 py-2 text-[14px] hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-start whitespace-normal break-words"
                                >
                                    <span className="font-bold mr-2 shrink-0">{label}.</span>
                                    <span className="flex-1 min-w-0">{stripLeadingOptionLabel(text)}</span>
                                </button>
                            );
                        })}
                        {options.length === 0 && <div className="px-4 py-2 text-gray-400 text-xs">No options available</div>}
                    </div>
                </div>
            )}

            {isReviewMode && !isCorrect && (
                <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[12px] px-2 py-0.5 rounded-[4px] border border-emerald-200 font-black shadow-sm select-none whitespace-nowrap">
                    <span className="text-emerald-600">✓</span>
                    <span>
                        {(() => {
                            if (!correctAnswer) return "N/A";
                            const answers = String(correctAnswer).split(/[\/|,]/).map(a => a.trim()).filter(Boolean);
                            return answers.map(ans => {
                                const foundIdx = options.findIndex((o, idx) => {
                                    const l = (o.label || String.fromCharCode(65 + idx));
                                    return String(l).trim().toLowerCase() === String(ans).trim().toLowerCase();
                                });
                                if (foundIdx !== -1) {
                                    return options[foundIdx].label || String.fromCharCode(65 + foundIdx);
                                }
                                return ans;
                            }).join(' / ');
                        })()}
                    </span>
                </div>
            )}
        </div>
    );
};

const MapPoolDroppable = ({ children, isDragging }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'map-pool-zone'
    });

    return (
        <div
            ref={setNodeRef}
            className={`
                p-4 md:p-5 h-auto flex flex-col transition-colors duration-300 rounded-none
                ${isOver && isDragging ? 'bg-blue-50/30' : 'bg-gray-50/10'}
                border-2 border-dashed border-gray-100/50
            `}
        >
            {children}
        </div>
    );
};

export const MapLabeling = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, onSeekTo, activePart }) => {
    const [activeId, setActiveId] = React.useState(null);
    const [openMenuId, setOpenMenuId] = React.useState(null);
    const options = group.options || [];
    const questions = group.questions || group.items || [];
    const allowReuse = group.allowReuse || 
                       (group.instruction && group.instruction.toLowerCase().includes("more than once")) ||
                       (questions.length > options.length);

    const questionTitle = (group.questionHeader?.text || group.questionHeader) || "Locations";
    const optionTitle = (group.optionHeader?.text || group.optionHeader) || "Options";

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const handleDragStart = (event) => setActiveId(event.active.id);
    const handleDragEnd = (event) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;
        const optionLabel = active.id.replace('map-option-', '');
        if (over.id === 'map-pool-zone') {
            if (allowReuse) return;
            const questionToClear = questions.find(q => userAnswers[q.id] === optionLabel);
            if (questionToClear) onAnswerChange(questionToClear.id, "");
            return;
        }
        const slotId = over.id.replace('map-slot-', '');
        onAnswerChange(slotId, optionLabel);
    };

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className="mb-10 flex flex-col xl:flex-row gap-8 xl:gap-12 items-start">
            {group.image && (
                <div className="xl:w-1/2 w-full border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex justify-center py-4 xl:sticky xl:top-4">
                    <img src={group.image} alt="Map" className="max-w-full max-h-[500px] w-auto h-auto object-contain" />
                </div>
            )}
            
            <div className="xl:w-1/2 w-full">
                <DndContext
                    id={`dnd-map-${group.id || (questions[0] && questions[0].id) || 'default'}`}
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={isReviewMode ? undefined : handleDragEnd}
                    autoScroll={false}
                >
                    <div className="flex flex-col gap-8 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-4">
                            <h4 className="text-[18px] font-bold text-black uppercase tracking-wide mb-1 px-1 text-center border-b border-gray-100 pb-2">{questionTitle}</h4>
                            <div className="flex flex-col gap-1">
                                {questions.map((q) => {
                                    const isCorrect = isReviewMode ? checkAnswer(userAnswers[q.id], q.answer || q.correct_answer || q.correctAnswer || q.correct_answer_value, true, options) : false;
                                    return (
                                        <div key={q.id} className={`flex items-center justify-between gap-4 py-0.5 px-3 rounded-xl transition-all hover:bg-gray-50/50 ${isReviewMode ? 'pr-20' : ''}`}>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <QuestionBadge 
                                                    id={q.id} 
                                                    isReviewMode={isReviewMode} 
                                                    onClick={() => isReviewMode && handleLocationClick(q.locationId)} 
                                                    onSeekTo={onSeekTo}
                                                    timestamp={q.timestamp ?? q.timeStep ?? q.time_step ?? q['time step']}
                                                    activePart={activePart}
                                                />
                                                <div className="font-bold text-gray-800 text-[15px] break-words whitespace-normal" dangerouslySetInnerHTML={{ __html: stripLeadingId(q.text, q.id) }} />
                                            </div>
                                            <MapDroppableSlot
                                                id={q.id}
                                                value={userAnswers[q.id]}
                                                options={options}
                                                isReviewMode={isReviewMode}
                                                isCorrect={isCorrect}
                                                correctAnswer={q.answer || q.correct_answer || q.correctAnswer || q.correct_answer_value}
                                                onClear={() => onAnswerChange(q.id, "")}
                                                onSelect={(label) => {
                                                    onAnswerChange(q.id, label);
                                                    setOpenMenuId(null);
                                                }}
                                                isMenuOpen={openMenuId === q.id}
                                                onToggleMenu={() => setOpenMenuId(openMenuId === q.id ? null : q.id)}
                                                allowReuse={allowReuse}
                                                userAnswers={userAnswers}
                                                questions={questions}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <MapPoolDroppable isDragging={!!activeId}>
                            <h4 className="text-[18px] font-bold text-black uppercase tracking-wide mb-4 text-center border-b border-gray-100 pb-2">{optionTitle}</h4>
                            <div className="flex flex-wrap gap-2 items-start justify-center">
                                {options.map((opt, idx) => {
                                    const label = opt.label || String.fromCharCode(65 + idx);
                                    const text = opt.text || opt.label || opt.content || (typeof opt === 'string' ? opt : "");
                                    const isUsed = !allowReuse && questions.some(q => userAnswers[q.id] === label);
                                    return (
                                        <div key={label} className={`${isUsed ? 'invisible pointer-events-none' : 'visible'} w-fit`}>
                                            <MapDraggableOption label={label} text={text} isReviewMode={isReviewMode} />
                                        </div>
                                    );
                                })}
                            </div>
                            {options.length > 0 && questions.filter(q => userAnswers[q.id]).length === options.length && (
                                <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl italic mt-4">All options placed</div>
                            )}
                        </MapPoolDroppable>
                    </div>
                </DndContext>
            </div>
        </div>
    );
};

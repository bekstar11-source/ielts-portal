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
import { ListeningTextInput } from '../ListeningComponents';

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
        transition: 'box-shadow 200ms ease, border-color 200ms ease'
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`
                w-full px-3 py-2 border border-black rounded-none cursor-grab active:cursor-grabbing
                select-none flex items-start transition-all
                ${isDragging ? 'opacity-40 ring-1 ring-blue-500 shadow-xl scale-105 z-[1000] bg-white border-blue-400' : 'bg-white hover:border-gray-800 hover:shadow-sm'}
            `}
        >
            <span className="leading-tight text-[15px] font-medium text-gray-800">{stripLeadingOptionLabel(text)}</span>
        </div>
    );
};

const DroppableFlowSlot = ({ id, value, options, isReviewMode, isCorrect, correctAnswer, onClear, onSelect, isMenuOpen, onToggleMenu, allowReuse, userAnswers, questions }) => {
    const { setNodeRef, isOver } = useDroppable({ id: `flow-slot-${id}` });
    const selectedOption = options?.find((opt, idx) => {
        const resLabel = opt.label || String.fromCharCode(65 + idx);
        return resLabel === value;
    });

    return (
        <div
            ref={setNodeRef}
            onClick={(e) => {
                e.stopPropagation();
                if (!isReviewMode) onToggleMenu();
            }}
            className={`
                relative min-h-[30px] w-[160px] mx-1 inline-flex items-center justify-center border transition-all rounded-none group cursor-pointer
                ${value 
                    ? (isReviewMode 
                        ? (isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50 font-bold')
                        : 'border-sky-500 bg-white border-solid shadow-sm'
                      )
                    : (isOver 
                        ? 'border-black bg-gray-50 border-dashed scale-[1.01]' 
                        : 'border-black/30 bg-gray-50/50 border-dashed'
                      )
                }
            `}
        >
            {value ? (
                <div className="flex items-center w-full px-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <span className="text-[14px] font-normal text-gray-900 line-clamp-1 flex-1 leading-tight text-center">{stripLeadingOptionLabel(selectedOption?.text || value)}</span>
                    {!isReviewMode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="absolute -top-2 -right-2 w-4 h-4 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg hover:bg-rose-600 z-10"
                        >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            ) : (
                <span className="text-[12px] font-medium text-gray-600 uppercase tracking-wider">{id} Drop</span>
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
        </div>
    );
};

const FlowPoolDroppable = ({ children, isDragging }) => {
    const { setNodeRef, isOver } = useDroppable({ id: 'flow-pool-zone' });
    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col gap-1.5 transition-colors duration-200 rounded-none p-2 min-h-[50px] ${isOver && isDragging ? 'bg-blue-50/30 border-blue-200' : 'bg-gray-50/30'} border border-dashed border-gray-200`}
        >
            {children}
        </div>
    );
};

export const FlowChart = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, onSeekTo, activePart }) => {
    const options = group.options || [];
    const hasOptions = options.length > 0;
    const [activeId, setActiveId] = React.useState(null);
    const [openMenuId, setOpenMenuId] = React.useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const isArrow = (text) => ["↓", "▼", "⬇", "arrow", "⇓"].includes(String(text).trim());
    const allSubGroups = (group.groups || [{ items: group.items || group.questions || [] }]);
    const allQuestionItems = allSubGroups.flatMap(sub => (sub.items || sub.questions || []).filter(it => !isArrow((typeof it.text === 'object' ? it.text.text : it.text) || "")));
    const allowReuse = group.allowReuse || (group.instruction && group.instruction.toLowerCase().includes("more than once")) || (allQuestionItems.length > options.length);

    const handleDragStart = (event) => setActiveId(event.active.id);
    const handleDragEnd = (event) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;
        const optionLabel = active.id.replace('flow-option-', '');
        if (over.id === 'flow-pool-zone') {
            if (allowReuse) return;
            const qToClear = allQuestionItems.find(q => userAnswers[q.id] === optionLabel);
            if (qToClear) onAnswerChange(qToClear.id, "");
            return;
        }
        const slotId = over.id.replace('flow-slot-', '');
        const prevOwner = allQuestionItems.find(q => userAnswers[q.id] === optionLabel);
        const targetCurrentValue = userAnswers[slotId];
        if (prevOwner && targetCurrentValue) onAnswerChange(prevOwner.id, targetCurrentValue);
        else if (prevOwner) onAnswerChange(prevOwner.id, "");
        onAnswerChange(slotId, optionLabel);
    };

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const renderFlowItem = (item, index, subItems) => {
        const itemText = (typeof item.text === 'object' ? item.text.text : item.text) || "";
        const hasInput = itemText && String(itemText).includes('[INPUT]');
        const correctVal = item.answer || item.correct_answer || item.correctAnswer;
        const isHeaderItem = index === 0 && !item.isQuestion && !hasInput;
        
        let content = null;
        if (item.isQuestion || hasInput) {
            const parts = String(itemText).split('[INPUT]');
            const cleanBefore = stripLeadingId(parts[0], item.id);
            content = (
                <div className="font-normal text-gray-800 leading-[1.8] flex flex-wrap items-baseline justify-center text-center">
                    {cleanBefore && <span className="mr-2" dangerouslySetInnerHTML={{ __html: cleanBefore }} />}
                    {hasOptions ? (
                        <DroppableFlowSlot 
                            id={item.id} value={userAnswers[item.id] || ""} options={options} isReviewMode={isReviewMode} 
                            isCorrect={isReviewMode ? checkAnswer(userAnswers[item.id], correctVal) : false} correctAnswer={correctVal} onClear={() => onAnswerChange(item.id, "")}
                            onSelect={(label) => {
                                onAnswerChange(item.id, label);
                                setOpenMenuId(null);
                            }}
                            isMenuOpen={openMenuId === item.id}
                            onToggleMenu={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                            allowReuse={allowReuse}
                            userAnswers={userAnswers}
                            questions={allQuestionItems}
                        />
                    ) : (
                        <ListeningTextInput 
                            id={item.id} answer={correctVal} locationId={item.locationId} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} 
                            handleLocationClick={handleLocationClick} onSeekTo={onSeekTo} timestamp={item.timestamp || item.timeStep} activePart={activePart}
                        />
                    )}
                    {parts[1] && <span className="ml-1" dangerouslySetInnerHTML={{ __html: parts[1] }} />}
                </div>
            );
        } else {
            content = <span className={`text-gray-800 text-center inline-block w-full ${isHeaderItem ? 'font-bold text-[16px]' : 'font-normal text-[14px]'}`}>{itemText}</span>;
        }

        return (
            <React.Fragment key={item.id || index}>
                <div className={`w-full transition-all ${isHeaderItem ? 'bg-transparent border-none pt-2 pb-1' : `border rounded-none p-3.5 ${!item.isQuestion && !hasInput ? 'bg-gray-50/40 border-black' : 'bg-white border-black shadow-sm'}`}`}>
                    {content}
                </div>
                {index !== subItems.length - 1 && <div className="flex flex-col items-center py-1"><div className="h-6 w-px bg-gray-400 relative"><div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-gray-400 text-[10px]">▼</div></div></div>}
            </React.Fragment>
        );
    };

    const FlowChartBody = () => (
        <div className="flex flex-col gap-2 w-full">
            {allSubGroups.map((sub, sIdx) => {
                const subItems = (sub.items || sub.questions || []).filter(it => !isArrow((typeof it.text === 'object' ? it.text.text : it.text) || ""));
                return (
                    <div key={sIdx} className="w-full flex flex-col items-center">
                        {sub.header && <h4 className="text-[0.9em] font-black text-gray-900 mb-2 text-center w-full uppercase tracking-[0.1em] border-b border-gray-100 pb-1.5">{typeof sub.header === 'object' ? sub.header.text : sub.header}</h4>}
                        <div className="flex flex-col items-center w-full gap-0">{subItems.map((item, index) => renderFlowItem(item, index, subItems))}</div>
                    </div>
                );
            })}
        </div>
    );

    if (hasOptions) {
        const usedLabels = allQuestionItems.map(q => userAnswers[q.id]).filter(Boolean);
        return (
            <DndContext id={`dnd-fc-${group.id || 'fc'}`} sensors={sensors} onDragStart={handleDragStart} onDragEnd={isReviewMode ? undefined : handleDragEnd}>
                <div className="mb-10 flex flex-col lg:flex-row justify-center items-start gap-8 lg:gap-14 w-full max-w-6xl mx-auto">
                    <div className="flex-1 w-full max-w-2xl"><FlowChartBody /></div>
                    <div className="w-full lg:w-[280px] shrink-0 lg:sticky lg:top-4">
                        <FlowPoolDroppable isDragging={!!activeId}>
                            {options.map((opt, idx) => {
                                const label = opt.label || String.fromCharCode(65 + idx);
                                const isUsed = usedLabels.includes(label);
                                if (isUsed && !allowReuse) return null;
                                return <div key={label} className={`${isUsed ? 'invisible h-0' : 'visible'}`}><FlowDraggableOption label={label} text={opt.text || opt.label} isReviewMode={isReviewMode} /></div>;
                            })}
                        </FlowPoolDroppable>
                    </div>
                </div>
            </DndContext>
        );
    }

    return <div className="mb-6 flex flex-col items-center w-full"><div className="flex flex-col gap-2 w-full max-w-2xl"><FlowChartBody /></div></div>;
};

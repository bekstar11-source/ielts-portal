import React from "react";
import { GapFillQuestion } from './GapFill';

const FlowItem = ({ 
    item, index, total, group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, highlights, handlePartSelect, onRemoveHighlight, keywordTable, activePassage, onOpenNotes, isPremium 
}) => {
    const itemText = (typeof item.text === 'object' ? item.text.text : item.text) || "";
    const hasInput = itemText && (String(itemText).includes('[INPUT]') || String(itemText).includes('[DROP]'));
    
    const isBoldHeader = /^<b>/.test(itemText.trim()) && !hasInput;
    const isHeaderItem = (item._isHeader || (index === 0 && !item.isQuestion && !hasInput));
    
    let content = null;

    if (item.isQuestion || hasInput) {
        content = (
            <div className="font-normal text-gray-800 leading-[1.8] flex flex-wrap items-baseline justify-center text-center">
                <GapFillQuestion 
                    group={group}
                    q={item}
                    val={userAnswers[item.id] || ""}
                    onAnswerChange={onAnswerChange}
                    isReviewMode={isReviewMode}
                    highlights={highlights}
                    handlePartSelect={handlePartSelect}
                    onRemoveHighlight={onRemoveHighlight}
                    keywordTable={keywordTable}
                    activePassage={activePassage}
                    handleLocationClick={handleLocationClick}
                    onOpenNotes={onOpenNotes}
                    isPremium={isPremium}
                    isFlowChart={true}
                />
            </div>
        );
    } else {
        content = (
            <span 
                className={`text-gray-800 text-center inline-block w-full ${isHeaderItem || isBoldHeader ? 'font-bold text-[16.5px]' : 'font-medium text-[15px]'}`}
                dangerouslySetInnerHTML={{ __html: itemText }}
            />
        );
    }

    if (isHeaderItem || isBoldHeader) {
        return (
            <React.Fragment>
                <div className="w-full bg-transparent pt-2 pb-2 text-center">
                    {content}
                </div>
                {index !== total - 1 && (
                    <div className="flex flex-col items-center py-1">
                        <div className="h-4 w-px bg-gray-300 relative">
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-gray-300 text-[10px]">▼</div>
                        </div>
                    </div>
                )}
            </React.Fragment>
        );
    }

    return (
        <React.Fragment>
            <div className="w-full transition-all border border-black rounded-none p-4 bg-white shadow-[2px_2px_0px_rgba(0,0,0,0.08)]">
                {content}
            </div>
            {index !== total - 1 && (
                <div className="flex flex-col items-center py-2">
                    <div className="h-8 w-px bg-gray-400 relative">
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-gray-400 text-[12px]">▼</div>
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

export const FlowChartQuestion = ({ 
    group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, highlights, handlePartSelect, onRemoveHighlight, keywordTable, activePassage, onOpenNotes, isPremium 
}) => {
    const allSubGroups = (group.groups || [{ items: group.items || group.questions || [] }]);

    const splitItemsIntoFlowSteps = (items) => {
        const result = [];
        items.forEach(item => {
            const rawText = (typeof item.text === 'object' ? item.text.text : item.text) || "";
            const segments = rawText.split(/<br\s*\/?>\s*<br\s*\/?>/gi).map(s => s.trim()).filter(Boolean);
            
            if (segments.length <= 1) {
                result.push(item);
                return;
            }
            
            segments.forEach((seg, segIdx) => {
                const hasInput = seg.includes('[INPUT]') || seg.includes('[DROP]');
                const isBoldOnly = /^<b>/.test(seg.trim()) && !hasInput;
                
                if (hasInput) {
                    result.push({
                        ...item,
                        text: seg,
                        isQuestion: true,
                    });
                } else {
                    result.push({
                        id: `${item.id}_text_${segIdx}`,
                        text: seg,
                        isQuestion: false,
                        _isHeader: isBoldOnly,
                        _isTextOnly: true,
                    });
                }
            });
        });
        return result;
    };

    return (
        <div className="mb-10 flex flex-col items-center w-full max-w-2xl mx-auto py-4">
            {allSubGroups.map((sub, sIdx) => {
                const rawItems = (sub.items || sub.questions || []).filter(it => {
                    const itText = String(typeof it.text === 'object' ? it.text.text : it.text || "").trim();
                    return !["↓", "▼", "⬇", "arrow", "⇓"].includes(itText);
                });
                
                const processedItems = splitItemsIntoFlowSteps(rawItems);
                
                return (
                    <div key={sIdx} className="w-full flex flex-col items-center mb-8 last:mb-0">
                        {sub.header && (
                             <h4 className="text-[14px] font-black text-gray-900 mb-4 text-center w-full tracking-[0.15em] border-b border-gray-200 pb-2">
                                {typeof sub.header === 'object' ? sub.header.text : sub.header}
                            </h4>
                        )}
                        <div className="flex flex-col items-center w-full gap-0">
                            {processedItems.map((item, index) => (
                                <FlowItem 
                                    key={item.id || index}
                                    item={item} 
                                    index={index} 
                                    total={processedItems.length}
                                    group={group}
                                    userAnswers={userAnswers}
                                    onAnswerChange={onAnswerChange}
                                    isReviewMode={isReviewMode}
                                    handleLocationClick={handleLocationClick}
                                    highlights={highlights}
                                    handlePartSelect={handlePartSelect}
                                    onRemoveHighlight={onRemoveHighlight}
                                    keywordTable={keywordTable}
                                    activePassage={activePassage}
                                    onOpenNotes={onOpenNotes}
                                    isPremium={isPremium}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

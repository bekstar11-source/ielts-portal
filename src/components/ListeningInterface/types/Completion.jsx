import React from 'react';
import { stripLeadingId } from '../ListeningUtils';
import { ListeningTextInput } from '../ListeningComponents';

// --- TABLE COMPLETION ---
export const TableCompletion = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, onSeekTo, activePart }) => {
    const renderSingleTable = (tableData, key) => {
        let headers = tableData.headers || [];
        let rows = tableData.rows || [];

        // If there are no explicit headers, but rows exist, check if rows[0] is a header row (all pure text cells)
        if (headers.length === 0 && rows.length > 0) {
            const firstRowCells = rows[0].cells || (Array.isArray(rows[0]) ? rows[0] : []);
            const isAllText = firstRowCells.every(cell => {
                if (!cell) return true;
                return !cell.isMixed && !cell.parts && (cell.text || typeof cell !== 'object') && !String(cell.text || cell).includes('[INPUT]');
            });
            if (isAllText && rows.length > 1) {
                headers = firstRowCells.map(cell => typeof cell === 'object' ? (cell.text || "") : String(cell));
                rows = rows.slice(1);
            }
        }

        return (
            <div className="overflow-x-auto mb-8 bg-white px-2 md:px-12 lg:px-16" key={key}>
                {tableData.header && (
                    <h3 className="text-[1.15em] font-black text-gray-900 mb-4 mt-2 pt-3 uppercase tracking-wider text-center border-b border-gray-100 pb-2">
                        {typeof tableData.header === 'object' ? tableData.header.text : tableData.header}
                    </h3>
                )}
                <table className="w-full max-w-4xl mx-auto text-[1em] text-left border-collapse border border-black">
                    <thead className="bg-gray-100 text-gray-700 uppercase font-black text-[0.8em] tracking-wider">
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} className="px-4 py-3 border border-black">
                                    {typeof h === 'object' ? h.text : h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                                {(row.cells || (Array.isArray(row) ? row : [])).map((cell, cIdx) => (
                                    <td key={cIdx} className="px-4 py-3 border border-black align-top">
                                        {(!cell.isMixed && (cell.text || typeof cell !== 'object') && !String(cell.text || cell).includes('[INPUT]')) ? (
                                            <div className="text-gray-800 font-semibold leading-relaxed pt-0.5 w-full">
                                                {(() => {
                                                    const content = cell.text || cell;
                                                    return String(content).split('\n').map((p, pIdx) => (
                                                        <div key={pIdx} className="leading-tight mb-1"><span dangerouslySetInnerHTML={{ __html: p }} /></div>
                                                    ));
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap items-baseline leading-[2] text-gray-900 font-semibold gap-y-1">
                                                {(() => {
                                                    let parts = cell.parts;
                                                    if (!parts && String(cell.text || cell).includes('[INPUT]')) {
                                                        parts = String(cell.text || cell).split(/(\[INPUT\])/g).map(p => {
                                                            if (p === '[INPUT]') return { type: 'input', id: cell.id };
                                                            return { type: 'text', content: p };
                                                        }).filter(p => p.type === 'input' || p.content);
                                                    }
 
                                                    // Extract all input IDs present in this cell's parts to strip them from text parts
                                                    const inputIds = (parts || []).filter(p => p.type === 'input').map(p => p.id);
 
                                                    return (parts || []).map((refinedPart, index) => {
                                                        if (refinedPart.type === 'text') {
                                                            let textContent = refinedPart.content || "";
                                                            inputIds.forEach(id => {
                                                                textContent = stripLeadingId(textContent, id);
                                                            });
                                                            return <span key={index} className="pr-1" dangerouslySetInnerHTML={{ __html: textContent }} />;
                                                        }
                                                        if (refinedPart.type === 'input') {
                                                            const lookupItems = (group.items || group.questions || []);
                                                            const item = lookupItems.find(it => String(it.id) === String(refinedPart.id));
                                                            return (
                                                                <div key={`input-${refinedPart.id}`} className="inline-flex items-baseline mb-1">
                                                                    <ListeningTextInput
                                                                        id={refinedPart.id} 
                                                                        answer={refinedPart.answer || item?.answer || item?.correct_answer || item?.correctAnswer || item?.correct_answer_value} 
                                                                        locationId={refinedPart.locationId || item?.locationId}
                                                                        userAnswers={userAnswers} 
                                                                        onAnswerChange={onAnswerChange} 
                                                                        isReviewMode={isReviewMode}
                                                                        handleLocationClick={handleLocationClick} 
                                                                        onSeekTo={onSeekTo}
                                                                        timestamp={refinedPart.timestamp || refinedPart.timeStep || item?.timestamp || item?.timeStep} 
                                                                        activePart={activePart}
                                                                    />
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    });
                                                })()}
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

    if (group.groups) {
        return (
            <div className="space-y-4">
                {group.groups.map((sub, sIdx) => {
                    if (sub.rows) {
                        return renderSingleTable(sub, `sub-${sIdx}`);
                    }
                    const items = sub.items || sub.questions || [];
                    return items.map((item, iIdx) => {
                        if (item.type === 'table' || item.headers || item.rows) {
                            return renderSingleTable(item, `${sIdx}-${iIdx}`);
                        }
                        return null;
                    });
                })}
            </div>
        );
    }
    return renderSingleTable(group, 'root');
};

// --- NOTE / FLOWCHART / SUMMARY COMPLETION ---
export const NoteCompletion = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, onSeekTo, activePart }) => {

    /**
     * Pre-processes a flat list of question items and merges consecutive items
     * that share the EXACT same text template into a single "merged entry".
     *
     * Example: Q38 and Q39 both have the text:
     *   "• Starts with a noise that sounds like 38. [INPUT], produced by two people moving large pieces of 39. [INPUT]"
     * 
     * Both share the same text with 2 [INPUT]s → they get merged into one row
     * that renders a single bullet with two inline inputs (one for Q38, one for Q39).
     */
    const mergeSharedTextItems = (items) => {
        const merged = [];
        let i = 0;
        while (i < items.length) {
            const current = items[i];
            const currentRaw = (typeof current.text === 'object' ? current.text.text : current.text) || "";
            const inputCount = (currentRaw.match(/\[INPUT\]/g) || []).length;

            // If this text has multiple [INPUT] placeholders, try to merge the next siblings
            // that have the same text (one sibling per additional [INPUT])
            if (inputCount > 1) {
                const siblings = [current];
                for (let j = 1; j < inputCount && (i + j) < items.length; j++) {
                    const sibling = items[i + j];
                    const siblingRaw = (typeof sibling.text === 'object' ? sibling.text.text : sibling.text) || "";
                    if (siblingRaw === currentRaw) {
                        siblings.push(sibling);
                    } else {
                        break; // texts diverge — stop merging
                    }
                }
                // Only merge if we collected exactly as many siblings as [INPUT] slots
                if (siblings.length === inputCount) {
                    merged.push({ isMerged: true, siblings, rawText: currentRaw });
                    i += inputCount;
                    continue;
                }
            }

            // Default: single item
            merged.push({ isMerged: false, item: current, rawText: currentRaw });
            i++;
        }
        return merged;
    };

    return (
        <div className="mb-2 space-y-8">
            {(group.groups || [group]).map((sub, sIdx) => {
                const allItems = sub.items || sub.questions || [];
                const mergedItems = mergeSharedTextItems(allItems);

                return (
                    <div key={sIdx} className="bg-white py-2 rounded-xl">
                        {sub.header && <h3 className="text-[1.1em] font-bold text-gray-900 mb-4 mt-2 pt-3 uppercase tracking-wider border-t border-gray-100">{typeof sub.header === 'object' ? sub.header.text : sub.header}</h3>}
                        <div className="flex flex-wrap items-baseline gap-y-1">
                            {mergedItems.map((entry, entryIdx) => {
                                const rawText = entry.rawText;
                                const hasNativeBullet = /^[•\-\*]/.test(rawText.trim());

                                const isNoteCompletion = group.type === 'note_completion';
                                const isBlockCompletion = isNoteCompletion || group.type === 'sentence_completion' || group.type === 'form_completion';

                                // Only show bullet dot if the JSON explicitly had one (e.g., starts with •, -, *)
                                const showBullet = hasNativeBullet;

                                // Force new line if it's supposed to be a block or if the user explicitly requested based on hyphens
                                const forceBlock = showBullet || isBlockCompletion || rawText.includes('-');

                                const firstItem = entry.isMerged ? entry.siblings[0] : entry.item;
                                const isHeading = firstItem.type === 'heading';
                                const breakEl = ((isHeading || forceBlock) && entryIdx > 0) ? <div className="w-full h-0" /> : null;

                                if (isHeading) {
                                    const headingText = rawText.replace(/^[•\-\*]\s*/, '').trim();
                                    return <React.Fragment key={entryIdx}>{breakEl}<div className="font-bold text-black text-[1.1em] w-full mt-6 mb-4 ielts-font">{headingText}</div></React.Fragment>;
                                }

                                // Render the text once, substituting each [INPUT] with the correct question's input field
                                const renderParts = () => {
                                    const segments = rawText.split(/(\[INPUT\])/g);
                                    const questions = entry.isMerged ? entry.siblings : [firstItem];
                                    let inputIdx = 0;

                                    return segments.map((seg, segIdx) => {
                                        if (seg === '[INPUT]') {
                                            const q = questions[inputIdx] || firstItem;
                                            inputIdx++;
                                            return (
                                                <ListeningTextInput
                                                    key={`input-${segIdx}-${q.id}`}
                                                    id={q.id}
                                                    answer={q.answer || q.correct_answer || q.correctAnswer || q.correct_answer_value}
                                                    locationId={q.locationId}
                                                    userAnswers={userAnswers}
                                                    onAnswerChange={onAnswerChange}
                                                    isReviewMode={isReviewMode}
                                                    handleLocationClick={handleLocationClick}
                                                    onSeekTo={onSeekTo}
                                                    timestamp={q.timestamp || q.timeStep}
                                                    activePart={activePart}
                                                />
                                            );
                                        }
                                        // Strip leading bullet from first segment (we render our own bullet dot)
                                        let textContent = segIdx === 0
                                            ? seg.replace(/^[•\-\*]\s*/, '').trim()
                                            : seg;

                                        // Remove question ID from the text segment (either at the start or end)
                                        const currentQ = questions[Math.floor(segIdx / 2)];
                                        if (currentQ && currentQ.id) {
                                            textContent = stripLeadingId(textContent, currentQ.id);
                                        }

                                        if (!textContent) return null;
                                        return <span key={segIdx} className="mr-0.5" dangerouslySetInnerHTML={{ __html: textContent }} />;
                                    });
                                };

                                return (
                                    <React.Fragment key={entryIdx}>
                                        {breakEl}
                                        <div className={`font-medium text-gray-900 leading-relaxed ielts-font ${forceBlock ? 'pl-4 flex w-full mb-3 items-start' : 'pl-2 inline-flex items-baseline'}`}>
                                            {showBullet && <div className="mt-2.5 w-[5px] h-[5px] rounded-full bg-black shrink-0 mr-2" />}
                                            <div className="flex-1 flex flex-wrap items-baseline gap-y-1">
                                                {renderParts()}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

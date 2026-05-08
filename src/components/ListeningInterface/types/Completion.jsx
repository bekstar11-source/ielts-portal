import React from 'react';
import { stripLeadingId } from '../ListeningUtils';
import { ListeningTextInput } from '../ListeningComponents';

// --- TABLE COMPLETION ---
export const TableCompletion = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, onSeekTo, activePart }) => {
    const renderSingleTable = (tableData, key) => {
        const headers = tableData.headers || [];
        const rows = tableData.rows || [];
        return (
            <div className="overflow-x-auto mb-8 bg-white px-2 md:px-12 lg:px-16" key={key}>
                <table className="w-full max-w-4xl mx-auto text-[1em] text-left border-collapse border border-black">
                    <thead className="bg-gray-100 text-gray-700 uppercase font-black text-[0.8em] tracking-wider">
                        <tr>{headers.map((h, i) => <th key={i} className="px-4 py-3 border border-black">{typeof h === 'object' ? h.text : h}</th>)}</tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                                {(row.cells || (Array.isArray(row) ? row : [])).map((cell, cIdx) => (
                                    <td key={cIdx} className="px-4 py-3 border border-black align-top">
                                        {!cell.isMixed && (cell.text || typeof cell !== 'object') ? (
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
                                                {(cell.parts || []).map((refinedPart, index) => {
                                                    if (refinedPart.type === 'text') return <span key={index} className="pr-1" dangerouslySetInnerHTML={{ __html: refinedPart.content }} />;
                                                    if (refinedPart.type === 'input') {
                                                        const lookupItems = (group.items || group.questions || []);
                                                        const item = lookupItems.find(it => String(it.id) === String(refinedPart.id));
                                                        return (
                                                            <div key={`input-${refinedPart.id}`} className="inline-flex items-baseline mb-1">
                                                                <ListeningTextInput 
                                                                    id={refinedPart.id} answer={refinedPart.answer || item?.answer} locationId={refinedPart.locationId || item?.locationId} 
                                                                    userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} 
                                                                    handleLocationClick={handleLocationClick} onSeekTo={onSeekTo}
                                                                    timestamp={item?.timestamp || item?.timeStep} activePart={activePart}
                                                                />
                                                            </div>
                                                        );
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

    if (group.groups) return <div className="space-y-4">{group.groups.map((sub, sIdx) => (sub.items || []).map((item, iIdx) => (item.type === 'table' || item.headers) ? renderSingleTable(item, `${sIdx}-${iIdx}`) : null))}</div>;
    return renderSingleTable(group, 'root');
};

// --- NOTE / FLOWCHART / SUMMARY COMPLETION ---
export const NoteCompletion = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, onSeekTo, activePart }) => {
    return (
        <div className="mb-2 space-y-8">
            {(group.groups || [group]).map((sub, sIdx) => (
                <div key={sIdx} className="bg-white py-2 rounded-xl">
                    {sub.header && <h3 className="text-[1.1em] font-black text-gray-900 mb-4 mt-2 pt-3 uppercase tracking-wider border-t border-gray-100">{typeof sub.header === 'object' ? sub.header.text : sub.header}</h3>}
                    <div className="flex flex-wrap items-baseline gap-y-1">
                        {(sub.items || sub.questions || []).map((q, qIdx) => {
                            const qText = (typeof q.text === 'object' ? q.text.text : q.text) || "";
                            const isBullet = /^[•\-\*]/.test(String(qText).trim()) || /^\d+[\.\)]/.test(String(qText).trim());
                            const breakEl = ( (q.type === 'heading' || isBullet) && qIdx > 0) ? <div className="w-full h-0" /> : null;

                            if (q.type === 'heading') return <React.Fragment key={qIdx}>{breakEl}<div className="font-bold text-black text-[1.125em] w-full mt-4 mb-1">{qText}</div></React.Fragment>;
                            
                            return (
                                <React.Fragment key={qIdx}>
                                    {breakEl}
                                    <div className={`font-normal text-gray-800 leading-relaxed ${isBullet ? 'pl-4 inline-flex w-full md:w-auto' : 'pl-2 inline-flex'}`}>
                                        {(q.parts || [{type: 'text', content: qText}]).map((part, pIdx) => {
                                            if (part.type === 'text') return <span key={pIdx} className="mr-1" dangerouslySetInnerHTML={{ __html: stripLeadingId(part.content, q.id) }} />;
                                            if (part.type === 'input') return (
                                                <ListeningTextInput 
                                                    key={pIdx} id={part.id || q.id} answer={part.answer || q.answer} locationId={part.locationId || q.locationId}
                                                    userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode}
                                                    handleLocationClick={handleLocationClick} onSeekTo={onSeekTo}
                                                    timestamp={q.timestamp || q.timeStep} activePart={activePart}
                                                />
                                            );
                                            return null;
                                        })}
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

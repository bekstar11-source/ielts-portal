import React from "react";

export default function ListeningFooter({
    testData,
    activePart,
    setActivePart,
    userAnswers,
    scrollToQuestionDiv,
    partNumber = null
}) {
    if (!testData || !testData.passages) return null;

    const isRealQuestion = (item) => {
        if (!item || item.id == null) return false;
        if (item.answer) return true;
        const idStr = String(item.id).trim();
        if (idStr.includes('-')) return false;
        return !isNaN(idStr) && idStr !== "";
    };

    const extractQuestionsFromGroup = (group) => {
        let questions = [];
        const type = String(group.type || "").toLowerCase();
        const isMultiTwo = type.includes('pick_two') || type.includes('multi_two');
        const isMultiThree = type.includes('pick_three') || type.includes('multi_three');
        const isMultiFour = type.includes('pick_four');
        const isMultiFive = type.includes('pick_five');

        let rawItems = [];
        if (group.questions && Array.isArray(group.questions)) rawItems = group.questions;
        else if (group.items && Array.isArray(group.items)) rawItems = group.items;
        else if (group.id != null && !group.groups && !group.rows) rawItems = [group];

        const parseMultiIds = (rawId, count) => {
            const str = String(rawId);
            if (str.includes('-')) {
                const parts = str.split('-').map(Number).filter(n => !isNaN(n));
                if (parts.length >= 2) {
                    const ids = [];
                    for (let n = parts[0]; n <= parts[parts.length - 1]; n++) ids.push(String(n));
                    return ids;
                }
            }
            if (!isNaN(rawId)) {
                return Array.from({ length: count }, (_, i) => String(Number(rawId) + i));
            }
            return [str];
        };

        if (isMultiTwo || isMultiThree || isMultiFour || isMultiFive) {
            if (rawItems.length === 1) {
                const q = rawItems[0];
                const count = isMultiFive ? 5 : (isMultiFour ? 4 : (isMultiThree ? 3 : 2));
                const ids = parseMultiIds(q.id, count);
                ids.forEach((splitId, i) => {
                    questions.push({ ...q, id: splitId, displayId: splitId, multiIndex: i, isMulti: true });
                });
            } else {
                questions = [...rawItems];
            }
        } else {
            questions = [...rawItems];
        }

        if (group.groups && Array.isArray(group.groups)) {
            group.groups.forEach(subGroup => {
                if (subGroup.rows) {
                    subGroup.rows.forEach(row => {
                        let cells = Array.isArray(row) ? row : (row.cells || []);
                        cells.forEach(cell => {
                            if (cell.id && !cell.isMultiQuestion && !cell.isMixed) questions.push(cell);
                            if (cell.isMultiQuestion && cell.content) questions.push(...cell.content);
                            if (cell.isMixed && cell.parts) {
                                cell.parts.forEach(p => { if (p.type === 'input') questions.push(p); });
                            }
                        });
                    });
                } else {
                    const items = subGroup.items || subGroup.questions || [];
                    items.forEach(it => {
                        if (it.type === 'table' || it.rows) {
                            it.rows.forEach(row => {
                                let cells = Array.isArray(row) ? row : (row.cells || []);
                                cells.forEach(cell => {
                                    if (cell.id && !cell.isMultiQuestion && !cell.isMixed) questions.push(cell);
                                    if (cell.isMultiQuestion && cell.content) questions.push(...cell.content);
                                    if (cell.isMixed && cell.parts) {
                                        cell.parts.forEach(p => { if (p.type === 'input') questions.push(p); });
                                    }
                                });
                            });
                        } else {
                            questions.push(it);
                        }
                    });
                }
            });
        }
        if ((group.type === 'table_completion' || group.type === 'table') && group.rows) {
            group.rows.forEach(row => {
                let cellsToIterate = Array.isArray(row) ? row : (row.cells || []);
                cellsToIterate.forEach(cell => {
                    if (cell.id && !cell.isMultiQuestion && !cell.isMixed) questions.push(cell);
                    if (cell.isMultiQuestion && cell.content) questions.push(...cell.content);
                    if (cell.isMixed && cell.parts) {
                        cell.parts.forEach(part => { if (part.type === 'input') questions.push(part); });
                    }
                });
            });
        }
        return questions;
    };

    const [activeQuestionId, setActiveQuestionId] = React.useState(null);

    const activePartPassage = testData.passages[activePart];
    const activePartGroups = testData.questions
        ? testData.questions.filter(g => String(g.passageId) === String(activePartPassage?.id))
        : [];
    const activePartQuestions = activePartGroups
        .reduce((acc, g) => [...acc, ...extractQuestionsFromGroup(g)], [])
        .filter(isRealQuestion)
        .filter((q, i, self) => i === self.findIndex(t => String(t.id) === String(q.id)));

    const firstQuestionId = activePartQuestions[0]?.id || null;

    React.useEffect(() => {
        if (firstQuestionId) setActiveQuestionId(firstQuestionId);
    }, [activePart, firstQuestionId]);

    React.useEffect(() => {
        const handleDocumentClick = (e) => {
            let target = e.target;
            while (target && target !== document.body) {
                if (target.id && target.id.startsWith('q-')) {
                    const qId = target.id.replace('q-', '');
                    if (activePartQuestions.some(pq => String(pq.id) === String(qId))) {
                        setActiveQuestionId(qId);
                        break;
                    }
                }
                target = target.parentNode;
            }
        };
        document.addEventListener('click', handleDocumentClick);
        return () => document.removeEventListener('click', handleDocumentClick);
    }, [activePartQuestions]);

    // ── Precompute per-passage data ──────────────────────────────────────
    const passageData = testData.passages.map((passage, idx) => {
        if (partNumber && idx !== partNumber - 1) return null;
        const groups = testData.questions
            ? testData.questions.filter(g => String(g.passageId) === String(passage.id))
            : [];
        const questions = groups
            .reduce((acc, g) => [...acc, ...extractQuestionsFromGroup(g)], [])
            .filter(isRealQuestion)
            .filter((q, i, self) => i === self.findIndex(t => String(t.id) === String(q.id)));
        const answeredCount = questions.filter(q =>
            userAnswers[q.id] && String(userAnswers[q.id]).trim() !== ""
        ).length;
        return { passage, idx, questions, qCount: questions.length, answeredCount };
    }).filter(Boolean);

    // ── Total question count for green-bar width calculation ─────────────
    const totalQ = passageData.reduce((s, d) => s + d.qCount, 0);

    return (
        <div className="h-full w-full flex flex-col bg-white select-none">

            {/* ── PARTS ROW ─────────────────────────────────────────────────── */}
            <div className="flex flex-1 items-stretch overflow-x-auto overflow-y-hidden">
                {passageData.map((d) => {
                    const { passage, idx, questions, qCount, answeredCount } = d;
                    const isActive = activePart === idx;
                    const partNum = passage.partNumber ?? (idx + 1);

                    if (isActive) {
                        return (
                            <div
                                key={passage.id || idx}
                                className="flex-1 min-w-0 h-full flex items-center bg-white"
                            >
                                {/* Part label */}
                                <div className="h-full flex flex-col items-center pl-4 pr-3 shrink-0">
                                    <div className="mt-[6px] h-[3px] w-full" />
                                    <div className="flex-1 flex items-center">
                                        <span className="font-bold text-[14px] text-gray-900 whitespace-nowrap">
                                            Part {partNum}
                                        </span>
                                    </div>
                                </div>

                                {/* Question number buttons */}
                                <div className="flex h-full gap-[6px] overflow-x-auto pr-3 flex-initial">
                                    {questions.map(q => {
                                        const isAnswered = userAnswers[q.id] && String(userAnswers[q.id]).trim() !== "";
                                        const isActiveQ = String(activeQuestionId) === String(q.id);

                                        return (
                                            <div key={q.id} className="flex flex-col items-center h-full min-w-[26px]">
                                                {/* Top indicator shifted slightly down */}
                                                <div 
                                                    className={`mt-[6px] h-[3px] w-full transition-colors ${isAnswered ? 'bg-[#3c763d]' : 'bg-[#e5e7eb]'}`}
                                                />
                                                {/* Button centered vertically in remaining space */}
                                                <div className="flex-1 flex items-center justify-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveQuestionId(q.id);
                                                            scrollToQuestionDiv(q.id);
                                                        }}
                                                        className="flex items-center justify-center w-full h-[26px] px-0.5 text-[14px] font-semibold rounded transition-all"
                                                        style={{
                                                            color: isActiveQ ? '#1a56db' : '#374151',
                                                            border: isActiveQ ? '1.5px solid #1a56db' : '1.5px solid transparent',
                                                        }}
                                                    >
                                                        {q.id}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    } else {
                        return (
                            <div
                                key={passage.id || idx}
                                onClick={() => setActivePart(idx)}
                                className="flex-1 min-w-0 h-full flex items-center justify-center gap-2 cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                            >
                                <span className="font-bold text-[14px] text-gray-700 whitespace-nowrap">
                                    Part {partNum}
                                </span>
                                <span className="text-[12px] text-gray-400 font-semibold whitespace-nowrap">
                                    {answeredCount} of {qCount}
                                </span>
                            </div>
                        );
                    }
                })}


            </div>
        </div>
    );
}
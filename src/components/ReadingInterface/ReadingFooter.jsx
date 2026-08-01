// src/components/ReadingInterface/ReadingFooter.jsx
import React from "react";

export default function ReadingFooter({
    testData,
    activePassage,
    setActivePassage,
    userAnswers,
    scrollToQuestionDiv,
    isMobile,
    setMobileActiveTab,
    partNumber = null
}) {
    if (!testData || !testData.passages) return null;

    const getDisplayLabel = (item) => item.id;

    const isRealQuestion = (item) => {
        if (!item || item.id == null) return false;
        if (item.answer) return true;
        const idStr = String(item.id).trim();
        if (idStr.includes('-') || idStr.includes('–') || idStr.includes('_')) return false;
        return !isNaN(idStr) && idStr !== "";
    };

    const checkIfAnswered = (q, answers) => {
        if (q.isMulti && q.parentQuestionId) {
            const val = answers[q.parentQuestionId];
            if (!val) return false;
            const choices = String(val).split(',').filter(Boolean);
            return choices.length > q.multiIndex;
        }
        return answers[q.id] && String(answers[q.id]).trim() !== "";
    };

    const extractQuestionsFromGroup = (group) => {
        let questions = [];
        const type = String(group.type || "").toLowerCase();
        const isMultiTwo = type.includes('pick_two') || type.includes('multi_two');
        const isMultiThree = type.includes('pick_three') || type.includes('multi_three');

        let rawItems = [];
        if (group.items && Array.isArray(group.items)) {
            rawItems = group.items;
        } else if (group.questions && Array.isArray(group.questions)) {
            rawItems = group.questions;
        } else if ((group.type === 'table_completion' || group.type === 'table') && group.rows) {
            group.rows.forEach(row => {
                let cells = Array.isArray(row) ? row : (row.cells || []);
                cells.forEach(cell => {
                    if (cell.id && !cell.isMultiQuestion && !cell.isMixed) rawItems.push(cell);
                    if (cell.isMultiQuestion && cell.content) rawItems.push(...cell.content);
                    if (cell.isMixed && cell.parts) {
                        cell.parts.forEach(part => { if (part.type === 'input') rawItems.push(part); });
                    }
                });
            });
        }

        const parseMultiIds = (rawId, count) => {
            const str = String(rawId);
            if (str.includes('-') || str.includes('–') || str.includes('_')) {
                const parts = str.split(/[\-–_]/).map(Number).filter(n => !isNaN(n));
                if (parts.length >= 2) {
                    const ids = [];
                    const min = Math.min(parts[0], parts[parts.length - 1]);
                    const max = Math.max(parts[0], parts[parts.length - 1]);
                    for (let n = min; n <= max; n++) ids.push(String(n));
                    return ids;
                }
            }
            if (!isNaN(rawId)) {
                return Array.from({ length: count }, (_, i) => String(Number(rawId) + i));
            }
            return [str];
        };

        if (isMultiTwo || isMultiThree) {
            rawItems.forEach(q => {
                const count = isMultiThree ? 3 : 2;
                const ids = parseMultiIds(q.id, count);
                ids.forEach((splitId, i) => {
                    questions.push({ ...q, id: splitId, displayId: splitId, multiIndex: i, isMulti: true, parentQuestionId: q.id });
                });
            });
        } else {
            questions = [...rawItems];
        }

        return questions;
    };

    const [activeQuestionId, setActiveQuestionId] = React.useState(null);

    const activePassageGroups = testData.questions
        ? testData.questions.filter(g => String(g.passageId) === String(testData.passages[activePassage]?.id))
        : [];
    const activePassageQuestions = activePassageGroups
        .reduce((acc, g) => [...acc, ...extractQuestionsFromGroup(g)], [])
        .filter(isRealQuestion)
        .filter((q, i, self) => i === self.findIndex(t => String(t.id) === String(q.id)));

    const firstQuestionId = activePassageQuestions[0]?.id || null;

    React.useEffect(() => {
        if (firstQuestionId) setActiveQuestionId(firstQuestionId);
    }, [activePassage, firstQuestionId]);

    React.useEffect(() => {
        const handleDocumentClick = (e) => {
            let target = e.target;
            while (target && target !== document.body) {
                if (target.id && target.id.startsWith('q-')) {
                    const qId = target.id.replace('q-', '');
                    if (activePassageQuestions.some(pq => String(pq.id) === String(qId))) {
                        setActiveQuestionId(qId);
                        break;
                    }
                }
                target = target.parentNode;
            }
        };
        document.addEventListener('click', handleDocumentClick);
        return () => document.removeEventListener('click', handleDocumentClick);
    }, [activePassageQuestions]);

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
        const answeredCount = questions.filter(q => checkIfAnswered(q, userAnswers)).length;
        return { passage, idx, questions, qCount: questions.length, answeredCount };
    }).filter(Boolean);

    // ── Total question count for green-bar width calculation ─────────────
    const totalQ = passageData.reduce((s, d) => s + d.qCount, 0);

    return (
        <div className="h-full w-full flex flex-col bg-white select-none px-3">


            {/* ── PARTS ROW ─────────────────────────────────────────────────── */}
            <div className="flex flex-1 items-stretch overflow-hidden">
                {passageData.map((d) => {
                    const { passage, idx, questions, qCount, answeredCount } = d;
                    const isActive = activePassage === idx;
                    const partNum = passage.partNumber ?? (idx + 1);

                    if (isActive) {
                        return (
                            <div
                                key={passage.id}
                                className="flex-1 min-w-0 h-full flex items-center bg-white"
                            >
                                {/* Part label */}
                                <div className="h-full flex flex-col items-center pl-4 pr-3 shrink-0">
                                    <div className="mt-[6px] h-[3px] w-full bg-[#d1d5db]" />
                                    <div className="flex-1 flex items-center">
                                        <span className="font-bold text-[14px] text-gray-900 whitespace-nowrap">
                                            Part {partNum}
                                        </span>
                                    </div>
                                </div>

                                {/* Question number buttons */}
                                <div className="flex h-full gap-[6px] pr-3 flex-1 min-w-0">
                                    {questions.map(q => {
                                        const label = getDisplayLabel(q);
                                        const isAnswered = checkIfAnswered(q, userAnswers);
                                        const isActiveQ = String(activeQuestionId) === String(q.id);

                                        return (
                                            <div key={q.id} className="flex flex-col items-center h-full grow-0 shrink basis-[32px] min-w-[22px] max-w-[32px]">
                                                {/* Top indicator shifted slightly down */}
                                                <div
                                                    className={`mt-[6px] h-[3px] w-full rounded-none transition-colors ${isAnswered ? 'bg-[#16a34a]' : 'bg-[#d1d5db]'}`}
                                                />
                                                {/* Button centered vertically in remaining space */}
                                                <div className="flex-1 flex items-center justify-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isMobile && setMobileActiveTab) setMobileActiveTab('questions');
                                                            setActiveQuestionId(q.id);
                                                            scrollToQuestionDiv(q.parentQuestionId || q.id);
                                                        }}
                                                        className="flex items-center justify-center w-[26px] h-[26px] px-0 text-[clamp(10.5px,1.05vw,14px)] leading-none font-semibold rounded transition-all"
                                                        style={{
                                                            color: isActiveQ ? '#1a56db' : '#374151',
                                                            border: isActiveQ ? '1.5px solid #1a56db' : '1.5px solid transparent',
                                                        }}
                                                    >
                                                        {label}
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
                                key={passage.id}
                                onClick={() => setActivePassage(idx)}
                                title={`Part ${partNum} — ${answeredCount} of ${qCount}`}
                                className="flex-1 basis-0 min-w-0 max-w-[460px] h-full flex items-center justify-center gap-2 px-3 cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                            >
                                <span className="font-bold text-[14px] text-gray-700 whitespace-nowrap">
                                    Part {partNum}
                                </span>
                                <span className="text-[12px] text-gray-400 font-semibold whitespace-nowrap tabular-nums">
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
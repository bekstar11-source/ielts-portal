import React from "react";
// Jadval katakchasidan savol ajratish qoidasi bitta joyda — ball hisobi (`evaluateTest`)
// ham aynan shu qoidaga tayanadi, aks holda footerda ko'rinmaydigan savol paydo bo'lardi.
import { extractTableQuestions } from "../../utils/tableQuestions";

// ⚠️ props/state'ga bog'liq bo'lmagan yordamchilar komponent tashqarisida —
// aks holda ular har renderda qaytadan yaratilib, quyidagi
// `activePartQuestions` ham har safar yangi massiv bo'lar va click-listener
// effekti har renderda o'chirilib-qayta qo'shilardi.
const isRealQuestion = (item) => {
    if (!item || item.id == null) return false;
    if (item.answer) return true;
    const idStr = String(item.id).trim();
    if (idStr.includes('-') || idStr.includes('–') || idStr.includes('_')) return false;
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
            // EN TIRE ham ajratkich: bazada diapazon ID lari "35–36" ko'rinishida
            // yoziladi. Faqat oddiy defis tekshirilganda bunday savol footerda
            // IKKITA emas, BITTA tugma bo'lib chiqardi — 40 talik testda 39 ta
            // tugma. `ReadingFooter` da bu allaqachon tuzatilgan edi.
            if (str.includes('-') || str.includes('–') || str.includes('_')) {
                const parts = str.split(/[-–_]/).map(Number).filter(n => !isNaN(n));
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
                    questions.push(...extractTableQuestions(subGroup.rows));
                } else {
                    const items = subGroup.items || subGroup.questions || [];
                    items.forEach(it => {
                        // `it.type === 'table'` bo'lsa-yu `rows` bo'lmasa, ilgari bu yer
                        // `undefined.forEach` bilan yiqilardi — shuning uchun `rows` mavjudligi
                        // yagona mezon.
                        if (Array.isArray(it.rows)) questions.push(...extractTableQuestions(it.rows));
                        else questions.push(it);
                    });
                }
            });
        }
        // Turga emas, tuzilmaga qaraymiz: ba'zi JSON larda guruh turi `note_completion`
        // bo'lib turib ichida `rows` bo'ladi — turga qarab tekshirilganda bunday
        // jadvalning savollari footerda umuman ko'rinmasdi.
        if (Array.isArray(group.rows)) {
            questions.push(...extractTableQuestions(group.rows));
        }
    return questions;
};

export default function ListeningFooter({
    testData,
    activePart,
    setActivePart,
    userAnswers,
    scrollToQuestionDiv,
    partNumber = null
}) {
    // ⚠️ BARCHA hook'lar shartsiz, eng yuqorida. Ilgari
    // `if (!testData) return null` hook'lardan oldin turardi: testData
    // keyinroq kelganda React "Rendered more hooks than during the previous
    // render" xatosi bilan sahifani yiqitardi.
    const [activeQuestionId, setActiveQuestionId] = React.useState(null);

    const activePartQuestions = React.useMemo(() => {
        if (!testData?.questions || !testData?.passages) return [];
        const activePartPassage = testData.passages[activePart];
        return testData.questions
            .filter(g => String(g.passageId) === String(activePartPassage?.id))
            .reduce((acc, g) => [...acc, ...extractQuestionsFromGroup(g)], [])
            .filter(isRealQuestion)
            .filter((q, i, self) => i === self.findIndex(t => String(t.id) === String(q.id)));
    }, [testData, activePart]);

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

    // Hook'lardan KEYINGI guard — bu yerdan pastda hook chaqirilmaydi.
    if (!testData || !testData.passages) return null;

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
        <div className="h-full w-full flex flex-col bg-white select-none px-3">

            {/* ── PARTS ROW ─────────────────────────────────────────────────── */}
            <div className="flex flex-1 items-stretch overflow-hidden">
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
                                <div className="h-full flex flex-col items-center pl-3 pr-3 shrink-0">
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
                                        const isAnswered = userAnswers[q.id] && String(userAnswers[q.id]).trim() !== "";
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
                                                            setActiveQuestionId(q.id);
                                                            scrollToQuestionDiv(q.id);
                                                        }}
                                                        className="flex items-center justify-center w-[26px] h-[26px] px-0 text-[clamp(10.5px,1.05vw,13.5px)] leading-none font-semibold rounded transition-all"
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
                                title={`Part ${partNum} — ${answeredCount} of ${qCount}`}
                                className="flex-1 basis-0 min-w-0 max-w-[460px] h-full flex items-center justify-center gap-2 px-3 cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                            >
                                <span className="font-bold text-[13.5px] text-gray-700 whitespace-nowrap">
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
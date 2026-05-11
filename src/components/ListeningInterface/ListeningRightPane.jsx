import React, { memo } from "react";
import { MapLabeling, Matching, SelectionBox, TableCompletion, NoteCompletion, FlowChart, MultipleChoice } from "./ListeningQuestionTypes";
import { useListeningHighlight } from "../../hooks/useListeningHighlight";

const formatIELTSInstruction = (text) => {
    if (!text) return "";
    // IELTS so'z limitlarini bold (bold) qilish
    const patterns = [
        /\b(NO MORE THAN (?:THREE|TWO|ONE|[A-Z]+) WORDS? AND\/OR A NUMBER)\b/gi,
        /\b(NO MORE THAN (?:THREE|TWO|ONE|[A-Z]+) WORDS?)\b/gi,
        /\b(ONE WORD AND\/OR A NUMBER)\b/gi,
        /\b(ONE WORD ONLY)\b/gi,
        /\b(A NUMBER)\b/gi
    ];

    let result = text;
    patterns.forEach(p => {
        result = result.replace(p, (match) => `<strong>${match.toUpperCase()}</strong>`);
    });

    // Ko'rsatmalarni yangi qatordan boshlash
    const breakPatterns = [
        { search: '. Write', replace: '. <div class="mt-1 mb-1">Write' },
        { search: '. Choose', replace: '. <div class="mt-1 mb-1">Choose' },
        { search: '? Choose', replace: '? <div class="mt-1 mb-1">Choose' }
    ];

    breakPatterns.forEach(p => {
        if (result.includes(p.search)) {
            result = result.replace(p.search, p.replace);
            result += '</div>';
        }
    });

    return result;
};

const ListeningRightPane = memo(({
    testData,
    activePart,
    userAnswers,
    onAnswerChange,
    isReviewMode,
    textSize = "text-base",
    handleLocationClick,
    testMode,
    onIntroEnd,
    isHighlighterActive: isHighlighterActiveProp,
    hideSecondaryIntro,
    isPremium,
    onSeekTo
}) => {
    // --- HIGHLIGHT HOOK ---
    // isHighlighterActiveProp props orqali kelsa hookka uzatiladi (tashqaridan boshqariladi)
    const {
        containerRef,
        handleTextSelection,
    } = useListeningHighlight(testData?.id, activePart, userAnswers, isHighlighterActiveProp);

    // --- INTRO BLUR LOGIC ---
    const [introTimeLeft, setIntroTimeLeft] = React.useState(0);
    const introEndFiredRef = React.useRef(false); // bir marta ishga tushirish

    React.useEffect(() => {
        if (isReviewMode || testMode === 'practice') return;
        introEndFiredRef.current = false; // reset when test starts
        const duration = Number(testData.introDuration) || 10;

        // Agar ikkinchi oyna yashirilgan bo'lsa (Masalan MockExam da Volume Check bo'lsa)
        if (hideSecondaryIntro) {
            setIntroTimeLeft(0);
            if (!introEndFiredRef.current && onIntroEnd) {
                introEndFiredRef.current = true;
                setTimeout(() => onIntroEnd(), 100);
            }
            return;
        }

        setIntroTimeLeft(duration);

        // Countdown boshlanishi bilan audio ham boshlansin
        if (!introEndFiredRef.current && onIntroEnd) {
            introEndFiredRef.current = true;
            setTimeout(() => onIntroEnd(), 100);
        }

        const timer = setInterval(() => {
            setIntroTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [testData.introDuration, isReviewMode, testMode, hideSecondaryIntro]); // eslint-disable-line react-hooks/exhaustive-deps

    // Guard Clause
    if (!testData?.questions || !testData?.passages) {
        return <div className="p-10 text-center text-gray-400">Loading questions...</div>;
    }

    // --- MAIN DISPATCHER ---
    const renderGroupContent = (group) => {
        if (group.type === 'map_labeling') return <MapLabeling group={group} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} onSeekTo={onSeekTo} activePart={activePart} />;
        if (group.type === 'matching') return <Matching group={group} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} onSeekTo={onSeekTo} activePart={activePart} />;
        if (['selection', 'pick_two', 'pick_three', 'pick_four', 'pick_five', 'multi_three', 'multi_choice_box', 'multiple_choice_multiple_answer'].includes(group.type)) return <SelectionBox group={group} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} onSeekTo={onSeekTo} activePart={activePart} />;
        if (['table_completion', 'table'].includes(group.type)) return <TableCompletion group={group} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} onSeekTo={onSeekTo} activePart={activePart} />;
        const completionTypes = ['note_completion', 'gap_fill', 'sentence_completion', 'summary_completion', 'form_completion'];
        if (completionTypes.includes(group.type)) {
            const normalized = group.groups ? group : { ...group, groups: [{ items: group.items || group.questions || [] }] };
            return <NoteCompletion group={normalized} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} onSeekTo={onSeekTo} activePart={activePart} />;
        }
        if (group.type === 'flow_chart') {
            const normalized = group.groups ? group : { ...group, groups: [{ items: group.items || group.questions || [] }] };
            return <FlowChart group={normalized} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} onSeekTo={onSeekTo} activePart={activePart} />;
        }

        // --- MCQ HANDLER ---
        // JSON da ikki xil MCQ strukturasi bo'lishi mumkin:
        // 1) FLAT: { id, type, text, options, answer } — savol to'g'ridan-to'g'ri group objektida
        // 2) GROUPED: { type, questions: [{id, text, options, answer}, ...] }
        let normalizedGroup = { ...group };

        const hasNestedQuestions = Array.isArray(group.questions) && group.questions.length > 0;
        const hasNestedItems = Array.isArray(group.items) && group.items.length > 0;
        const hasNestedGroups = Array.isArray(group.groups) && group.groups.length > 0;

        if (hasNestedGroups) {
            // MultipleChoice allaqachon groups bilan ishlashni biladi
            normalizedGroup = group;
        } else if (!hasNestedQuestions && !hasNestedItems && group.id != null) {
            // FLAT tuzilish: group o'zi bitta savol — uni questions arrayga o'raymiz
            normalizedGroup = {
                ...group,
                questions: [{
                    id: group.id,
                    text: group.text,
                    options: group.options || [],
                    answer: group.answer || group.correct_answer,
                    locationId: group.locationId,
                }],
            };
        } else {
            // GROUPED tuzilish: options group darajasida bo'lsa, har bir savolga uzatamiz
            normalizedGroup = {
                ...group,
                questions: (group.questions || group.items || []).map(q => ({
                    ...q,
                    options: q.options || group.options || [],
                })),
            };
        }

        return <MultipleChoice group={normalizedGroup} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} onSeekTo={onSeekTo} activePart={activePart} />;
    };

    const currentPassage = testData.passages[activePart];
    const questionsForPart = testData.questions.filter(g => g.passageId === currentPassage?.id);

    return (
        <div
            className={`p-6 pb-5 bg-white select-text w-full relative h-[100%] flex flex-col ielts-font`}
            style={{
                fontSize: textSize === 'text-sm' ? '14px' : textSize === 'text-xl' ? '20px' : '16px',
                transition: 'font-size 0.3s ease-in-out'
            }}
        >
            {/* INTRO BLUR */}
            {introTimeLeft > 0 && !isReviewMode && !hideSecondaryIntro && (
                <div className="fixed inset-0 z-[3000] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-500">
                    <div className="text-6xl mb-1 animate-bounce">🎧</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Test is about to start</h2>
                    <p className="text-gray-500 font-medium mb-2">Please put on your headphones</p>
                    <div className="w-24 h-24 rounded-full border-4 border-blue-600 flex items-center justify-center bg-white shadow-lg">
                        <span className="text-3xl font-bold text-blue-600 animate-pulse">{introTimeLeft}</span>
                    </div>
                </div>
            )}

            {/* STABLE HIGHLIGHT CONTENT CONTAINER */}
            <div 
                ref={containerRef} 
                onMouseUp={handleTextSelection}
                className="overflow-y-auto custom-scrollbar highlight-container-stable h-full flex-1"
            >
                {/* HEADER */}
                {(() => {
                    let partMinId = Infinity;
                    let partMaxId = -Infinity;
                    questionsForPart.forEach(group => {
                        let items = [];
                        if (Array.isArray(group.groups)) {
                            group.groups.forEach(sub => { items = [...items, ...(sub.items || sub.questions || [])]; });
                        } else {
                            items = group.questions || group.items || [];
                        }
                        items.forEach(it => {
                            const idNum = parseInt(it.id);
                            if (!isNaN(idNum)) {
                                if (idNum < partMinId) partMinId = idNum;
                                if (idNum > partMaxId) partMaxId = idNum;
                            }
                        });
                    });

                    const rangeStr = partMinId !== Infinity ? `${partMinId}–${partMaxId}` : "";
                    // AUTO-DETECT PART NUMBER FROM QUESTIONS
                    const partNum = (() => {
                        let minId = Infinity;
                        questionsForPart.forEach(group => {
                            const checkId = (idStr) => {
                                if (!idStr) return;
                                const matches = String(idStr).match(/\d+/g);
                                if (matches) matches.forEach(m => {
                                    const num = parseInt(m);
                                    if (num < minId) minId = num;
                                });
                            };
                            checkId(group.id);
                            (group.items || group.questions || [])?.forEach(it => checkId(it.id));
                            group.groups?.forEach(sub => (sub.items || sub.questions || [])?.forEach(it => checkId(it.id)));
                        });

                        if (minId !== Infinity) {
                            if (minId <= 10) return 1;
                            if (minId <= 20) return 2;
                            if (minId <= 30) return 3;
                            return 4;
                        }
                        return currentPassage?.partNumber ?? (activePart + 1);
                    })();

                    return (
                        <div className="bg-[#f4f4f2] border border-[#e8e8e6] rounded-sm px-5 py-4 mb-8">
                            <h2 className="text-[1.125em] font-bold text-black mb-1 leading-none">
                                Part {partNum}
                            </h2>
                            <p className="text-[1.05em] text-black font-normal">
                                Listen and answer questions {rangeStr}.
                            </p>
                        </div>
                    );
                })()}

                {/* QUESTIONS LOOP */}
                {questionsForPart.map((group, gIdx) => {
                // Savol raqamlarini aniqlash (Oddiy yoki nested guruhlar uchun)
                let allSubItems = [];
                if (Array.isArray(group.groups)) {
                    group.groups.forEach(sub => {
                        allSubItems = [...allSubItems, ...(sub.items || sub.questions || [])];
                    });
                } else {
                    allSubItems = group.questions || group.items || [];
                }

                // Barcha savol ID larini yig'ish (faqat raqamlilarni)
                const allIds = allSubItems
                    .map(it => parseInt(it.id))
                    .filter(id => !isNaN(id));

                const firstId = allIds.length > 0 ? Math.min(...allIds) : group.id;
                const lastId = allIds.length > 0 ? Math.max(...allIds) : group.id;

                let questionRange = "";
                if (firstId && lastId) {
                    questionRange = String(firstId) === String(lastId)
                        ? `Question ${firstId}`
                        : `Questions ${firstId}–${lastId}`;
                }

                const prevGroup = gIdx > 0 ? questionsForPart[gIdx - 1] : null;
                const normalizeHTML = (html) => (typeof html === 'string') ? html.replace(/<[^>]*>/g, '').trim().toLowerCase() : '';
                const isDuplicateInstruction = prevGroup && normalizeHTML(prevGroup.instruction) === normalizeHTML(group.instruction);
                const isDuplicateGroupText = prevGroup && normalizeHTML(prevGroup.text) === normalizeHTML(group.text);

                return (
                    <div key={gIdx} className="mb-8 animate-in fade-in duration-500">
                        <div className="mb-1 flex flex-col">
                            {questionRange && (
                                <div className="mb-1">
                                    <h3 className="text-[1.25em] font-bold text-black leading-tight tracking-tight">
                                        {questionRange}
                                    </h3>
                                </div>
                            )}
                            <div className="mb-4">
                                {!isDuplicateInstruction && group.instruction && (
                                    <div className="text-[1.05em] font-normal text-gray-900 leading-snug">
                                        <span dangerouslySetInnerHTML={{ __html: formatIELTSInstruction(group.instruction) }} />
                                    </div>
                                )}
                                {!isDuplicateGroupText && group.text && (group.questions?.length > 0 || group.items?.length > 0 || group.groups?.length > 0) && (
                                    <div className="mt-6 text-[1.2em] font-bold text-black leading-tight">
                                        <span dangerouslySetInnerHTML={{ __html: group.text }} />
                                    </div>
                                )}
                            </div>
                        </div>
                        {renderGroupContent(group)}
                    </div>
                );
            })}
            </div>
        </div>
    );
}, (prev, next) =>
    prev.activePart === next.activePart &&
    prev.userAnswers === next.userAnswers &&
    prev.isReviewMode === next.isReviewMode &&
    prev.textSize === next.textSize &&
    prev.testMode === next.testMode &&
    prev.testData === next.testData &&
    prev.isHighlighterActive === next.isHighlighterActive
);

export default ListeningRightPane;
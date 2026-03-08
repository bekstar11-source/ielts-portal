import React, { memo } from "react";
import { MapLabeling, Matching, SelectionBox, TableCompletion, NoteCompletion, FlowChart, StandardMCQ } from "./ListeningQuestionTypes";
import { useListeningHighlight } from "../../hooks/useListeningHighlight";

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
    }, [testData.introDuration, isReviewMode, testMode]); // eslint-disable-line react-hooks/exhaustive-deps

    // Guard Clause
    if (!testData?.questions || !testData?.passages) {
        return <div className="p-10 text-center text-gray-400">Loading questions...</div>;
    }

    // --- MAIN DISPATCHER ---
    const renderGroupContent = (group) => {
        if (group.type === 'map_labeling') return <MapLabeling group={group} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />;
        if (group.type === 'matching') return <Matching group={group} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />;
        if (['selection', 'pick_two', 'multi_choice_box', 'multiple_choice_multiple_answer'].includes(group.type)) return <SelectionBox group={group} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />;
        if (group.type === 'table_completion') return <TableCompletion group={group} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />;
        if ((group.type === 'note_completion' || group.type === 'gap_fill') && group.groups) return <NoteCompletion group={group} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />;
        if (group.type === 'flow_chart') return <FlowChart group={group} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />;

        // --- MCQ HANDLER ---
        // JSON da ikki xil MCQ strukturasi bo'lishi mumkin:
        // 1) FLAT: { id, type, text, options, answer } — savol to'g'ridan-to'g'ri group objektida
        // 2) GROUPED: { type, questions: [{id, text, options, answer}, ...] }
        let normalizedGroup = { ...group };

        const hasNestedQuestions = Array.isArray(group.questions) && group.questions.length > 0;
        const hasNestedItems = Array.isArray(group.items) && group.items.length > 0;

        if (!hasNestedQuestions && !hasNestedItems && group.id != null) {
            // FLAT tuzilish: group o'zi bitta savol — uni questions arrayga o'raymiz
            normalizedGroup = {
                ...group,
                questions: [{
                    id: group.id,
                    text: group.text,
                    options: group.options || [],
                    answer: group.answer,
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

        return <StandardMCQ group={normalizedGroup} userAnswers={userAnswers} onAnswerChange={onAnswerChange} isReviewMode={isReviewMode} handleLocationClick={handleLocationClick} />;
    };

    const currentPassage = testData.passages[activePart];
    const questionsForPart = testData.questions.filter(g => g.passageId === currentPassage?.id);

    return (
        <div
            ref={containerRef}
            className={`p-6 pb-5 bg-white select-text w-full relative`}
            style={{
                fontSize: textSize === 'text-sm' ? '14px' : textSize === 'text-xl' ? '20px' : '16px',
                transition: 'font-size 0.3s ease-in-out'
            }}
            onMouseUp={handleTextSelection}
        >
            {/* INTRO BLUR */}
            {introTimeLeft > 0 && !isReviewMode && (
                <div className="fixed inset-0 z-[3000] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-500">
                    <div className="text-6xl mb-4 animate-bounce">🎧</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Test is about to start</h2>
                    <p className="text-gray-500 font-medium mb-6">Please put on your headphones</p>
                    <div className="w-24 h-24 rounded-full border-4 border-blue-600 flex items-center justify-center bg-white shadow-lg">
                        <span className="text-3xl font-bold text-blue-600 animate-pulse">{introTimeLeft}</span>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="mb-6 border-b border-gray-200 pb-4 flex items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{currentPassage?.title}</h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Listen carefully and answer the questions.</p>
                </div>
            </div>

            {/* QUESTIONS LOOP */}
            {questionsForPart.map((group, gIdx) => {
                // Flat MCQ (id to'g'ridan to'g'ri group da) yoki nested (questions/items arrayda)
                const allItems = group.questions || group.items || [];
                const firstId = allItems.length > 0 ? allItems[0].id : (group.id != null ? group.id : null);
                const lastId = allItems.length > 0 ? allItems[allItems.length - 1].id : (group.id != null ? group.id : null);
                let questionRange = (firstId && lastId && String(firstId) !== String(lastId)) ? `Questions ${firstId}–${lastId}` : (firstId ? `Question ${firstId}` : "");

                // MCQ savollarda badge allaqachon raqamni ko'rsatadi — questionRange ortiqcha
                // Non-MCQ typelar ro'yxatiga KIRMAGANLAR = MCQ
                const NON_MCQ_TYPES = ['map_labeling', 'matching', 'selection', 'pick_two', 'multi_choice_box', 'multiple_choice_multiple_answer', 'table_completion', 'note_completion', 'gap_fill', 'flow_chart'];
                const isMCQ = !NON_MCQ_TYPES.includes(group.type);
                // Flat MCQ (group.id bor, ichida questions/items yo'q) yoki bitta savollik MCQ — range ko'rsatma
                const isFlatMCQ = isMCQ && !Array.isArray(group.questions) && !Array.isArray(group.items) && group.id != null;
                if (isMCQ && (isFlatMCQ || String(firstId) === String(lastId))) {
                    questionRange = "";
                }

                const prevGroup = gIdx > 0 ? questionsForPart[gIdx - 1] : null;
                const normalizeHTML = (html) => (typeof html === 'string') ? html.replace(/<[^>]*>/g, '').trim().toLowerCase() : '';
                const isDuplicateInstruction = prevGroup && normalizeHTML(prevGroup.instruction) === normalizeHTML(group.instruction);

                // Nested holat uchun group.text ni ham tekshirib qo'yishimiz mumkin, agar u ham huddi shunday takrorlanayotgan bo'lsa
                const isDuplicateGroupText = prevGroup && normalizeHTML(prevGroup.text) === normalizeHTML(group.text);

                return (
                    <div key={gIdx} className="mb-10 animate-in fade-in duration-500">
                        <div className="mb-5 flex flex-col gap-3">
                            {questionRange && <h3 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-1 inline-block w-fit">{questionRange}</h3>}
                            {!isDuplicateInstruction && group.instruction && <div className="text-base font-bold text-black"><span dangerouslySetInnerHTML={{ __html: group.instruction }} /></div>}
                            {/* group.text faqat nested savollar uchun — flat MCQ da StandardMCQ o'zi render qiladi */}
                            {!isDuplicateGroupText && group.text && (group.questions?.length > 0 || group.items?.length > 0) && <div className="text-base font-bold text-black leading-relaxed"><span dangerouslySetInnerHTML={{ __html: group.text }} /></div>}
                        </div>
                        {renderGroupContent(group)}
                    </div>
                );
            })}
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
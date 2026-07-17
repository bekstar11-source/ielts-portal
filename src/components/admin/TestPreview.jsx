// src/components/admin/TestPreview.jsx
// CreateTest sahifasidagi o'ng panelda real practice ko'rinishini taklif  etuvchi preview
import React, { useState, useCallback, useRef } from "react";
import ReadingLeftPane from "../ReadingInterface/ReadingLeftPane";
import ReadingRightPane from "../ReadingInterface/ReadingRightPane";
import ListeningRightPane from "../ListeningInterface/ListeningRightPane";

// ─── READING PREVIEW ──────────────────────────────────────────────────────────
function ReadingPreview({ testData }) {
    const [activePassage, setActivePassage] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [leftWidth, setLeftWidth] = useState(50);
    const isResizing = useRef(false);
    const containerRef = useRef(null);

    const handleAnswerChange = useCallback((qId, val) => {
        setUserAnswers(prev => ({ ...prev, [qId]: val }));
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isResizing.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const pct = ((e.clientX - rect.left) / rect.width) * 100;
        setLeftWidth(Math.max(25, Math.min(75, pct)));
    }, []);

    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleMouseMove]);

    const handleMouseDown = useCallback((e) => {
        isResizing.current = true;
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        e.preventDefault();
    }, [handleMouseMove, handleMouseUp]);

    if (!testData?.passages?.length) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium">JSON tashlab ko'ring</p>
            </div>
        );
    }

    const passages = testData.passages || [];
    const questions = testData.questions || [];

    // Tab header uchun passage list
    const passageTabs = passages.map((p, i) => ({
        label: p.title ? p.title.slice(0, 20) : `Passage ${i + 1}`,
        index: i
    }));

    const currentPassageRaw = passages[activePassage];
    const storageKey = null; // Disable local storage cache for previews so we always see live JSON changes

    // Passage label (1-3)
    const passageQuestions = questions.filter(g => String(g.passageId) === String(currentPassageRaw?.id)) || [];
    let labelSuffix = activePassage + 1;
    if (passageQuestions.length > 0) {
        const allIds = [];
        passageQuestions.forEach(group => {
            group.items?.forEach(item => {
                const id = parseInt(item.id);
                if (!isNaN(id)) allIds.push(id);
            });
        });
        if (allIds.length > 0) {
            const minId = Math.min(...allIds);
            if (minId >= 27) labelSuffix = 3;
            else if (minId >= 14) labelSuffix = 2;
            else labelSuffix = 1;
        }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* PASSAGE TABS */}
            {passages.length > 1 && (
                <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
                    {passageTabs.map(tab => (
                        <button
                            key={tab.index}
                            onClick={() => setActivePassage(tab.index)}
                            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all truncate max-w-[120px] ${
                                activePassage === tab.index
                                    ? "border-[#3772FF] text-[#3772FF] bg-white"
                                    : "border-transparent text-gray-500 hover:text-gray-800"
                            }`}
                            title={tab.label}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* SPLIT PANE */}
            <div ref={containerRef} className="flex flex-1 overflow-hidden">
                {/* LEFT - PASSAGE */}
                <div
                    className="flex flex-col border-r border-gray-200 h-full overflow-y-auto bg-white select-text"
                    style={{ width: `${leftWidth}%` }}
                >
                    <ReadingLeftPane
                        key={`preview-passage-${activePassage}`}
                        passageLabel={`READING PASSAGE ${labelSuffix}`}
                        title={currentPassageRaw?.title || ""}
                        content={currentPassageRaw?.content || ""}
                        textSize="text-base"
                        highlightedId={null}
                        storageKey={storageKey}
                        isReviewMode={false}
                        onAddToWordBank={null}
                    />
                </div>

                {/* RESIZER */}
                <div
                    className="w-[5px] bg-gray-100 hover:bg-blue-200 cursor-col-resize flex justify-center items-center border-x border-gray-200 z-10 shrink-0 transition-colors"
                    onMouseDown={handleMouseDown}
                >
                    <div className="w-[1px] h-[20px] bg-gray-400" />
                </div>

                {/* RIGHT - QUESTIONS */}
                <div
                    className="flex-1 bg-slate-50 flex flex-col overflow-y-auto h-full select-text"
                    style={{ width: `${100 - leftWidth}%` }}
                >
                    <ReadingRightPane
                        testData={testData}
                        activePassage={activePassage}
                        userAnswers={userAnswers}
                        onAnswerChange={handleAnswerChange}
                        isReviewMode={false}
                        textSize="text-base"
                        handleLocationClick={() => {}}
                        highlights={{}}
                        onAddHighlight={() => {}}
                        onRemoveHighlight={() => {}}
                        onAddToWordBank={null}
                        testId="preview"
                        keywordTable={[]}
                    />
                </div>
            </div>

            {/* FOOTER TABS (passage navigation) */}
            {passages.length > 1 && (
                <div className="flex items-center justify-center gap-1 p-2 border-t border-gray-200 bg-white shrink-0">
                    {passageTabs.map(tab => (
                        <button
                            key={tab.index}
                            onClick={() => setActivePassage(tab.index)}
                            className={`px-3 py-1 text-xs font-bold rounded transition ${
                                activePassage === tab.index
                                    ? "bg-[#3772FF] text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            {tab.index + 1}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── LISTENING PREVIEW ────────────────────────────────────────────────────────
function ListeningPreview({ testData }) {
    const [activePart, setActivePart] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});

    const handleAnswerChange = useCallback((qId, val) => {
        setUserAnswers(prev => ({ ...prev, [qId]: val }));
    }, []);

    if (!testData?.passages?.length) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <p className="text-sm font-medium">JSON tashlab ko'ring</p>
            </div>
        );
    }

    const passages = testData.passages || [];

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* PART TABS */}
            <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
                {passages.map((p, i) => (
                    <button
                        key={i}
                        onClick={() => setActivePart(i)}
                        className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                            activePart === i
                                ? "border-[#3772FF] text-[#3772FF] bg-white"
                                : "border-transparent text-gray-500 hover:text-gray-800"
                        }`}
                    >
                        Part {i + 1}
                    </button>
                ))}
            </div>

            {/* RIGHT PANE ONLY */}
            <div className="flex-1 overflow-y-auto bg-white">
                <ListeningRightPane
                    testData={testData}
                    activePart={activePart}
                    userAnswers={userAnswers}
                    onAnswerChange={handleAnswerChange}
                    isReviewMode={false}
                    textSize="text-base"
                    testMode="practice"
                    introFinished={true}
                    hasStarted={true}
                    audioCurrentTime={0}
                    handleLocationClick={() => {}}
                    isHighlighterActive={false}
                    hideSecondaryIntro={true}
                />
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-center gap-1 p-2 border-t border-gray-200 bg-white shrink-0">
                {passages.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setActivePart(i)}
                        className={`px-3 py-1 text-xs font-bold rounded transition ${
                            activePart === i
                                ? "bg-[#3772FF] text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                        Part {i + 1}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function TestPreview({ testData, testType }) {
    if (!testData) return null;

    const actualType = testType || testData?.type;

    if (actualType === "reading") {
        return <ReadingPreview testData={testData} />;
    }

    if (actualType === "listening") {
        return <ListeningPreview testData={testData} />;
    }

    // Writing / Speaking uchun oddiy preview
    return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 p-8">
            <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <p className="text-sm font-medium text-center">
                {actualType === "writing" ? "Writing preview bu yerda ko'rsatilmaydi" : "Preview mavjud emas"}
            </p>
        </div>
    );
}

import React, { useState, useEffect } from "react";
import { useTestSession } from "../../hooks/useTestSession";
import { FiWifi, FiBell, FiMenu, FiEdit, FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";

export default function WritingInterface({
    testData,
    userAnswers: parentAnswers,
    onAnswerChange: setParentAnswer,
    isReviewMode,
    textSize,
    testId,
    disableInternalSession = false,
    isMockExam = false
}) {
    const currentTestId = testId || testData?.id;

    // Session hook for auto-save (Only if not disabled)
    const {
        answers: sessionAnswers,
        handleAnswerChange: setSessionAnswer,
        isDataLoaded
    } = useTestSession(disableInternalSession ? null : `ielts_writing_session_${currentTestId || 'default'}`);

    const [activeTask, setActiveTask] = useState(1);
    const [leftWidth, setLeftWidth] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const textareaRef = React.useRef(null);

    const currentAnswer = parentAnswers?.[`task${activeTask}`] || "";

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.max(260, textareaRef.current.scrollHeight)}px`;
        }
    }, [currentAnswer, activeTask]);

    // Boshqa dastur (masalan Telegram) fokusni olib, keyin talaba brauzerga
    // qaytganda fokus <body> da qolib ketadi va yozilgan harflar hech qayerga
    // tushmaydi. Shu holatda kursorni matn maydoniga qaytaramiz.
    useEffect(() => {
        if (isReviewMode) return;

        const restoreFocus = () => {
            const el = textareaRef.current;
            if (!el || el.disabled) return;
            const active = document.activeElement;
            // Faqat hech narsa tanlanmagan bo'lsa: modal tugmasi yoki boshqa
            // input'dan fokusni tortib olmaymiz.
            if (active && active !== document.body && active !== document.documentElement) return;
            const pos = el.value.length;
            el.focus({ preventScroll: true });
            try { el.setSelectionRange(pos, pos); } catch { /* ignore */ }
        };

        const onFocus = () => setTimeout(restoreFocus, 60);
        const onVisibility = () => { if (!document.hidden) onFocus(); };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [isReviewMode, activeTask]);

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const newLeftWidth = (e.clientX / window.innerWidth) * 100;
        if (newLeftWidth > 20 && newLeftWidth < 80) {
            setLeftWidth(newLeftWidth);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            document.body.style.userSelect = "none";
        } else {
            document.body.style.userSelect = "";
        }
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.body.style.userSelect = "";
        };
    }, [isDragging]);

    // Dual update: session + parent
    const handleDualAnswerChange = (taskId, value) => {
        const key = `task${taskId}`;
        if (!disableInternalSession) {
            setSessionAnswer(key, value);
        }
        if (setParentAnswer) {
            setParentAnswer(key, value);
        }
    };

    // Resume sync
    useEffect(() => {
        if (!disableInternalSession && sessionAnswers && Object.keys(sessionAnswers).length > 0) {
            Object.entries(sessionAnswers).forEach(([key, val]) => {
                if (parentAnswers && parentAnswers[key] !== val) {
                    setParentAnswer(key, val);
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDataLoaded]);

    const getWordCount = (text) => {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(Boolean).length;
    };

    if (!testData) {
        return <div className="p-8 text-center text-red-500">Writing test data not found.</div>;
    }

    // Handle legacy data format
    const normalizedTestData = { ...testData };
    if (!normalizedTestData.writingTasks && (normalizedTestData.task1 || normalizedTestData.task2)) {
        normalizedTestData.writingTasks = [];
        if (normalizedTestData.task1) {
            normalizedTestData.writingTasks.push({
                id: 1,
                title: "Writing Task 1",
                prompt: normalizedTestData.task1,
                image: normalizedTestData.task1ImageUrl || "",
                minWords: 150
            });
        }
        if (normalizedTestData.task2) {
            normalizedTestData.writingTasks.push({
                id: 2,
                title: "Writing Task 2",
                prompt: normalizedTestData.task2,
                image: normalizedTestData.task2ImageUrl || "",
                minWords: 250
            });
        }
    }

    if (!normalizedTestData || !normalizedTestData.writingTasks || normalizedTestData.writingTasks.length === 0) {
        return <div className="p-8 text-center text-red-500">Writing test data not found.</div>;
    }

    const tasks = normalizedTestData.writingTasks;
    const currentTask = tasks.find(t => t.id === activeTask);
    const wordCount = getWordCount(currentAnswer);
    const minWords = currentTask?.minWords || 150;

    return (
        <div className={`flex flex-col h-full w-full bg-white text-[#111] overflow-hidden ${textSize || 'text-base'} font-sans`}>
            
            {/* Instruction Bar */}
            <div className="bg-[#f0f0f0] px-4 py-3 mx-4 my-3 border border-[#e0e0e0] shrink-0">
                <h2 className="font-bold text-[14px] mb-1">Part {activeTask}</h2>
                <p className="text-[14px] text-[#333]">
                    You should spend about {activeTask === 1 ? '20' : '40'} minutes on this task. Write at least {minWords} words.
                </p>
            </div>

            {/* Main Split Content */}
            <div className="flex-1 flex overflow-hidden w-full relative">
                
                {/* Left pane (Prompt) */}
                <div 
                    className="h-full overflow-y-auto px-6 py-4 flex flex-col"
                    style={{ width: `${leftWidth}%` }}
                >
                    <div className="max-w-[700px] w-full mx-auto">
                        {activeTask === 2 && (
                            <div className="text-[17px] font-normal mb-6 text-[#111]">
                                Write about the following topic:
                            </div>
                        )}
                        <div className="text-[17px] font-bold mb-6 whitespace-pre-wrap leading-[1.6] text-[#111]">
                            {currentTask?.prompt}
                        </div>
                        {activeTask === 2 && (
                            <div className="text-[17px] font-normal mb-6 text-[#111]">
                                Give reasons for your answer and include any relevant examples from your own knowledge or experience.
                            </div>
                        )}
                        
                        {currentTask?.image && (
                            <div className="mb-6 group text-left">
                                <img
                                    src={currentTask.image}
                                    alt="Task visual"
                                    className="max-w-full inline-block"
                                    style={{ maxHeight: '500px' }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Resizer Divider */}
                <div 
                    className="w-[16px] bg-[#a6a6a6] flex flex-col items-center justify-center cursor-col-resize relative z-10 shrink-0 hover:bg-[#999] transition-colors"
                    onMouseDown={() => setIsDragging(true)}
                >
                    <div className="absolute top-1/2 -translate-y-1/2 bg-white border border-gray-400 w-7 h-5 flex items-center justify-center shadow-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 8l4 4-4 4" />
                            <path d="M7 8l-4 4 4 4" />
                            <path d="M3 12h18" />
                        </svg>
                    </div>
                </div>

                {/* Right pane (Textarea & Navigation) */}
                <div className="h-full overflow-y-auto flex flex-col pt-4 pb-12 pl-6 pr-10" style={{ width: `${100 - leftWidth}%` }}>
                    {/* Textarea + Word count */}
                    <div className="flex flex-col">
                        <textarea
                            ref={textareaRef}
                            value={currentAnswer}
                            onChange={(e) => handleDualAnswerChange(activeTask, e.target.value)}
                            onPaste={(e) => !isReviewMode && e.preventDefault()}
                            onContextMenu={(e) => !isReviewMode && e.preventDefault()}
                            onCopy={(e) => !isReviewMode && e.preventDefault()}
                            onCut={(e) => !isReviewMode && e.preventDefault()}
                            spellCheck={false}
                            data-gramm="false"
                            data-enable-grammarly="false"
                            disabled={isReviewMode}
                            style={{ userSelect: 'text', WebkitUserSelect: 'text', minHeight: '260px', overflowY: 'hidden' }}
                            className={`w-full border border-[#555] p-4 text-[15px] leading-relaxed resize-none focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 ${isReviewMode ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                        />
                        <div className="text-right text-[17px] text-black mt-6 font-bold">
                            Words: {wordCount}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Footer */}
            <footer className="bg-white border-t border-[#ccc] h-[46px] flex shrink-0">
                {/* Part 1 Tab */}
                <button 
                    onClick={() => setActiveTask(1)}
                    className={`w-1/2 flex items-center justify-start px-6 transition-colors border-r border-[#ccc] ${
                        activeTask === 1 ? 'bg-[#f0f0f0]' : 'bg-white hover:bg-gray-50'
                    }`}
                >
                    <div className={`w-[22px] h-[22px] rounded flex items-center justify-center mr-3 ${activeTask === 1 ? 'bg-[#e2e2e2]' : 'bg-transparent'}`}>
                        {activeTask === 1 && <FiCheck size={14} className="text-[#333]" />}
                    </div>
                    <span className="font-bold text-[14px] text-[#333]">Part 1</span>
                </button>

                {/* Part 2 Tab */}
                <button 
                    onClick={() => setActiveTask(2)}
                    className={`w-1/2 flex items-center justify-end px-6 transition-colors ${
                        activeTask === 2 ? 'bg-[#f0f0f0]' : 'bg-white hover:bg-gray-50'
                    }`}
                >
                    <span className="font-bold text-[14px] text-[#333] mr-4">Part 2</span>
                    <div className={`w-[22px] h-[22px] rounded flex items-center justify-center ml-4 ${activeTask === 2 ? 'bg-[#e2e2e2]' : 'bg-transparent'}`}>
                        {activeTask === 2 && <FiCheck size={14} className="text-[#333]" />}
                    </div>
                </button>
            </footer>
        </div>
    );
}


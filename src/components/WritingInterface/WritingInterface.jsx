import React, { useState, useEffect } from "react";
import { useTestSession } from "../../hooks/useTestSession";

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
    const currentAnswer = parentAnswers?.[`task${activeTask}`] || "";
    const wordCount = getWordCount(currentAnswer);
    const minWords = currentTask?.minWords || 150;

    return (
        <div className={`flex flex-col h-full w-full bg-white overflow-hidden ${textSize || 'text-base'}`}>

            {/* Task Tabs */}
            <div className="bg-[#f8f9fa] border-b px-6 py-2.5 flex justify-between items-center shadow-sm z-10">
                <div className="flex gap-2">
                    {tasks.map(task => (
                        <button
                            key={task.id}
                            onClick={() => setActiveTask(task.id)}
                            disabled={isReviewMode}
                            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all active:scale-[0.98] ${activeTask === task.id
                                ? 'bg-zinc-900 text-white shadow-md'
                                : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                                } ${isReviewMode ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                            {task.title}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Writing Section</div>
                </div>
            </div>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden ${isMockExam ? 'pb-[50px]' : ''}`}>

                {/* Left: Task Prompt */}
                <div className="w-full md:w-1/2 bg-white border-b md:border-b-0 md:border-r border-gray-100 overflow-y-visible md:overflow-y-auto p-6 md:p-10">
                    <div className="max-w-2xl mx-auto h-full flex flex-col">
                        <div className="mb-6 md:mb-8">
                            <h2 className="text-2xl md:text-3xl font-black text-zinc-900 mb-3 tracking-tight">{currentTask?.title}</h2>
                            <div className="flex flex-wrap gap-4 text-[13px] font-bold">
                                <span className="text-zinc-400 uppercase tracking-wider">⏱️ Spend about {currentTask?.id === 1 ? '20' : '40'} mins</span>
                                <span className="text-zinc-400 uppercase tracking-wider">✍️ Min {minWords} words</span>
                            </div>
                        </div>

                        <div className="flex-1">
                            <div className="bg-zinc-50 border-l-[6px] border-zinc-900 p-6 md:p-10 rounded-xl mb-6 md:mb-8 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
                                <p className="text-zinc-800 leading-relaxed whitespace-pre-wrap text-lg md:text-xl font-semibold italic">
                                    "{currentTask?.prompt}"
                                </p>
                            </div>

                            {currentTask?.image && (
                                <div className="mb-6 md:mb-8 group">
                                    <img
                                        src={currentTask.image}
                                        alt="Task visual"
                                        className="w-full rounded-2xl border border-gray-100 shadow-xl transition-all group-hover:shadow-2xl"
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-auto pt-8 border-t border-gray-50 hidden md:block">
                            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-[0.2em]">End of prompt area</p>
                        </div>
                    </div>
                </div>

                {/* Right: Answer Area */}
                <div className="w-full md:w-1/2 bg-[#fdfdfd] p-6 md:p-10 flex flex-col min-h-[450px] md:min-h-0">
                    <div className="max-w-2xl mx-auto w-full h-full flex flex-col">
                        <div className="mb-5 flex justify-between items-end">
                            <div className="flex flex-col">
                                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-1">Response</h3>
                                <div className="h-1 w-8 bg-zinc-900 rounded-full"></div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Word count</span>
                                <div className="px-4 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-black shadow-lg shadow-zinc-900/10">
                                    {wordCount}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 relative group min-h-[300px] md:min-h-0">
                            <div className="absolute inset-0 bg-zinc-900/5 rounded-[32px] translate-x-1 translate-y-1 transition-transform group-focus-within:translate-x-1.5 group-focus-within:translate-y-1.5"></div>
                            <textarea
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
                                placeholder={`Type your response for ${currentTask?.title.toLowerCase()}...`}
                                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                                className={`relative h-full w-full p-6 md:p-10 border-2 rounded-[32px] font-serif text-lg md:text-xl leading-relaxed resize-none focus:outline-none focus:ring-0 transition-all ${isReviewMode
                                    ? 'bg-gray-50 border-gray-200 cursor-not-allowed'
                                    : 'bg-white border-zinc-200 focus:border-zinc-900 shadow-sm'
                                    } min-h-[300px] md:min-h-[400px]`}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

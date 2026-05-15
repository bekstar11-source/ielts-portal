import React, { useState, useEffect } from "react";
import { useTestSession } from "../../hooks/useTestSession";

export default function WritingInterface({
    testData,
    userAnswers: parentAnswers,
    onAnswerChange: setParentAnswer,
    isReviewMode,
    textSize
}) {
    // Session hook for auto-save
    const {
        answers: sessionAnswers,
        handleAnswerChange: setSessionAnswer,
        isDataLoaded
    } = useTestSession(`ielts_writing_session_${testData?.id || 'default'}`);

    const [activeTask, setActiveTask] = useState(1);

    // Dual update: session + parent
    const handleDualAnswerChange = (taskId, value) => {
        const key = `task${taskId}`;
        setSessionAnswer(key, value);
        if (setParentAnswer) {
            setParentAnswer(key, value);
        }
    };

    // Resume sync
    useEffect(() => {
        if (sessionAnswers && Object.keys(sessionAnswers).length > 0) {
            Object.entries(sessionAnswers).forEach(([key, val]) => {
                // Only update if parent doesn't have it or it's different
                if (parentAnswers && parentAnswers[key] !== val) {
                    setParentAnswer(key, val);
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDataLoaded]); // reliance on isDataLoaded

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
    const isUnderLimit = wordCount < minWords;

    return (
        <div className={`flex flex-col h-full w-full bg-gray-50 overflow-hidden ${textSize || 'text-base'}`}>

            {/* Task Tabs */}
            <div className="bg-white border-b px-6 py-3 flex gap-3 shadow-sm">
                {tasks.map(task => (
                    <button
                        key={task.id}
                        onClick={() => setActiveTask(task.id)}
                        disabled={isReviewMode}
                        className={`px-6 py-2 text-sm font-bold rounded transition-all active:scale-95 ${activeTask === task.id
                            ? 'bg-zinc-900 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } ${isReviewMode ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                        {task.title}
                    </button>
                ))}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left: Task Prompt */}
                <div className="w-1/2 bg-white border-r border-gray-200 overflow-y-auto p-8">
                    <div className="max-w-2xl mx-auto">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">{currentTask?.title}</h2>
                            <div className="text-sm text-gray-500 space-y-1">
                                <p>You should spend about {currentTask?.id === 1 ? '20' : '40'} minutes on this task.</p>
                                <p>Write at least {minWords} words.</p>
                            </div>
                        </div>

                        <div className="bg-zinc-50 border-l-4 border-zinc-900 p-8 rounded-r-lg mb-6 shadow-sm">
                            <p className="text-gray-900 leading-relaxed whitespace-pre-wrap text-xl font-medium">
                                {currentTask?.prompt}
                            </p>
                        </div>

                        {currentTask?.image && (
                            <div className="mb-6">
                                <img
                                    src={currentTask.image}
                                    alt="Task visual"
                                    className="w-full rounded-lg border border-gray-200 shadow-sm"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Answer Area */}
                <div className="w-1/2 bg-gray-50 overflow-y-auto p-8 flex flex-col">
                    <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
                        <div className="mb-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-700">Your Answer</h3>
                            <div className={`text-xs font-bold px-4 py-1.5 rounded bg-zinc-100 text-zinc-900 border border-zinc-200 shadow-sm`}>
                                {wordCount} / {minWords} words
                            </div>
                        </div>

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
                            placeholder={`Start writing your ${currentTask?.title.toLowerCase()} here...`}
                            className={`flex-1 w-full p-8 border-2 rounded-lg font-serif text-lg leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all ${isReviewMode
                                ? 'bg-gray-100 cursor-not-allowed'
                                : 'bg-white border-gray-300 shadow-inner'
                                }`}
                        />

                    </div>
                </div>
            </div>
        </div>
    );
}

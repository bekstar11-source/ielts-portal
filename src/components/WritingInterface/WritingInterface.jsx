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
        showResumeModal,
        confirmResume,
        confirmRestart,
        isDataLoaded
    } = useTestSession(`ielts_writing_session_${testData?.id || 'default'}`);

    const [activeTask, setActiveTask] = useState(1);
    const [isFullScreen, setIsFullScreen] = useState(false);

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
        if (!showResumeModal && sessionAnswers && Object.keys(sessionAnswers).length > 0) {
            Object.entries(sessionAnswers).forEach(([key, val]) => {
                // Only update if parent doesn't have it or it's different
                if (parentAnswers && parentAnswers[key] !== val) {
                    setParentAnswer(key, val);
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showResumeModal, isDataLoaded]); // Removed sessionAnswers to avoid loop, rely on isDataLoaded

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullScreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullScreen(false);
            }
        }
    };

    const getWordCount = (text) => {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(Boolean).length;
    };

    if (!testData || !testData.writingTasks) {
        return <div className="p-10 text-center text-gray-500">Writing test data not found</div>;
    }

    const currentTask = testData.writingTasks.find(t => t.id === activeTask);
    const currentAnswer = parentAnswers?.[`task${activeTask}`] || "";
    const wordCount = getWordCount(currentAnswer);
    const minWords = currentTask?.minWords || 150;
    const isUnderLimit = wordCount < minWords;

    return (
        <div className={`flex flex-col h-screen w-screen bg-gray-50 overflow-hidden ${textSize || 'text-base'}`}>

            {/* Resume Modal */}
            {showResumeModal && (
                <div className="fixed inset-0 z-[3000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
                        <h3 className="text-lg font-bold text-gray-900">Resume Test?</h3>
                        <p className="text-sm text-gray-500 mt-2">
                            We found a previous unfinished session. Would you like to continue?
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button onClick={confirmRestart} className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">Restart</button>
                            <button onClick={confirmResume} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Continue</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen Toggle */}
            <button
                onClick={toggleFullScreen}
                className="absolute top-4 right-5 z-50 bg-white border border-gray-200 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50"
            >
                {isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}
            </button>

            {/* Task Tabs */}
            <div className="bg-white border-b px-6 py-3 flex gap-3 shadow-sm">
                {testData.writingTasks.map(task => (
                    <button
                        key={task.id}
                        onClick={() => setActiveTask(task.id)}
                        disabled={isReviewMode}
                        className={`px-5 py-2.5 text-sm font-bold rounded-lg transition ${activeTask === task.id
                            ? 'bg-yellow-500 text-white shadow-md'
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
                            <p className="text-sm text-gray-500">
                                You should spend about {currentTask?.id === 1 ? '20' : '40'} minutes on this task.
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

                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg">
                            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {currentTask?.prompt}
                            </p>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>Write at least {minWords} words.</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Answer Area */}
                <div className="w-1/2 bg-gray-50 overflow-y-auto p-8 flex flex-col">
                    <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
                        <div className="mb-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-700">Your Answer</h3>
                            <div className={`text-sm font-bold px-3 py-1 rounded-full ${isUnderLimit ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                }`}>
                                {wordCount} / {minWords} words
                            </div>
                        </div>

                        <textarea
                            value={currentAnswer}
                            onChange={(e) => handleDualAnswerChange(activeTask, e.target.value)}
                            disabled={isReviewMode}
                            placeholder={`Start writing your ${currentTask?.title.toLowerCase()} here...`}
                            className={`flex-1 w-full p-6 border-2 rounded-lg font-serif text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500 ${isReviewMode
                                ? 'bg-gray-100 cursor-not-allowed'
                                : 'bg-white border-gray-300'
                                }`}
                        />

                        {isUnderLimit && !isReviewMode && (
                            <p className="mt-3 text-sm text-red-600">
                                ⚠️ You need {minWords - wordCount} more words to meet the minimum requirement.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

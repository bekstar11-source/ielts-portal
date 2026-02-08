import React, { useState } from 'react';
import { useResizablePane } from '../../hooks/useResizablePane';

export default function WritingInterface({
  testData,
  userAnswers,
  onAnswerChange,
  textSize = 'text-base'
}) {
  const { leftWidth, startResizing } = useResizablePane(50);
  const [activeTab, setActiveTab] = useState('task1');

  // Helper to get current answer safely
  const currentAnswer = userAnswers?.[activeTab] || "";

  // Helper to handle text change
  const handleChange = (e) => {
    onAnswerChange(activeTab, e.target.value);
  };

  // Helper for word count
  const getWordCount = (text) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  // Get current task data
  // detailed format: testData.writingTasks = [{id: 1, ...}, {id: 2, ...}]
  // fallback format: testData.passage (old single essay)
  const isMultiTask = testData?.writingTasks?.length > 0;

  let currentTask = null;
  if (isMultiTask) {
    const taskId = activeTab === 'task1' ? 1 : 2;
    currentTask = testData.writingTasks.find(t => t.id === taskId);
  } else {
    // Fallback for old single-task tests
    currentTask = {
      title: "Writing Task",
      prompt: testData?.passage || "No prompt available.",
      image: testData?.image_url,
      minWords: 250
    };
  }

  if (!currentTask) return <div className="p-10">Task not found.</div>;

  return (
    <div className={`flex flex-col h-full w-full bg-gray-100 ${textSize}`}>

      {/* TABS (Only if Multi-Task) */}
      {isMultiTask && (
        <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center gap-4 shrink-0 shadow-sm z-10">
           <button
              onClick={() => setActiveTab('task1')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'task1'
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
           >
             Writing Task 1
           </button>
           <button
              onClick={() => setActiveTab('task2')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'task2'
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
           >
             Writing Task 2
           </button>
        </div>
      )}

      {/* SPLIT SCREEN CONTENT */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* LEFT SIDE: PROMPT */}
        <div
          className="bg-white h-full overflow-y-auto border-r border-gray-200 flex flex-col"
          style={{ width: `${leftWidth}%` }}
        >
           <div className="p-8 max-w-3xl mx-auto w-full">
              <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between items-center">
                 <span>{currentTask.title || "Task Prompt"}</span>
                 <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                   Min Words: {currentTask.minWords || 150}
                 </span>
              </h2>

              {currentTask.image && (
                <div className="mb-6 bg-gray-50 p-2 rounded-xl border border-gray-100 flex justify-center">
                   <img
                      src={currentTask.image}
                      alt="Task Chart/Graph"
                      className="max-h-[300px] object-contain rounded-lg shadow-sm"
                   />
                </div>
              )}

              <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                 {currentTask.prompt}
              </div>

              <div className="mt-8 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-700">
                 <strong>Tip:</strong> Pay attention to the word limit and ensure you address all parts of the task.
              </div>
           </div>
        </div>

        {/* RESIZER */}
        <div
           className="w-[6px] bg-gray-50 hover:bg-blue-200 cursor-col-resize flex justify-center items-center border-x border-gray-200 z-20 transition-colors"
           onMouseDown={startResizing}
        >
           <div className="w-[1px] h-[20px] bg-gray-300"></div>
        </div>

        {/* RIGHT SIDE: EDITOR */}
        <div
          className="bg-slate-50 h-full overflow-hidden flex flex-col relative"
          style={{ width: `${100 - leftWidth}%` }}
        >
           <textarea
              className="w-full h-full resize-none p-8 focus:outline-none focus:ring-0 bg-white font-serif text-lg text-gray-800 leading-relaxed overflow-y-auto"
              placeholder="Type your answer here..."
              value={currentAnswer}
              onChange={handleChange}
              spellCheck="false"
           />

           {/* WORD COUNT FLOATING BADGE */}
           <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur border border-gray-200 px-4 py-2 rounded-full shadow-lg text-sm font-bold text-gray-600 flex items-center gap-2 z-10 transition-all hover:scale-105">
              <span>{getWordCount(currentAnswer)} words</span>
              <span className={`w-2 h-2 rounded-full ${getWordCount(currentAnswer) >= (currentTask.minWords || 150) ? 'bg-green-500' : 'bg-red-500'}`}></span>
           </div>
        </div>

      </div>
    </div>
  );
}

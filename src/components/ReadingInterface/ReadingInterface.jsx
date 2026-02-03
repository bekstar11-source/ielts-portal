// src/components/ReadingInterface/ReadingInterface.jsx
import React, { useState, useRef } from "react";
import ReadingLeftPane from "./ReadingLeftPane";
import ReadingRightPane from "./ReadingRightPane";
import ReadingFooter from "./ReadingFooter";
import HighlightMenu from "./HighlightMenu";

// 👇 HOOKLAR
import { useResizablePane } from "../../hooks/useResizablePane";
import { useTextSelection } from "../../hooks/useTextSelection";
import { useTestSession } from "../../hooks/useTestSession"; // 🔥 YANGI

export default function ReadingInterface({ 
  testData, 
  // userAnswers, // ❌ Endi bularni Hook boshqaradi
  // onAnswerChange, // ❌ 
  onFlag, 
  flaggedQuestions, 
  isReviewMode, 
  textSize 
}) {
  // --- 1. SESSION HOOK (LocalStorage & Logic) ---
  // "ielts_reading_session" - bu kalit so'z. Listening uchun boshqasini berasiz.
  const { 
    answers: userAnswers, 
    handleAnswerChange: onAnswerChange, 
    showResumeModal, 
    confirmResume, 
    confirmRestart 
  } = useTestSession("ielts_reading_session");

  // --- 2. RESIZE HOOK ---
  const { leftWidth, startResizing } = useResizablePane(50);

  // --- 3. TEXT SELECTION HOOK ---
  const { menuPos, handleTextSelection, applyHighlight, clearSelection } = useTextSelection();

  // --- STATE ---
  const [activePassage, setActivePassage] = useState(0);
  const [highlightedLoc, setHighlightedLoc] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const rootRef = useRef(null);

  // --- FULLSCREEN LOGIC ---
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

  // --- REVIEW MODE LOGIC ---
  const handleLocationClick = (locId) => {
    if (!locId) return;
    setHighlightedLoc(locId);
  };

  // --- SCROLL TO QUESTION ---
  const handleScrollToQuestion = (questionId) => {
    const elementId = `q-${questionId}`;
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-blue-50", "transition-colors", "duration-500");
      setTimeout(() => element.classList.remove("bg-blue-50"), 1500);
    }
  };

  // 🔥 Storage key for the active passage content (if needed for persistence)
  const currentStorageKey = `reading_passage_${activePassage}`;

  if (!testData) return <div className="p-10">Loading Test Data...</div>;

  return (
    <div 
      className={`flex flex-col h-screen w-screen bg-ielts-bg text-black overflow-hidden relative ${textSize || 'text-base'}`} 
      ref={rootRef}
    >
      
      {/* 🔥 RESUME / RESTART MODAL 🔥 */}
      {showResumeModal && (
        <div className="fixed inset-0 z-[3000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center transform scale-100 transition-all">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Resume Test?</h3>
              <p className="text-sm text-gray-500 mt-2">
                We found a previous unfinished session. Would you like to continue where you left off or start fresh?
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={confirmRestart}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Restart Test
              </button>
              <button
                onClick={confirmResume}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Toggle */}
      <button 
        onClick={toggleFullScreen}
        className="absolute top-4 right-5 z-50 bg-white border border-gray-200 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50 unselectable"
      >
        {isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}
      </button>

      <HighlightMenu position={menuPos} onHighlight={applyHighlight} onClear={clearSelection} />

      {/* MAIN SPLIT CONTENT */}
      <div className="flex w-full h-[calc(100vh-50px)] overflow-hidden relative"> 
        
        {/* LEFT PANE */}
        <div 
          className="bg-white flex flex-col border-r border-gray-200 h-full overflow-y-auto select-text"
          style={{ width: `${leftWidth}%` }}
          onMouseUp={handleTextSelection}
        >
          <ReadingLeftPane 
             passageLabel={`READING PASSAGE ${activePassage + 1}`}
             title={testData.passages[activePassage]?.title || ""}
             content={testData.passages[activePassage]?.content || ""} 
             textSize={textSize}
             highlightedId={highlightedLoc}
             storageKey={currentStorageKey}
          />
        </div>

        {/* RESIZER */}
        <div 
          className="w-[6px] bg-gray-100 hover:bg-gray-300 cursor-col-resize flex justify-center items-center border-x border-gray-200 z-10 shrink-0"
          onMouseDown={startResizing}
        >
          <div className="w-[1px] h-[20px] bg-gray-400"></div>
        </div>

        {/* RIGHT PANE */}
        <div 
          className="flex-1 bg-slate-50 flex flex-col overflow-y-auto h-full relative select-text"
          style={{ width: `${100 - leftWidth}%` }}
          onMouseUp={handleTextSelection}
        >
          <ReadingRightPane 
            testData={testData} 
            activePassage={activePassage}
            userAnswers={userAnswers} // 👈 Hookdan kelgan state
            onAnswerChange={onAnswerChange} // 👈 Hookdan kelgan funksiya
            onFlag={onFlag}
            flaggedQuestions={flaggedQuestions}
            isReviewMode={isReviewMode}
            textSize={textSize}
            handleLocationClick={handleLocationClick}
          />
        </div>
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 w-full h-[50px] bg-white border-t border-gray-200 z-[2000] shadow-md">
        <ReadingFooter 
           testData={testData}
           activePassage={activePassage}
           setActivePassage={setActivePassage}
           userAnswers={userAnswers}
           scrollToQuestionDiv={handleScrollToQuestion}
        />
      </div>
    </div>
  );
}
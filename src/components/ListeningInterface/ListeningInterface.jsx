import React, { useState, useRef } from "react";
import ListeningLeftPane from "./ListeningLeftPane";
import ListeningRightPane from "./ListeningRightPane";
import ListeningFooter from "./ListeningFooter";
import HighlightMenu from "./HighlightMenu"; 

// 👇 HOOKLAR
import { useResizablePane } from "../../hooks/useResizablePane";
import { useTextSelection } from "../../hooks/useTextSelection";
import { useTestSession } from "../../hooks/useTestSession"; // 1. IMPORT

export default function ListeningInterface({ 
  testData, 
  // userAnswers, // ❌ Hook boshqaradi
  // onAnswerChange, // ❌ Hook boshqaradi
  onFlag, 
  flaggedQuestions, 
  isReviewMode, 
  textSize 
}) {
  // --- 1. SESSION HOOK (Listening uchun maxsus kalit) ---
  const { 
    answers: userAnswers, 
    handleAnswerChange: onAnswerChange, 
    showResumeModal, 
    confirmResume, 
    confirmRestart,
    isDataLoaded
  } = useTestSession("ielts_listening_session"); // 🔥 KALIT SO'Z: Listening

  // --- 2. RESIZE HOOK ---
  const { leftWidth, startResizing } = useResizablePane(40); // Listening default 40%

  // --- 3. TEXT SELECTION HOOK ---
  const { menuPos, handleTextSelection, applyHighlight, clearSelection } = useTextSelection();

  // --- STATE ---
  const [activePart, setActivePart] = useState(0); // Listeningda "Part 1, 2, 3, 4"
  const [highlightedLoc, setHighlightedLoc] = useState(null); // Review Mode uchun
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

  // --- REVIEW MODE: Location Click (Transcriptga scroll qilish) ---
  const handleLocationClick = (locId) => {
    if (!locId) return;
    setHighlightedLoc(locId); // LeftPane ga ID ni yuboramiz
  };

  // --- FOOTER NAV: Scroll to Question (Savolga scroll qilish) ---
  const handleScrollToQuestion = (questionId) => {
    const elementId = `q-${questionId}`;
    const element = document.getElementById(elementId);

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Vizual effekt
      element.classList.add("bg-blue-50", "transition-colors", "duration-500");
      setTimeout(() => {
        element.classList.remove("bg-blue-50");
      }, 1500);
    }
  };

  // --- DATA GUARD ---
  if (!testData || !isDataLoaded) {
      return <div className="flex h-screen items-center justify-center text-gray-500">Loading Listening Test...</div>;
  }

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
              <h3 className="text-lg font-bold text-gray-900">Resume Listening Test?</h3>
              <p className="text-sm text-gray-500 mt-2">
                We found a previous unfinished session. Would you like to continue where you left off?
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={confirmRestart}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Restart
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

      {/* Fullscreen Button */}
      <button 
        onClick={toggleFullScreen}
        className="absolute top-4 right-5 z-50 bg-white border border-gray-200 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600 shadow-sm flex items-center gap-2 hover:bg-gray-50 unselectable"
      >
        {isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}
      </button>

      {/* Highlight Menu (Agar transkriptda belgilash kerak bo'lsa) */}
      <HighlightMenu position={menuPos} onHighlight={applyHighlight} onClear={clearSelection} />

      {/* MAIN SPLIT CONTENT */}
      <div className="flex w-full h-[calc(100vh-50px)] overflow-hidden relative"> 
        
        {/* LEFT PANE (Transcript) */}
        <div 
          className="bg-white flex flex-col border-r border-gray-200 h-full overflow-y-auto select-text"
          style={{ width: `${leftWidth}%` }}
          onMouseUp={handleTextSelection} // Highlight ishlashi uchun
        >
          <ListeningLeftPane 
             // Listening JSON da odatda "parts" bo'ladi, "passages" emas
             content={testData.parts ? testData.parts[activePart]?.transcript : ""} 
             textSize={textSize}
             highlightedId={highlightedLoc} // Review Mode uchun highlight ID
          />
        </div>

        {/* RESIZER */}
        <div 
          className="w-[6px] bg-gray-100 hover:bg-gray-300 cursor-col-resize flex justify-center items-center border-x border-gray-200 z-10 shrink-0 transition-colors unselectable"
          onMouseDown={startResizing}
        >
          <div className="w-[1px] h-[20px] bg-gray-400"></div>
        </div>

        {/* RIGHT PANE (Questions) */}
        <div 
          className="flex-1 bg-slate-50 flex flex-col overflow-y-auto h-full relative select-text"
          style={{ width: `${100 - leftWidth}%` }}
          onMouseUp={handleTextSelection}
        >
          <ListeningRightPane 
            testData={testData} 
            activePart={activePart}
            userAnswers={userAnswers} // 🔥 Hookdan kelgan
            onAnswerChange={onAnswerChange} // 🔥 Hookdan kelgan
            onFlag={onFlag}
            flaggedQuestions={flaggedQuestions}
            isReviewMode={isReviewMode}
            textSize={textSize}
            handleLocationClick={handleLocationClick} // Review Mode funksiyasi
          />
        </div>
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 w-full h-[50px] bg-white border-t border-gray-200 z-[2000] shadow-md">
        <ListeningFooter 
           testData={testData}
           activePart={activePart}
           setActivePart={setActivePart}
           userAnswers={userAnswers}
           scrollToQuestionDiv={handleScrollToQuestion} // Navigatsiya funksiyasi
        />
      </div>
    </div>
  );
}
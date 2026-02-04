// src/components/ReadingInterface/ReadingInterface.jsx
import React, { useState, useRef, useEffect } from "react"; // 🔥 useEffect qo'shildi
import ReadingLeftPane from "./ReadingLeftPane";
import ReadingRightPane from "./ReadingRightPane";
import ReadingFooter from "./ReadingFooter";
import HighlightMenu from "./HighlightMenu";

// 👇 HOOKLAR
import { useResizablePane } from "../../hooks/useResizablePane";
import { useTextSelection } from "../../hooks/useTextSelection";
import { useTestSession } from "../../hooks/useTestSession"; // 🔥 Session Hook import qilindi

export default function ReadingInterface({ 
  testData, 
  userAnswers: parentAnswers,   // 👈 Parentdagi (TestSolving) javoblar
  onAnswerChange: setParentAnswer, // 👈 Parentdagi o'zgartirish funksiyasi
  onFlag, 
  flaggedQuestions, 
  isReviewMode, 
  textSize 
}) {
  // --- 1. SESSION HOOK (KO'PRIK BOSHLANDI) ---
  const { 
    answers: sessionAnswers, // Hookdagi (LocalStorage) javoblar
    handleAnswerChange: setSessionAnswer, 
    showResumeModal, 
    confirmResume, 
    confirmRestart 
  } = useTestSession(`ielts_reading_session_${testData?.id || 'default'}`);

  // 🌉 KO'PRIK 1: JAVOB O'ZGARISHI (Dual Update)
  // Foydalanuvchi javob berganda ham Hookga, ham Parentga yozamiz
  const handleDualAnswerChange = (questionId, value) => {
      // 1. LocalStoragega yozish (Refresh qilsa saqlab qolish uchun)
      setSessionAnswer(questionId, value);
      
      // 2. TestSolving.jsx ga yozish (Finish bosganda 0 chiqmasligi uchun)
      if (setParentAnswer) {
          // 🔥 MUHIM: Biz qiymatni stringga aylantirib, tozalab yuboramiz
          // Bu kechikishni (lag) oldini olishga yordam beradi
          const cleanVal = value ? String(value) : "";
          setParentAnswer(questionId, cleanVal);
      }
  };

  // 🌉 KO'PRIK 2: RESUME QILISH (Sync Effect)
  // Agar "Continue" bosilsa, Hookdagi ma'lumotni Parentga o'tkazamiz
  useEffect(() => {
      // Modal yopilgan bo'lsa va sessiyada javoblar bo'lsa
      if (!showResumeModal && sessionAnswers && Object.keys(sessionAnswers).length > 0) {
          Object.entries(sessionAnswers).forEach(([key, val]) => {
              // Agar Parentda bu javob bo'lmasa yoki farq qilsa -> Yangilaymiz
              if (parentAnswers && parentAnswers[key] !== val) {
                  setParentAnswer(key, val);
              }
          });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResumeModal, sessionAnswers]); // parentAnswers ni dependencyga qo'shmadik (loop oldini olish uchun)


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

  // Storage key
  const currentStorageKey = `reading_passage_${activePassage}`;

  if (!testData) return <div className="p-10">Loading Test Data...</div>;

  return (
    <div 
      className={`flex flex-col h-screen w-screen bg-ielts-bg text-black overflow-hidden relative ${textSize || 'text-base'}`} 
      ref={rootRef}
    >
      
      {/* 🔥 RESUME MODAL (QAYTARILDI) */}
      {showResumeModal && (
        <div className="fixed inset-0 z-[3000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900">Resume Test?</h3>
            <p className="text-sm text-gray-500 mt-2">
              We found a previous unfinished session. Would you like to continue?
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={confirmRestart}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
              >
                Restart
              </button>
              <button
                onClick={confirmResume}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
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
          {(() => {
             const currentPassage = testData.passages[activePassage];
             const rawTitle = currentPassage?.title || "";
             const match = rawTitle.match(/Passage\s+(\d+)/i);
             const displayNum = match ? match[1] : activePassage + 1;

             return (
               <ReadingLeftPane 
                  passageLabel={`READING PASSAGE ${displayNum}`} 
                  title={rawTitle} 
                  content={currentPassage?.content || ""} 
                  textSize={textSize}
                  highlightedId={highlightedLoc}
                  storageKey={currentStorageKey}
               />
             );
          })()}
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
            // 🔥 MUHIM: Ekranda Parent ma'lumotini ko'rsatamiz (sinxronlik uchun)
            userAnswers={parentAnswers || {}} 
            // 🔥 MUHIM: Javob o'zgarganda "Bridge" funksiyasini chaqiramiz
            onAnswerChange={handleDualAnswerChange} 
            
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
           userAnswers={parentAnswers || {}} // 🔥 Footerda ham Parent ma'lumoti
           scrollToQuestionDiv={handleScrollToQuestion}
        />
      </div>
    </div>
  );
}
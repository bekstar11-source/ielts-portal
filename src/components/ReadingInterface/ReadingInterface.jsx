// src/components/ReadingInterface/ReadingInterface.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import ReadingLeftPane from "./ReadingLeftPane";
import ReadingRightPane from "./ReadingRightPane";
import ReadingFooter from "./ReadingFooter";

import { useResizablePane } from "../../hooks/useResizablePane";
import { useTestSession } from "../../hooks/useTestSession";
import { generateId } from "../../utils/highlightUtils";
import VocabularyCanvas from "../ReviewInterface/VocabularyCanvas";

// --- HIGHLIGHT PERSISTENCE HELPERS ---
const HL_STORAGE_PREFIX = "reading_rp_hl_";

function loadHighlights(testId) {
  try {
    const raw = localStorage.getItem(`${HL_STORAGE_PREFIX}${testId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveHighlights(testId, data) {
  try {
    localStorage.setItem(`${HL_STORAGE_PREFIX}${testId}`, JSON.stringify(data));
  } catch { /* storage to'la bo'lsa ignore */ }
}

export default function ReadingInterface({
  testData,
  userAnswers: parentAnswers,
  onAnswerChange: setParentAnswer,
  onFlag,
  flaggedQuestions,
  isReviewMode,
  textSize,
  onAddToWordBank,
  captureData,
  onClearCapture,
  testId,
  testName,
  onSaveAllWords,
  isSavingWB
}) {
  // --- 1. SESSION HOOK ---
  const {
    answers: sessionAnswers,
    handleAnswerChange: setSessionAnswer,
    showResumeModal,
    confirmResume,
    confirmRestart
  } = useTestSession(`ielts_reading_session_${testData?.id || 'default'}`);

  // 🌉 KO'PRIK 1: JAVOB O'ZGARISHI (Dual Update)
  const handleDualAnswerChange = (questionId, value) => {
    setSessionAnswer(questionId, value);
    if (setParentAnswer) {
      const cleanVal = value ? String(value) : "";
      setParentAnswer(questionId, cleanVal);
    }
  };

  // 🌉 KO'PRIK 2: RESUME QILISH (Sync Effect)
  useEffect(() => {
    if (!showResumeModal && sessionAnswers && Object.keys(sessionAnswers).length > 0) {
      Object.entries(sessionAnswers).forEach(([key, val]) => {
        if (parentAnswers && parentAnswers[key] !== val) {
          setParentAnswer(key, val);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResumeModal, sessionAnswers]);


  // --- 2. RESIZE HOOK ---
  const { leftWidth, startResizing } = useResizablePane(50);

  // --- 4. HIGHLIGHT STATE (localStorage da saqlanadi) ---
  const [allHighlights, setAllHighlights] = useState(() => loadHighlights(testData?.id));

  // testId o'zgarganda (farqli test ochilganda) yangi storage dan yuklaymiz
  useEffect(() => {
    if (testData?.id) {
      setAllHighlights(loadHighlights(testData.id));
    }
  }, [testData?.id]);

  const addHighlight = useCallback((partId, newHighlight) => {
    setAllHighlights(prev => {
      const existing = prev[partId] || [];
      const next = {
        ...prev,
        [partId]: [...existing, { ...newHighlight, id: generateId() }]
      };
      saveHighlights(testData?.id, next);
      return next;
    });
  }, [testData?.id]);

  const removeHighlight = useCallback((partId, highlightId) => {
    setAllHighlights(prev => {
      const existing = prev[partId] || [];
      const next = {
        ...prev,
        [partId]: existing.filter(h => h.id !== highlightId)
      };
      saveHighlights(testData?.id, next);
      return next;
    });
  }, [testData?.id]);

  // --- STATE ---
  const [activePassage, setActivePassage] = useState(0);
  const [highlightedLoc, setHighlightedLoc] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const rootRef = useRef(null);

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

  const handleLocationClick = (locId) => {
    if (!locId) return;
    setHighlightedLoc(locId);
  };

  const handleScrollToQuestion = (questionId) => {
    const elementId = `q-${questionId}`;
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-blue-50", "transition-colors", "duration-500");
      setTimeout(() => element.classList.remove("bg-blue-50"), 1500);
    }
  };

  // 🔥 O'ZGARISH 1: Storage Key endi TEST ID ga bog'landi
  // Oldin faqat "reading_passage_0" edi, endi "reading_session_testID_passage_0"
  const currentStorageKey = `reading_session_${testData.id}_passage_${activePassage}`;

  if (!testData) return <div className="p-10">Loading Test Data...</div>;

  return (
    <div
      className={`flex flex-col h-screen w-screen bg-ielts-bg text-black overflow-hidden relative ${textSize || 'text-base'}`}
      ref={rootRef}
    >

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

      <button onClick={toggleFullScreen} className="absolute top-4 right-5 z-50 bg-white border border-gray-200 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50 unselectable">
        {isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}
      </button>

      <div className="flex w-full h-[calc(100vh-50px)] overflow-hidden relative">

        {/* LEFT PANE */}
        <div
          className="bg-white flex flex-col border-r border-gray-200 h-full overflow-y-auto select-text"
          style={{ width: `${leftWidth}%` }}
        >
          {(() => {
            const currentPassage = testData.passages[activePassage];

            return (
              <ReadingLeftPane
                // 🔥 O'ZGARISH 2: KEY qo'shildi!
                // Bu Reactga eski matnni majburan o'chirib, yangisini chizishni buyuradi.
                key={`${testData.id}-passage-${activePassage}`}

                // 🔥 TUZATISH: Regex shart emas, indeksga 1 ni qo'shamiz (0+1=1, 1+1=2)
                passageLabel={`READING PASSAGE ${activePassage + 1}`}
                title={currentPassage?.title || ""}
                content={currentPassage?.content || ""}
                textSize={textSize}
                highlightedId={highlightedLoc}
                storageKey={currentStorageKey}
                isReviewMode={isReviewMode}
                onAddToWordBank={onAddToWordBank}
              />
            );
          })()}
        </div>

        <div className="w-[6px] bg-gray-100 hover:bg-gray-300 cursor-col-resize flex justify-center items-center border-x border-gray-200 z-10 shrink-0" onMouseDown={startResizing}>
          <div className="w-[1px] h-[20px] bg-gray-400"></div>
        </div>

        {/* RIGHT PANE */}
        <div
          className="flex-1 bg-slate-50 flex flex-col overflow-y-auto h-full relative select-text"
          style={{ width: `${100 - leftWidth}%` }}
        >
          <ReadingRightPane
            testData={testData}
            activePassage={activePassage}
            userAnswers={parentAnswers || {}}
            onAnswerChange={handleDualAnswerChange}
            onFlag={onFlag}
            flaggedQuestions={flaggedQuestions}
            isReviewMode={isReviewMode}
            textSize={textSize}
            handleLocationClick={handleLocationClick}
            highlights={allHighlights}
            onAddHighlight={addHighlight}
            onRemoveHighlight={removeHighlight}
            onAddToWordBank={onAddToWordBank}
            testId={testId}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full h-[50px] bg-white border-t border-gray-200 z-[2000] shadow-md">
        <ReadingFooter
          testData={testData}
          activePassage={activePassage}
          setActivePassage={setActivePassage}
          userAnswers={parentAnswers || {}}
          scrollToQuestionDiv={handleScrollToQuestion}
        />
      </div>

      {isReviewMode && (
        <VocabularyCanvas
          captureData={captureData}
          onClearCapture={onClearCapture}
          testId={testId}
          testName={testName}
          onSaveAll={onSaveAllWords}
          isSaving={isSavingWB}
        />
      )}
    </div>
  );
}
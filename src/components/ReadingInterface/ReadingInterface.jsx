// src/components/ReadingInterface/ReadingInterface.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ReadingLeftPane from "./ReadingLeftPane";
import ReadingRightPane from "./ReadingRightPane";
import ReadingFooter from "./ReadingFooter";

import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useResizablePane } from "../../hooks/useResizablePane";
import { useTestSession } from "../../hooks/useTestSession";
import { generateId, injectKeywordsToHTML } from "../../utils/highlightUtils";
import VocabSynonymCanvas from "../ReviewInterface/VocabSynonymCanvas";

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
  isSavingWB,
  keywordTable = [],
  userId,
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

  // 🔥 YANGI: Restart bosilganda hamma narsani tozalaymiz
  const handleRestart = () => {
    if (testData?.id) {
      // 1. Highlightlarni tozalash
      localStorage.removeItem(`${HL_STORAGE_PREFIX}${testData.id}`);
      setAllHighlights({});

      // 2. Passage lardagi highlightlangan HTMLlarni tozalash
      const passagesCount = testData.passages?.length || 3;
      for (let i = 0; i < passagesCount; i++) {
        localStorage.removeItem(`reading_session_${testData.id}_passage_${i}`);
      }
    }
    // Asl restart funksiyasini chaqiramiz (javoblarni o'chiradi)
    confirmRestart();
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
  const [activeDragData, setActiveDragData] = useState(null);
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

  // 🔑 KEYWORD HIGHLIGHT: useMemo bilan passage contentni boyatamiz
  // isReviewMode bo'lmasa — original kontent qaytariladi (performance)
  const currentPassageRaw = testData.passages?.[activePassage];
  const highlightedPassageContent = useMemo(() => {
    let baseContent = currentPassageRaw?.content;

    // Review rejimida avval practice paytidagi highlightlarni onlaymiz 
    // (agar localStorage da bo'lsa)
    if (isReviewMode && testData?.id) {
      const storageKey = `reading_session_${testData.id}_passage_${activePassage}`;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Date.now() - parsed.timestamp < 30 * 24 * 60 * 60 * 1000) {
            baseContent = parsed.html;
          }
        }
      } catch (e) {
        console.error("Error loading user highlights for review:", e);
      }
    }

    if (!isReviewMode || !keywordTable?.length) return baseContent;
    return injectKeywordsToHTML(baseContent, keywordTable, false);
  }, [currentPassageRaw?.content, keywordTable, isReviewMode, testData?.id, activePassage]);

  // --- DND: Cross-Pane Matching Headings ---
  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const handleHeadingDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || !active) return;

    // Only handle reading-heading-* → reading-drop-* events
    const activeId = String(active.id);
    const overId = String(over.id);
    
    if (!activeId.startsWith('reading-heading-') || !overId.startsWith('reading-drop-')) return;

    const headingLabel = activeId.replace('reading-heading-', '');
    const questionId = overId.replace('reading-drop-', '');

    // Find current passage's matching headings group to get all questions
    const currentPassageId = testData.passages?.[activePassage]?.id;
    const matchingGroup = testData.questions?.find(g => {
      if (g.passageId !== currentPassageId) return false;
      const gt = String(g.type || "").toLowerCase();
      const gi = String(g.instruction || "").toLowerCase();
      return gt.includes('matching') && (
        gi.includes('heading') || gt.includes('heading')
      );
    });

    if (matchingGroup) {
      const questions = matchingGroup.items || [];
      // If this heading was already placed somewhere else, clear that
      const prevOwner = questions.find(q => 
        parentAnswers && parentAnswers[q.id] === headingLabel && String(q.id) !== String(questionId)
      );
      if (prevOwner) {
        handleDualAnswerChange(prevOwner.id, "");
      }
    }

    handleDualAnswerChange(questionId, headingLabel);
  }, [testData, activePassage, parentAnswers, handleDualAnswerChange]);

  if (!testData) return <div className="p-10">Loading Test Data...</div>;

  return (
    <div
      className={`flex flex-col h-full w-full bg-ielts-bg text-black overflow-hidden relative ${textSize || 'text-base'}`}
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
              <button onClick={handleRestart} className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">Restart</button>
              <button onClick={confirmResume} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Continue</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={toggleFullScreen} className="absolute top-4 right-5 z-50 bg-white border border-gray-200 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50 unselectable">
        {isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}
      </button>

      {/* DndContext wraps BOTH panes for cross-pane drag-and-drop (matching headings) */}
      <DndContext
        sensors={dndSensors}
        onDragStart={({ active }) => setActiveDragData(active?.data?.current || null)}
        onDragEnd={(event) => {
          setActiveDragData(null);
          if (!isReviewMode) handleHeadingDragEnd(event);
        }}
        onDragCancel={() => setActiveDragData(null)}
      >
        <div className="flex w-full h-[calc(100vh-50px)] overflow-hidden relative">

          {/* LEFT PANE */}
          <div
            className="bg-white flex flex-col h-full overflow-y-auto select-text shadow-sm"
            style={{ width: `${leftWidth}%` }}
          >
            {(() => {
              const currentPassageId = testData.passages?.[activePassage]?.id;
              const passageQuestions = testData.questions?.filter(g => g.passageId === currentPassageId) || [];
              
              const currentPassageObj = testData.passages?.[activePassage];
              const labelSuffix = currentPassageObj?.partNumber ?? (activePassage + 1);

              // Matching headings guruhini topamiz (agar mavjud bo'lsa)
              const matchingHeadingsGroup = passageQuestions.find(g => {
                const gt = String(g.type || "").toLowerCase();
                const gi = String(g.instruction || "").toLowerCase();
                return gt.includes('matching') && (
                  gi.includes('heading') || gt.includes('heading') ||
                  (g.options && g.options.some(opt => {
                    const t = String(typeof opt === 'object' ? opt.text : opt).toLowerCase();
                    return t.length > 15;
                  }) && gi.includes('paragraph'))
                );
              });

              return (
                <ReadingLeftPane
                  key={`${testData.id}-passage-${activePassage}`}
                  passageLabel={`READING PASSAGE ${labelSuffix}`}
                  title={currentPassageRaw?.title || ""}
                  content={highlightedPassageContent || ""}
                  textSize={textSize}
                  highlightedId={highlightedLoc}
                  storageKey={currentStorageKey}
                  isReviewMode={isReviewMode}
                  onAddToWordBank={onAddToWordBank}
                  matchingHeadingsGroup={matchingHeadingsGroup || null}
                  userAnswers={parentAnswers || {}}
                  onAnswerChange={handleDualAnswerChange}
                />
              );
            })()}
          </div>

          <div 
            className="w-[8px] -mx-[4px] bg-transparent hover:bg-blue-500/10 cursor-col-resize z-20 shrink-0 transition-colors" 
            onMouseDown={startResizing}
          ></div>

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
              keywordTable={keywordTable}
            />
          </div>
        </div>

        {/* DragOverlay — drag jarayonida heading ni barcha scroll/overflow chegaralaridan tashqarida ko'rsatadi */}
        <DragOverlay dropAnimation={null}>
          {activeDragData ? (
            <div className="px-3 py-2.5 border-2 border-blue-600 rounded-none bg-white shadow-[0_15px_30px_rgba(0,0,0,0.15)] flex items-start gap-3 max-w-sm opacity-95 ring-2 ring-blue-100/50">
              <span className="leading-snug text-[14.5px] font-semibold text-gray-900">
                {typeof activeDragData.text === 'string' 
                  ? activeDragData.text.replace(/^([ivx\d]+)[\.\)\s]+/i, '').trim() 
                  : activeDragData.text}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
        <VocabSynonymCanvas
          captureData={captureData}
          onClearCapture={onClearCapture}
          userId={userId}
          testId={testId}
          testTitle={testData?.title || testName || testId}
        />
      )}
    </div>
  );
}
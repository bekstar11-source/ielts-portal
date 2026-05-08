// src/components/ReadingInterface/ReadingInterface.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { DndContext, DragOverlay } from '@dnd-kit/core';

import ReadingLeftPane from "./ReadingLeftPane";
import ReadingRightPane from "./ReadingRightPane";
import ReadingFooter from "./ReadingFooter";
import ReadingNotesSidePanel from "./ReadingNotesSidePanel";
import ResumeModal from "./ResumeModal";
import VocabSynonymCanvas from "../ReviewInterface/VocabSynonymCanvas";

import { useResizablePane } from "../../hooks/useResizablePane";
import { useTestSession } from "../../hooks/useTestSession";
import { useReadingPersistence } from "../../hooks/useReadingPersistence";
import { useReadingDnd } from "../../hooks/useReadingDnd";
import { injectKeywordsToHTML } from "../../utils/highlightUtils";
import { 
    HL_STORAGE_PREFIX, 
    detectPassageLabelSuffix, 
    findMatchingHeadingsGroup 
} from "./ReadingInterfaceUtils";

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
  isNotesVisible,
  setIsNotesVisible,
  isPremium
}) {
  const currentTestId = testData?.id || testId;

  // --- 1. SESSION & ANSWERS ---
  const {
    answers: sessionAnswers,
    handleAnswerChange: setSessionAnswer,
    showResumeModal,
    confirmResume,
    confirmRestart
  } = useTestSession(`ielts_reading_session_${currentTestId || 'default'}`);

  const handleDualAnswerChange = useCallback((questionId, value) => {
    setSessionAnswer(questionId, value);
    if (setParentAnswer) {
      setParentAnswer(questionId, value ? String(value) : "");
    }
  }, [setSessionAnswer, setParentAnswer]);

  const handleRestart = () => {
    if (currentTestId) {
      localStorage.removeItem(`${HL_STORAGE_PREFIX}${currentTestId}`);
      setAllHighlights({});
      const passagesCount = testData.passages?.length || 3;
      for (let i = 0; i < passagesCount; i++) {
        localStorage.removeItem(`reading_session_${currentTestId}_passage_${i}`);
      }
    }
    confirmRestart();
  };

  useEffect(() => {
    if (!showResumeModal && sessionAnswers) {
      Object.entries(sessionAnswers).forEach(([key, val]) => {
        if (parentAnswers && parentAnswers[key] !== val) {
          setParentAnswer(key, val);
        }
      });
    }
  }, [showResumeModal, sessionAnswers, setParentAnswer]);

  // --- 2. PERSISTENCE (Highlights & Notes) ---
  const {
    allHighlights, setAllHighlights, addHighlight, removeHighlight,
    allNotes, addNote, updateNote, deleteNote
  } = useReadingPersistence(currentTestId);

  const handleDeleteNote = useCallback((passageIndex, noteId) => {
    deleteNote(passageIndex, noteId, (noteToDelete) => {
      if (noteToDelete?.source === 'question' && noteToDelete.hlId) {
        removeHighlight(noteToDelete.partId, noteToDelete.hlId);
      }
      if (noteToDelete?.hlIds?.length > 0) {
        noteToDelete.hlIds.forEach(hlId => {
          const span = document.getElementById(hlId);
          if (span) {
            const parent = span.parentNode;
            if (parent) {
                while(span.firstChild) parent.insertBefore(span.firstChild, span);
                parent.removeChild(span);
                parent.normalize();
            }
          }
        });
        const passageStorageKey = `reading_session_${currentTestId}_passage_${passageIndex}`;
        const contentDiv = document.getElementById('reading-content-display');
        if (contentDiv && !isReviewMode) {
            localStorage.setItem(passageStorageKey, JSON.stringify({
                html: contentDiv.innerHTML,
                timestamp: Date.now()
            }));
        }
      }
    });
  }, [currentTestId, deleteNote, removeHighlight]);

  // --- 3. UI STATE & NAVIGATION ---
  const { leftWidth, startResizing } = useResizablePane(50);
  const [activePassage, setActivePassage] = useState(0);
  const [highlightedLoc, setHighlightedLoc] = useState(null);
  const [highlightTrigger, setHighlightTrigger] = useState(0); 
  const rootRef = useRef(null);

  const handleLocationClick = (locId, passageIdOrIndex) => {
    if (!locId) return;
    if (passageIdOrIndex !== undefined && passageIdOrIndex !== null) {
      let targetIndex = typeof passageIdOrIndex === 'number' 
        ? passageIdOrIndex 
        : testData.passages?.findIndex(p => p.id === passageIdOrIndex);
      if (targetIndex >= 0 && targetIndex !== activePassage) setActivePassage(targetIndex);
    }
    setHighlightedLoc(locId);
    setHighlightTrigger(prev => prev + 1);
  };

  const handleScrollToQuestion = (questionId) => {
    const element = document.getElementById(`q-${questionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-blue-50", "transition-colors", "duration-500");
      setTimeout(() => element.classList.remove("bg-blue-50"), 1500);
    }
  };

  const handleScrollToNote = (note) => {
    if (note.hlIds?.length > 0) {
      const firstSpan = document.getElementById(note.hlIds[0]);
      if (firstSpan) {
        firstSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstSpan.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
        setTimeout(() => firstSpan.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2'), 2000);
      }
    }
  };

  // --- 4. CONTENT PROCESSING ---
  const currentPassageRaw = testData.passages?.[activePassage];
  const highlightedPassageContent = useMemo(() => {
    let baseContent = currentPassageRaw?.content;
    if (isReviewMode && currentTestId) {
      const storageKey = `reading_session_${currentTestId}_passage_${activePassage}`;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Date.now() - parsed.timestamp < 30 * 24 * 60 * 60 * 1000) baseContent = parsed.html;
        }
      } catch (e) {}
    }
    if (!isReviewMode || !keywordTable?.length) return baseContent;
    return injectKeywordsToHTML(baseContent, keywordTable, false);
  }, [currentPassageRaw?.content, keywordTable, isReviewMode, currentTestId, activePassage]);

  // --- 5. DND ---
  const { 
    activeDragData, dndSensors, onDragStart, onDragEnd, onDragCancel 
  } = useReadingDnd(testData, activePassage, parentAnswers, handleDualAnswerChange, isReviewMode);

  if (!testData) return <div className="p-10">Loading Test Data...</div>;

  const currentStorageKey = `reading_session_${currentTestId}_passage_${activePassage}`;
  const passageQuestions = testData.questions?.filter(g => g.passageId === currentPassageRaw?.id) || [];
  const labelSuffix = detectPassageLabelSuffix(testData, activePassage);
  const matchingHeadingsGroup = findMatchingHeadingsGroup(passageQuestions);

  return (
    <div className={`flex flex-col h-full w-full bg-ielts-bg text-black overflow-hidden relative ${textSize || 'text-base'}`} ref={rootRef}>
      <ResumeModal show={showResumeModal} onRestart={handleRestart} onResume={confirmResume} />

      <DndContext sensors={dndSensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
        <div className="flex w-full h-[calc(100vh-50px)] overflow-hidden relative">
          <div className="bg-white flex flex-col h-full overflow-y-auto select-text shadow-sm" style={{ width: `${leftWidth}%` }}>
            <ReadingLeftPane
                key={`${currentTestId}-passage-${activePassage}`}
                passageLabel={`READING PASSAGE ${labelSuffix}`}
                title={currentPassageRaw?.title || ""}
                content={highlightedPassageContent || ""}
                textSize={textSize}
                highlightedId={highlightedLoc}
                highlightTrigger={highlightTrigger}
                storageKey={currentStorageKey}
                isReviewMode={isReviewMode}
                onAddToWordBank={onAddToWordBank}
                matchingHeadingsGroup={matchingHeadingsGroup || null}
                userAnswers={parentAnswers || {}}
                onAnswerChange={handleDualAnswerChange}
                onAddNote={(noteData) => addNote(activePassage, noteData)}
                onOpenNotes={() => setIsNotesVisible(true)}
            />
          </div>

          <div className="w-[8px] -mx-[4px] bg-transparent hover:bg-blue-500/10 cursor-col-resize z-20 shrink-0 transition-colors" onMouseDown={startResizing}></div>

          <div className="flex-1 bg-slate-50 flex flex-col overflow-y-auto h-full relative select-text" style={{ width: `${100 - leftWidth}%` }}>
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
              onAddNote={(noteData) => addNote(activePassage, noteData)}
              onOpenNotes={() => setIsNotesVisible(true)}
              isPremium={isPremium}
            />
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragData && (
            <div className="px-3 py-2.5 border-2 border-blue-600 rounded-none bg-white shadow-[0_15px_30px_rgba(0,0,0,0.15)] flex items-start gap-3 max-w-sm opacity-95 ring-2 ring-blue-100/50">
              <span className="leading-snug text-[14.5px] font-semibold text-gray-900">
                {typeof activeDragData.text === 'string' 
                  ? activeDragData.text.replace(/^([ivx\d]+)[\.\)\s]+/i, '').trim() 
                  : activeDragData.text}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <div className="fixed bottom-0 left-0 w-full h-[50px] bg-white border-t border-gray-200 z-[2000] shadow-md">
        <ReadingFooter testData={testData} activePassage={activePassage} setActivePassage={setActivePassage} userAnswers={parentAnswers || {}} scrollToQuestionDiv={handleScrollToQuestion} />
      </div>

      {isReviewMode && <VocabSynonymCanvas captureData={captureData} onClearCapture={onClearCapture} userId={userId} testId={testId} testTitle={testData?.title || testName || testId} />}

      <ReadingNotesSidePanel 
        isVisible={isNotesVisible}
        onClose={() => setIsNotesVisible(false)}
        notes={allNotes[activePassage] || []}
        onUpdateNote={(id, cnt) => updateNote(activePassage, id, cnt)}
        onDeleteNote={(id) => handleDeleteNote(activePassage, id)}
        onScrollToNote={handleScrollToNote}
      />
    </div>
  );
}
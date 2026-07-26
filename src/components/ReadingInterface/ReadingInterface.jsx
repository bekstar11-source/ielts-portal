// src/components/ReadingInterface/ReadingInterface.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { DndContext, DragOverlay } from '@dnd-kit/core';

import ReadingLeftPane from "./ReadingLeftPane";
import ReadingRightPane from "./ReadingRightPane";
import ReadingFooter from "./ReadingFooter";
import ReadingNotesSidePanel from "./ReadingNotesSidePanel";
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
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { styles as readingInterfaceStyles } from "./ReadingStyles";

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
  isPremium,
  partNumber = null,
  activePart = null,
  setActivePart = null
}) {
  const currentTestId = testId || testData?.id;

  // --- 1. SESSION & ANSWERS ---
  const {
    answers: sessionAnswers,
    handleAnswerChange: setSessionAnswer,
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
    if (sessionAnswers) {
      Object.entries(sessionAnswers).forEach(([key, val]) => {
        if (parentAnswers && parentAnswers[key] !== val) {
          setParentAnswer(key, val);
        }
      });
    }
  }, [sessionAnswers, setParentAnswer]);

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
  
  const [localActivePassage, setLocalActivePassage] = useState(partNumber ? partNumber - 1 : 0);
  const activePassage = (activePart !== undefined && activePart !== null) ? activePart : localActivePassage;
  const setActivePassage = setActivePart ? setActivePart : setLocalActivePassage;

  useEffect(() => {
    if (partNumber) {
      setActivePassage(partNumber - 1);
    }
  }, [partNumber, setActivePassage]);
  const [highlightedLoc, setHighlightedLoc] = useState(null);
  const [highlightTrigger, setHighlightTrigger] = useState(0); 
  const rootRef = useRef(null);

  // --- MOBILE DETECTION ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileActiveTab, setMobileActiveTab] = useState('passage'); // 'passage' | 'questions'

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLocationClick = (locId, passageIdOrIndex) => {
    if (!locId) return;
    
    // Switch to passage tab on mobile
    if (isMobile && mobileActiveTab !== 'passage') {
      setMobileActiveTab('passage');
    }

    if (passageIdOrIndex !== undefined && passageIdOrIndex !== null) {
      let targetIndex = typeof passageIdOrIndex === 'number' 
        ? passageIdOrIndex 
        : testData.passages?.findIndex(p => p.id === passageIdOrIndex);
      if (targetIndex >= 0 && targetIndex !== activePassage) setActivePassage(targetIndex);
    }
    setHighlightedLoc(locId);
    setHighlightTrigger(prev => prev + 1);
  };

  const handleWordClick = useCallback((word, source = 'passage') => {
    if (!word) return;
    if (isMobile) {
      if (source === 'passage' && mobileActiveTab !== 'passage') {
        setMobileActiveTab('passage');
      } else if (source === 'question' && mobileActiveTab !== 'questions') {
        setMobileActiveTab('questions');
      }
    }

    setTimeout(() => {
        const containerId = source === 'question' ? 'reading-right-pane-content' : 'reading-content-display';
        const contentDiv = document.getElementById(containerId);
        
        if (!contentDiv) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            window.find(word, false, false, true, false);
            return;
        }

        // Remove old transient highlights
        document.querySelectorAll('.vocab-transient-hl').forEach(el => {
            const parent = el.parentNode;
            if (parent) {
                while(el.firstChild) parent.insertBefore(el.firstChild, el);
                parent.removeChild(el);
                parent.normalize();
            }
        });

        // Find text nodes containing the word
        const walker = document.createTreeWalker(contentDiv, NodeFilter.SHOW_TEXT, null, false);
        let node;
        let found = false;
        const searchStr = word.toLowerCase();

        while ((node = walker.nextNode())) {
            const idx = node.nodeValue.toLowerCase().indexOf(searchStr);
            if (idx >= 0) {
                const range = document.createRange();
                range.setStart(node, idx);
                range.setEnd(node, idx + searchStr.length);
                
                const span = document.createElement('span');
                span.className = 'vocab-transient-hl bg-yellow-300 text-black transition-colors duration-1000';
                try {
                    range.surroundContents(span);
                    span.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    found = true;
                    break;
                } catch(e) {}
            }
        }
        
        if (!found) {
            // Fallback to native window.find
            const selection = window.getSelection();
            selection.removeAllRanges();
            window.find(word, false, false, true, false);
        }
    }, 50);
  }, [isMobile, mobileActiveTab]);

  const handleScrollToQuestion = (questionId) => {
    // Switch to questions tab on mobile
    if (isMobile && mobileActiveTab !== 'questions') {
      setMobileActiveTab('questions');
      // Wait for re-render before scrolling
      setTimeout(() => {
        const element = document.getElementById(`q-${questionId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("bg-blue-50", "transition-colors", "duration-500");
          setTimeout(() => element.classList.remove("bg-blue-50"), 1500);
        }
      }, 50);
      return;
    }

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

    // In review mode, convert <mark id="loc_X"> to <span id="loc_X"> to prevent browser's default yellow highlights
    // and to allow correct keyword injection regex match
    if (isReviewMode && baseContent) {
      baseContent = baseContent.replace(/<mark([^>]*)>([\s\S]*?)<\/mark>/gi, (match, attrs, innerContent) => {
        if (attrs.includes('id="loc_')) {
          return `<span${attrs}>${innerContent}</span>`;
        }
        return innerContent;
      });
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
  const passageQuestions = testData.questions?.filter(g => String(g.passageId) === String(currentPassageRaw?.id)) || [];
  const labelSuffix = detectPassageLabelSuffix(testData, activePassage);
  const passageLabel = `Passage ${labelSuffix}`;
  const passageTitle = currentPassageRaw?.title || "";
  const matchingHeadingsGroup = findMatchingHeadingsGroup(passageQuestions);

  // --- PROGRESS CALCULATION (for floating bar) ---
  const progressPercent = useMemo(() => {
    if (!passageQuestions.length) return 0;
    
    const extractAllIds = (groups) => {
        const ids = new Set();
        groups.forEach(g => {
            if (g.items) g.items.forEach(i => ids.add(i.id));
            else if (g.questions) g.questions.forEach(q => ids.add(q.id));
        });
        return Array.from(ids);
    };

    const qIds = extractAllIds(passageQuestions);
    if (!qIds.length) return 0;
    
    const answeredCount = qIds.filter(id => parentAnswers[id] && String(parentAnswers[id]).trim() !== "").length;
    return Math.min(100, (answeredCount / qIds.length) * 100);
  }, [passageQuestions, parentAnswers]);

  // --- HAPTIC UTILITY ---
  const triggerHaptic = useCallback((type = 'light') => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        if (type === 'light') window.navigator.vibrate(30);
        else if (type === 'medium') window.navigator.vibrate(50);
        else if (type === 'success') window.navigator.vibrate([30, 50, 30]);
        else if (type === 'error') window.navigator.vibrate([60, 100, 60]);
    }
  }, []);

  // Wrap dual answer change to include haptic
  const handleAnswerWithHaptic = useCallback((id, val) => {
    handleDualAnswerChange(id, val);
    triggerHaptic('light');
  }, [handleDualAnswerChange, triggerHaptic]);

  return (
    <div 
        className={`flex flex-col w-full bg-ielts-bg text-black overflow-hidden relative ${textSize || 'text-base'}`} 
        style={{ height: '100%' }} 
        ref={rootRef}
    >
      <style>{readingInterfaceStyles}</style>

      {/* Header Bar spanning across both panes */}
      <div className={`px-4 pt-1 pb-2 bg-white select-none ${isMobile ? 'px-2 py-0' : ''}`} style={{ fontFamily: 'Arial, sans-serif' }}>
          <div className={`bg-[#f2f4f1] border border-[#dcdfd9] rounded-[4px] px-5 py-1.5 shadow-sm ${isMobile ? 'px-3 py-0.5' : ''}`}>
              <div className={`font-bold text-[#000000] ${isMobile ? 'text-[14px]' : 'text-[16px]'}`}>
                  Passage {labelSuffix}
              </div>
              <div className={`text-[#000000] font-semibold ${isMobile ? 'text-[11px] leading-tight' : 'text-[14px]'}`}>
                  {(() => {
                      // Robust question range calculation
                      const qNums = [];
                      const collectNums = (idStr) => {
                          if (!idStr) return;
                          const matches = String(idStr).match(/\d+/g);
                          if (matches) matches.forEach(m => {
                              const num = parseInt(m);
                              if (!isNaN(num)) qNums.push(num);
                          });
                      };
                      (passageQuestions || []).forEach(group => {
                          collectNums(group.id);
                          if (group.startNumber) qNums.push(Number(group.startNumber));
                          if (group.endNumber) qNums.push(Number(group.endNumber));
                          group.items?.forEach(item => collectNums(item.id));
                          group.questions?.forEach(q => {
                              collectNums(q.id);
                              if (q.number) qNums.push(Number(q.number));
                          });
                          group.groups?.forEach(g => {
                              collectNums(g.id);
                              (g.items || g.questions)?.forEach(it => {
                                  collectNums(it.id);
                                  if (it.number) qNums.push(Number(it.number));
                              });
                          });
                      });

                      const minQ = qNums.length > 0 ? Math.min(...qNums) : "";
                      const maxQ = qNums.length > 0 ? Math.max(...qNums) : "";
                      
                      if (minQ && maxQ) {
                          return `Read the text and answer questions ${minQ}–${maxQ}.`;
                      }

                      // Fallback if passageQuestions is empty due to missing passageId mapping
                      const fallbackRanges = {
                          1: "1–13",
                          2: "14–26",
                          3: "27–40"
                      };
                      return `Read the text and answer questions ${fallbackRanges[activePassage + 1] || "below"}.`;
                  })()}
              </div>
          </div>
      </div>

      {isMobile && (
          <div className="w-full bg-white h-[3px] overflow-hidden">
              <div 
                  className="h-full bg-ielts-blue transition-all duration-500 ease-out" 
                  style={{ width: `${progressPercent}%` }}
              />
          </div>
      )}

      <DndContext sensors={dndSensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
        <div className="flex w-full flex-1 overflow-hidden relative pb-[60px]">
          <div 
            className={`bg-white flex flex-col h-full select-text shadow-sm ${isMobile && mobileActiveTab !== 'passage' ? 'hidden' : ''} ${isMobile ? 'pane-mobile-full' : ''}`} 
            style={!isMobile ? { width: `${leftWidth}%` } : {}}
          >
            <ReadingLeftPane
                key={`${currentTestId}-passage-${activePassage}`}
                passageLabel={passageLabel}
                title={passageTitle}
                content={highlightedPassageContent || ""}
                textSize={textSize}
                highlightedId={highlightedLoc}
                highlightTrigger={highlightTrigger}
                storageKey={currentStorageKey}
                isReviewMode={isReviewMode}
                onAddToWordBank={onAddToWordBank}
                matchingHeadingsGroup={matchingHeadingsGroup || null}
                userAnswers={parentAnswers || {}}
                onAnswerChange={handleAnswerWithHaptic}
                onAddNote={(noteData) => addNote(activePassage, noteData)}
                onOpenNotes={() => setIsNotesVisible(true)}
                questions={passageQuestions}
            />
          </div>

          {!isMobile && (
            <div 
              className="w-4 -mx-2 flex items-center justify-center cursor-col-resize z-30 group relative" 
              onMouseDown={startResizing}
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-gray-400 group-hover:bg-blue-500 transition-colors" />
              <div className="z-10 w-7 h-7 bg-[#f9f9f9] border border-gray-500 flex items-center justify-center shadow-sm group-hover:border-blue-500 group-hover:text-blue-600 transition-all">
                <ArrowsLeftRight size={18} weight="bold" className="text-gray-700" />
              </div>
            </div>
          )}

          <div 
            className={`flex-1 bg-slate-50 flex flex-col h-full relative select-text ${isMobile && mobileActiveTab !== 'questions' ? 'hidden' : ''} ${isMobile ? 'pane-mobile-full' : ''}`} 
            style={!isMobile ? { width: `${100 - leftWidth}%` } : {}}
          >
            <ReadingRightPane
              testData={testData}
              activePassage={activePassage}
              userAnswers={parentAnswers || {}}
              onAnswerChange={handleAnswerWithHaptic}
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
              testName={testName || testData?.title}
              keywordTable={keywordTable}
              onAddNote={(noteData) => addNote(activePassage, noteData)}
              onOpenNotes={() => setIsNotesVisible(true)}
              isPremium={isPremium}
              passageTitle={passageTitle}
              passageLabel={passageLabel}
            />
          </div>
        </div>

        {isMobile && (
          <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 z-[2001] flex gap-6 p-1">
            <button 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black transition-all duration-300 shadow-xl border-2 ${mobileActiveTab === 'passage' ? 'bg-blue-600 text-white border-white scale-110 shadow-blue-500/40' : 'bg-white text-blue-600 border-blue-100 shadow-sm'}`}
              onClick={() => {
                if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(10);
                setMobileActiveTab('passage');
              }}
            >
              P
            </button>
            <button 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black transition-all duration-300 shadow-xl border-2 ${mobileActiveTab === 'questions' ? 'bg-blue-600 text-white border-white scale-110 shadow-blue-500/40' : 'bg-white text-blue-600 border-blue-100 shadow-sm'}`}
              onClick={() => {
                if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(10);
                setMobileActiveTab('questions');
              }}
            >
              Q
            </button>
          </div>
        )}

        <DragOverlay dropAnimation={null}>
          {activeDragData && (
            <div className="px-3 py-1 border border-blue-500 rounded-md bg-white shadow-[0_10px_20px_rgba(0,0,0,0.1)] flex items-start gap-2 w-fit opacity-90">
              <span className="leading-snug text-[14px] font-bold text-black">
                {typeof activeDragData.text === 'string' 
                  ? activeDragData.text.replace(/^([ivx\d]+)[\.\)\s]+/i, '').trim() 
                  : activeDragData.text}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <div className="fixed bottom-0 left-0 w-full h-[60px] bg-white z-[2000]">
        <ReadingFooter 
          testData={testData} 
          activePassage={activePassage} 
          setActivePassage={setActivePassage} 
          userAnswers={parentAnswers || {}} 
          scrollToQuestionDiv={handleScrollToQuestion}
          isMobile={isMobile}
          setMobileActiveTab={setMobileActiveTab}
          partNumber={partNumber}
        />
      </div>

      {isReviewMode && <VocabSynonymCanvas captureData={captureData} onClearCapture={onClearCapture} userId={userId} testId={testId} testTitle={testData?.title || testName || testId} onWordClick={handleWordClick} />}

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
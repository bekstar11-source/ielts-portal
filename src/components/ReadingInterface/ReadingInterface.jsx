// src/components/ReadingInterface/ReadingInterface.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ReadingLeftPane from "./ReadingLeftPane";
import ReadingRightPane from "./ReadingRightPane";
import ReadingFooter from "./ReadingFooter";
import ReadingNotesSidePanel from "./ReadingNotesSidePanel";


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

const NOTES_STORAGE_PREFIX = "reading_notes_";

function loadNotes(testId) {
  try {
    const raw = localStorage.getItem(`${NOTES_STORAGE_PREFIX}${testId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveNotes(testId, data) {
  try {
    localStorage.setItem(`${NOTES_STORAGE_PREFIX}${testId}`, JSON.stringify(data));
  } catch { }
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

  isNotesVisible,
  setIsNotesVisible
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
        [partId]: [...existing, { ...newHighlight, id: newHighlight.id || generateId() }]
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

  // --- NOTES STATE ---
  const [allNotes, setAllNotes] = useState(() => loadNotes(testId || testData?.id));

  useEffect(() => {
    if (testId || testData?.id) {
      setAllNotes(loadNotes(testId || testData?.id));
    }
  }, [testId, testData?.id]);

  const addNote = useCallback((passageIndex, noteData) => {
    setAllNotes(prev => {
      const existing = prev[passageIndex] || [];
      const next = {
        ...prev,
        [passageIndex]: [...existing, { ...noteData, content: "" }]
      };
      saveNotes(testId || testData?.id, next);
      return next;
    });
    setIsNotesVisible(true);
  }, [testId, testData?.id]);

  const updateNote = useCallback((passageIndex, noteId, content) => {
    setAllNotes(prev => {
      const existing = prev[passageIndex] || [];
      const next = {
        ...prev,
        [passageIndex]: existing.map(n => n.id === noteId ? { ...n, content } : n)
      };
      saveNotes(testId || testData?.id, next);
      return next;
    });
  }, [testId, testData?.id]);

  const deleteNote = useCallback((passageIndex, noteId) => {
    setAllNotes(prev => {
      const existing = prev[passageIndex] || [];
      const noteToDelete = existing.find(n => n.id === noteId);

      // If it's a question note, remove its highlight from state
      if (noteToDelete && noteToDelete.source === 'question' && noteToDelete.hlId) {
        removeHighlight(noteToDelete.partId, noteToDelete.hlId);
      }

      const next = {
        ...prev,
        [passageIndex]: existing.filter(n => n.id !== noteId)
      };
      saveNotes(testId || testData?.id, next);
      
      // Left pane logic (DOM based)
      if (noteToDelete && noteToDelete.hlIds && noteToDelete.hlIds.length > 0) {
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

        // MUHIM: Passage storage'ni ham yangilab qo'yamiz (spanlar o'chganini saqlash uchun)
        const passageStorageKey = `reading_session_${testId || testData.id}_passage_${passageIndex}`;
        const contentDiv = document.getElementById('reading-content-display');
        if (contentDiv) {
            localStorage.setItem(passageStorageKey, JSON.stringify({
                html: contentDiv.innerHTML,
                timestamp: Date.now()
            }));
        }
      }
      
      return next;
    });
  }, [testId, testData?.id, removeHighlight]);

  const handleScrollToNote = (note) => {
    if (note.hlIds && note.hlIds.length > 0) {
      const firstSpan = document.getElementById(note.hlIds[0]);
      if (firstSpan) {
        firstSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstSpan.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
        setTimeout(() => firstSpan.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2'), 2000);
      }
    }
  };

  // --- STATE ---
  const [activePassage, setActivePassage] = useState(0);
  const [highlightedLoc, setHighlightedLoc] = useState(null);
  const [highlightTrigger, setHighlightTrigger] = useState(0); 


  const [activeDragData, setActiveDragData] = useState(null);
  const rootRef = useRef(null);



  const handleLocationClick = (locId, passageIdOrIndex) => {
    if (!locId) return;

    // Switch passage if needed
    if (passageIdOrIndex !== undefined && passageIdOrIndex !== null) {
      let targetIndex = -1;
      if (typeof passageIdOrIndex === 'number') {
        targetIndex = passageIdOrIndex;
      } else {
        targetIndex = testData.passages?.findIndex(p => p.id === passageIdOrIndex);
      }

      if (targetIndex >= 0 && targetIndex !== activePassage) {
        setActivePassage(targetIndex);
      }
    }

    setHighlightedLoc(locId);
    setHighlightTrigger(prev => prev + 1);
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
              
              // PASSAGE LABEL DETECTION (AUTOMATIC)
              const labelSuffix = (() => {
                // Try to detect from question numbers
                const currentPassageId = testData.passages?.[activePassage]?.id;
                const questions = testData.questions?.filter(g => String(g.passageId) === String(currentPassageId)) || [];
                
                let minId = Infinity;
                const checkId = (idStr) => {
                    if (!idStr) return;
                    const matches = String(idStr).match(/\d+/g);
                    if (matches) matches.forEach(m => {
                        const num = parseInt(m);
                        if (num < minId) minId = num;
                    });
                };

                questions.forEach(group => {
                    checkId(group.id);
                    group.items?.forEach(item => checkId(item.id));
                    group.questions?.forEach(q => checkId(q.id));
                    group.groups?.forEach(g => (g.items || g.questions)?.forEach(it => checkId(it.id)));
                });

                if (minId !== Infinity) {
                    if (minId <= 13) return 1;
                    if (minId <= 26) return 2;
                    return 3;
                }
                return testData.passages?.[activePassage]?.partNumber ?? (activePassage + 1);
              })();

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
              onAddNote={(noteData) => addNote(activePassage, noteData)}
              onOpenNotes={() => setIsNotesVisible(true)}
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

      {/* NOTES SIDE PANEL */}
      <ReadingNotesSidePanel 
        isVisible={isNotesVisible}
        onClose={() => setIsNotesVisible(false)}
        notes={allNotes[activePassage] || []}
        onUpdateNote={(id, cnt) => updateNote(activePassage, id, cnt)}
        onDeleteNote={(id) => deleteNote(activePassage, id)}
        onScrollToNote={handleScrollToNote}
      />
    </div>
  );
}
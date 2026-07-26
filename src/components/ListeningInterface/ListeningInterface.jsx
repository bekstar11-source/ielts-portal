import React, { useState, useRef, useEffect } from "react";
import ListeningLeftPane from "./ListeningLeftPane";
import ListeningRightPane from "./ListeningRightPane";
import ListeningFooter from "./ListeningFooter";
import HighlightMenu from "../ReadingInterface/HighlightMenu";
import { HighlighterIcon } from "./ListeningComponents";
import { ArrowsLeftRight } from "@phosphor-icons/react";

// Hooklar (Loyiha papkasida bor deb hisoblaymiz)
import { useResizablePane } from "../../hooks/useResizablePane";
import useTextSelection from "../../hooks/useTextSelection";
import { useListeningHighlight } from "../../hooks/useListeningHighlight";

export default function ListeningInterface({
  testData,
  userAnswers,      // Parentdan kelgan javoblar
  onAnswerChange,   // Parentdan kelgan o'zgartirish funksiyasi
  onFlag,           // Flag (bayroqcha) qo'yish
  flaggedQuestions, // Flag qilinganlar ro'yxati
  isReviewMode,     // Test tugaganmi?
  textSize,         // Matn o'lchami
  testMode,         // 'exam' yoki 'practice'
  audioCurrentTime, // Audio vaqti
  introFinished,    // Intro tugadimi?
  hasStarted,       // Test boshlandimi?
  activePart,       // State lifted to TestSolving
  setActivePart,    // State setter lifted to TestSolving
  onIntroEnd,        // <-- Exam modeda intro tugagach audio play triggerini yuboradi
  hideSecondaryIntro,
  isPremium,
  onSeekTo,
  partNumber = null
}) {
  // --- 1. RESIZE & SELECTION HOOKS ---
  // Listeningda chap taraf (matn) odatda kichikroq bo'ladi (default 40%)
  const { leftWidth, startResizing } = useResizablePane(40);
  const { menuPos, handleTextSelection, applyHighlight, clearSelection, addToDictionary } = useTextSelection();

  // --- 2. STATE ---
  // activePart parent dan kelishi kerak, lekin fallback uchun ichki state ham saqlaymiz
  const [_internalActivePart, _setInternalActivePart] = useState(0);
  const effectiveActivePart = activePart !== undefined ? activePart : _internalActivePart;
  const effectiveSetActivePart = setActivePart || _setInternalActivePart;

  const [highlightedLoc, setHighlightedLoc] = useState(null); // Review paytida bosilganda highlight qilish

  const {
    isHighlighterActive,
    setIsHighlighterActive,
  } = useListeningHighlight(testData?.id, effectiveActivePart, userAnswers, true);

  const rootRef = useRef(null);

  // --- MOBILE DETECTION ---
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showTranscriptOnMobile, setShowTranscriptOnMobile] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 3. DATA GUARD ---
  // JSON strukturasi bo'yicha "passages" ishlatamiz
  const passages = testData?.passages || [];
  const currentPassage = passages[effectiveActivePart] || {};

  // --- 4. NAVIGATION HANDLERS ---

  // Review Mode: Savol raqami bosilganda matndagi joyga (locationId) sakrash
  const handleLocationClick = (locId) => {
    if (!locId) return;
    setHighlightedLoc(locId); // LeftPane ga ID yuboriladi
  };

  // Footer: Savol raqami bosilganda o'ng tarafdagi savolga scroll qilish
  const handleScrollToQuestion = (questionId) => {
    if (!testData?.passages || !testData?.questions) return;
    // 1. Avval savol qaysi Partda ekanligini aniqlaymiz
    const questionPartIndex = testData.passages.findIndex(p =>
      testData.questions.some(q => q && String(q.passageId) === String(p.id) &&
        (q.id === questionId || (q.items && q.items.some(i => i.id === questionId)) ||
          (q.groups && q.groups.some(g => g.items && g.items.some(i => i.id === questionId))))
      )
    );

    // 2. Agar boshqa Partda bo'lsa, o'sha Partga o'tamiz
    if (questionPartIndex !== -1 && questionPartIndex !== effectiveActivePart) {
      effectiveSetActivePart(questionPartIndex);
      // State o'zgargandan keyin scroll qilish uchun timeout
      setTimeout(() => scrollToElement(questionId), 100);
    } else {
      scrollToElement(questionId);
    }
  };

  const scrollToElement = (id) => {
    const element = document.getElementById(`q-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Vizual effekt (Highlight)
      element.classList.add("bg-yellow-100", "transition-colors", "duration-500");
      setTimeout(() => element.classList.remove("bg-yellow-100"), 1500);
    }
  };

  // Agar ma'lumot hali yuklanmagan bo'lsa
  if (!testData || passages.length === 0) {
    return <div className="flex h-full items-center justify-center text-gray-500 animate-pulse">Loading Test Data...</div>;
  }

  return (
    // 4-muammo yechimi: bg-white (kulrang emas)
    <div
      className={`flex flex-col h-full w-full bg-white text-gray-900 overflow-hidden relative ${textSize || 'text-base'}`}
      ref={rootRef}
    >



      {/* --- MAIN SPLIT CONTENT --- */}
      <div className={`flex w-full h-full overflow-hidden relative pb-[60px] ${isMobile ? 'pt-[48px]' : ''}`}>

        {/* 1-muammo yechimi: Chap taraf va Resizer FAQAT Review paytida ko'rinadi */}
        {isReviewMode && (
          <>
            <HighlightMenu
              position={menuPos}
              onHighlight={applyHighlight}
              onClear={clearSelection}
              onAddDictionary={() => addToDictionary({ sectionTitle: currentPassage?.title, testTitle: "Listening Test" })}
            />

            {((!isMobile && showTranscript) || (isMobile && showTranscriptOnMobile)) && (
              <div
                className={`${isMobile ? 'absolute inset-0 z-40' : ''} bg-white flex flex-col border-r border-gray-200 h-full overflow-hidden transition-all duration-300`}
                style={{ width: isMobile ? '100%' : `${leftWidth}%` }}
              >
                {/* Transcript Header with Hide Action */}
                <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0 select-none">
                  <span className="font-bold text-[11px] text-blue-600 uppercase tracking-widest">Transcript</span>
                  {isMobile ? (
                    <button 
                      onClick={() => setShowTranscriptOnMobile(false)}
                      className="px-3 py-1 bg-white border border-gray-300 rounded text-xs font-bold text-gray-700 active:bg-gray-100 shadow-sm"
                    >
                      Back to Questions
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShowTranscript(false)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 hover:border-gray-300 rounded-[6px] text-xs font-semibold text-gray-650 hover:text-gray-900 active:bg-gray-50 shadow-sm transition-all"
                      title="Hide Transcript"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                      Hide Script
                    </button>
                  )}
                </div>

                {/* Transcript Content Container */}
                <div 
                  className="flex-1 overflow-y-auto h-full"
                  onMouseUp={handleTextSelection}
                >
                  <ListeningLeftPane
                    content={passages[effectiveActivePart]?.content} // Transkript
                    textSize={textSize}
                    highlightedId={highlightedLoc}
                    title={currentPassage.title}
                    isReviewMode={isReviewMode}
                  />
                </div>
              </div>
            )}

            {!isMobile && showTranscript && (
              <div 
                className="w-4 -mx-2 flex items-center justify-center cursor-col-resize z-30 group relative" 
                onMouseDown={startResizing}
              >
                {/* Vertical Line - visible like in image */}
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-gray-400 group-hover:bg-blue-500 transition-colors" />
                
                {/* Drag Handle - Square matching the image */}
                <div className="z-10 w-7 h-7 bg-[#f9f9f9] border border-gray-500 flex items-center justify-center shadow-sm group-hover:border-blue-500 group-hover:text-blue-600 transition-all">
                  <ArrowsLeftRight size={18} weight="bold" className="text-gray-700" />
                </div>
              </div>
            )}
          </>
        )}

        {/* 3-muammo yechimi: O'ng taraf Test paytida 100% width bo'ladi */}
        <div
          className={`flex-1 bg-white flex flex-col overflow-y-auto h-full relative ${isMobile && isReviewMode && showTranscriptOnMobile ? 'hidden' : ''}`}
          style={{ width: isReviewMode && !isMobile && showTranscript ? `${100 - leftWidth}%` : '100%' }}
        >
          {isMobile && isReviewMode && !showTranscriptOnMobile && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex justify-between items-center sticky top-0 z-20">
              <span className="text-xs font-bold text-blue-700">Reviewing Part {effectiveActivePart + 1}</span>
              <button 
                onClick={() => setShowTranscriptOnMobile(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold shadow-sm active:bg-blue-700"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Transcript
              </button>
            </div>
          )}

          <ListeningRightPane
            testData={testData}
            activePart={effectiveActivePart} // Hozirgi bo'lim indeksi
            userAnswers={userAnswers}
            onAnswerChange={onAnswerChange}
            onFlag={onFlag}
            flaggedQuestions={flaggedQuestions}
            isReviewMode={isReviewMode}
            textSize={textSize}
            testMode={testMode}
            introFinished={introFinished}
            hasStarted={hasStarted}
            audioCurrentTime={audioCurrentTime}
            handleLocationClick={handleLocationClick} // Review funksiyasi
            onIntroEnd={onIntroEnd}
            isHighlighterActive={isHighlighterActive}
            hideSecondaryIntro={hideSecondaryIntro}
            isPremium={isPremium}
            onSeekTo={onSeekTo}
            showTranscript={showTranscript}
            setShowTranscript={setShowTranscript}
          />
        </div>
      </div>

      {/* --- FOOTER (Navigation) --- */}
      <div className="absolute bottom-0 left-0 w-full h-[60px] bg-white z-[50]">
        <ListeningFooter
          testData={testData}
          activePart={effectiveActivePart}
          setActivePart={effectiveSetActivePart}
          userAnswers={userAnswers}
          isReviewMode={isReviewMode}
          scrollToQuestionDiv={handleScrollToQuestion} // Scroll funksiyasi
          partNumber={partNumber}
        />
      </div>
    </div>
  );
}
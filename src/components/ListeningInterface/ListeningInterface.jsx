import React, { useState, useRef, useEffect } from "react";
import ListeningLeftPane from "./ListeningLeftPane";
import ListeningRightPane from "./ListeningRightPane";
import ListeningFooter from "./ListeningFooter";
import HighlightMenu from "./HighlightMenu"; 

// Hooklar (Loyiha papkasida bor deb hisoblaymiz)
import { useResizablePane } from "../../hooks/useResizablePane";
import { useTextSelection } from "../../hooks/useTextSelection";

export default function ListeningInterface({ 
  testData, 
  userAnswers,      // Parentdan kelgan javoblar
  onAnswerChange,   // Parentdan kelgan o'zgartirish funksiyasi
  onFlag,           // Flag (bayroqcha) qo'yish
  flaggedQuestions, // Flag qilinganlar ro'yxati
  isReviewMode,     // Test tugaganmi?
  textSize,         // Matn o'lchami
  testMode,         // 'exam' yoki 'practice'
  audioCurrentTime, // Audio vaqti (agar kerak bo'lsa vizualizatsiya uchun)
  introFinished,    // Intro tugadimi?
  hasStarted        // Test boshlandimi?
}) {
  // --- 1. RESIZE & SELECTION HOOKS ---
  // Listeningda chap taraf (matn) odatda kichikroq bo'ladi (default 40%)
  const { leftWidth, startResizing } = useResizablePane(40); 
  const { menuPos, handleTextSelection, applyHighlight, clearSelection } = useTextSelection();

  // --- 2. STATE ---
  const [activePart, setActivePart] = useState(0); // Hozirgi bo'lim (Part 1, 2, 3, 4)
  const [highlightedLoc, setHighlightedLoc] = useState(null); // Review paytida bosilganda highlight qilish
  
  const rootRef = useRef(null);

  // --- 3. DATA GUARD ---
  // JSON strukturasi bo'yicha "passages" ishlatamiz
  const passages = testData?.passages || [];
  const currentPassage = passages[activePart] || {};

  // --- 4. NAVIGATION HANDLERS ---
  
  // Review Mode: Savol raqami bosilganda matndagi joyga (locationId) sakrash
  const handleLocationClick = (locId) => {
    if (!locId) return;
    setHighlightedLoc(locId); // LeftPane ga ID yuboriladi
  };

  // Footer: Savol raqami bosilganda o'ng tarafdagi savolga scroll qilish
  const handleScrollToQuestion = (questionId) => {
    // 1. Avval savol qaysi Partda ekanligini aniqlaymiz
    const questionPartIndex = testData.passages.findIndex(p => 
        testData.questions.some(q => q.passageId === p.id && 
            (q.id === questionId || (q.items && q.items.some(i => i.id === questionId)) || 
            (q.groups && q.groups.some(g => g.items.some(i => i.id === questionId))))
        )
    );

    // 2. Agar boshqa Partda bo'lsa, o'sha Partga o'tamiz
    if (questionPartIndex !== -1 && questionPartIndex !== activePart) {
        setActivePart(questionPartIndex);
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
      
      {/* Highlight Menu (Faqat Review Mode da matn belgilash uchun) */}
      {isReviewMode && (
         <HighlightMenu position={menuPos} onHighlight={applyHighlight} onClear={clearSelection} />
      )}

      {/* --- MAIN SPLIT CONTENT --- */}
      <div className="flex w-full h-full overflow-hidden relative pb-[60px]"> {/* Footer balandligi uchun joy */}
        
        {/* 1-muammo yechimi: Chap taraf va Resizer FAQAT Review paytida ko'rinadi */}
        {isReviewMode && (
          <>
            <div 
              className="bg-white flex flex-col border-r border-gray-200 h-full overflow-y-auto"
              style={{ width: `${leftWidth}%` }}
              onMouseUp={handleTextSelection}
            >
              <ListeningLeftPane 
                 content={passages[activePart]?.content} // Transkript
                 textSize={textSize}
                 highlightedId={highlightedLoc}
                 title={currentPassage.title}
                 isReviewMode={isReviewMode}
              />
            </div>

            <div 
              className="w-[6px] bg-gray-50 hover:bg-gray-200 cursor-col-resize flex justify-center items-center border-x border-gray-200 z-10 shrink-0 select-none"
              onMouseDown={startResizing}
            >
               <div className="w-[1px] h-[20px] bg-gray-300"></div>
            </div>
          </>
        )}

        {/* 3-muammo yechimi: O'ng taraf Test paytida 100% width bo'ladi */}
        <div 
          className="flex-1 bg-white flex flex-col overflow-y-auto h-full relative"
          style={{ width: isReviewMode ? `${100 - leftWidth}%` : '100%' }}
        >
          <ListeningRightPane 
            testData={testData} 
            activePart={activePart} // Hozirgi bo'lim indeksi
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
          />
        </div>
      </div>

      {/* --- FOOTER (Navigation) --- */}
      <div className="absolute bottom-0 left-0 w-full h-[60px] bg-white border-t border-gray-200 z-[50] shadow-md">
        <ListeningFooter 
           testData={testData}
           activePart={activePart}
           setActivePart={setActivePart}
           userAnswers={userAnswers}
           isReviewMode={isReviewMode}
           scrollToQuestionDiv={handleScrollToQuestion} // Scroll funksiyasi
        />
      </div>
    </div>
  );
}
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage } from "../firebase/firebase";
import { doc, getDoc, addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import ReadingInterface from "../components/ReadingInterface/ReadingInterface";
import ListeningInterface from "../components/ListeningInterface/ListeningInterface";

// IELTS BAND CALCULATOR
const calculateBandScore = (score, type) => {
  const t = type?.toLowerCase();
  if (t === 'listening' || t === 'reading') {
    if (score >= 39) return 9.0;
    if (score >= 37) return 8.5;
    if (score >= 35) return 8.0;
    if (score >= 32) return 7.5;
    if (score >= 30) return 7.0;
    if (score >= 26) return 6.5;
    if (score >= 23) return 6.0;
    if (score >= 18) return 5.5;
    if (score >= 16) return 5.0;
    if (score >= 13) return 4.5;
    if (score >= 10) return 4.0;
    return 3.5;
  }
  return null;
};

export default function TestSolving() {
  const { testId } = useParams(); 
  const id = testId; 

  const navigate = useNavigate();
  const { user, userData } = useAuth();
  
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // STATE: Test Mode
  const [testMode, setTestMode] = useState(null); 
  const [showModeSelection, setShowModeSelection] = useState(true);

  const [userAnswers, setUserAnswers] = useState({});
  const [writingEssay, setWritingEssay] = useState(""); 
  
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0); 
  const [saving, setSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [textSize, setTextSize] = useState('text-medium'); 
  const [isReviewing, setIsReviewing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Audio States & Refs
  const [audioTime, setAudioTime] = useState(0);
  const audioRef = useRef(null);

  // 1. TESTNI YUKLASH
  useEffect(() => {
    if (!id || !user) return;

    const fetchTest = async () => {
      try {
        // --- PERMISSION CHECK (Start) ---
        if (userData?.role !== 'admin') {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            const currentUserData = userSnap.data();
            const groupsQuery = query(collection(db, 'groups'), where('studentIds', 'array-contains', user.uid));
            const groupsSnap = await getDocs(groupsQuery);
            let rawAssignments = [];
            if (currentUserData?.assignedTests) rawAssignments = [...rawAssignments, ...currentUserData.assignedTests];
            groupsSnap.docs.forEach(doc => { const gData = doc.data(); if (gData.assignedTests) rawAssignments = [...rawAssignments, ...gData.assignedTests]; });
            const allowedIds = rawAssignments.map(item => { if (typeof item === 'string') return item.trim(); if (item && item.id) return String(item.id).trim(); return null; }).filter(Boolean);
            let hasPermission = allowedIds.includes(String(id).trim());
            if (!hasPermission) { const potentialSets = rawAssignments.filter(a => typeof a === 'object' || (typeof a === 'string' && a.startsWith('SET_'))); if (potentialSets.length > 0) hasPermission = true; }
        }
        // --- PERMISSION CHECK (End) ---

        const docRef = doc(db, "tests", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setTest(data);
          
          const type = data.type ? data.type.toLowerCase() : '';

          // Timer logic (Saved time or Default)
          const savedTime = localStorage.getItem(`timer_${user.uid}_${data.id}`);
          if (savedTime) {
              setTimeLeft(parseInt(savedTime));
          } else {
              if (type === 'listening') setTimeLeft(2400); 
              else if (type === 'writing') setTimeLeft(3600);
              else if (type === 'speaking') setTimeLeft(900); 
              else setTimeLeft(3600); // Reading default 60 min
          }

          // Draft logic
          const draftKey = `draft_${user.uid}_${data.id}`;
          const savedDraft = localStorage.getItem(draftKey);
          if (type === 'writing' && savedDraft) {
              try { const parsed = JSON.parse(savedDraft); if (typeof parsed === 'object') setUserAnswers(parsed); else setWritingEssay(savedDraft); } catch { setWritingEssay(savedDraft); }
          } else if (savedDraft) { try { setUserAnswers(JSON.parse(savedDraft)); } catch (e) {} }

          // 🔥 MODE SELECTION LOGIC (O'ZGARTIRILDI)
          // Reading yoki Listening bo'lsa -> Mode Selection chiqsin
          if (type === 'reading' || type === 'listening') {
              setShowModeSelection(true);
          } else {
              // Writing/Speaking bo'lsa -> Avtomatik Exam Mode
              setTestMode('exam');
              setShowModeSelection(false);
          }

        } else {
          alert("Test bazadan topilmadi!");
          navigate("/dashboard");
        }
      } catch (error) { console.error("Xatolik:", error); } finally { setLoading(false); }
    };
    fetchTest();
  }, [id, navigate, user, userData?.role]); 

  // 2. TIMER (O'ZGARTIRILDI: Practice uchun oldinga, Exam uchun orqaga)
  useEffect(() => {
    // Agar test tugagan, yuklanayotgan yoki hali rejim tanlanmagan bo'lsa -> Timer ishlamaydi
    if (showResult || loading || showModeSelection || !test) return;
    
    // Exam modeda vaqt tugagan bo'lsa -> Timer to'xtaydi
    if (testMode === 'exam' && timeLeft <= 0) return;

    const timerId = setInterval(() => {
        setTimeLeft(prev => {
            let newVal;
            
            if (testMode === 'practice') {
                newVal = prev + 1; // Practice: 0, 1, 2, 3... (Oldinga)
            } else {
                newVal = prev - 1; // Exam: 60, 59, 58... (Orqaga)
            }

            localStorage.setItem(`timer_${user.uid}_${id}`, newVal);
            return newVal;
        });
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, showResult, loading, user.uid, id, showModeSelection, test, testMode]);

  // AUTO SAVE
  useEffect(() => {
    if (!test || showResult) return;
    const draftKey = `draft_${user.uid}_${test.id}`;
    if (test.type === 'writing') {
        const dataToSave = test.writingTasks ? JSON.stringify(userAnswers) : writingEssay;
        localStorage.setItem(draftKey, dataToSave);
    } else if (test.type === 'reading' || test.type === 'listening') {
        localStorage.setItem(draftKey, JSON.stringify(userAnswers));
    }
    if ((test.type === 'listening' || test.type === 'reading') && testMode) {
         localStorage.setItem(`mode_${user.uid}_${test.id}`, testMode);
    }
  }, [writingEssay, userAnswers, test, user.uid, showResult, testMode]);

  const handleSelectAnswer = (questionId, option) => {
    if (showResult && !isReviewing) return;
    if (isReviewing) return; 
    setUserAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const toggleFlag = (questionId) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) newSet.delete(questionId);
      else newSet.add(questionId);
      return newSet;
    });
  };

  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.error(err));
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  const handleStartAudio = () => {
      if (audioRef.current) {
          audioRef.current.play().catch(e => console.log("Audio play error:", e));
      }
  };

  const handleSubmit = async () => {
    if (!window.confirm("Testni yakunlashga ishonchingiz komilmi?")) return;
    setSaving(true);

    let resultData = {
      userId: user.uid,
      userName: userData?.fullName || user.email,
      testId: test.id,
      testTitle: test.title,
      type: test.type,
      mode: testMode, 
      date: new Date().toISOString(),
      userAnswers: userAnswers 
    };

    try {
        let correctCount = 0;
        let totalQ = 0;
        test.questions.forEach(q => {
           if (q.items) { 
               q.items.forEach(item => {
                   totalQ++;
                   if (String(userAnswers[item.id] || "").trim().toLowerCase() === String(item.answer).trim().toLowerCase()) correctCount++;
               });
           } else { 
               totalQ++;
               if (String(userAnswers[q.id] || "").trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()) correctCount++;
           }
        });
        const band = calculateBandScore(correctCount, test.type);
        resultData.score = correctCount; 
        resultData.bandScore = band;     
        resultData.totalQuestions = totalQ;
        resultData.percentage = Math.round((correctCount / totalQ) * 100);
        resultData.status = "graded";
        
        // Practice modeda ketgan vaqtni saqlash (sekundda)
        if (testMode === 'practice') {
            resultData.timeSpent = timeLeft; 
        }

        setScore(correctCount);

      await addDoc(collection(db, "results"), resultData);
      localStorage.removeItem(`draft_${user.uid}_${test.id}`);
      localStorage.removeItem(`timer_${user.uid}_${test.id}`);
      localStorage.removeItem(`mode_${user.uid}_${test.id}`);
      setShowResult(true);
    } catch (error) { console.error(error); alert("Saqlashda xatolik."); } 
    finally { setSaving(false); }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    // Soat bo'lsa HH:MM:SS, bo'lmasa MM:SS
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-xl text-gray-500">Test yuklanmoqda...</div>;
  if (!test) return <div className="flex h-screen items-center justify-center font-bold text-red-500">Test topilmadi.</div>;

  const isListening = test?.type?.toLowerCase() === 'listening';
  
  const audioSource = 
      test.audio ||                       
      test.audio_url || 
      test.audioUrl ||                    
      test.file ||                        
      test.passages?.[0]?.audio;       

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans select-none">
      
      {/* HEADER */}
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-50 transition-all relative">
        <div className="flex items-center gap-4 flex-1">
          <div className="font-bold text-xl tracking-tight text-gray-900 cursor-default shrink-0">
             CLC <span className="text-gray-400 font-medium">Portal</span>
          </div>
          <div className="h-5 w-px bg-gray-300 hidden sm:block shrink-0"></div>
          <div className="hidden sm:block">
             <h1 className="text-sm font-medium text-gray-700 leading-tight line-clamp-2 max-w-[250px]">{test.title}</h1>
          </div>
        </div>
        
        {/* AUDIO PLAYER (Faqat Listening uchun) */}
        {isListening && !showModeSelection && !showResult && (
           <div className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md flex justify-center z-[100] ${testMode === 'exam' ? 'pointer-events-none select-none' : 'pointer-events-auto'}`}>
              {audioSource ? (
                  <audio 
                     ref={audioRef} 
                     controls 
                     controlsList="nodownload" 
                     src={audioSource} 
                     onTimeUpdate={(e) => setAudioTime(e.target.currentTime)}
                     onPause={(e) => { if(testMode === 'exam' && !e.target.ended) e.target.play() }}
                     className="h-10 w-full shadow-md rounded-full bg-gray-50 border border-gray-200 focus:outline-none block"
                  />
              ) : (
                  <div className="bg-red-50 text-red-600 px-4 py-1 rounded-full text-xs font-bold border border-red-200 shadow-sm animate-pulse">
                      ⚠️ Audio fayl topilmadi
                  </div>
              )}
           </div>
        )}

        <div className="flex items-center gap-6 justify-end flex-1 z-20">
            {testMode && !showResult && (
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border hidden md:inline-block ${testMode === 'exam' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{testMode}</span>
            )}
            <div className="hidden md:flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                <button onClick={() => setTextSize('text-small')} className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${textSize === 'text-small' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>A</button>
                <button onClick={() => setTextSize('text-medium')} className={`px-2 py-1 text-sm font-bold rounded-md transition-all ${textSize === 'text-medium' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>A</button>
                <button onClick={() => setTextSize('text-large')} className={`px-2 py-1 text-base font-bold rounded-md transition-all ${textSize === 'text-large' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>A</button>
            </div>
            
            {/* TIMER DISPLAY */}
            {!showResult && !showModeSelection && (
                <div className={`font-mono text-xl font-bold tabular-nums tracking-tight ${testMode === 'exam' && timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-gray-900'}`}>
                    {testMode === 'practice' ? '⏱️ ' : ''}{formatTime(timeLeft)}
                </div>
            )}

            {!showResult && !showModeSelection && (
                <button onClick={handleSubmit} disabled={saving} className="bg-gray-900 hover:bg-black text-white font-medium text-sm px-5 py-2 rounded-full shadow-sm transition-all transform active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap">
                    {saving ? "Saving..." : "Finish"}
                </button>
            )}
            {showResult && (
                <button onClick={() => navigate('/my-results')} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-full shadow-sm transition-all">Exit</button>
            )}
        </div>
      </header>

      {/* CONTENT AREA */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* 🔥 MODE SELECTION MODAL (O'ZGARTIRILDI: isListening olib tashlandi) */}
        {showModeSelection && (
             <div className="absolute inset-0 bg-white/90 z-[999] flex items-center justify-center backdrop-blur-md">
                 <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full text-center">
                     <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Test Mode</h2>
                     <p className="text-gray-500 mb-8 text-sm">Choose how you want to take this test</p>
                     <div className="grid grid-cols-2 gap-4">
                         
                         {/* EXAM MODE BUTTON */}
                         <button onClick={() => { setTestMode('exam'); setShowModeSelection(false); }} className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 p-6 rounded-xl group transition-all shadow-sm hover:shadow-md">
                             <div className="text-3xl mb-3">🎓</div>
                             <h3 className="font-bold text-gray-900 group-hover:text-red-600">Exam Mode</h3>
                             <p className="text-gray-400 text-xs mt-2">No pause. Real exam conditions.</p>
                         </button>

                         {/* PRACTICE MODE BUTTON */}
                         <button 
                            onClick={() => { 
                                setTestMode('practice'); 
                                setTimeLeft(0); // 🔥 Practice modeda vaqt 0 dan boshlanadi
                                setShowModeSelection(false); 
                            }} 
                            className="bg-white hover:bg-green-50 border border-gray-200 hover:border-green-200 p-6 rounded-xl group transition-all shadow-sm hover:shadow-md"
                         >
                             <div className="text-3xl mb-3">🎧</div>
                             <h3 className="font-bold text-gray-900 group-hover:text-green-600">Practice Mode</h3>
                             <p className="text-gray-400 text-xs mt-2">Pause allowed. Self-paced.</p>
                         </button>
                     </div>
                 </div>
             </div>
        )}
        
        {/* RESULT MODAL */}
        {showResult && !isReviewing && (
             <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center backdrop-blur-md animate-in fade-in">
                 <div className="bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full text-center">
                    <h3 className="font-bold text-3xl text-gray-900 mb-2">Test Completed 🎉</h3>
                    
                    {testMode === 'practice' && (
                        <p className="text-gray-500 mb-4">Time Spent: <span className="font-bold text-gray-800">{formatTime(timeLeft)}</span></p>
                    )}

                    {test.type !== 'speaking' && test.type !== 'writing' ? (
                        <div className="my-8">
                            <div className="text-7xl font-black text-gray-900 tracking-tighter mb-2">{score}</div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Correct Answers</p>
                            <div className="mt-8 p-4 bg-blue-50 rounded-2xl">
                                <p className="text-xs font-bold text-blue-500 uppercase mb-1">Your Band Score</p>
                                <p className="text-5xl font-bold text-blue-600">{calculateBandScore(score, test.type)}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 my-8">Your answer has been submitted for grading.</p>
                    )}
                    <div className="flex flex-col gap-3">
                        <button onClick={() => setIsReviewing(true)} className="bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-xl w-full transition shadow-lg shadow-gray-200">Review Mistakes</button>
                        <button onClick={() => navigate('/my-results')} className="text-gray-500 hover:text-gray-900 font-bold py-3 rounded-xl w-full transition">Exit</button>
                    </div>
                 </div>
             </div>
        )}

        {/* INTERFACE RENDERING */}
        {!showModeSelection && (
            test.type === 'reading' ? (
                <div className="w-full h-full">
                    <ReadingInterface testData={test} userAnswers={userAnswers} onAnswerChange={handleSelectAnswer} onFlag={toggleFlag} flaggedQuestions={flaggedQuestions} isReviewMode={isReviewing} textSize={textSize} />
                </div>
            ) : isListening ? (
                <div className="w-full h-full">
                    <ListeningInterface 
                        testData={test} 
                        userAnswers={userAnswers} 
                        onAnswerChange={handleSelectAnswer} 
                        onFlag={toggleFlag} 
                        flaggedQuestions={flaggedQuestions} 
                        isReviewMode={isReviewing} 
                        textSize={textSize}
                        testMode={testMode}
                        onToggleFullScreen={handleToggleFullScreen}
                        isFullScreen={isFullScreen}
                        audioCurrentTime={audioTime} 
                        onStartTest={handleStartAudio} 
                    />
                </div>
            ) : (
                <div className="p-10 text-center text-gray-400">Test turi aniqlanmadi</div>
            )
        )}
      </div>
    </div>
  );
}
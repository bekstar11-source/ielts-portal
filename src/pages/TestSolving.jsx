import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage } from "../firebase/firebase";
import { doc, getDoc, addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import ReadingInterface from "../components/ReadingInterface/ReadingInterface";
import ListeningInterface from "../components/ListeningInterface/ListeningInterface";
import WritingInterface from "../components/WritingInterface/WritingInterface";
import { callGradeWritingTest } from "../utils/firebaseFunctions";

// IELTS BAND CALCULATOR
const calculateBandScore = (score, type, totalQuestions = 40) => {
  const t = type?.toLowerCase();
  
  if (t === 'listening' || t === 'reading') {
    let finalScore = score;
    if (totalQuestions > 0 && totalQuestions < 35) {
        finalScore = Math.round((score / totalQuestions) * 40);
    }
    if (finalScore >= 39) return 9.0;
    if (finalScore >= 37) return 8.5;
    if (finalScore >= 35) return 8.0;
    if (finalScore >= 32) return 7.5;
    if (finalScore >= 30) return 7.0;
    if (finalScore >= 26) return 6.5;
    if (finalScore >= 23) return 6.0;
    if (finalScore >= 18) return 5.5;
    if (finalScore >= 16) return 5.0;
    if (finalScore >= 13) return 4.5;
    if (finalScore >= 10) return 4.0;
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
  const [textSize, setTextSize] = useState('text-base'); 
  const [isReviewing, setIsReviewing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Audio States & Refs
  const [activePart, setActivePart] = useState(0);
  const [audioTime, setAudioTime] = useState(0);
  const audioRef = useRef(null);

  // 1. TESTNI YUKLASH
  useEffect(() => {
    if (!id || !user) return;

    const fetchTest = async () => {
      try {
        // --- PERMISSION CHECK ---
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

        const docRef = doc(db, "tests", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setTest(data);
          
          const type = data.type ? data.type.toLowerCase() : '';

          // Timer logic
          const savedTime = localStorage.getItem(`timer_${user.uid}_${data.id}`);
          if (savedTime) {
              setTimeLeft(parseInt(savedTime));
          } else {
              if (type === 'listening') setTimeLeft(2400); 
              else if (type === 'writing') setTimeLeft(3600);
              else if (type === 'speaking') setTimeLeft(900); 
              else setTimeLeft(3600);
          }

          // Draft logic
          const draftKey = `draft_${user.uid}_${data.id}`;
          const savedDraft = localStorage.getItem(draftKey);
          if (type === 'writing' && savedDraft) {
              try { const parsed = JSON.parse(savedDraft); if (typeof parsed === 'object') setUserAnswers(parsed); else setWritingEssay(savedDraft); } catch { setWritingEssay(savedDraft); }
          } else if (savedDraft) { try { setUserAnswers(JSON.parse(savedDraft)); } catch (e) {} }

          // Mode Selection Logic
          if (type === 'reading' || type === 'listening') {
              setShowModeSelection(true);
          } else {
              setTestMode('exam');
              setShowModeSelection(false);
          }

        } else {
          alert("Test not found!");
          navigate("/dashboard");
        }
      } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
    };
    fetchTest();
  }, [id, navigate, user, userData?.role]); 

  // 2. TIMER
  useEffect(() => {
    if (showResult || loading || showModeSelection || !test) return;
    if (testMode === 'exam' && timeLeft <= 0) return;

    const timerId = setInterval(() => {
        setTimeLeft(prev => {
            let newVal;
            if (testMode === 'practice') newVal = prev + 1;
            else newVal = prev - 1;
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
  }, [writingEssay, userAnswers, test, user.uid, showResult]);

  const currentPassage = test?.passages?.[activePart];
  const audioSource = currentPassage?.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file || test?.passages?.[0]?.audio;

  useEffect(() => {
      if (audioRef.current && audioSource && activePart >= 0 && !showModeSelection && !showResult) {
          audioRef.current.load();
          if (activePart > 0 || testMode === 'exam') {
              const playPromise = audioRef.current.play();
              if (playPromise !== undefined) playPromise.catch(console.log);
          }
      }
  }, [audioSource, activePart, showModeSelection, showResult, testMode]);

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
      if (audioRef.current) audioRef.current.play().catch(console.log);
  };

  const handleSubmit = async () => {
    if (!window.confirm("Are you sure you want to finish the test?")) return;
    await new Promise(resolve => setTimeout(resolve, 100));
    setSaving(true);

    try {
        // 🔥 WRITING SUBMISSION (Via Cloud Function)
        if (test.type === 'writing') {
             // 1. Prepare Data
             const payload = {
                testId: test.id,
                task1Response: userAnswers.task1 || writingEssay || "",
                task1Prompt: test.writingTasks?.find(t=>t.id===1)?.prompt || test.passage || "",
                task2Response: userAnswers.task2 || "",
                task2Prompt: test.writingTasks?.find(t=>t.id===2)?.prompt || "",
             };

             // 2. Call Cloud Function
             await callGradeWritingTest(payload);

             // 3. Cleanup & Redirect
             localStorage.removeItem(`draft_${user.uid}_${test.id}`);
             localStorage.removeItem(`timer_${user.uid}_${test.id}`);
             alert("Test submitted successfully! Our AI is grading your essay. You will be notified once the review is complete.");
             navigate('/my-results');
             return; // Stop execution here
        }

        // --- READING / LISTENING GRADING ---
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

        let correctCount = 0;
        let totalQ = 0;
        const checkAnswer = (correct, user) => {
            if (correct === undefined || correct === null) return false;
            let cleanCorrect = String(correct).trim().toLowerCase();
            let cleanUser = String(user || "").trim().toLowerCase();
            if (/^[ivx]+\./.test(cleanUser)) cleanUser = cleanUser.split('.')[0].trim();
            if (cleanCorrect.includes('/')) return cleanCorrect.split('/').map(s => s.trim()).includes(cleanUser);
            if (cleanCorrect.includes('|')) return cleanCorrect.split('|').map(s => s.trim()).includes(cleanUser);
            return cleanCorrect === cleanUser;
        };

        test.questions.forEach(q => {
           if (q.items && Array.isArray(q.items)) { 
               q.items.forEach(item => {
                   totalQ++;
                   const correctAnswer = item.answer || item.correct_answer;
                   const userAnswer = userAnswers[String(item.id)] || userAnswers[item.id];
                   if (checkAnswer(correctAnswer, userAnswer)) correctCount++;
               });
           } else {
               totalQ++;
               const correctAnswer = q.answer || q.correct_answer;
               const userAnswer = userAnswers[String(q.id)] || userAnswers[q.id];
               if (checkAnswer(correctAnswer, userAnswer)) correctCount++;
           }
        });

        const band = calculateBandScore(correctCount, test.type, totalQ);
        resultData.score = correctCount; 
        resultData.bandScore = band;     
        resultData.totalQuestions = totalQ;
        resultData.percentage = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
        resultData.status = "graded";
        if (testMode === 'practice') resultData.timeSpent = timeLeft;

        setScore(correctCount);
        await addDoc(collection(db, "results"), resultData);

        localStorage.removeItem(`draft_${user.uid}_${test.id}`);
        localStorage.removeItem(`timer_${user.uid}_${test.id}`);
        localStorage.removeItem(`mode_${user.uid}_${test.id}`);
        setShowResult(true);

    } catch (error) {
        console.error(error);
        alert("Submission failed. Please try again.");
    } finally {
        setSaving(false);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-xl text-gray-500">Loading Test...</div>;
  if (!test) return <div className="flex h-screen items-center justify-center font-bold text-red-500">Test not found.</div>;

  const isListening = test?.type?.toLowerCase() === 'listening';
  
  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans select-none">
      
      {/* HEADER */}
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-50 relative">
        <div className="flex items-center gap-4 flex-1">
          <div className="font-bold text-xl tracking-tight text-gray-900 cursor-default shrink-0">
             CLC <span className="text-gray-400 font-medium">Portal</span>
          </div>
          <div className="hidden sm:block">
             <h1 className="text-sm font-medium text-gray-700 leading-tight line-clamp-2 max-w-[250px]">{test.title}</h1>
          </div>
        </div>
        
        {/* AUDIO PLAYER */}
        {isListening && !showModeSelection && !showResult && (
           <div className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md flex justify-center z-[100] ${testMode === 'exam' ? 'pointer-events-none select-none' : 'pointer-events-auto'}`}>
              {audioSource && (
                  <audio 
                     ref={audioRef} 
                     controls 
                     controlsList="nodownload" 
                     src={audioSource} 
                     onTimeUpdate={(e) => setAudioTime(e.target.currentTime)}
                     onPause={(e) => { if(testMode === 'exam' && !e.target.ended) e.target.play() }}
                     className="h-10 w-full shadow-md rounded-full bg-gray-50 border border-gray-200 block"
                  />
              )}
           </div>
        )}

        <div className="flex items-center gap-6 justify-end flex-1 z-20">
            {testMode && !showResult && (
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border hidden md:inline-block ${testMode === 'exam' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{testMode}</span>
            )}
            <div className="hidden md:flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                <button onClick={() => setTextSize('text-sm')} className="px-2 py-1 text-xs font-bold rounded-md text-gray-400 hover:text-black">A</button>
                <button onClick={() => setTextSize('text-base')} className="px-2 py-1 text-sm font-bold rounded-md bg-white text-black shadow-sm">A</button>
                <button onClick={() => setTextSize('text-xl')} className="px-2 py-1 text-base font-bold rounded-md text-gray-400 hover:text-black">A</button>
            </div>
            
            {!showResult && !showModeSelection && (
                <div className={`font-mono text-xl font-bold tabular-nums tracking-tight ${testMode === 'exam' && timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-gray-900'}`}>
                    {testMode === 'practice' ? '⏱️ ' : ''}{formatTime(timeLeft)}
                </div>
            )}

            {!showResult && !showModeSelection && (
                <button onClick={handleSubmit} disabled={saving} className="bg-gray-900 hover:bg-black text-white font-medium text-sm px-5 py-2 rounded-full shadow-sm transition-all transform active:scale-95 disabled:bg-gray-400 whitespace-nowrap">
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
        
        {showModeSelection && (
             <div className="absolute inset-0 bg-white/90 z-[999] flex items-center justify-center backdrop-blur-md">
                 <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full text-center">
                     <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Test Mode</h2>
                     <div className="grid grid-cols-2 gap-4 mt-8">
                         <button onClick={() => { setTestMode('exam'); setShowModeSelection(false); }} className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 p-6 rounded-xl group transition-all shadow-sm">
                             <div className="text-3xl mb-3">🎓</div>
                             <h3 className="font-bold text-gray-900 group-hover:text-red-600">Exam Mode</h3>
                         </button>
                         <button onClick={() => { setTestMode('practice'); setTimeLeft(0); setShowModeSelection(false); }} className="bg-white hover:bg-green-50 border border-gray-200 hover:border-green-200 p-6 rounded-xl group transition-all shadow-sm">
                             <div className="text-3xl mb-3">🎧</div>
                             <h3 className="font-bold text-gray-900 group-hover:text-green-600">Practice Mode</h3>
                         </button>
                     </div>
                 </div>
             </div>
        )}
        
        {showResult && !isReviewing && (
             <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center backdrop-blur-md animate-in fade-in">
                 <div className="bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full text-center">
                    <h3 className="font-bold text-3xl text-gray-900 mb-2">Test Completed 🎉</h3>
                    <div className="flex flex-col gap-3 mt-8">
                        <button onClick={() => setIsReviewing(true)} className="bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-xl w-full transition">Review Mistakes</button>
                        <button onClick={() => navigate('/my-results')} className="text-gray-500 hover:text-gray-900 font-bold py-3 rounded-xl w-full transition">Exit</button>
                    </div>
                 </div>
             </div>
        )}

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
                        activePart={activePart}
                        setActivePart={setActivePart}
                    />
                </div>
            ) : test.type === 'writing' ? (
                <div className="w-full h-full">
                    <WritingInterface
                        testData={test}
                        userAnswers={userAnswers}
                        onAnswerChange={handleSelectAnswer}
                        textSize={textSize}
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

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function MockExam() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData } = useAuth();

  // Dashboarddan kelgan ma'lumot (ID lar)
  const mockData = location.state?.mockData;

  const [stage, setStage] = useState('loading'); // loading, intro, listening, reading, writing, result
  const [tests, setTests] = useState({ listening: null, reading: null, writing: null });
  const [answers, setAnswers] = useState({ listening: {}, reading: {}, writing: "" });
  const [timeLeft, setTimeLeft] = useState(0);

  // 1. TESTLARNI YUKLASH
  useEffect(() => {
    if (!mockData) {
        alert("Xatolik! Mock ma'lumotlari topilmadi.");
        navigate('/');
        return;
    }

    const fetchTests = async () => {
        try {
            // Parallel yuklash
            const [lSnap, rSnap, wSnap] = await Promise.all([
                getDoc(doc(db, "tests", mockData.subTests.listening)),
                getDoc(doc(db, "tests", mockData.subTests.reading)),
                getDoc(doc(db, "tests", mockData.subTests.writing))
            ]);

            if (!lSnap.exists() || !rSnap.exists() || !wSnap.exists()) {
                throw new Error("Ba'zi testlar bazadan o'chirilgan.");
            }

            setTests({
                listening: { id: lSnap.id, ...lSnap.data() },
                reading: { id: rSnap.id, ...rSnap.data() },
                writing: { id: wSnap.id, ...wSnap.data() }
            });
            setStage('intro');

        } catch (err) {
            console.error(err);
            alert("Testlarni yuklashda xatolik: " + err.message);
            navigate('/');
        }
    };
    fetchTests();
  }, [mockData, navigate]);

  // 2. TIMER LOGIC
  useEffect(() => {
      if (timeLeft <= 0) return;
      const timer = setInterval(() => {
          setTimeLeft(prev => {
              if (prev <= 1) {
                  clearInterval(timer);
                  handleNextStage(); // Vaqt tugasa avtomatik o'tkazish
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
      return () => clearInterval(timer);
  }, [timeLeft]);

  // 3. ACTIONS
  const startExam = () => {
      setStage('listening');
      setTimeLeft(30 * 60); // 30 min (Listening)
  };

  const handleNextStage = () => {
      if (stage === 'listening') {
          setStage('reading');
          setTimeLeft(60 * 60); // 60 min
      } else if (stage === 'reading') {
          setStage('writing');
          setTimeLeft(60 * 60); // 60 min (Writing)
      } else if (stage === 'writing') {
          finishExam();
      }
  };

  const handleAnswer = (qId, val) => {
      const type = stage; // 'listening' or 'reading'
      setAnswers(prev => ({
          ...prev,
          [type]: { ...prev[type], [qId]: val }
      }));
  };

  const finishExam = async () => {
      setStage('saving');
      
      // Baholash (Listening & Reading)
      let lScore = 0, rScore = 0;
      
      tests.listening.questions.forEach(q => {
          if (String(answers.listening[q.id] || "").trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()) lScore++;
      });
      
      tests.reading.questions.forEach(q => {
          if (String(answers.reading[q.id] || "").trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()) rScore++;
      });

      // Saqlash
      await addDoc(collection(db, "results"), {
          userId: user.uid,
          userName: userData?.fullName || "User",
          testTitle: "FULL MOCK EXAM",
          type: "mock_full",
          mockKey: mockData.mockKey,
          date: new Date().toISOString(),
          scores: {
              listening: lScore,
              reading: rScore,
              writing: null // Admin tekshiradi
          },
          details: {
              listeningAnswers: answers.listening,
              readingAnswers: answers.reading,
              writingEssay: answers.writing
          },
          status: 'pending_review' // Writing tekshirilmagan
      });

      setStage('result');
  };

  // --- RENDER ---
  if (stage === 'loading' || stage === 'saving') return <div className="h-screen flex items-center justify-center text-xl font-bold">Yuklanmoqda...</div>;

  if (stage === 'intro') {
      return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
              <div className="bg-white max-w-lg w-full p-8 rounded-2xl text-center">
                  <h1 className="text-3xl font-bold mb-4">🎓 IELTS Mock Exam</h1>
                  <div className="text-left bg-slate-100 p-4 rounded-lg mb-6 space-y-2 text-sm">
                      <p><b>1. Listening:</b> 30 daqiqa (4 qism)</p>
                      <p><b>2. Reading:</b> 60 daqiqa (3 ta matn)</p>
                      <p><b>3. Writing:</b> 60 daqiqa (Task 1 & 2)</p>
                  </div>
                  <button onClick={startExam} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">BOSHLASH</button>
              </div>
          </div>
      );
  }

  if (stage === 'result') {
      return (
          <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold text-green-700 mb-2">Imtihon Yakunlandi!</h2>
                  <p className="text-gray-600 mb-6">Natijalaringiz saqlandi. Writing qismi tekshirilgandan so'ng umumiy ball chiqadi.</p>
                  <button onClick={() => navigate('/')} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold">Bosh sahifa</button>
              </div>
          </div>
      );
  }

  const currentTest = tests[stage];
  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  return (
      <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
          {/* HEADER */}
          <header className="bg-slate-800 text-white p-4 flex justify-between items-center z-10 shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                  <span className="bg-white/20 px-3 py-1 rounded text-sm font-bold uppercase">{stage}</span>
                  <span className="text-slate-300 text-sm hidden sm:inline">{currentTest.title}</span>
              </div>
              <div className={`font-mono text-xl font-bold px-4 py-1 rounded ${timeLeft < 300 ? 'bg-red-600 animate-pulse' : 'bg-slate-700'}`}>
                  ⏱ {formatTime(timeLeft)}
              </div>
              <button onClick={handleNextStage} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-bold transition">
                  {stage === 'writing' ? "Yakunlash ✅" : "Keyingi qism ➡️"}
              </button>
          </header>

          <div className="flex flex-1 overflow-hidden">
              
              {/* CHAP: MATERIAL (Matn / Audio / Prompt) */}
              <div className="w-1/2 bg-white border-r border-gray-200 overflow-y-auto p-8 shadow-inner">
                  {stage === 'listening' ? (
                      <div className="mt-10 text-center">
                          <div className="text-6xl mb-4">🎧</div>
                          <h2 className="text-2xl font-bold mb-4">Listening Test</h2>
                          {/* Audio Player (Agar bo'laklangan bo'lsa, ularni ketma-ket qo'yish kerak) */}
                          <div className="space-y-4">
                              {currentTest.passages?.map((p, i) => (
                                  <div key={i} className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                      <h4 className="font-bold text-purple-800 mb-2">Part {i+1}</h4>
                                      {p.audio ? <audio controls src={p.audio} className="w-full"/> : <p className="text-red-500">Audio yo'q</p>}
                                  </div>
                              ))}
                          </div>
                      </div>
                  ) : stage === 'writing' ? (
                      <div className="space-y-8">
                          {currentTest.writingTasks?.map((task, i) => (
                              <div key={i} className="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
                                  <h3 className="font-bold text-yellow-800 mb-3 uppercase tracking-wide">Writing Task {i+1}</h3>
                                  {task.image && <img src={task.image} className="w-full mb-4 rounded border bg-white" alt="Task"/>}
                                  <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-gray-800">{task.prompt}</p>
                              </div>
                          ))}
                      </div>
                  ) : (
                      // READING
                      <div className="space-y-8">
                          {currentTest.passages?.map((p, i) => (
                              <div key={i} className="prose max-w-none">
                                  <h3 className="text-xl font-bold text-blue-800 border-b pb-2 mb-4">{p.title}</h3>
                                  <div dangerouslySetInnerHTML={{__html: p.content}} className="text-lg leading-loose font-serif text-justify text-gray-800"/>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {/* O'NG: SAVOLLAR / JAVOB VARAQASI */}
              <div className="w-1/2 bg-gray-50 overflow-y-auto p-8 pb-20">
                  {stage === 'writing' ? (
                      <div className="h-full flex flex-col">
                          <label className="font-bold text-gray-700 mb-2">Javobingizni shu yerga yozing (Task 1 & 2):</label>
                          <textarea 
                              className="flex-1 w-full p-5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-lg font-serif resize-none shadow-sm"
                              placeholder="Task 1: ... &#10;&#10;Task 2: ..."
                              value={answers.writing}
                              onChange={(e) => setAnswers({...answers, writing: e.target.value})}
                          />
                          <p className="text-right text-sm text-gray-500 mt-2">So'zlar soni: {answers.writing.trim().split(/\s+/).length}</p>
                      </div>
                  ) : (
                      // LISTENING / READING SAVOLLARI
                      <div className="space-y-6">
                          {currentTest.questions?.map((group, gIdx) => (
                              <div key={gIdx} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                                  {/* Savol turi va yo'riqnomasi */}
                                  <div className="mb-4 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500 text-sm font-medium text-blue-900" dangerouslySetInnerHTML={{__html: group.instruction}} />
                                  
                                  {/* Rasm (Agar bo'lsa, masalan Map) */}
                                  {group.image && <img src={group.image} className="mb-4 max-w-full rounded border" alt="Question Resource"/>}

                                  {/* Savollar */}
                                  <div className="space-y-3">
                                      {group.items?.map((q) => (
                                          <div key={q.id} className="flex gap-3 items-start">
                                              <span className="font-bold text-gray-500 mt-2 w-6 text-right">{q.id}.</span>
                                              
                                              {/* Input turi */}
                                              {group.type === 'multiple_choice' ? (
                                                  <div className="flex-1 space-y-1">
                                                      <p className="font-medium text-gray-800 mb-2">{q.text}</p>
                                                      {q.options?.map(opt => (
                                                          <label key={opt} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                              <input 
                                                                  type="radio" 
                                                                  name={`q-${stage}-${q.id}`} 
                                                                  checked={answers[stage][q.id] === opt} 
                                                                  onChange={() => handleAnswer(q.id, opt)}
                                                                  className="w-4 h-4 text-blue-600"
                                                              />
                                                              <span className="text-gray-700">{opt}</span>
                                                          </label>
                                                      ))}
                                                  </div>
                                              ) : (
                                                  <div className="flex-1">
                                                      <p className="font-medium text-gray-800 mb-1">{q.text}</p>
                                                      <input 
                                                          type="text" 
                                                          className="w-full border p-2 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                          placeholder="Javob..."
                                                          value={answers[stage][q.id] || ""}
                                                          onChange={(e) => handleAnswer(q.id, e.target.value)}
                                                      />
                                                  </div>
                                              )}
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

          </div>
      </div>
  );
}
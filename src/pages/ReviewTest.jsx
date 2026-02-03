import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import ReadingInterface from "../components/ReadingInterface";
import ListeningInterface from "./components/listening/ListeningInterface";

export default function ReviewTest() {
  const { id } = useParams(); // Result ID
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null); // Asl test savollari
  const [resultData, setResultData] = useState(null); // Foydalanuvchi javoblari
  const [textSize, setTextSize] = useState('text-medium');
  
  // Writing Review uchun Tab state
  const [activeWritingTab, setActiveWritingTab] = useState(1);

  // Dummy states for interface props
  const [flaggedQuestions] = useState(new Set());
  const handleNoOp = () => {}; 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resultRef = doc(db, "results", id);
        const resultSnap = await getDoc(resultRef);

        if (!resultSnap.exists()) {
          alert("Natija topilmadi!");
          return navigate("/my-results");
        }
        
        const rData = resultSnap.data();
        setResultData(rData);

        const testRef = doc(db, "tests", rData.testId);
        const testSnap = await getDoc(testRef);

        if (!testSnap.exists()) {
          alert("Test bazadan o'chirilgan bo'lishi mumkin.");
          return;
        }

        setTestData({ id: testSnap.id, ...testSnap.data() });

      } catch (error) {
        console.error("Xatolik:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-xl text-gray-500">Yuklanmoqda...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="bg-[#1a1a1a] text-white p-3 flex justify-between items-center z-10 shrink-0 shadow-md h-16">
        <div className="flex items-center gap-4 pl-4">
          <button 
            onClick={() => navigate(-1)} 
            className="text-gray-400 hover:text-white font-bold text-sm border border-gray-600 px-3 py-1 rounded transition"
          >
            &larr; Orqaga
          </button>
          <div>
             <h1 className="font-bold text-xs text-gray-400 uppercase tracking-widest">Test Review</h1>
             <p className="font-bold text-white text-sm truncate max-w-xs">{testData?.title}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6 pr-4">
            <div className="bg-gray-800 px-4 py-1 rounded border border-gray-600 text-center">
                <span className="text-[10px] text-gray-400 block uppercase">Sizning Natijangiz</span>
                <span className={`font-bold text-lg ${resultData.status === 'graded' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {resultData.bandScore ? `Band ${resultData.bandScore}` : 
                     resultData.score !== null ? `${resultData.score} / ${resultData.totalQuestions}` : "Pending"}
                </span>
            </div>

            <div className="hidden md:flex items-center bg-gray-700 rounded-md p-1 gap-1 border border-gray-600">
                <button onClick={() => setTextSize('text-small')} className={`px-2 py-0.5 text-xs font-bold rounded ${textSize === 'text-small' ? 'bg-white text-black' : 'text-gray-300 hover:bg-gray-600'}`}>A-</button>
                <button onClick={() => setTextSize('text-medium')} className={`px-2 py-0.5 text-xs font-bold rounded ${textSize === 'text-medium' ? 'bg-white text-black' : 'text-gray-300 hover:bg-gray-600'}`}>A</button>
                <button onClick={() => setTextSize('text-large')} className={`px-2 py-0.5 text-xs font-bold rounded ${textSize === 'text-large' ? 'bg-white text-black' : 'text-gray-300 hover:bg-gray-600'}`}>A+</button>
            </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {testData?.type === 'reading' ? (
             <ReadingInterface 
                testData={testData} 
                userAnswers={resultData.userAnswers}
                onAnswerChange={handleNoOp} 
                onFlag={handleNoOp}
                flaggedQuestions={flaggedQuestions}
                isReviewMode={true} 
                textSize={textSize} 
             />
        ) : testData?.type === 'listening' ? (
             <ListeningInterface 
                testData={testData}
                userAnswers={resultData.userAnswers}
                onAnswerChange={handleNoOp} 
                onFlag={handleNoOp}
                flaggedQuestions={flaggedQuestions}
                isReviewMode={true} 
                textSize={textSize}
             />
        ) : testData?.type === 'writing' ? (
             // --- WRITING REVIEW ---
             <div className="w-full h-full flex flex-col bg-gray-50 overflow-hidden">
                 
                 {/* 🔥 YANGI: FEEDBACK QISMI (Agar o'qituvchi yozgan bo'lsa) */}
                 {resultData.feedback && (
                     <div className="bg-blue-50 border-b border-blue-200 p-4 shadow-sm animate-in slide-in-from-top-5">
                         <div className="max-w-4xl mx-auto flex gap-4 items-start">
                             <div className="bg-blue-100 p-2 rounded-full text-2xl">👨‍🏫</div>
                             <div className="flex-1">
                                 <h3 className="font-bold text-blue-800 text-sm uppercase mb-1">O'qituvchi Izohi:</h3>
                                 <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed font-medium">
                                     {resultData.feedback}
                                 </p>
                             </div>
                             <div className="bg-white px-4 py-2 rounded border border-blue-200 text-center shadow-sm">
                                 <span className="block text-[10px] text-gray-500 uppercase font-bold">Band Score</span>
                                 <span className="text-2xl font-black text-blue-600">{resultData.score || resultData.bandScore || "-"}</span>
                             </div>
                         </div>
                     </div>
                 )}

                 {/* Writing Content */}
                 <div className="flex-1 overflow-y-auto">
                     {testData.writingTasks ? (
                         <>
                             {/* Tabs */}
                             <div className="bg-white border-b px-6 py-2 flex gap-4 shadow-sm sticky top-0 z-10">
                                 {testData.writingTasks.map(task => (
                                     <button
                                         key={task.id}
                                         onClick={() => setActiveWritingTab(task.id)}
                                         className={`px-4 py-2 text-sm font-bold rounded-lg transition ${activeWritingTab === task.id ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                                     >
                                         {task.title} Review
                                     </button>
                                 ))}
                             </div>

                             {/* Content */}
                             <div className="p-6">
                                 {testData.writingTasks.map(task => {
                                     if(task.id !== activeWritingTab) return null;
                                     const answer = resultData.writingAnswers ? resultData.writingAnswers[`task${task.id}`] : "";
                                     
                                     return (
                                         <div key={task.id} className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                                             <div className="bg-white p-6 rounded-xl border shadow-sm h-fit">
                                                 <h3 className="font-bold text-gray-800 text-lg mb-4 border-b pb-2">Savol ({task.title})</h3>
                                                 {task.image && <img src={task.image} className="w-full mb-4 rounded border" alt="Task" />}
                                                 <p className="whitespace-pre-wrap text-gray-700 text-sm font-medium">{task.prompt}</p>
                                             </div>

                                             <div className="bg-white p-6 rounded-xl border shadow-sm h-fit border-green-200">
                                                 <h3 className="font-bold text-green-700 text-lg mb-4 border-b pb-2">Sizning Javobingiz</h3>
                                                 <div className="whitespace-pre-wrap font-serif text-gray-800 leading-relaxed text-sm bg-gray-50 p-4 rounded border border-gray-200 min-h-[300px]">
                                                     {answer || <span className="text-gray-400 italic">Javob yozilmagan...</span>}
                                                 </div>
                                                 <div className="mt-4 text-right text-xs text-gray-500 font-bold">
                                                     Word Count: {(answer || "").trim().split(/\s+/).filter(Boolean).length}
                                                 </div>
                                             </div>
                                         </div>
                                     )
                                 })}
                             </div>
                         </>
                     ) : (
                         // Legacy Format
                         <div className="w-full h-full flex flex-col items-center p-10">
                             <div className="w-full max-w-4xl border p-8 rounded-xl bg-white shadow-sm">
                                 <h3 className="font-bold text-gray-800 text-xl mb-4 border-b pb-2">Writing Task Review</h3>
                                 {testData.image_url && <img src={testData.image_url} alt="Task" className="w-full mb-6 rounded border" />}
                                 <p className="mb-6 font-bold text-gray-700 bg-gray-50 p-3 rounded border">{testData.passage}</p>

                                 <h4 className="font-bold text-green-700 mb-2">Sizning Javobingiz:</h4>
                                 <p className="whitespace-pre-wrap font-serif text-gray-800 leading-relaxed p-4 bg-gray-50 border rounded min-h-[200px]">
                                     {resultData.essay || "Javob topilmadi"}
                                 </p>
                             </div>
                         </div>
                     )}
                 </div>
             </div>
        ) : (
             // --- SPEAKING REVIEW ---
             <div className="w-full h-full flex flex-col items-center bg-white overflow-y-auto">
                 
                 {/* 🔥 YANGI: FEEDBACK QISMI (Speaking uchun ham) */}
                 {resultData.feedback && (
                     <div className="w-full bg-blue-50 border-b border-blue-200 p-6 mb-6">
                         <div className="max-w-3xl mx-auto flex gap-4 items-start">
                             <div className="text-3xl">👨‍🏫</div>
                             <div className="flex-1">
                                 <h3 className="font-bold text-blue-800 uppercase text-sm mb-2">O'qituvchi Izohi:</h3>
                                 <p className="text-gray-800 font-medium whitespace-pre-wrap">{resultData.feedback}</p>
                             </div>
                             <div className="text-center bg-white px-4 py-2 rounded border border-blue-200">
                                 <span className="block text-[10px] uppercase font-bold text-gray-500">Score</span>
                                 <span className="text-3xl font-black text-blue-600">{resultData.score}</span>
                             </div>
                         </div>
                     </div>
                 )}

                 <h2 className="text-2xl font-bold mb-4 text-gray-800 mt-6">Speaking Review</h2>
                 
                 <div className="w-full max-w-md border p-6 rounded-xl bg-gray-50 shadow-sm text-center mb-8">
                     <h3 className="font-bold mb-4 text-gray-600">Sizning Audio Javobingiz</h3>
                     {resultData.audioAnswer ? (
                         <audio controls src={resultData.audioAnswer} className="w-full" />
                     ) : (
                         <p className="text-red-500">Audio yozilmagan yoki topilmadi.</p>
                     )}
                 </div>
                 
                 <div className="w-full max-w-2xl text-center px-6 pb-10">
                     <h4 className="font-bold text-gray-700 mb-2">Task Description:</h4>
                     <p className="text-gray-600 bg-gray-100 p-4 rounded border text-left whitespace-pre-wrap">{testData.passage || testData.script}</p>
                 </div>
             </div>
        )}
      </div>
    </div>
  );
}
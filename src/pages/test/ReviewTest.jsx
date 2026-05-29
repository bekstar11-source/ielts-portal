import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import ReadingInterface from "../../components/ReadingInterface";
import ListeningInterface from "./components/listening/ListeningInterface";
import { useAuth } from "../../context/AuthContext";

export default function ReviewTest() {
  const { id } = useParams(); // Result ID
  const navigate = useNavigate();
  const { userData } = useAuth();
  
  const isPremium = userData?.isPremium || 
                    userData?.isPro || 
                    ['premium', 'pro', 'standard'].includes(userData?.accountType) || 
                    ['admin', 'teacher'].includes(userData?.role);
  
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
                <span className={`font-bold text-lg ${(resultData.status === 'graded' || resultData.writingBand) ? 'text-green-400' : 'text-yellow-400'}`}>
                    {resultData.bandScore ? `Band ${resultData.bandScore}` : 
                     resultData.writingBand ? `Band ${resultData.writingBand}` :
                     resultData.score !== null && resultData.score !== undefined ? `${resultData.score} / ${resultData.totalQuestions}` : "Pending"}
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
                isPremium={isPremium}
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
                isPremium={isPremium}
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
                 {testData.writingTasks ? (
                     <>
                         {/* Content - VERTICAL SCROLL APPLE STYLE */}
                         <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 bg-[#F5F5F7]">
                             <div className="max-w-[800px] mx-auto flex flex-col gap-16 pb-20">
                                 {testData.writingTasks.map(task => {
                                     const answer = resultData.writingAnswers ? resultData.writingAnswers[`task${task.id}`] : "";
                                     
                                     return (
                                         <div key={task.id} className="flex flex-col gap-8 animate-fadeIn">
                                             
                                             {/* TASK HEADER */}
                                             <div className="flex flex-col items-center text-center space-y-2 mb-2">
                                                 <span className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">IELTS Writing</span>
                                                 <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{task.title}</h2>
                                                 <div className="w-12 h-1 bg-blue-500 rounded-full mt-4 opacity-20 hidden"></div>
                                             </div>

                                             {/* PROMPT CARD */}
                                             <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col gap-6 relative overflow-hidden group">
                                                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-100 to-gray-200"></div>
                                                 <div className="flex justify-between items-center">
                                                     <h3 className="font-semibold text-gray-800 text-[13px] uppercase tracking-widest text-[#1d1d1f]">Question</h3>
                                                     {task.minWords && <span className="text-[11px] font-medium text-gray-500 bg-[#F5F5F7] px-3 py-1 rounded-full uppercase tracking-wider">Min {task.minWords} words</span>}
                                                 </div>
                                                 
                                                 {task.image && (
                                                     <div className="w-full bg-[#fbfbfd] rounded-2xl p-4 flex justify-center border border-gray-100">
                                                         <img src={task.image} className="max-w-full max-h-[300px] object-contain mix-blend-multiply" alt="Task" />
                                                     </div>
                                                 )}
                                                 
                                                 <div className="whitespace-pre-wrap text-[#1d1d1f] text-[15px] leading-relaxed font-medium">
                                                     {task.prompt}
                                                 </div>
                                             </div>

                                             {/* STUDENT ANSWER CARD */}
                                             <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col gap-6 relative overflow-hidden">
                                                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-80"></div>
                                                 <div className="flex justify-between items-center">
                                                     <h3 className="font-semibold text-gray-800 text-[13px] uppercase tracking-widest text-[#1d1d1f] flex items-center gap-2">
                                                         Student Answer
                                                     </h3>
                                                     <div className="text-[11px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                                                         {(answer || "").trim().split(/\s+/).filter(Boolean).length} WORDS
                                                     </div>
                                                 </div>
                                                 
                                                 <div className="whitespace-pre-wrap font-serif text-[#1d1d1f] text-[16px] leading-[1.8] min-h-[150px]">
                                                     {answer || <span className="text-gray-400 italic">Javob yozilmagan...</span>}
                                                 </div>
                                             </div>

                                             {/* XATOLAR BO'LIMI - APPLE DIZAYN (COMPACT) */}
                                             {resultData.aiReview && resultData.aiReview[`task${task.id}`] && (
                                                 <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col gap-6 relative overflow-hidden">
                                                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-rose-400 opacity-80"></div>
                                                     <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                                                         <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                                                             <span className="text-orange-500 text-sm">✨</span>
                                                         </div>
                                                         <h3 className="font-semibold text-[#1d1d1f] text-sm uppercase tracking-widest">AI Evaluation</h3>
                                                     </div>

                                                     {resultData.aiReview[`task${task.id}`].criteria && (
                                                         <div className="overflow-hidden rounded-2xl border border-gray-100">
                                                             <table className="w-full text-left text-sm">
                                                                 <thead className="bg-[#FBFBFD] text-gray-500 border-b border-gray-100">
                                                                     <tr>
                                                                         <th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider w-1/4">Criterion</th>
                                                                         <th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider w-20">Band</th>
                                                                         <th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider">Feedback</th>
                                                                     </tr>
                                                                 </thead>
                                                                 <tbody className="divide-y divide-gray-100">
                                                                     <tr className="hover:bg-[#FBFBFD] transition-colors">
                                                                         <td className="px-6 py-4 font-medium text-[#1d1d1f]">Task Achievement</td>
                                                                         <td className="px-6 py-4 font-bold text-gray-900">{resultData.aiReview[`task${task.id}`].criteria.taskAchievement?.band || '-'}</td>
                                                                         <td className="px-6 py-4 text-[#1d1d1f] leading-relaxed opacity-80">{resultData.aiReview[`task${task.id}`].criteria.taskAchievement?.feedback || '-'}</td>
                                                                     </tr>
                                                                     <tr className="hover:bg-[#FBFBFD] transition-colors">
                                                                         <td className="px-6 py-4 font-medium text-[#1d1d1f]">Coherence & Cohesion</td>
                                                                         <td className="px-6 py-4 font-bold text-gray-900">{resultData.aiReview[`task${task.id}`].criteria.coherence?.band || '-'}</td>
                                                                         <td className="px-6 py-4 text-[#1d1d1f] leading-relaxed opacity-80">{resultData.aiReview[`task${task.id}`].criteria.coherence?.feedback || '-'}</td>
                                                                     </tr>
                                                                     <tr className="hover:bg-[#FBFBFD] transition-colors">
                                                                         <td className="px-6 py-4 font-medium text-[#1d1d1f]">Lexical Resource</td>
                                                                         <td className="px-6 py-4 font-bold text-gray-900">{resultData.aiReview[`task${task.id}`].criteria.lexical?.band || '-'}</td>
                                                                         <td className="px-6 py-4 text-[#1d1d1f] leading-relaxed opacity-80">{resultData.aiReview[`task${task.id}`].criteria.lexical?.feedback || '-'}</td>
                                                                     </tr>
                                                                     <tr className="hover:bg-[#FBFBFD] transition-colors">
                                                                         <td className="px-6 py-4 font-medium text-[#1d1d1f]">Grammar Range</td>
                                                                         <td className="px-6 py-4 font-bold text-gray-900">{resultData.aiReview[`task${task.id}`].criteria.grammar?.band || '-'}</td>
                                                                         <td className="px-6 py-4 text-[#1d1d1f] leading-relaxed opacity-80">{resultData.aiReview[`task${task.id}`].criteria.grammar?.feedback || '-'}</td>
                                                                     </tr>
                                                                     <tr className="bg-[#f5f5f7]">
                                                                         <td className="px-6 py-5 font-bold text-[#1d1d1f]">OVERALL</td>
                                                                         <td className="px-6 py-5 font-black text-rose-500 text-lg">{resultData.aiReview[`task${task.id}`].criteria.overall?.band || '-'}</td>
                                                                         <td className="px-6 py-5 font-medium text-[#1d1d1f] leading-relaxed">{resultData.aiReview[`task${task.id}`].criteria.overall?.feedback || '-'}</td>
                                                                     </tr>
                                                                 </tbody>
                                                             </table>
                                                         </div>
                                                     )}
                                                     
                                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                                         {/* Grammar */}
                                                         <div className="bg-[#FBFBFD] rounded-2xl p-5 border border-gray-100">
                                                             <h4 className="font-semibold text-gray-400 text-[11px] mb-4 uppercase tracking-widest flex items-center gap-2">
                                                                 <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                                                 Grammar Corrections
                                                             </h4>
                                                             {resultData.aiReview[`task${task.id}`].grammarErrors?.length > 0 ? (
                                                                 <ul className="space-y-4">
                                                                     {resultData.aiReview[`task${task.id}`].grammarErrors.map((err, i) => (
                                                                         <li key={i} className="flex flex-col gap-1.5 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                                                             <div className="flex flex-wrap items-center gap-2 text-[14px]">
                                                                                 <span className="line-through text-gray-400 decoration-red-300">{err.original}</span> 
                                                                                 <span className="text-gray-300 mx-1">→</span>
                                                                                 <span className="text-[#1d1d1f] font-semibold bg-green-50 px-2 py-0.5 rounded">{err.correction}</span>
                                                                             </div>
                                                                             <div className="text-gray-500 text-[12px] leading-relaxed mt-1">{err.explanation}</div>
                                                                         </li>
                                                                     ))}
                                                                 </ul>
                                                             ) : (
                                                                 <p className="text-[13px] text-gray-500 opacity-70">No significant grammar errors found.</p>
                                                             )}
                                                         </div>
                                                         {/* Lexical */}
                                                         <div className="bg-[#FBFBFD] rounded-2xl p-5 border border-gray-100">
                                                             <h4 className="font-semibold text-gray-400 text-[11px] mb-4 uppercase tracking-widest flex items-center gap-2">
                                                                 <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                                                 Vocabulary / Data Corrections
                                                             </h4>
                                                             {resultData.aiReview[`task${task.id}`].lexicalErrors?.length > 0 ? (
                                                                 <ul className="space-y-4">
                                                                     {resultData.aiReview[`task${task.id}`].lexicalErrors.map((err, i) => (
                                                                         <li key={i} className="flex flex-col gap-1.5 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                                                             <div className="flex flex-wrap items-center gap-2 text-[14px]">
                                                                                 <span className="line-through text-gray-400 decoration-red-300">{err.original}</span> 
                                                                                 <span className="text-gray-300 mx-1">→</span>
                                                                                 <span className="text-[#1d1d1f] font-semibold bg-blue-50 px-2 py-0.5 rounded">{err.correction}</span>
                                                                             </div>
                                                                             <div className="text-gray-500 text-[12px] leading-relaxed mt-1">{err.explanation}</div>
                                                                         </li>
                                                                     ))}
                                                                 </ul>
                                                             ) : (
                                                                 <p className="text-[13px] text-gray-500 opacity-70">No significant vocabulary issues found.</p>
                                                             )}
                                                         </div>
                                                     </div>
                                                 </div>
                                             )}
                                         </div>
                                     );
                                 })}
                             </div>
                         </div>
                     </>
                 ) : (
                     // Legacy Format
                     <div className="w-full h-full flex flex-col items-center py-10 bg-[#F5F5F7] overflow-y-auto">
                         <div className="w-full max-w-[800px] border border-gray-100 p-8 rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                             <h3 className="font-bold text-gray-800 text-xl mb-4 border-b pb-2">Writing Task Review</h3>
                             {testData.image_url && <img src={testData.image_url} alt="Task" className="w-full mb-6 rounded-2xl border" />}
                             <p className="mb-6 font-medium leading-relaxed text-[#1d1d1f]">{testData.passage}</p>

                             <h4 className="font-bold text-[#1d1d1f] mb-2 uppercase tracking-widest text-[13px]">Sizning Javobingiz:</h4>
                             <p className="whitespace-pre-wrap font-serif text-[#1d1d1f] leading-relaxed p-6 bg-[#fbfbfd] border border-gray-100 rounded-2xl min-h-[200px]">
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
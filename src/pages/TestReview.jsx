import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import ReadingInterface from "../components/ReadingInterface/ReadingInterface";
import ListeningInterface from '../components/ListeningInterface/ListeningInterface';

export default function TestReview() {
  const { id } = useParams(); // Result ID
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null); // Asl test (Savollar)
  const [resultData, setResultData] = useState(null); // O'quvchi javobi
  const [textSize, setTextSize] = useState('text-medium');

  // Writing Tab (Task 1 / Task 2)
  const [activeWritingTab, setActiveWritingTab] = useState(1);

  // --- ADMIN BAHOLASH STATELARI ---
  const [adminScore, setAdminScore] = useState("");
  const [adminFeedback, setAdminFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Interface uchun dummy funksiyalar (Admin faqat ko'radi, o'zgartirmaydi)
  const [flaggedQuestions] = useState(new Set());
  const handleNoOp = () => {}; 

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Natijani olish
        const resultRef = doc(db, "results", id);
        const resultSnap = await getDoc(resultRef);

        if (!resultSnap.exists()) {
          alert("Result not found!");
          return navigate("/admin/results");
        }
        
        const rData = resultSnap.data();
        setResultData(rData);

        // Populate fields if graded
        if (rData.score !== null && rData.score !== undefined) setAdminScore(rData.score);
        if (rData.feedback) setAdminFeedback(rData.feedback);
        // Fallback: If AI feedback exists but no teacher feedback, use AI's overall band
        if (!rData.score && rData.aiGrading?.overallBand) setAdminScore(rData.aiGrading.overallBand);

        // 2. Asl Testni olish
        const testRef = doc(db, "tests", rData.testId);
        const testSnap = await getDoc(testRef);

        if (!testSnap.exists()) {
          setTestData({ title: "Deleted Test", type: rData.type }); // Fallback
        } else {
          setTestData({ id: testSnap.id, ...testSnap.data() });
        }

      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // --- ADMIN: BAHONI SAQLASH FUNKSIYASI ---
  const handleSaveGrade = async () => {
      if (adminScore === "") return alert("Please enter a band score!");
      
      setIsSaving(true);
      try {
          const resultRef = doc(db, "results", id);
          
          await updateDoc(resultRef, {
              score: Number(adminScore),
              bandScore: Number(adminScore),
              feedback: adminFeedback,
              status: 'published' // 🔥 Changed to 'published' per requirement
          });
          
          alert("Grade Saved & Published! ✅");
          
          // Local update
          setResultData(prev => ({ 
              ...prev, 
              score: adminScore, 
              bandScore: adminScore, 
              feedback: adminFeedback, 
              status: 'published'
          }));
      
      } catch (err) {
          alert("Error: " + err.message);
      } finally {
          setIsSaving(false);
      }
  };

  const renderAICriteria = (criteriaData) => {
    if (!criteriaData) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {Object.entries(criteriaData).map(([key, val]) => (
           <div key={key} className="bg-blue-50/50 border border-blue-100 p-3 rounded text-xs">
              <div className="flex justify-between mb-1">
                 <strong className="capitalize text-blue-800">{key.replace(/([A-Z])/g, ' $1').trim()}</strong>
                 <span className="font-bold text-blue-600">{val.score}</span>
              </div>
              <p className="text-gray-600">{val.feedback}</p>
           </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-gray-500">Loading...</div>;
  if (!resultData || !testData) return <div className="p-10 text-center">Data not found</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans">
      
      {/* --- HEADER (ADMIN PANEL STYLE) --- */}
      <header className="bg-slate-900 text-white p-3 flex justify-between items-center shadow-md h-16 shrink-0 z-10">
         <div className="flex items-center gap-4 pl-2">
            <button onClick={() => navigate('/admin/results')} className="text-gray-400 hover:text-white transition font-bold text-sm border border-gray-600 px-3 py-1 rounded">
                &larr; Back
            </button>
            <div className="border-l border-gray-700 pl-4">
                <h1 className="font-bold text-xs text-blue-400 uppercase tracking-wider">Teacher Review Panel</h1>
                <div className="flex items-center gap-2">
                    <p className="font-bold text-white text-sm truncate max-w-md">{testData.title}</p>
                    <span className={`text-[10px] px-2 rounded uppercase font-bold ${
                        testData.type === 'listening' ? 'bg-purple-600' : 
                        testData.type === 'writing' ? 'bg-yellow-600 text-black' : 
                        'bg-blue-600'
                    }`}>
                        {testData.type}
                    </span>
                </div>
            </div>
         </div>
         
         <div className="pr-4 flex items-center gap-4">
            <div className="text-right hidden sm:block">
                <p className="text-[10px] text-gray-400 uppercase">Student</p>
                <p className="font-bold text-sm">{resultData.userName || "Unknown"}</p>
            </div>
            <div className={`px-3 py-1 rounded border text-center ${resultData.status === 'published' || resultData.status === 'graded' ? 'bg-green-900 border-green-500 text-green-400' : 'bg-yellow-900 border-yellow-500 text-yellow-400'}`}>
                <span className="text-[10px] block uppercase opacity-70">Status</span>
                <span className="font-bold">
                  {resultData.status === 'published' || resultData.status === 'graded'
                    ? `Published (${resultData.bandScore || resultData.score})`
                    : "Review Pending"}
                </span>
            </div>
         </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* 1. READING / LISTENING (Auto Graded) */}
        {testData.type === 'reading' ? (
             <ReadingInterface 
                testData={testData} 
                userAnswers={resultData.userAnswers}
                onAnswerChange={handleNoOp} 
                onFlag={handleNoOp}
                flaggedQuestions={flaggedQuestions}
                isReviewMode={true} 
                textSize={textSize} 
             />
        ) : testData.type === 'listening' ? (
             <ListeningInterface 
                testData={testData}
                userAnswers={resultData.userAnswers}
                onAnswerChange={handleNoOp} 
                onFlag={handleNoOp}
                flaggedQuestions={flaggedQuestions}
                isReviewMode={true} 
                textSize={textSize}
             />
        ) : testData.type === 'writing' ? (
             
             // 2. WRITING REVIEW (Enhanced for AI)
             <div className="w-full h-full flex flex-col bg-gray-50">
                 
                 {/* TABS (Task 1 / Task 2) */}
                 {testData.writingTasks ? (
                     <div className="bg-white border-b px-6 py-2 flex gap-4 shadow-sm">
                         {testData.writingTasks.map(task => (
                             <button
                                 key={task.id}
                                 onClick={() => setActiveWritingTab(task.id)}
                                 className={`px-4 py-2 text-sm font-bold rounded-lg transition ${activeWritingTab === task.id ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                             >
                                 {task.title} Review
                             </button>
                         ))}
                     </div>
                 ) : null}

                 {/* WRITING CONTENT AREA */}
                 <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                     {testData.writingTasks ? (
                         // --- MULTI-TASK FORMAT ---
                         testData.writingTasks.map(task => {
                             if (task.id !== activeWritingTab) return null;
                             
                             const taskIdKey = task.id === 1 ? 'task1' : 'task2';
                             const answer = resultData.userAnswers?.[taskIdKey] || resultData.writingAnswers?.[`task${task.id}`] || "";
                             
                             // Get AI Data for this task
                             const aiTaskData = resultData.aiGrading?.[taskIdKey]; // 'task1' or 'task2'

                             return (
                                 <div key={task.id} className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                                     
                                     {/* LEFT: STUDENT ANSWER & PROMPT */}
                                     <div className="flex flex-col gap-6">
                                         {/* Question Card */}
                                         <div className="bg-white p-6 rounded-xl border shadow-sm">
                                             <h3 className="font-bold text-gray-800 text-lg mb-4 border-b pb-2 flex justify-between">
                                                 <span>Question ({task.title})</span>
                                                 <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">Min: {task.minWords} words</span>
                                             </h3>
                                             {task.image && <img src={task.image} className="w-full mb-4 rounded border bg-gray-50 object-contain max-h-60" alt="Task" />}
                                             <div className="whitespace-pre-wrap text-gray-700 text-sm font-medium leading-relaxed bg-gray-50 p-4 rounded border">
                                                 {task.prompt}
                                             </div>
                                         </div>

                                         {/* Answer Card */}
                                         <div className="bg-white p-6 rounded-xl border shadow-sm border-blue-200 relative h-full">
                                             <h3 className="font-bold text-blue-700 text-lg mb-4 border-b pb-2">Student Answer</h3>
                                             <div className="whitespace-pre-wrap font-serif text-gray-800 leading-relaxed text-base bg-gray-50 p-6 rounded border border-gray-200 min-h-[300px]">
                                                 {answer || <span className="text-gray-400 italic">No answer provided.</span>}
                                             </div>
                                             <div className="absolute top-6 right-6 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">
                                                 Words: {(answer || "").trim().split(/\s+/).filter(Boolean).length}
                                             </div>
                                         </div>
                                     </div>

                                     {/* RIGHT: AI FEEDBACK */}
                                     <div className="flex flex-col gap-6">
                                        <div className="bg-white p-6 rounded-xl border shadow-sm border-purple-200">
                                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                                <h3 className="font-bold text-purple-700 text-lg flex items-center gap-2">
                                                    🤖 AI Assessment
                                                </h3>
                                                {aiTaskData && (
                                                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold text-sm">
                                                        Est. Band: {aiTaskData.band}
                                                    </span>
                                                )}
                                            </div>

                                            {aiTaskData ? (
                                                <div className="space-y-4">
                                                    <div className="text-sm text-gray-600 italic bg-purple-50 p-3 rounded border border-purple-100">
                                                        "{aiTaskData.generalFeedback}"
                                                    </div>

                                                    {/* Criteria Grid */}
                                                    {renderAICriteria(aiTaskData.criteria)}

                                                    {/* Improvements */}
                                                    {aiTaskData.improvements && (
                                                        <div className="mt-4">
                                                            <h4 className="font-bold text-xs text-gray-500 uppercase mb-2">Steps to Improve</h4>
                                                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                                                {aiTaskData.improvements.map((imp, idx) => (
                                                                    <li key={idx}>{imp}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-10 text-gray-400">
                                                    AI Grading is processing or unavailable.
                                                </div>
                                            )}
                                        </div>
                                     </div>
                                 </div>
                             );
                         })
                     ) : (
                         <div className="p-10 text-center">Legacy format not fully supported.</div>
                     )}
                 </div>

                 {/* 🔥 TEACHER GRADING PANEL */}
                 <div className="bg-white border-t-4 border-t-blue-500 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20 sticky bottom-0">
                     <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-start">
                         <div className="flex-1 w-full">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">✍️ Teacher Feedback (Editable)</label>
                             <textarea 
                                 className="w-full border p-3 rounded text-sm h-20 focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50 focus:bg-white transition"
                                 placeholder="Edit or add your own feedback here..."
                                 value={adminFeedback}
                                 onChange={(e) => setAdminFeedback(e.target.value)}
                             />
                         </div>
                         <div className="flex flex-col gap-2 min-w-[200px]">
                             <div>
                                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">📊 Final Band Score</label>
                                 <input 
                                     type="number" step="0.5" max="9" min="0"
                                     className="w-full border p-2 rounded font-bold text-2xl text-center focus:ring-2 focus:ring-blue-500 outline-none text-blue-600"
                                     value={adminScore}
                                     onChange={(e) => setAdminScore(e.target.value)}
                                 />
                             </div>
                             <button 
                                 onClick={handleSaveGrade}
                                 disabled={isSaving}
                                 className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded shadow-lg transition disabled:bg-gray-400 text-sm uppercase flex items-center justify-center gap-2"
                             >
                                 {isSaving ? "⏳ Publishing..." : "✅ Approve & Publish"}
                             </button>
                         </div>
                     </div>
                 </div>
             </div>

        ) : testData.type === 'speaking' ? (
             
             // 3. SPEAKING REVIEW (Admin uchun) - Kept as is
             <div className="w-full h-full flex flex-col bg-gray-50">
                 <div className="flex-1 flex flex-col items-center justify-center w-full p-10 overflow-y-auto">
                     <div className="w-full max-w-2xl bg-white p-8 rounded-xl border shadow-sm mb-8 text-center">
                         <h2 className="text-xl font-bold mb-6 text-gray-800">🎤 Speaking Answer</h2>
                         {resultData.audioAnswer ? (
                             <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex flex-col items-center">
                                 <div className="text-5xl mb-4">🎧</div>
                                 <audio controls src={resultData.audioAnswer} className="w-full mb-2" />
                             </div>
                         ) : (
                             <p className="text-red-500 font-bold bg-red-50 p-4 rounded border border-red-200">⚠️ No Audio Found.</p>
                         )}
                     </div>
                 </div>

                 {/* ADMIN GRADING PANEL (SPEAKING) */}
                 <div className="bg-white border-t-4 border-t-purple-500 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20">
                     <div className="max-w-4xl mx-auto flex gap-4 items-center">
                         <div className="flex-1">
                             <input 
                                 type="text" 
                                 className="w-full border p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50" 
                                 placeholder="Speaking Feedback..."
                                 value={adminFeedback} 
                                 onChange={e=>setAdminFeedback(e.target.value)} 
                             />
                         </div>
                         <div className="w-24">
                             <input 
                                 type="number" step="0.5" max="9" min="0"
                                 className="w-full border p-4 rounded-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-500 text-xl" 
                                 value={adminScore} 
                                 onChange={e=>setAdminScore(e.target.value)} 
                             />
                         </div>
                         <button 
                            onClick={handleSaveGrade} 
                            disabled={isSaving}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg font-bold shadow-lg transition disabled:bg-gray-400"
                         >
                             {isSaving ? "..." : "SAVE"}
                         </button>
                     </div>
                 </div>
             </div>
        ) : null}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import ReadingInterface from "../components/ReadingInterface/ReadingInterface";
import ListeningInterface from '../components/ListeningInterface/ListeningInterface';
import { useAuth } from "../context/AuthContext";

export default function TestReview() {
    const { id } = useParams(); // Result ID
    const navigate = useNavigate();
    const { user, userData } = useAuth();

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

    // --- MOCK REVIEW STATE ---
    const [activeMockPart, setActiveMockPart] = useState('listening'); // listening, reading, writing
    const [currentAnswers, setCurrentAnswers] = useState({}); // Active part answers

    // Interface uchun dummy funksiyalar (Admin faqat ko'radi, o'zgartirmaydi)
    const [flaggedQuestions] = useState(new Set());
    const handleNoOp = () => { };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 1. Natijani olish
                const resultRef = doc(db, "results", id);
                const resultSnap = await getDoc(resultRef);

                if (!resultSnap.exists()) {
                    alert("Natija topilmadi!");
                    return navigate(userData?.role === 'admin' ? "/admin/results" : "/practice");
                }

                const rData = resultSnap.data();
                setResultData(rData);

                // 2. Test ID ni aniqlash (Normal vs Mock)
                let testIdToLoad = rData.testId;
                let partAnswers = rData.userAnswers || {};

                if (rData.type === 'mock_full') {
                    if (rData.subTests && rData.subTests[activeMockPart]) {
                        testIdToLoad = rData.subTests[activeMockPart];
                    }
                    if (rData.details) {
                        partAnswers = rData.details[`${activeMockPart}Answers`] || {};
                    }
                }

                setCurrentAnswers(partAnswers);

                // Agar oldin baholangan bo'lsa (Writing/Speaking)
                if (rData.score !== null && rData.score !== undefined) setAdminScore(rData.score);
                if (rData.feedback) setAdminFeedback(rData.feedback);

                // 3. Testni yuklash
                if (testIdToLoad) {
                    const testRef = doc(db, "tests", testIdToLoad);
                    const testSnap = await getDoc(testRef);

                    if (!testSnap.exists()) {
                        setTestData({ title: "O'chirilgan Test", type: activeMockPart }); // Fallback
                    } else {
                        setTestData({ id: testSnap.id, ...testSnap.data() });
                    }
                } else {
                    setTestData({ title: "Test ID topilmadi", type: activeMockPart });
                }

            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, navigate, user, userData, activeMockPart]);

    // --- ADMIN: BAHONI SAQLASH FUNKSIYASI ---
    const handleSaveGrade = async () => {
        if (adminScore === "") return alert("Iltimos, ball qo'ying!");

        setIsSaving(true);
        try {
            const resultRef = doc(db, "results", id);

            await updateDoc(resultRef, {
                score: Number(adminScore),
                bandScore: Number(adminScore), // Hozircha score = band deb turamiz
                feedback: adminFeedback,
                status: 'graded' // Statusni 'graded' ga o'zgartiramiz
            });

            alert("Baho saqlandi! ✅");

            // Lokal stateni yangilash (UI darhol o'zgarishi uchun)
            setResultData(prev => ({
                ...prev,
                score: adminScore,
                bandScore: adminScore,
                feedback: adminFeedback,
                status: 'graded'
            }));

        } catch (err) {
            alert("Xato: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center font-bold text-gray-500">Yuklanmoqda...</div>;
    if (!resultData || !testData) return <div className="p-10 text-center">Ma'lumot topilmadi</div>;

    return (
        <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans">

            {/* --- HEADER --- */}
            <header className="bg-slate-900 text-white p-3 flex justify-between items-center shadow-md h-16 shrink-0 z-10">
                <div className="flex items-center gap-4 pl-2">
                    <button onClick={() => navigate(userData?.role === 'admin' ? '/admin/results' : '/practice')} className="text-gray-400 hover:text-white transition font-bold text-sm border border-gray-600 px-3 py-1 rounded">
                        &larr; Orqaga
                    </button>
                    <div className="border-l border-gray-700 pl-4">
                        <h1 className="font-bold text-xs text-blue-400 uppercase tracking-wider">
                            {userData?.role === 'admin' ? 'Admin Review Panel' : 'Natijani ko\'rish'}
                            {resultData.type === 'mock_full' && ' (Full Mock)'}
                        </h1>
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-white text-sm truncate max-w-sm">{testData.title}</p>
                            {resultData.type !== 'mock_full' && (
                                <span className={`text-[10px] px-2 rounded uppercase font-bold ${testData.type === 'listening' ? 'bg-purple-600' :
                                    testData.type === 'writing' ? 'bg-yellow-600 text-black' :
                                        'bg-blue-600'
                                    }`}>
                                    {testData.type}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* PART SWITCHER FOR MOCK */}
                {resultData.type === 'mock_full' && (
                    <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
                        {['listening', 'reading', 'writing'].map(part => (
                            <button
                                key={part}
                                onClick={() => setActiveMockPart(part)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition ${activeMockPart === part ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {part}
                            </button>
                        ))}
                    </div>
                )}

                <div className="pr-4 flex items-center gap-4">
                    {userData?.role === 'admin' && (
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-gray-400 uppercase">O'quvchi</p>
                            <p className="font-bold text-sm">{resultData.userName || "Noma'lum"}</p>
                        </div>
                    )}
                    <div className={`px-3 py-1 rounded border text-center ${resultData.status === 'graded' ? 'bg-green-900 border-green-500 text-green-400' : 'bg-yellow-900 border-yellow-500 text-yellow-400'}`}>
                        <span className="text-[10px] block uppercase opacity-70">Status</span>
                        <span className="font-bold">{resultData.status === 'graded' ? `Band ${resultData.score}` : "Kutilmoqda"}</span>
                    </div>
                </div>
            </header>

            {/* --- ASOSIY CONTENT --- */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* 1. READING / LISTENING (Avtomatik Tekshirilgan) */}
                {testData.type === 'reading' ? (
                    <ReadingInterface
                        testData={testData}
                        userAnswers={currentAnswers}
                        onAnswerChange={handleNoOp}
                        onFlag={handleNoOp}
                        flaggedQuestions={flaggedQuestions}
                        isReviewMode={true}
                        textSize={textSize}
                    />
                ) : testData.type === 'listening' ? (
                    <ListeningInterface
                        testData={testData}
                        userAnswers={currentAnswers}
                        onAnswerChange={handleNoOp}
                        onFlag={handleNoOp}
                        flaggedQuestions={flaggedQuestions}
                        isReviewMode={true}
                        textSize={textSize}
                    />
                ) : testData.type === 'writing' ? (

                    // 2. WRITING REVIEW (Admin uchun)
                    <div className="w-full h-full flex flex-col bg-gray-50">

                        {/* TABS (Task 1 / Task 2) - Agar yangi format bo'lsa */}
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
                        <div className="flex-1 overflow-y-auto p-6">
                            {testData.writingTasks ? (
                                // --- YANGI FORMAT (Multi-Task) ---
                                testData.writingTasks.map(task => {
                                    if (task.id !== activeWritingTab) return null;

                                    // Javobni olish (xavfsiz yo'l bilan)
                                    const answer = currentAnswers ? currentAnswers[`task${task.id}`] : "";

                                    return (
                                        <div key={task.id} className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 h-full">

                                            {/* Chap: SAVOL */}
                                            <div className="bg-white p-6 rounded-xl border shadow-sm h-fit">
                                                <h3 className="font-bold text-gray-800 text-lg mb-4 border-b pb-2 flex justify-between">
                                                    <span>Savol ({task.title})</span>
                                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">Min: {task.minWords} words</span>
                                                </h3>
                                                {task.image && <img src={task.image} className="w-full mb-4 rounded border bg-gray-50 object-contain max-h-60" alt="Task" />}
                                                <div className="whitespace-pre-wrap text-gray-700 text-sm font-medium leading-relaxed bg-gray-50 p-4 rounded border">
                                                    {task.prompt}
                                                </div>
                                            </div>

                                            {/* O'ng: O'QUVCHI JAVOBI */}
                                            <div className="bg-white p-6 rounded-xl border shadow-sm h-fit border-blue-200 relative">
                                                <h3 className="font-bold text-blue-700 text-lg mb-4 border-b pb-2">O'quvchi Javobi</h3>
                                                <div className="whitespace-pre-wrap font-serif text-gray-800 leading-relaxed text-base bg-gray-50 p-6 rounded border border-gray-200 min-h-[400px]">
                                                    {answer || <span className="text-gray-400 italic">O'quvchi javob yozmadi.</span>}
                                                </div>
                                                <div className="absolute top-6 right-6 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">
                                                    So'zlar: {(answer || "").trim().split(/\s+/).filter(Boolean).length}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                // --- ESKI FORMAT (Single Essay) ---
                                <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border">
                                    <h3 className="font-bold text-gray-800 mb-4">Task Instructions</h3>
                                    {testData.image_url && <img src={testData.image_url} alt="Task" className="w-full mb-4 rounded" />}
                                    <p className="mb-6 p-4 bg-gray-50 rounded border text-sm">{testData.passage}</p>

                                    <h3 className="font-bold text-blue-700 mb-2">Essay Answer</h3>
                                    <p className="whitespace-pre-wrap font-serif text-gray-800 p-4 border rounded bg-blue-50 leading-relaxed">
                                        {resultData.essay || "Javob yo'q"}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 🔥 ADMIN GRADING PANEL (WRITING UCHUN) - Faqat Adminlar */}
                        {userData?.role === 'admin' ? (
                            <div className="bg-white border-t-4 border-t-blue-500 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20">
                                <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-start">
                                    <div className="flex-1 w-full">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">✍️ O'qituvchi Izohi (Feedback)</label>
                                        <textarea
                                            className="w-full border p-3 rounded text-sm h-20 focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50 focus:bg-white transition"
                                            placeholder="O'quvchiga xatolari va maslahatlarni yozing..."
                                            value={adminFeedback}
                                            onChange={(e) => setAdminFeedback(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2 min-w-[150px]">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">📊 Band Score</label>
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
                                            {isSaving ? "⏳ Saqlanmoqda..." : "✅ Saqlash"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : resultData.status === 'graded' && resultData.feedback ? (
                            <div className="bg-white border-t-4 border-t-green-500 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20">
                                <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center">
                                    <div className="flex-1 w-full">
                                        <label className="block text-xs font-bold text-green-600 uppercase mb-1">📝 O'qituvchi Izohi</label>
                                        <p className="text-sm text-gray-700 bg-green-50 p-3 rounded border border-green-200">{resultData.feedback}</p>
                                    </div>
                                    <div className="text-center min-w-[100px]">
                                        <span className="block text-xs font-bold text-green-600 uppercase mb-1">Band Score</span>
                                        <span className="text-3xl font-bold text-green-700">{resultData.score}</span>
                                    </div>
                                </div>
                            </div>
                        ) : resultData.status !== 'graded' ? (
                            <div className="bg-yellow-50 border-t-4 border-t-yellow-400 p-4 z-20">
                                <p className="text-center text-sm font-bold text-yellow-700">⏳ O'qituvchi hali baholamagan. Iltimos, kutib turing.</p>
                            </div>
                        ) : null}
                    </div>

                ) : testData.type === 'speaking' ? (

                    // 3. SPEAKING REVIEW (Admin uchun)
                    <div className="w-full h-full flex flex-col bg-gray-50">
                        <div className="flex-1 flex flex-col items-center justify-center w-full p-10 overflow-y-auto">

                            <div className="w-full max-w-2xl bg-white p-8 rounded-xl border shadow-sm mb-8 text-center">
                                <h2 className="text-xl font-bold mb-6 text-gray-800">🎤 Speaking Javobi</h2>

                                {resultData.audioAnswer ? (
                                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex flex-col items-center">
                                        <div className="text-5xl mb-4">🎧</div>
                                        <audio controls src={resultData.audioAnswer} className="w-full mb-2" />
                                        <a href={resultData.audioAnswer} download target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-bold">
                                            📥 Audioni yuklab olish
                                        </a>
                                    </div>
                                ) : (
                                    <p className="text-red-500 font-bold bg-red-50 p-4 rounded border border-red-200">⚠️ Audio fayl topilmadi.</p>
                                )}
                            </div>

                            <div className="w-full max-w-2xl text-center">
                                <h4 className="font-bold text-gray-500 uppercase text-xs mb-2 tracking-widest">Task Description</h4>
                                <div className="bg-white p-6 rounded-xl border text-gray-700 whitespace-pre-wrap font-medium shadow-sm text-left">
                                    {testData.passage || testData.script || "Savol matni yo'q"}
                                </div>
                            </div>
                        </div>

                        {/* 🔥 ADMIN GRADING PANEL (SPEAKING UCHUN) - Faqat Adminlar */}
                        {userData?.role === 'admin' ? (
                            <div className="bg-white border-t-4 border-t-purple-500 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20">
                                <div className="max-w-4xl mx-auto flex gap-4 items-center">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            className="w-full border p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50"
                                            placeholder="Speaking bo'yicha qisqacha izoh..."
                                            value={adminFeedback}
                                            onChange={e => setAdminFeedback(e.target.value)}
                                        />
                                    </div>
                                    <div className="w-24">
                                        <input
                                            type="number" step="0.5" max="9" min="0"
                                            className="w-full border p-4 rounded-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-500 text-xl"
                                            placeholder="0.0"
                                            value={adminScore}
                                            onChange={e => setAdminScore(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={handleSaveGrade}
                                        disabled={isSaving}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg font-bold shadow-lg transition disabled:bg-gray-400"
                                    >
                                        {isSaving ? "..." : "SAQLASH"}
                                    </button>
                                </div>
                            </div>
                        ) : resultData.status === 'graded' && resultData.feedback ? (
                            <div className="bg-white border-t-4 border-t-green-500 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20">
                                <div className="max-w-4xl mx-auto flex gap-4 items-center">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-green-600 uppercase mb-1">📝 O'qituvchi Izohi</label>
                                        <p className="text-sm text-gray-700 bg-green-50 p-3 rounded border border-green-200">{resultData.feedback}</p>
                                    </div>
                                    <div className="text-center min-w-[80px]">
                                        <span className="block text-xs font-bold text-green-600 uppercase mb-1">Band</span>
                                        <span className="text-3xl font-bold text-green-700">{resultData.score}</span>
                                    </div>
                                </div>
                            </div>
                        ) : resultData.status !== 'graded' ? (
                            <div className="bg-yellow-50 border-t-4 border-t-yellow-400 p-4 z-20">
                                <p className="text-center text-sm font-bold text-yellow-700">⏳ O'qituvchi hali baholamagan. Iltimos, kutib turing.</p>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import ReadingInterface from "../components/ReadingInterface/ReadingInterface";
import ListeningInterface from '../components/ListeningInterface/ListeningInterface';
import { useAuth } from "../context/AuthContext";
import { batchAddWordsToBank } from "../utils/wordbankUtils";
import { calculateSectionScore, calculateBandScore, calculateOverallBand } from "../utils/ieltsScoring";
import CustomAudioPlayer from "../components/TestSolving/CustomAudioPlayer";

// --- MOCK KEYWORD TABLE (real JSON tayyor bo'lgach testData.keywordTable ga almashtiriladi) ---
// Format: { id: number, locationId: string, passageWord: string, questionWord: string }
const MOCK_KEYWORD_TABLE = [];
// Misol (o'chirib qo'ying yoki o'zgartiring real testga moslash uchun):
// const MOCK_KEYWORD_TABLE = [
//   { id: 1, locationId: "loc_1", passageWord: "nature", questionWord: "natural" },
//   { id: 2, locationId: "loc_3", passageWord: "climate", questionWord: "weather" },
// ];


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
    const [listeningActivePart, setListeningActivePart] = useState(0); // Listening part tab
    const [audioTime, setAudioTime] = useState(0); // Audio vaqti

    // Interface uchun dummy funksiyalar (Admin faqat ko'radi, o'zgartirmaydi)
    const [flaggedQuestions] = useState(new Set());
    const handleNoOp = () => { };

    // --- WORDBANK STATELARI ---
    const [captureData, setCaptureData] = useState(null);
    const [isSavingWB, setIsSavingWB] = useState(false);

    const handleAddToWordBank = useCallback((word, source, context) => {
        setCaptureData({ word, source, context, timestamp: Date.now() });
    }, []);

    const handleClearCapture = useCallback(() => {
        setCaptureData(null);
    }, []);

    // --- KEYWORD HOVER + CLICK SINXRONIZATSIYA (Event Delegation) ---
    useEffect(() => {
        // Hover: faqat yashil neon effekti
        const handleMouseOver = (e) => {
            const el = e.target.closest('.keyword-highlight');
            if (!el) return;
            const kwId = el.getAttribute('data-keyword-id');
            document.querySelectorAll(`.keyword-highlight[data-keyword-id="${kwId}"]`)
                .forEach(x => x.classList.add('active-sync'));
        };

        const handleMouseOut = (e) => {
            const el = e.target.closest('.keyword-highlight');
            if (!el) return;
            const kwId = el.getAttribute('data-keyword-id');
            document.querySelectorAll(`.keyword-highlight[data-keyword-id="${kwId}"]`)
                .forEach(x => x.classList.remove('active-sync'));
        };

        // Click: qarama-qarshi panelga scroll
        const handleClick = (e) => {
            const el = e.target.closest('.keyword-highlight');
            if (!el) return;
            const kwId = el.getAttribute('data-keyword-id');
            document.querySelectorAll(`.keyword-highlight[data-keyword-id="${kwId}"]`)
                .forEach(counterpart => {
                    if (counterpart !== el) {
                        counterpart.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'nearest'
                        });
                    }
                });
        };

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);
        document.addEventListener('click', handleClick);
        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
            document.removeEventListener('click', handleClick);
        };
    }, []);

    const handleSaveAllWords = useCallback(async (wordPairs) => {
        if (!user || !wordPairs || wordPairs.length === 0) return;
        setIsSavingWB(true);
        try {
            await batchAddWordsToBank(user.uid, wordPairs);
            alert(`${wordPairs.length} ta so'z WordBank'ga saqlandi! ✅`);
        } catch (err) {
            console.error("WordBank batch save error:", err);
            alert("Xato: " + err.message);
        } finally {
            setIsSavingWB(false);
        }
    }, [user]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 1. Natijani olish
                const resultRef = doc(db, "results", id);
                const resultSnap = await getDoc(resultRef);

                if (!resultSnap.exists()) {
                    alert("Natija topilmadi!");
                    const target = userData?.role === 'admin' || userData?.role === 'teacher' ? "/admin/results" : "/my-results";
                    return navigate(target);
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

                // 3. Baholangan ballarni yuklash (Mock vs Normal)
                let existingScore = rData.score;
                let existingFeedback = rData.feedback;

                if (rData.type === 'mock_full' && rData.scores) {
                    if (activeMockPart === 'writing') {
                        existingScore = rData.scores.writing;
                        existingFeedback = rData.scores.writingFeedback;
                    } else if (activeMockPart === 'speaking') {
                        existingScore = rData.scores.speaking;
                        existingFeedback = rData.scores.speakingFeedback;
                    }
                }

                setAdminScore(existingScore !== null && existingScore !== undefined ? existingScore : "");
                setAdminFeedback(existingFeedback || "");

                // 3. Testni yuklash
                if (testIdToLoad) {
                    const testRef = doc(db, "tests", testIdToLoad);
                    const testSnap = await getDoc(testRef);

                    if (!testSnap.exists()) {
                        setTestData({ title: "O'chirilgan Test", type: activeMockPart }); // Fallback
                    } else {
                        const rawTestData = { id: testSnap.id, ...testSnap.data() };
                        
                        // Normalizatsiya: Writing testlar (ham alohida, ham Mock tarkibida)
                        const isWritingTest = rawTestData.type === 'writing' || 
                                            rawTestData.type === 'Writing' || 
                                            activeMockPart === 'writing';

                        if (isWritingTest && !rawTestData.writingTasks) {
                            console.log("Normalizing Writing data for:", rawTestData.id);
                            rawTestData.writingTasks = [
                                ...(rawTestData.task1 ? [{ 
                                    id: 1, 
                                    title: 'Task 1', 
                                    prompt: rawTestData.task1, 
                                    minWords: 150, 
                                    image: rawTestData.image_url || rawTestData.image || rawTestData.task1_image 
                                }] : []),
                                ...(rawTestData.task2 ? [{ 
                                    id: 2, 
                                    title: 'Task 2', 
                                    prompt: rawTestData.task2, 
                                    minWords: 250,
                                    image: rawTestData.task2_image
                                }] : [])
                            ];
                            
                            // Agar hali ham bo'sh bo'lsa, lekin passage/prompt/instruction bor bo'lsa
                            if (rawTestData.writingTasks.length === 0) {
                                const mainPrompt = rawTestData.passage || rawTestData.prompt || rawTestData.instruction || rawTestData.content;
                                if (mainPrompt) {
                                    rawTestData.writingTasks = [{ 
                                        id: 1, 
                                        title: 'Writing Task', 
                                        prompt: mainPrompt, 
                                        minWords: 150, 
                                        image: rawTestData.image_url || rawTestData.image 
                                    }];
                                }
                            }
                        }
                        setTestData(rawTestData);
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
        if ((activeMockPart === 'writing' || activeMockPart === 'speaking') && adminScore === "") {
            return alert("Iltimos, ball qo'ying!");
        }

        setIsSaving(true);
        try {
            const resultRef = doc(db, "results", id);
            const scoreVal = Number(adminScore);

            const updatePayload = {
                score: scoreVal,
                bandScore: scoreVal,
                feedback: adminFeedback,
                status: 'graded'
            };

            // Agar bu Mock Full bo'lsa, qolgan bandlar bilan overall ni hisoblaymiz
            if (resultData.type === 'mock_full') {
                const newScores = { ...resultData.scores };
                
                // 1. Reading va Listening uchun Avtomatik Hisoblash (Recalculate Button bilan kelsa)
                if (activeMockPart === 'reading' || activeMockPart === 'listening') {
                    const sectionResults = calculateSectionScore(testData, currentAnswers);
                    const band = calculateBandScore(sectionResults.correct, activeMockPart, sectionResults.total);
                    
                    if (activeMockPart === 'reading') {
                        newScores.reading = sectionResults.correct;
                        newScores.readingBand = band;
                    } else {
                        newScores.listening = sectionResults.correct;
                        newScores.listeningBand = band;
                    }
                }

                // 2. Writing va Speaking uchun Qo'lda Baholash (Manual Input bilan kelsa)
                if (activeMockPart === 'writing') {
                    newScores.writing = scoreVal;
                    newScores.writingFeedback = adminFeedback;
                }
                if (activeMockPart === 'speaking') {
                    newScores.speaking = scoreVal;
                    newScores.speakingFeedback = adminFeedback;
                }

                // Overall Band Hisoblash (Average of all available sections)
                const sections = [];
                if (newScores.listeningBand !== undefined && newScores.listeningBand !== null) sections.push(Number(newScores.listeningBand));
                if (newScores.readingBand !== undefined && newScores.readingBand !== null) sections.push(Number(newScores.readingBand));
                if (newScores.writing !== undefined && newScores.writing !== null) sections.push(Number(newScores.writing));
                if (newScores.speaking !== undefined && newScores.speaking !== null) sections.push(Number(newScores.speaking));

                if (sections.length > 0) {
                    const roundedOverall = calculateOverallBand(...sections);
                    newScores.overallBand = roundedOverall;
                    
                    // Top-level update for dashboard
                    updatePayload.score = roundedOverall;
                    updatePayload.bandScore = roundedOverall;
                    updatePayload.overallBand = roundedOverall;
                }

                updatePayload.scores = newScores;
                
                if (adminFeedback) {
                     updatePayload.feedback = adminFeedback;
                }
            }

            await updateDoc(resultRef, updatePayload);
            
            // 🔥 IMPORTANT: Update local state so the UI reflects changes immediately
            setResultData(prev => ({ ...prev, ...updatePayload }));
            

            const finalDoc = await getDoc(resultRef);
            if (finalDoc.exists()) {
                setResultData(finalDoc.data());
            }

            alert("Baho saqlandi! ✅");

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
            <header className="bg-slate-900 text-white flex justify-between items-center shadow-md h-14 shrink-0 z-10 px-4">
                {/* LEFT: BACK & TITLE */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <button 
                        onClick={() => navigate(userData?.role === 'admin' || userData?.role === 'teacher' ? '/admin/results' : '/my-results')} 
                        className="text-gray-400 hover:text-white transition flex items-center justify-center w-9 h-9 sm:w-auto sm:h-10 sm:px-3 rounded-xl bg-gray-800/40 border border-white/5 hover:bg-gray-700/60 active:scale-95 group shadow-lg"
                        title="Back to results"
                    >
                        <span className="text-lg group-hover:-translate-x-0.5 transition-transform">←</span>
                        <span className="hidden sm:inline ml-2 text-[11px] font-black uppercase tracking-widest">Back</span>
                    </button>
                    
                    <div className="flex flex-col border-l border-white/10 pl-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-400 text-[8px] font-black uppercase tracking-tighter rounded border border-blue-500/20">
                                {resultData.type === 'mock_full' ? 'FULL MOCK' : 'PARTIAL'}
                            </span>
                            {resultData.userName && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded shadow-[0_0_10px_rgba(245,158,11,0.05)]">
                                    <div className="w-1 h-1 bg-amber-500 rounded-full shadow-[0_0_5px_rgba(245,158,11,0.5)] animate-pulse" />
                                    <span className="text-amber-500 text-[9px] font-black tracking-tight uppercase">
                                        STUDENT: {resultData.userName}
                                    </span>
                                </div>
                            )}
                            <span className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">
                                {userData?.role === 'admin' || userData?.role === 'teacher' ? 'TEACHER VIEW' : 'STUDENT REVIEW'}
                            </span>
                        </div>
                        <p className="font-black text-white text-[13px] tracking-tight leading-none truncate max-w-[120px] sm:max-w-[200px] lg:max-w-[300px]">
                            {testData.title}
                        </p>
                    </div>
                </div>

                {/* CENTER: CONTROLS */}
                <div className="flex-1 flex justify-center items-center gap-4 px-2 min-w-0">
                    {/* Section Selector (Ultra-Compact L R W S) for FULL MOCK */}
                    {resultData.type === 'mock_full' && (
                        <div className="flex bg-white/5 backdrop-blur-xl rounded-xl p-1 gap-1 border border-white/5 shadow-2xl relative">
                            {['listening', 'reading', 'writing', 'speaking'].map(part => {
                                const isActive = activeMockPart === part;
                                const label = part.charAt(0).toUpperCase();
                                const colors = {
                                    listening: 'bg-purple-600/90 shadow-[0_0_15px_#9333ea66]',
                                    reading: 'bg-blue-600/90 shadow-[0_0_15px_#2563eb66]',
                                    writing: 'bg-emerald-600/90 shadow-[0_0_15px_#05966966]',
                                    speaking: 'bg-indigo-600/90 shadow-[0_0_15px_#4f46e566]'
                                };
                                return (
                                    <button
                                        key={part}
                                        onClick={() => setActiveMockPart(part)}
                                        className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-[10px] sm:text-[11px] font-black transition-all duration-300 relative group active:scale-95 ${
                                            isActive ? `${colors[part]} text-white border border-white/20` : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                                        }`}
                                        title={part.charAt(0).toUpperCase() + part.slice(1)}
                                    >
                                        <span className="relative z-10">{label}</span>
                                        {isActive && (
                                            <span className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Audio Player (Refined & Unified) */}
                    {(testData.type === 'listening' || activeMockPart === 'listening') && (() => {
                        // Find the first valid audio source
                        const firstAudio = testData?.passages?.find(p => p.audio || testData?.audio || testData?.audio_url || testData?.audioUrl || testData?.file);
                        const src = firstAudio?.audio || testData?.audio || testData?.audio_url || testData?.audioUrl || testData?.file;
                        
                        if (!src) return null;
                        
                        return (
                            <div className="max-w-[280px] sm:max-w-[340px] flex-1 bg-white/5 backdrop-blur-xl rounded-xl p-1 border border-white/10 shadow-lg group hover:border-white/20 transition-all duration-300">
                                <CustomAudioPlayer
                                    src={src}
                                    index={0}
                                    variant="dark"
                                    activePart={listeningActivePart}
                                    testMode="practice"
                                    setAudioTime={setAudioTime}
                                    startTime={0}
                                    endTime={0}
                                />
                            </div>
                        );
                    })()}
                </div>

                {/* RIGHT: SCORES & STATUS */}
                <div className="flex items-center gap-2 sm:gap-4 shrink-0 px-2 lg:px-0">
                    {/* Mock Detailed Scores (Consolidated) */}
                    {resultData.type === 'mock_full' && (
                        <div className="hidden sm:flex items-center gap-1 bg-white/5 backdrop-blur-xl px-2 py-1 lg:px-4 lg:py-2.5 rounded-2xl border border-white/10 shadow-2xl ring-1 ring-white/5">
                            {[
                                { key: 'listeningBand', rawKey: 'listening', label: 'L', color: 'text-purple-400' },
                                { key: 'readingBand', rawKey: 'reading', label: 'R', color: 'text-blue-400' },
                                { key: 'writing', label: 'W', color: 'text-emerald-400' },
                                { key: 'speaking', label: 'S', color: 'text-indigo-400' }
                            ].map((item, idx) => {
                                const band = Number(resultData.scores?.[item.key] || 0).toFixed(1);
                                const raw = resultData.scores?.[item.rawKey];
                                const total = 40; // IELTS default
                                
                                return (
                                    <React.Fragment key={item.key}>
                                        <div className="flex flex-col items-center min-w-[44px] group relative">
                                            <div className={`absolute -top-1 font-black text-[7px] ${item.color} opacity-0 group-hover:opacity-100 transition-opacity -translate-y-full mb-1 uppercase whitespace-nowrap`}>
                                                {item.label} {raw !== undefined ? `(${raw}/${total})` : ''}
                                            </div>
                                            <div className="flex flex-col items-center leading-none">
                                                <span className={`text-[15px] font-black ${item.color} tracking-tighter`}>
                                                    {band}
                                                </span>
                                                {raw !== undefined && (
                                                    <span className="text-[9px] font-bold text-white/30 tracking-tight mt-0.5">
                                                        {raw}/{total}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {idx < 3 && <div className="w-px h-5 bg-white/10 mx-1" />}
                                    </React.Fragment>
                                );
                            })}

                            {(userData?.role === 'admin' || userData?.role === 'teacher') && (
                                <div className="flex items-center border-l border-white/10 ml-2 pl-2">
                                    <button
                                        onClick={handleSaveGrade}
                                        disabled={isSaving}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl transition-all text-blue-400 hover:text-white group active:scale-90"
                                        title="Recalculate Scores"
                                    >
                                        <span className={`text-sm transform transition-transform duration-700 ${isSaving ? 'animate-spin' : 'group-hover:rotate-180'}`}>
                                            {isSaving ? "⏳" : "🔄"}
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Overall Badge (Ultra-Premium Glass) */}
                    <div className={`relative flex flex-col items-center justify-center min-w-[80px] sm:min-w-[100px] h-11 sm:h-12 px-4 rounded-2xl border transition-all duration-700 overflow-hidden group ${
                        resultData.status === 'graded' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20' 
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20'
                    }`}>
                        <div className={`absolute inset-x-0 bottom-0 h-1 transition-all duration-700 translate-y-0.5 opacity-60 ${
                            resultData.status === 'graded' ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-amber-500 shadow-[0_0_15px_#f59e0b]'
                        }`} />
                        
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-30 group-hover:opacity-60 transition-opacity" />

                        <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60 leading-none mb-1 relative z-10">
                            {resultData.status === 'graded' ? 'FINAL BAND' : 'PROCESSING'}
                        </span>
                        <div className="flex items-center gap-1 relative z-10">
                            <span className="font-black text-xl sm:text-2xl leading-none group-hover:scale-110 transition-transform duration-500">
                                {(resultData.status === 'graded' || resultData.overallBand) 
                                    ? (resultData.overallBand || resultData.score || "-")
                                    : "---"
                                }
                            </span>
                            {resultData.status !== 'graded' && <span className="animate-pulse text-xs">⏳</span>}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-col flex-1 overflow-hidden relative">
                {/* 🚀 COMPACT QUESTION STRIP (Replacer for removed MockResultSummary) */}
                {(activeMockPart === 'listening' || activeMockPart === 'reading' || testData.type === 'listening' || testData.type === 'reading') && (
                    <div className="bg-white border-b border-gray-100 px-4 py-1.5 flex items-center justify-between shadow-sm z-[5]">
                        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap hidden sm:inline mr-2">Results:</span>
                            <div className="flex flex-wrap gap-1 max-h-[26px]">
                                {Object.entries(resultData.answers || {}).slice(0, 40).map(([qId, val], idx) => {
                                    const isCorrect = testData.questions?.find(q => q.id === qId)?.answer?.toLowerCase() === val?.toLowerCase();
                                    return (
                                        <div 
                                            key={qId} 
                                            className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[4px] flex items-center justify-center text-[8px] sm:text-[9px] font-black transition-all ${
                                                isCorrect ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-100'
                                            }`}
                                        >
                                            {idx + 1}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                                <span className="text-[9px] font-black text-gray-500 uppercase">{resultData.score || 0} Correct</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-hidden relative">
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
                        onAddToWordBank={handleAddToWordBank}
                        captureData={captureData}
                        onClearCapture={handleClearCapture}
                        testId={testData.id}
                        testName={testData.title}
                        onSaveAllWords={handleSaveAllWords}
                        isSavingWB={isSavingWB}
                        keywordTable={testData.keywordTable || MOCK_KEYWORD_TABLE}
                        userId={user?.uid}
                    />
                ) : testData.type === 'listening' ? (
                    <div className="flex flex-col w-full h-full bg-gray-50">
                        <ListeningInterface
                            key={testData.id}  // testData o'zgarganda to'liq remount
                            testData={testData}
                            userAnswers={currentAnswers}
                            onAnswerChange={handleNoOp}
                            onFlag={handleNoOp}
                            flaggedQuestions={flaggedQuestions}
                            isReviewMode={true}
                            textSize={textSize}
                            testMode="practice"
                            activePart={listeningActivePart}
                            setActivePart={setListeningActivePart}
                            audioCurrentTime={audioTime}
                        />
                    </div>
                ) : testData.type === 'writing' ? (
                    <div className="w-full h-full flex flex-col bg-gray-50">

                        {/* TABS (Task 1 / Task 2) - Agar yangi format bo'lsa */}
                        {testData.writingTasks ? (
                            <div className="bg-white border-b px-4 py-1.5 flex gap-2 shadow-sm z-10">
                                {testData.writingTasks.map(task => (
                                    <button
                                        key={task.id}
                                        onClick={() => setActiveWritingTab(task.id)}
                                        className={`px-3 py-1 text-xs font-black uppercase tracking-tight rounded-md transition ${activeWritingTab === task.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        {task.title}
                                    </button>
                                ))}
                            </div>
                        ) : null}

                        {/* WRITING CONTENT AREA */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                            {testData.writingTasks ? (
                                // --- YANGI FORMAT (Multi-Task) ---
                                testData.writingTasks.map(task => {
                                    if (task.id !== activeWritingTab) return null;

                                    // Javobni olish (xavfsiz yo'l bilan)
                                    const answer = currentAnswers ? currentAnswers[`task${task.id}`] : "";

                                    return (
                                        <div key={task.id} className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 h-full animate-fadeIn">

                                            {/* Chap: SAVOL */}
                                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md h-fit">
                                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                                                    <h3 className="font-black text-gray-800 text-[11px] uppercase tracking-wider flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                        Question ({task.title})
                                                    </h3>
                                                    <span className="text-[10px] bg-gray-50 text-gray-400 font-bold px-2 py-0.5 rounded border border-gray-100">Min: {task.minWords} words</span>
                                                </div>
                                                {task.image && <img src={task.image} className="w-full mb-3 rounded-lg border bg-gray-50/30 object-contain max-h-48" alt="Task" />}
                                                <div className="whitespace-pre-wrap text-gray-600 text-xs font-medium leading-relaxed bg-blue-50/30 p-3 rounded-lg border border-blue-100/50">
                                                    {task.prompt}
                                                </div>
                                            </div>

                                            {/* O'ng: O'QUVCHI JAVOBI */}
                                            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm transition-all hover:shadow-md h-fit relative bg-gradient-to-br from-white to-blue-50/20">
                                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-blue-100">
                                                    <h3 className="font-black text-blue-700 text-[11px] uppercase tracking-wider flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                                        Student Answer
                                                    </h3>
                                                    <div className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black shadow-sm">
                                                        {((answer || (typeof currentAnswers === 'string' ? currentAnswers : "")) + "").trim().split(/\s+/).filter(Boolean).length} WORDS
                                                    </div>
                                                </div>
                                                <div className="whitespace-pre-wrap font-serif text-gray-800 leading-relaxed text-sm bg-white p-5 rounded-lg border border-blue-100 min-h-[300px] shadow-inner selection:bg-blue-100">
                                                    {answer || (typeof currentAnswers === 'string' ? currentAnswers : null) || <span className="text-gray-400 italic">No answer provided.</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                // --- FALLBACK (Single Essay / Old Format) ---
                                <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border">
                                    <h3 className="font-bold text-gray-800 mb-4">Task Instructions</h3>
                                    {(testData.image_url || testData.image || testData.task1_image) && <img src={testData.image_url || testData.image || testData.task1_image} alt="Task" className="w-full mb-4 rounded" />}
                                    <p className="mb-6 p-4 bg-gray-50 rounded border text-sm">{testData.passage || testData.task1 || testData.prompt || testData.instruction}</p>
                                    
                                    <h3 className="font-bold text-blue-700 mb-2">Essay Answer</h3>
                                    <div className="whitespace-pre-wrap font-serif text-gray-800 p-4 border rounded bg-blue-50 leading-relaxed min-h-[200px]">
                                        {resultData.essay || 
                                         (typeof currentAnswers === 'string' ? currentAnswers : null) ||
                                         currentAnswers.task1 || 
                                         currentAnswers.writingAnswer || 
                                         currentAnswers.task2 || 
                                         "Javob yo'q"}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ✍️ ENHANCED GRADING LAB (WRITING) */}
                        {(userData?.role === 'admin' || userData?.role === 'teacher') ? (
                            <div className="bg-white border-t border-blue-500/30 p-4 lg:p-6 shadow-[0_-10px_40px_-15px_rgba(59,130,246,0.15)] z-20 backdrop-blur-xl bg-white/95 sticky bottom-0">
                                <div className="max-w-6xl mx-auto flex flex-col gap-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm">✍️</div>
                                            <div>
                                                <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest leading-none flex items-center gap-2">
                                                    Instructor Feedback
                                                    {resultData.userName && (
                                                        <span className="text-[10px] text-blue-600/60 font-bold lowercase italic tracking-tight">• evaluation for {resultData.userName}</span>
                                                    )}
                                                </h3>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Provide detailed corrections and suggestions</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col lg:flex-row gap-4 items-start">
                                        <div className="flex-1 w-full group relative">
                                            <textarea
                                                className="w-full border-2 border-gray-100 p-4 rounded-2xl text-sm min-h-[220px] lg:min-h-[260px] focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none resize-y bg-gray-50/30 focus:bg-white transition-all shadow-sm font-medium"
                                                placeholder="Example: Your task response is clear, but work on cohesive devices. Use more varied linking words..."
                                                value={adminFeedback}
                                                onChange={(e) => setAdminFeedback(e.target.value)}
                                            />
                                        </div>
                                        
                                        <div className="w-full lg:w-fit flex flex-row lg:flex-col gap-2.5 items-stretch">
                                            <div className="flex-1 lg:w-24 bg-blue-50/50 p-3 rounded-2xl border-2 border-blue-100 flex flex-col items-center justify-center group">
                                                <label className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1 shadow-sm opacity-60 text-center leading-none">Band</label>
                                                <input
                                                    type="number" step="0.5" max="9" min="0"
                                                    className="w-12 bg-transparent text-2xl font-black text-center text-blue-700 outline-none focus:scale-110 transition-transform"
                                                    placeholder="0.0"
                                                    value={adminScore}
                                                    onChange={(e) => setAdminScore(e.target.value)}
                                                />
                                            </div>
                                            
                                            <button
                                                onClick={handleSaveGrade}
                                                disabled={isSaving}
                                                className="flex-1 lg:w-24 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:bg-gray-300 flex flex-col items-center justify-center gap-1 group py-3 px-4 overflow-hidden relative"
                                            >
                                                {isSaving ? (
                                                    <span className="animate-pulse text-[10px]">...</span>
                                                ) : (
                                                    <>
                                                        <span className="text-base group-hover:scale-125 transition-transform duration-300">💾</span>
                                                        <span className="text-[8px] uppercase tracking-widest">Submit</span>
                                                    </>
                                                )}
                                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : resultData.status === 'graded' && (resultData.feedback || (resultData.type === 'mock_full' && resultData.scores?.writingFeedback)) ? (
                            <div className="bg-emerald-50/50 border-t border-emerald-500/20 p-6 lg:p-8 shadow-inner z-20">
                                <div className="max-w-4xl mx-auto flex flex-col gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-lg">📝</div>
                                        <div>
                                            <h3 className="text-sm font-black text-emerald-900 uppercase tracking-[0.2em]">Writing Feedback</h3>
                                            <p className="text-[10px] text-emerald-600/60 font-bold uppercase tracking-widest mt-1">Review your score and instructor comments</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-3xl p-6 lg:p-8 border border-emerald-100 shadow-xl shadow-emerald-900/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-100 transition-colors" />
                                        <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start">
                                            <div className="flex-1">
                                                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap font-medium italic">
                                                    "{resultData.type === 'mock_full' ? resultData.scores?.writingFeedback : resultData.feedback}"
                                                </p>
                                            </div>
                                            <div className="w-full lg:w-fit flex flex-col items-center gap-2 p-5 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/20 min-w-[120px]">
                                                <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Final Band</span>
                                                <span className="text-4xl font-black text-white">
                                                    {resultData.type === 'mock_full' ? (Number(resultData.scores?.writing || 0).toFixed(1)) : (Number(resultData.score || 0).toFixed(1))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : resultData.status !== 'graded' ? (
                            <div className="bg-amber-50/50 border-t border-amber-400/20 p-2 z-20">
                                <p className="text-center text-[10px] font-black text-amber-700 uppercase tracking-widest">⏳ Awaiting Grading by Instructor</p>
                            </div>
                        ) : null}

                    </div>

                ) : testData.type === 'speaking' ? (
                    <div className="w-full h-full flex flex-col bg-gray-50/50">
                        <div className="flex-1 flex flex-col items-center justify-center w-full p-4 overflow-y-auto">

                            <div className="w-full max-w-xl bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mb-5 text-center relative overflow-hidden group transition-all hover:shadow-xl">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
                                <h2 className="text-sm font-black uppercase tracking-widest mb-4 text-gray-800">🎤 Speaking Performance</h2>

                                {resultData.audioAnswer ? (
                                    <div className="bg-purple-50/50 p-5 rounded-xl border border-purple-100 flex flex-col items-center gap-3">
                                        <div className="bg-white p-3 rounded-full shadow-md group-hover:scale-110 transition-transform duration-500">
                                            <span className="text-3xl">🎧</span>
                                        </div>
                                        <audio controls src={resultData.audioAnswer} className="w-full max-w-md h-10 shadow-sm rounded-full" />
                                        <a href={resultData.audioAnswer} download target="_blank" rel="noreferrer" className="text-[10px] text-purple-600 hover:text-purple-700 font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                                            <span>📥</span> Download Recording
                                        </a>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 p-6 bg-red-50/50 rounded-xl border border-red-100">
                                        <span className="text-2xl">⚠️</span>
                                        <p className="text-red-600 text-xs font-black uppercase tracking-tight">Audio recording not found</p>
                                    </div>
                                )}
                            </div>

                            <div className="w-full max-w-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-px flex-1 bg-gray-200" />
                                    <h4 className="font-black text-gray-400 uppercase text-[9px] tracking-[0.2em] whitespace-nowrap">Task Description</h4>
                                    <div className="h-px flex-1 bg-gray-200" />
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-200 text-gray-600 text-[11px] whitespace-pre-wrap font-medium shadow-sm leading-relaxed max-h-[200px] overflow-y-auto">
                                    {testData.passage || testData.script || "No description available"}
                                </div>
                            </div>
                        </div>

                        {/* 🎤 ENHANCED GRADING LAB (SPEAKING) */}
                        {(userData?.role === 'admin' || userData?.role === 'teacher') ? (
                            <div className="bg-white border-t border-purple-500/30 p-4 lg:p-6 shadow-[0_-10px_40px_-15px_rgba(139,92,246,0.15)] z-20 backdrop-blur-xl bg-white/95 sticky bottom-0">
                                <div className="max-w-4xl mx-auto flex flex-col gap-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white text-sm">💬</div>
                                            <div>
                                                <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest leading-none flex items-center gap-2">
                                                    Speaking Feedback
                                                    {resultData.userName && (
                                                        <span className="text-[10px] text-purple-600/60 font-bold lowercase italic tracking-tight">• evaluation for {resultData.userName}</span>
                                                    )}
                                                </h3>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Comment on fluency, grammar, and pronunciation</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col lg:flex-row gap-4 items-start">
                                        <div className="flex-1 w-full group relative">
                                            <textarea
                                                className="w-full border-2 border-gray-100 p-4 rounded-2xl text-sm min-h-[220px] focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 outline-none resize-y bg-gray-50/30 focus:bg-white transition-all shadow-sm font-medium"
                                                placeholder="Example: Pronunciation is clear, but work on using more complex sentence structures..."
                                                value={adminFeedback}
                                                onChange={(e) => setAdminFeedback(e.target.value)}
                                            />
                                        </div>
                                        
                                        <div className="w-full lg:w-fit flex flex-row lg:flex-col gap-2.5 items-stretch">
                                            <div className="flex-1 lg:w-24 bg-purple-50/50 p-3 rounded-2xl border-2 border-purple-100 flex flex-col items-center justify-center group">
                                                <label className="text-[8px] font-black text-purple-600 uppercase tracking-widest mb-1 opacity-60 text-center leading-none">Band</label>
                                                <input
                                                    type="number" step="0.5" max="9" min="0"
                                                    className="w-12 bg-transparent text-2xl font-black text-center text-purple-700 outline-none focus:scale-110 transition-transform"
                                                    placeholder="0.0"
                                                    value={adminScore}
                                                    onChange={(e) => setAdminScore(e.target.value)}
                                                />
                                            </div>
                                            
                                            <button
                                                onClick={handleSaveGrade}
                                                disabled={isSaving}
                                                className="flex-1 lg:w-24 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl shadow-xl shadow-purple-500/20 transition-all active:scale-95 disabled:bg-gray-300 flex flex-col items-center justify-center gap-1 group py-3 px-4 overflow-hidden relative"
                                            >
                                                {isSaving ? (
                                                    <span className="animate-pulse text-[10px]">...</span>
                                                ) : (
                                                    <>
                                                        <span className="text-base group-hover:scale-125 transition-transform duration-300">💾</span>
                                                        <span className="text-[8px] uppercase tracking-widest">Save</span>
                                                    </>
                                                )}
                                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : resultData.status === 'graded' && (resultData.feedback || (resultData.type === 'mock_full' && resultData.scores?.speakingFeedback)) ? (
                            <div className="bg-emerald-50/50 border-t border-emerald-500/20 p-6 lg:p-8 shadow-inner z-20 w-full">
                                <div className="max-w-4xl mx-auto flex flex-col gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-lg">📝</div>
                                        <div>
                                            <h3 className="text-sm font-black text-emerald-900 uppercase tracking-[0.2em]">Speaking Feedback</h3>
                                            <p className="text-[10px] text-emerald-600/60 font-bold uppercase tracking-widest mt-1">Review your performance feedback</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-3xl p-6 lg:p-8 border border-emerald-100 shadow-xl shadow-emerald-900/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-100 transition-colors" />
                                        <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start">
                                            <div className="flex-1">
                                                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap font-medium italic">
                                                    "{resultData.type === 'mock_full' ? resultData.scores?.speakingFeedback : resultData.feedback}"
                                                </p>
                                            </div>
                                            <div className="w-full lg:w-fit flex flex-col items-center gap-2 p-5 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/20 min-w-[120px]">
                                                <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Final Band</span>
                                                <span className="text-4xl font-black text-white">
                                                    {resultData.type === 'mock_full' ? (Number(resultData.scores?.speaking || 0).toFixed(1)) : (Number(resultData.score || 0).toFixed(1))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : resultData.status !== 'graded' ? (
                            <div className="bg-purple-50/50 border-t border-purple-400/20 p-2 z-20">
                                <p className="text-center text-[10px] font-black text-purple-700 uppercase tracking-widest">⏳ Instructor evaluation pending</p>
                            </div>
                        ) : null}
                    </div>
                ) : null}
                </div>
            </div>
        </div>
    );
}
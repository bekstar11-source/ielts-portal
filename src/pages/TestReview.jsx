import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Volume1, VolumeX } from 'lucide-react';
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
    const [task1Band, setTask1Band] = useState("");
    const [task2Band, setTask2Band] = useState("");
    const [adminFeedback, setAdminFeedback] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // --- MOCK REVIEW STATE ---
    const [activeMockPart, setActiveMockPart] = useState('listening'); // listening, reading, writing
    const [currentAnswers, setCurrentAnswers] = useState({}); // Active part answers
    const [listeningActivePart, setListeningActivePart] = useState(0); // Listening part tab
    const [audioTime, setAudioTime] = useState(0); // Audio vaqti
    const [volume, setVolume] = useState(1);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);

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
                setTask1Band(rData.task1Band || "");
                setTask2Band(rData.task2Band || "");
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
        if (activeMockPart === 'writing' && (!task1Band || !task2Band)) {
            return alert("T1 va T2 ballarini kiriting!");
        }
        if (activeMockPart === 'speaking' && adminScore === "") {
            return alert("Iltimos, ball qo'ying!");
        }

        setIsSaving(true);
        try {
            const resultRef = doc(db, "results", id);

            let scoreVal = Number(adminScore);
            let t1 = Number(task1Band);
            let t2 = Number(task2Band);

            if (activeMockPart === 'writing') {
                scoreVal = calculateOverallBand(t1, t2, t2);
            }

            const updatePayload = {
                score: scoreVal,
                bandScore: scoreVal,
                task1Band: t1 || 0,
                task2Band: t2 || 0,
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

            {/* --- CLEAN & PREMIUM HEADER --- */}
            <header className="h-16 bg-zinc-950 text-white flex justify-between items-center px-4 sm:px-6 shrink-0 z-20 border-b border-white/5 relative">
                {/* 1. LEFT: NAVIGATION & TITLES */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(userData?.role === 'admin' || userData?.role === 'teacher' ? '/admin/results' : '/my-results')}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95 group"
                        title="Back to results"
                    >
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="flex flex-col min-w-0">
                        <h1 className="text-[14px] font-bold text-white tracking-tight truncate max-w-[150px] sm:max-w-[280px]">
                            {testData.title}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                                {resultData.userName || 'Student'}
                            </span>
                            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                resultData.type === 'mock_full' ? 'text-indigo-400 bg-indigo-400/10' : 'text-blue-400 bg-blue-400/10'
                            }`}>
                                {resultData.type === 'mock_full' ? 'FULL MOCK' : 'PARTIAL'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. CENTER: INTERACTIVE CONTROLS */}
                <div className="flex-1 flex justify-center items-center gap-6 px-4">
                    {/* Minimal Section Selector */}
                    {resultData.type === 'mock_full' && (
                        <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5 shadow-inner">
                            {['listening', 'reading', 'writing', 'speaking'].map(part => {
                                const isActive = activeMockPart === part;
                                const label = part.charAt(0).toUpperCase();
                                return (
                                    <button
                                        key={part}
                                        onClick={() => setActiveMockPart(part)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-[11px] font-black transition-all relative ${
                                            isActive 
                                                ? 'bg-white text-zinc-950 shadow-lg scale-105' 
                                                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
                                        }`}
                                        title={part}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Audio Player & Volume (Only for Listening results or active Listening part in Full Mock) */}
                    {(testData.type?.toLowerCase() === 'listening' || (resultData.type === 'mock_full' && activeMockPart === 'listening')) && (
                        <div className="flex items-center gap-3 flex-1 max-w-[400px]">
                            <div className="flex-1">
                                {testData.passages?.map((passage, index) => {
                                    const src = passage.audio || testData?.audio || testData?.audio_url || testData?.audioUrl || testData?.file;
                                    if (!src) return null;
                                    return (
                                        <CustomAudioPlayer
                                            key={index}
                                            src={src}
                                            index={index}
                                            variant="dark"
                                            activePart={listeningActivePart}
                                            testMode="practice"
                                            setAudioTime={setAudioTime}
                                            volume={volume}
                                            startTime={passage.startTime || 0}
                                            endTime={passage.endTime || 0}
                                        />
                                    );
                                })}
                                {(!testData.passages || testData.passages.length === 0) && (testData?.audio || testData?.audio_url || testData?.audioUrl || testData?.file) && (
                                    <CustomAudioPlayer
                                        src={testData?.audio || testData?.audio_url || testData?.audioUrl || testData?.file}
                                        index={0}
                                        variant="dark"
                                        activePart={listeningActivePart}
                                        testMode="practice"
                                        setAudioTime={setAudioTime}
                                        volume={volume}
                                        startTime={0}
                                        endTime={0}
                                    />
                                )}
                            </div>

                            {/* Discrete Volume */}
                            <div className="relative">
                                <button
                                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                                        showVolumeSlider ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                                    }`}
                                    onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                                >
                                    {volume === 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
                                </button>
                                
                                <AnimatePresence>
                                    {showVolumeSlider && (
                                        <>
                                            <div className="fixed inset-0 z-[100]" onClick={() => setShowVolumeSlider(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute top-full right-0 mt-3 p-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-[101] min-w-[200px]"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-bold text-gray-500 w-8">{Math.round(volume * 100)}%</span>
                                                    <input
                                                        type="range" min="0" max="1" step="0.01" value={volume}
                                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                                        className="flex-1 accent-white h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                                                    />
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. RIGHT: PERFORMANCE MATRICS */}
                <div className="flex items-center gap-4">
                    {/* Consolidates Section Scores */}
                    {resultData.type === 'mock_full' && (
                        <div className="hidden lg:flex items-center bg-zinc-900/80 rounded-2xl px-4 py-2 border border-white/5 divide-x divide-white/5">
                            {[
                                { key: 'listeningBand', label: 'L', color: 'text-purple-400' },
                                { key: 'readingBand', label: 'R', color: 'text-blue-400' },
                                { key: 'writing', label: 'W', color: 'text-emerald-400' },
                                { key: 'speaking', label: 'S', color: 'text-indigo-400' }
                            ].map((item) => (
                                <div key={item.key} className="px-3 flex flex-col items-center first:pl-0 last:pr-0">
                                    <span className="text-[9px] font-black text-white/30 tracking-tighter uppercase mb-0.5">{item.label}</span>
                                    <span className={`text-[14px] font-bold ${item.color}`}>
                                        {Number(resultData.scores?.[item.key] || 0).toFixed(1)}
                                    </span>
                                </div>
                            ))}
                            {(userData?.role === 'admin' || userData?.role === 'teacher') && (
                                <button
                                    onClick={handleSaveGrade}
                                    disabled={isSaving}
                                    className="pl-3 text-zinc-500 hover:text-white transition-colors"
                                    title="Recalculate"
                                >
                                    <div className={isSaving ? 'animate-spin' : ''}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </div>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Overall Score Badge */}
                    <div className={`h-11 px-5 rounded-xl border flex items-center gap-3 transition-all duration-500 ${
                        (resultData.status === 'graded' || resultData.overallBand)
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black tracking-widest uppercase opacity-60">Overall</span>
                            <span className="text-lg font-black leading-tight">
                                {resultData.overallBand || resultData.writingBand || resultData.score || "---"}
                            </span>
                        </div>
                        {resultData.status !== 'graded' && !resultData.overallBand && (
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse border border-amber-400/50" />
                        )}
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
                                    const q = testData.questions?.find(q => String(q.id) === String(qId));
                                    const ans = q?.answer || q?.correct_answer || q?.correctAnswer || q?.correct_answer_value;
                                    const isCorrect = String(ans || "").toLowerCase() === String(val || "").toLowerCase();
                                    return (
                                        <div
                                            key={qId}
                                            className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[4px] flex items-center justify-center text-[8px] sm:text-[9px] font-black transition-all ${isCorrect ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-100'
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
                    {testData.type?.toLowerCase() === 'reading' ? (
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
                    ) : testData.type?.toLowerCase() === 'listening' ? (
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
                    ) : testData.type?.toLowerCase() === 'writing' ? (
                        <div className="w-full h-full flex flex-col bg-[#F5F5F7]">
                            {/* WRITING CONTENT AREA - VERTICAL SCROLL */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12">
                                <div className="max-w-[800px] mx-auto flex flex-col gap-16 pb-20">
                                    {testData.writingTasks ? (
                                        testData.writingTasks.map(task => {
                                            const answer = currentAnswers ? currentAnswers[`task${task.id}`] : "";

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
                                                            <span className="text-[11px] font-medium text-gray-500 bg-[#F5F5F7] px-3 py-1 rounded-full uppercase tracking-wider">Min {task.minWords} words</span>
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
                                                                {((answer || (typeof currentAnswers === 'string' ? currentAnswers : "")) + "").trim().split(/\s+/).filter(Boolean).length} WORDS
                                                            </div>
                                                        </div>

                                                        <div className="whitespace-pre-wrap font-serif text-[#1d1d1f] text-[16px] leading-[1.8] min-h-[150px]">
                                                            {answer || (typeof currentAnswers === 'string' ? currentAnswers : null) || <span className="text-gray-400 italic">No answer provided.</span>}
                                                        </div>
                                                    </div>

                                                    {/* AI FEEDBACK CARD (IF GRADED) */}
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
                                        })
                                    ) : (
                                        // --- FALLBACK (Single Essay / Old Format) ---
                                        <div className="max-w-[800px] mx-auto flex flex-col gap-8">
                                            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                                <h3 className="font-semibold text-[13px] uppercase tracking-widest text-[#1d1d1f] mb-6">Task Instructions</h3>
                                                {(testData.image_url || testData.image || testData.task1_image) && <img src={testData.image_url || testData.image || testData.task1_image} alt="Task" className="w-full mb-6 rounded-2xl" />}
                                                <p className="text-[#1d1d1f] leading-relaxed text-[15px]">{testData.passage || testData.task1 || testData.prompt || testData.instruction}</p>
                                            </div>

                                            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                                <h3 className="font-semibold text-[13px] uppercase tracking-widest text-[#1d1d1f] mb-6">Student Answer</h3>
                                                <div className="whitespace-pre-wrap font-serif text-[#1d1d1f] text-[16px] leading-[1.8]">
                                                    {resultData.essay ||
                                                        (typeof currentAnswers === 'string' ? currentAnswers : null) ||
                                                        currentAnswers.task1 ||
                                                        currentAnswers.writingAnswer ||
                                                        currentAnswers.task2 ||
                                                        <span className="text-gray-400 italic">No answer provided.</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ✍️ COMPACT GRADING LAB (WRITING) OR STUDENT FINAL FEEDBACK */}
                                    {(userData?.role === 'admin' || userData?.role === 'teacher') ? (
                                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col gap-6 relative overflow-hidden mt-8">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 opacity-80"></div>
                                            <div className="flex flex-col lg:flex-row gap-4 items-end">

                                                {/* Feedback Area */}
                                                <div className="flex-1 w-full space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-[10px] text-white">✍️</div>
                                                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Feedback</h3>
                                                    </div>
                                                    <textarea
                                                        className="w-full border border-gray-200 p-3 rounded-xl text-sm min-h-[60px] lg:min-h-[80px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-y bg-gray-50/50 focus:bg-white transition-all font-medium"
                                                        placeholder="Izoh yozing..."
                                                        value={adminFeedback}
                                                        onChange={(e) => setAdminFeedback(e.target.value)}
                                                    />
                                                </div>

                                                {/* Selectors & Button */}
                                                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto pb-1">
                                                    {testData.type === 'writing' || activeMockPart === 'writing' ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex flex-col items-center px-3 py-1 bg-blue-50 rounded-xl border border-blue-100">
                                                                <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter">T1</span>
                                                                <select value={task1Band} onChange={(e) => setTask1Band(e.target.value)} className="bg-transparent text-sm font-black text-blue-700 outline-none">
                                                                    <option value="">--</option>
                                                                    {[3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map(v => <option key={v} value={v}>{v}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="flex flex-col items-center px-3 py-1 bg-blue-50 rounded-xl border border-blue-100">
                                                                <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter">T2</span>
                                                                <select value={task2Band} onChange={(e) => setTask2Band(e.target.value)} className="bg-transparent text-sm font-black text-blue-700 outline-none">
                                                                    <option value="">--</option>
                                                                    {[3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map(v => <option key={v} value={v}>{v}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="flex flex-col items-center px-4 py-1.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/10">
                                                                <span className="text-[8px] font-black uppercase tracking-tighter opacity-80">Overall</span>
                                                                <div className="text-sm font-black leading-none mt-0.5">
                                                                    {calculateOverallBand(Number(task1Band || 0), Number(task2Band || 0), Number(task2Band || 0)).toFixed(1)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 gap-3">
                                                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider">Band</span>
                                                            <input
                                                                type="number" step="0.5" max="9" min="0"
                                                                className="w-8 bg-transparent text-base font-black text-center text-blue-700 outline-none"
                                                                placeholder="0.0"
                                                                value={adminScore}
                                                                onChange={(e) => setAdminScore(e.target.value)}
                                                            />
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={handleSaveGrade}
                                                        disabled={isSaving}
                                                        className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_8px_20px_rgb(37,99,235,0.2)] transition-all active:scale-95 disabled:bg-gray-300 w-full lg:w-auto"
                                                    >
                                                        {isSaving ? 'Saving...' : 'Submit'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : ((resultData.status === 'graded' || resultData.writingBand != null || resultData.scores?.writing != null) && (resultData.feedback || resultData.teacherFeedback || (resultData.type === 'mock_full' && (resultData.scores?.writingFeedback || resultData.teacherFeedback)))) ? (
                                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col gap-6 relative overflow-hidden mt-8">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-80"></div>
                                            <div className="w-full flex flex-col gap-6">
                                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 text-lg">📝</div>
                                                    <div>
                                                        <h3 className="font-semibold text-[#1d1d1f] text-sm uppercase tracking-widest">Writing Feedback</h3>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Review your score and instructor comments</p>
                                                    </div>
                                                </div>

                                                <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start pt-2">
                                                    <div className="flex-1">
                                                        <p className="text-[#1d1d1f] text-[15px] leading-relaxed whitespace-pre-wrap font-medium bg-[#FBFBFD] p-5 rounded-2xl border border-gray-100">
                                                            "{resultData.type === 'mock_full' ? (resultData.scores?.writingFeedback || resultData.teacherFeedback || resultData.feedback) : (resultData.teacherFeedback || resultData.feedback)}"
                                                        </p>
                                                    </div>
                                                    <div className="w-full lg:w-fit flex flex-col items-center gap-2 p-5 bg-emerald-500 rounded-2xl shadow-[0_8px_20px_rgb(16,185,129,0.2)] min-w-[140px]">
                                                        <span className="text-[10px] font-black text-emerald-50 uppercase tracking-widest">Final Band</span>
                                                        <span className="text-5xl font-black text-white">
                                                            {resultData.type === 'mock_full' ? (Number(resultData.scores?.writing || resultData.writingBand || 0).toFixed(1)) : (Number(resultData.score || resultData.writingBand || 0).toFixed(1))}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (resultData.status !== 'graded' && !resultData.writingBand && !resultData.scores?.writing) ? (
                                        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 mt-8 flex justify-center items-center">
                                            <p className="text-center text-[11px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                                <span className="animate-pulse">⏳</span> Awaiting Grading by Instructor
                                            </p>
                                        </div>
                                    ) : null}

                                </div>
                            </div>
                        </div>

                    ) : testData.type?.toLowerCase() === 'speaking' ? (
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
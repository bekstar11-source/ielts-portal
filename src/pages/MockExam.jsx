import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import ReadingInterface from "../components/ReadingInterface/ReadingInterface";
import ListeningInterface from "../components/ListeningInterface/ListeningInterface";
import WritingInterface from "../components/WritingInterface/WritingInterface";
import TestHeader from "../components/TestSolving/TestHeader";
import { Particles } from "../components/ui/particles";

export default function MockExam() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, userData } = useAuth();

    // Dashboarddan kelgan ma'lumot (ID lar)
    const mockData = location.state?.mockData;

    const [stage, setStage] = useState('loading'); // loading, intro, listening, reading, writing, result, saving
    const [tests, setTests] = useState({ listening: null, reading: null, writing: null });
    // Consolidated answers: listening and reading are maps {id: val}, writing is {task1: val, task2: val}
    const [answers, setAnswers] = useState({
        listening: {},
        reading: {},
        writing: {}
    });
    const [timeLeft, setTimeLeft] = useState(0);
    const [introWait, setIntroWait] = useState(0);
    const [systemVolume, setSystemVolume] = useState(1);
    const [activePart, setActivePart] = useState(0); // For Listening
    const [audioTime, setAudioTime] = useState(0);
    const [textSize, setTextSize] = useState('text-base');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, msg: '' });
    const [cheatWarning, setCheatWarning] = useState({ isOpen: false, count: 0, msg: '' });
    const stageRef = useRef(stage);
    const answersRef = useRef(answers);

    useEffect(() => {
        stageRef.current = stage;
    }, [stage]);

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft]);

    // Timer logic for Volume Check Intro
    useEffect(() => {
        if (stage === 'listening_volume_check' && introWait > 0) {
            const timer = setInterval(() => {
                setIntroWait(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setStage('listening');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [stage, introWait]);

    // 3. FULLSCREEN & SECURITY EVENTS
    useEffect(() => {
        const isProtectedStage = stage !== 'intro' && stage !== 'result' && stage !== 'loading' && stage !== 'saving';

        const triggerCheatWarning = (message) => {
            if (!isProtectedStage) return;
            setCheatWarning(prev => ({ 
                isOpen: true, 
                count: prev.count + 1, 
                msg: message 
            }));
        };

        const handleFullScreenChange = () => {
            if (!document.fullscreenElement && isProtectedStage && !cheatWarning.isOpen) {
                triggerCheatWarning("Diqqat! Imtihon vaqtida To'liq Ekran (Full Screen) rejimidan chiqish qat'iyan man etiladi.");
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden && isProtectedStage && !cheatWarning.isOpen) {
                triggerCheatWarning("Diqqat! Imtihon vaqtida boshqa oyna (Tab) yoki dasturlarga o'tish qat'iyan man etiladi.");
            }
        };
        
        const handleContextMenu = (e) => {
            if (isProtectedStage) e.preventDefault();
        };
        
        const handleCopy = (e) => {
            if (stage !== 'writing' && isProtectedStage) e.preventDefault();
        };
        
        const handleBeforeUnload = (e) => {
            if (isProtectedStage) {
                finishExam(); // Try to save before leaving
                e.preventDefault();
                e.returnValue = "Imtihonni tark etmoqchimisiz? Ma'lumotlar saqlanmasligi mumkin.";
            }
        };

        const handlePopState = (e) => {
            if (isProtectedStage) {
                alert("Imtihonni tark etyapsiz! Javoblaringiz avtomatik saqlanmoqda...");
                finishExam(); // If user clicks back
            }
        };

        // If user already cheated 3 times, finish it
        if (cheatWarning.count >= 3 && isProtectedStage) {
            alert("⚠️ QOIDABUZARLIK! Siz qoidalarni 3 marta buzdingiz. Imtihon avtomatik tarzda yakunlandi va javoblaringiz baholashga yuborildi.");
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }
            setCheatWarning(prev => ({ ...prev, isOpen: false }));
            finishExam();
        }

        // Popstate mock guard
        window.history.pushState({ mockTestGuard: true }, '');

        document.addEventListener('fullscreenchange', handleFullScreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopy);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopy);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [stage, cheatWarning.isOpen, cheatWarning.count]);

    // 4. ACTIONS
    const startExam = async () => {
        try {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }
        } catch (err) {
            console.log("Full screen error:", err);
        }

        const waitTime = Number(tests.listening?.introDuration || 0);
        if (waitTime > 0) {
            setStage('listening_volume_check');
            setIntroWait(waitTime);
        } else {
            setStage('listening');
        }
        setTimeLeft(30 * 60); // 30 min (Listening)
    };

    const handleNextStage = () => {
        const currentStage = stageRef.current;
        if (currentStage === 'listening') {
            setStage('reading_intro');
        } else if (currentStage === 'reading_intro') {
            setStage('reading');
            setTimeLeft(60 * 60); // 60 min
        } else if (currentStage === 'reading') {
            setStage('writing_intro');
        } else if (currentStage === 'writing_intro') {
            setStage('writing');
            setTimeLeft(60 * 60); // 60 min (Writing)
        } else if (currentStage === 'writing') {
            finishExam();
        }
    };

    const handleFinishClick = () => {
        const currentStage = stageRef.current;
        let sectionName = "";
        if (currentStage === 'listening') sectionName = "Listening";
        else if (currentStage === 'reading') sectionName = "Reading";
        else if (currentStage === 'writing') sectionName = "Writing";
        else return;

        const confirmMsg = currentStage === 'writing'
            ? "Writing qismini yakunlab, butun imtihonni topshirmoqchimisiz?"
            : `${sectionName} qismini yakunlamoqchimisiz? Keyin bu qismga qayta olmaysiz.`;

        setConfirmModal({ isOpen: true, msg: confirmMsg });
    };

    const handleAnswer = (qId, val) => {
        setAnswers(prev => ({
            ...prev,
            [stage]: { ...prev[stage], [qId]: val }
        }));
    };

    const finishExam = async () => {
        setStage('saving');

        const currentAnswers = answersRef.current;
        let lScore = 0, rScore = 0;

        tests.listening.questions.forEach(q => {
            if (String(currentAnswers.listening[q.id] || "").trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()) lScore++;
        });

        tests.reading.questions.forEach(q => {
            if (String(currentAnswers.reading[q.id] || "").trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()) rScore++;
        });

        // Saqlash
        await addDoc(collection(db, "results"), {
            userId: user.uid,
            userName: userData?.fullName || "User",
            testTitle: "FULL MOCK EXAM",
            type: "mock_full",
            mockKey: mockData.mockKey,
            subTests: mockData.subTests, 
            date: new Date().toISOString(),
            scores: {
                listening: lScore,
                reading: rScore,
                writing: null 
            },
            details: {
                listeningAnswers: currentAnswers.listening,
                readingAnswers: currentAnswers.reading,
                writingAnswers: currentAnswers.writing 
            },
            status: 'pending_review'
        });

        setStage('result');
    };

    // --- RENDER ---
    if (stage === 'loading' || stage === 'saving') return <div className="h-screen flex items-center justify-center text-xl font-bold">Yuklanmoqda...</div>;

    if (stage === 'intro') {
        return (
            <div className="relative min-h-screen bg-gray-50 flex items-center justify-center p-4 overflow-hidden font-sans select-none">
                {/* Background Particles */}
                <Particles
                    className="absolute inset-0 z-0 pointer-events-none"
                    quantity={120}
                    ease={80}
                    color="#64748b"
                    refresh
                />

                {/* Main Content */}
                <div className="relative z-10 w-full max-w-4xl bg-white/80 backdrop-blur-xl border border-gray-200 p-10 md:p-14 rounded-[32px] text-center shadow-2xl animate-in fade-in zoom-in duration-700">
                    <div className="inline-flex items-center justify-center p-4 bg-gray-100 rounded-full mb-8 shadow-sm border border-gray-200">
                         <svg className="w-10 h-10 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21l9-5-9-5-9 5 9 5z" />
                         </svg>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight text-gray-900 uppercase" style={{ letterSpacing: "-0.03em" }}>
                        IELTS Mock Exam
                    </h1>
                    
                    <p className="text-gray-500 text-lg md:text-xl mb-12 font-medium">Please read the instructions carefully before starting the test.</p>

                    <div className="grid md:grid-cols-3 gap-6 mb-12 text-left">
                        <div className="bg-white border border-gray-200 p-6 rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300 transform hover:-translate-y-1">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                </div>
                                <span className="text-blue-600 font-bold uppercase tracking-wider text-xs">Section 1</span>
                            </div>
                            <span className="text-gray-900 text-2xl font-black mt-1">Listening</span>
                            <span className="text-gray-500 text-sm font-medium">30 minutes • 4 parts</span>
                        </div>
                        <div className="bg-white border border-gray-200 p-6 rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300 transform hover:-translate-y-1">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                </div>
                                <span className="text-emerald-600 font-bold uppercase tracking-wider text-xs">Section 2</span>
                            </div>
                            <span className="text-gray-900 text-2xl font-black mt-1">Reading</span>
                            <span className="text-gray-500 text-sm font-medium">60 minutes • 3 passages</span>
                        </div>
                        <div className="bg-white border border-gray-200 p-6 rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300 transform hover:-translate-y-1">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </div>
                                <span className="text-purple-600 font-bold uppercase tracking-wider text-xs">Section 3</span>
                            </div>
                            <span className="text-gray-900 text-2xl font-black mt-1">Writing</span>
                            <span className="text-gray-500 text-sm font-medium">60 minutes • 2 tasks</span>
                        </div>
                    </div>

                    <div className="max-w-3xl mx-auto mb-12 bg-red-50 border border-red-200 rounded-2xl p-5 text-left flex items-start gap-4">
                        <svg className="w-7 h-7 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <p className="text-gray-700 text-[15px] leading-relaxed">
                            <strong className="text-red-900 block mb-1">Strict Proctoring Rules:</strong> This test requires Full-Screen mode. Leaving the screen, opening new tabs, or returning to normal mode will be caught by our anti-cheat system. Violating the rules 3 times will result in an automatic termination.
                        </p>
                    </div>

                    <button 
                        onClick={startExam} 
                        className="w-full md:w-auto px-16 py-5 bg-gray-900 text-white rounded-full font-black tracking-widest text-lg hover:bg-black transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
                    >
                        START EXAMINATION
                    </button>
                    <p className="mt-8 text-gray-500 text-[13px] uppercase tracking-widest font-semibold font-mono">Connect your headphones 🔊</p>
                </div>
            </div>
        );
    }

    if (stage === 'reading_intro') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-white via-orange-50/50 to-white flex items-center justify-center p-4">
                <div className="bg-white/90 backdrop-blur-md max-w-lg w-full p-8 rounded-[32px] text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-orange-100/60">
                    <h1 className="text-3xl font-black mb-4 text-gray-900 tracking-tight">📖 Reading Section</h1>
                    <div className="text-left bg-orange-50/50 p-6 rounded-2xl mb-8 space-y-3 text-sm text-gray-700 border border-orange-100 shadow-sm shadow-orange-100/20">
                        <p><b className="text-gray-900">Duration:</b> 60 minutes</p>
                        <p><b className="text-gray-900">Format:</b> 3 reading passages</p>
                        <p><b className="text-gray-900">Questions:</b> 40 questions total</p>
                        <p className="mt-4 pt-4 border-t border-orange-200/50 leading-relaxed text-gray-600">
                            Please note that no extra time is given to transfer your answers to an answer sheet. Time management is crucial.
                        </p>
                    </div>
                    <button onClick={handleNextStage} className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-4 rounded-2xl font-black text-lg hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg shadow-orange-500/25 active:scale-[0.98]">
                        Start Reading Test
                    </button>
                </div>
            </div>
        );
    }

    if (stage === 'writing_intro') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-white via-orange-50/50 to-white flex items-center justify-center p-4">
                <div className="bg-white/90 backdrop-blur-md max-w-lg w-full p-8 rounded-[32px] text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-orange-100/60">
                    <h1 className="text-3xl font-black mb-4 text-gray-900 tracking-tight">📝 Writing Section</h1>
                    <div className="text-left bg-orange-50/50 p-6 rounded-2xl mb-8 space-y-3 text-sm text-gray-700 border border-orange-100 shadow-sm shadow-orange-100/20">
                        <p><b className="text-gray-900">Duration:</b> 60 minutes</p>
                        <p><b className="text-gray-900">Format:</b> 2 tasks</p>
                        <p><b className="text-gray-900">Task 1:</b> Minimum 150 words (recommended: 20 minutes)</p>
                        <p><b className="text-gray-900">Task 2:</b> Minimum 250 words (recommended: 40 minutes)</p>
                        <p className="mt-4 pt-4 border-t border-orange-200/50 leading-relaxed text-gray-600">
                            Make sure to read the prompts carefully and manage your time appropriately between the two tasks.
                        </p>
                    </div>
                    <button onClick={handleNextStage} className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-4 rounded-2xl font-black text-lg hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg shadow-orange-500/25 active:scale-[0.98]">
                        Start Writing Test
                    </button>
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

    const logicalStage = stage === 'listening_volume_check' ? 'listening' : stage;
    const currentTest = tests[logicalStage];

    const volumeChange = (e) => {
        const vol = parseFloat(e.target.value);
        setSystemVolume(vol);
        const a = document.getElementById("audio-part-0");
        if (a) a.volume = vol;
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
            {/* HEADER */}
            <TestHeader
                test={currentTest}
                timeLeft={timeLeft}
                saving={stage === 'saving'}
                testMode="exam"
                onFinish={handleFinishClick}
                textSize={textSize}
                setTextSize={setTextSize}
                showResult={stage === 'result'}
                showModeSelection={false}
                activePart={activePart}
                setActivePart={setActivePart}
                setAudioTime={setAudioTime}
                triggerPlay={stage === 'listening' || stage === 'listening_volume_check'}
                buttonText={(stage === 'listening' || stage === 'listening_volume_check') ? 'Move to reading' : stage === 'reading' ? 'Move to writing' : 'Finish'}
            />

            <div className="flex-1 overflow-hidden relative">
                {stage === 'listening_volume_check' ? (
                    <div className="absolute inset-0 bg-gradient-to-br from-white via-orange-50/50 to-white z-50 flex items-center justify-center text-gray-900">
                        <div className="text-center max-w-lg p-10 bg-white/90 backdrop-blur-md rounded-[32px] shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-orange-100/60 animate-fade-in-up">
                            <div className="w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-orange-200/50">
                                <svg className="w-12 h-12 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-black mb-4 tracking-tight text-gray-900">Volume Check</h2>
                            <p className="text-gray-500 mb-8 font-medium leading-relaxed">
                                Please ensure you can hear the audio clearly. Adjust the volume below if necessary. The test will automatically begin in:
                            </p>
                            
                            <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-orange-600 mb-8 font-mono tabular-nums">
                                {introWait}s
                            </div>

                            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 mb-8 shadow-inner shadow-gray-50/50">
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={systemVolume}
                                    onChange={volumeChange}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500 shadow-sm"
                                />
                            </div>

                            <div className="flex justify-center items-center gap-3">
                                <span className="flex h-3 w-3 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                </span>
                                <span className="text-sm text-blue-400 font-bold uppercase tracking-wider">Audio direction is playing</span>
                            </div>
                        </div>
                    </div>
                ) : stage === 'listening' ? (
                    <ListeningInterface
                        testData={tests.listening}
                        userAnswers={answers.listening}
                        onAnswerChange={handleAnswer}
                        onFlag={() => { }} // Not strictly required for mock but good to have if needed
                        flaggedQuestions={new Set()}
                        activePart={activePart}
                        setActivePart={setActivePart}
                        textSize={textSize}
                        audioCurrentTime={audioTime}
                        hideSecondaryIntro={true}
                    />
                ) : stage === 'reading' ? (
                    <ReadingInterface
                        testData={tests.reading}
                        userAnswers={answers.reading}
                        onAnswerChange={handleAnswer}
                        onFlag={() => { }}
                        flaggedQuestions={new Set()}
                        textSize={textSize}
                    />
                ) : (
                    <WritingInterface
                        testData={tests.writing}
                        userAnswers={answers.writing}
                        onAnswerChange={handleAnswer}
                        textSize={textSize}
                    />
                )}
            </div>

            {/* Custom Confirm Modal for Finish / Move to... */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 border border-gray-100 flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-orange-500">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900">Are you sure?</h3>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            {confirmModal.msg}
                        </p>
                        <div className="flex gap-3 justify-end mt-2">
                            <button
                                onClick={() => setConfirmModal({ isOpen: false, msg: '' })}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={() => {
                                    setConfirmModal({ isOpen: false, msg: '' });
                                    handleNextStage();
                                }}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md transition"
                            >
                                Ha, ishonchim komil
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Anti-Cheat / Security Warning Modal */}
            {cheatWarning.isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/90 backdrop-blur-md transition-all duration-300">
                    <div className="bg-white p-8 rounded-[24px] shadow-2xl max-w-md w-full mx-4 border-2 border-red-500 flex flex-col items-center text-center animate-fade-in-up">
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Qoidabuzarlik Aniqlandi!</h2>
                        <p className="text-red-600 font-bold mb-4 bg-red-50 py-2 px-4 rounded-xl border border-red-100">
                            Qoida {cheatWarning.count} marta buzildi
                        </p>
                        <p className="text-gray-600 font-medium mb-8 leading-relaxed">
                            {cheatWarning.msg} Agar qoidabuzarlik davom etsa, imtihon avtomatik ravishda to'xtatilib baholanadi. Iltimos, barcha diqqatingizni testga qaratib xaritadan chiqmang.
                        </p>
                        <button
                            onClick={async () => {
                                // Close modal and re-request full screen
                                setCheatWarning(prev => ({ ...prev, isOpen: false }));
                                try {
                                    const elem = document.documentElement;
                                    if (elem.requestFullscreen) await elem.requestFullscreen();
                                    else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
                                    else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
                                } catch (err) { console.log(err); }
                            }}
                            className="w-full py-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 transition-all active:scale-95 text-lg"
                        >
                            Tushundim, testga qaytish
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
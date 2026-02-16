import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import ReadingInterface from "../components/ReadingInterface/ReadingInterface";
import ListeningInterface from "../components/ListeningInterface/ListeningInterface";
import WritingInterface from "../components/WritingInterface/WritingInterface";
import TestHeader from "../components/TestSolving/TestHeader";

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
    const [activePart, setActivePart] = useState(0); // For Listening
    const [audioTime, setAudioTime] = useState(0);
    const [textSize, setTextSize] = useState('text-base');

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
        setAnswers(prev => ({
            ...prev,
            [stage]: { ...prev[stage], [qId]: val }
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
            subTests: mockData.subTests, // Save subtest IDs for review compatibility
            date: new Date().toISOString(),
            scores: {
                listening: lScore,
                reading: rScore,
                writing: null // Admin tekshiradi
            },
            details: {
                listeningAnswers: answers.listening,
                readingAnswers: answers.reading,
                writingAnswers: answers.writing // Now an object {task1: ..., task2: ...}
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
    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
            {/* HEADER */}
            <TestHeader
                test={currentTest}
                timeLeft={timeLeft}
                saving={stage === 'saving'}
                testMode="exam"
                onFinish={handleNextStage}
                textSize={textSize}
                setTextSize={setTextSize}
                showResult={stage === 'result'}
                showModeSelection={false}
                activePart={activePart}
                setAudioTime={setAudioTime}
            />

            <div className="flex-1 overflow-hidden relative">
                {stage === 'listening' ? (
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
        </div>
    );
}
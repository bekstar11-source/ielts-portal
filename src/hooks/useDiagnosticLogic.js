import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc, addDoc, collection, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { calculateBandScore, checkAnswer } from "../utils/ieltsScoring";
import { logAction } from "../utils/logger";

export function useDiagnosticLogic() {
    const { testId } = useParams();
    const navigate = useNavigate();
    const { user, userData } = useAuth();

    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userAnswers, setUserAnswers] = useState({});
    const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
    const [saving, setSaving] = useState(false);

    // Diagnostic test defaults -> Exam Mode
    const [timeLeft, setTimeLeft] = useState(1200); // Ex: 20 min short test
    const [textSize, setTextSize] = useState('text-base');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [activePart, setActivePart] = useState(0);
    const [audioTime, setAudioTime] = useState(0);

    const [startedAt] = useState(new Date());

    useEffect(() => {
        if (!testId || !user) return;

        const fetchTest = async () => {
            try {
                // No permission checks for diagnostic in Public mode
                const docRef = doc(db, "tests", testId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = { id: docSnap.id, ...docSnap.data() };
                    if (data.type) data.type = data.type.toLowerCase();
                    setTest(data);

                    if (data.type === 'listening') setTimeLeft(1200);
                    else setTimeLeft(1200);
                } else {
                    alert("Diagnostic Test topilmadi!");
                    navigate("/dashboard");
                }
            } catch (error) {
                console.error("Xatolik:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTest();
    }, [testId, navigate, user]);

    useEffect(() => {
        if (loading || !test || timeLeft <= 0) return;
        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, [timeLeft, loading, test]);

    const handleSelectAnswer = (questionId, option) => {
        setUserAnswers(prev => {
            if (prev[questionId] === option) return prev;
            return { ...prev, [questionId]: option };
        });
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

    const handleSubmit = async () => {
        if (!window.confirm("Testni yakunlashga ishonchingiz komilmi?")) return;
        setSaving(true);

        try {
            let correctCount = 0;
            let totalQ = 0;
            let resultData = {
                userId: user.uid,
                userName: userData?.fullName || user.email || 'Unknown User',
                testId: test.id,
                testTitle: test.title || 'Diagnostic Test',
                type: test.type,
                mode: 'diagnostic', // Special mode
                date: new Date().toISOString(),
                startedAt: startedAt.toISOString(),
                userAnswers: userAnswers || {}
            };

            if (test.questions && Array.isArray(test.questions)) {
                test.questions.forEach(q => {
                    if (q.items && Array.isArray(q.items)) {
                        q.items.forEach(item => {
                            const correct = item.answer || item.correct_answer;
                            if (correct) {
                                totalQ++;
                                if (checkAnswer(correct, userAnswers[String(item.id)] || userAnswers[item.id])) {
                                    correctCount++;
                                }
                            }
                        });
                    } else {
                        const correct = q.answer || q.correct_answer;
                        if (correct) {
                            totalQ++;
                            if (checkAnswer(correct, userAnswers[String(q.id)] || userAnswers[q.id])) {
                                correctCount++;
                            }
                        }
                    }
                });

                const band = calculateBandScore(correctCount, test.type, totalQ);
                resultData.bandScore = band || 0;
                resultData.score = correctCount;
                resultData.totalQuestions = totalQ;
                resultData.percentage = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
                resultData.status = "graded";
            }

            resultData.timeSpent = Math.max(0, 1200 - timeLeft);

            // Add result to Firestore
            const resultDoc = await addDoc(collection(db, "results"), resultData);

            logAction(user.uid, 'DIAGNOSTIC_SUBMIT', {
                testId: test.id,
                score: correctCount,
                band: resultData.bandScore
            });

            // Update user with current level based on diagnostic
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                currentBand: resultData.bandScore,
                diagnosticCompleted: true,
                "gamification.points": increment(50), // Bonus XP for taking diagnostic
                "lastActiveAt": serverTimestamp()
            }).catch(err => console.warn("Stats update failed:", err));

            // Navigate to the diagnostic result page
            navigate(`/diagnostic-result/${resultDoc.id}`);

        } catch (error) {
            console.error("Submit Error:", error);
            alert(`Saqlashda xatolik yuz berdi: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return {
        test, loading, userAnswers, handleSelectAnswer,
        flaggedQuestions, toggleFlag, saving, handleSubmit,
        timeLeft, textSize, setTextSize, isFullScreen, handleToggleFullScreen,
        activePart, setActivePart, audioTime, setAudioTime
    };
}

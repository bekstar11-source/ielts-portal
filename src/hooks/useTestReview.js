import { useState, useEffect, useCallback, useRef } from 'react';
import { db, functions } from '../firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { calculateSectionScore, calculateBandScore, calculateOverallBand } from '../utils/ieltsScoring';

export const useTestReview = (id, user, userData, navigate) => {
    const [loading, setLoading] = useState(true);
    const [testData, setTestData] = useState(null);
    const [resultData, setResultData] = useState(null);
    const [activeMockPart, setActiveMockPart] = useState('listening');
    const [currentAnswers, setCurrentAnswers] = useState({});
    
    const [adminScore, setAdminScore] = useState("");
    const [task1Band, setTask1Band] = useState("");
    const [task2Band, setTask2Band] = useState("");
    const [adminFeedback, setAdminFeedback] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    const [listeningActivePart, setListeningActivePart] = useState(0);
    const [audioTime, setAudioTime] = useState(0);
    const [volume, setVolume] = useState(1);
    
    const audioRefs = useRef([]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const resultRef = doc(db, "results", id);
            const resultSnap = await getDoc(resultRef);

            if (!resultSnap.exists()) {
                alert("Natija topilmadi!");
                const target = userData?.role === 'admin' || userData?.role === 'teacher' ? "/admin/results" : "/my-results";
                return navigate(target);
            }

            const rData = resultSnap.data();
            setResultData(rData);

            // Extract attempt ID from URL
            const params = new URLSearchParams(window.location.search);
            const attemptId = params.get('attempt');

            let testIdToLoad = rData.testId;
            let partAnswers = rData.userAnswers || {};

            // If we have attempts array (new system)
            if (rData.attempts && Array.isArray(rData.attempts) && rData.attempts.length > 0) {
                let targetAttempt = null;
                
                if (attemptId) {
                    targetAttempt = rData.attempts.find(a => a.attemptId === attemptId);
                }
                
                // Fallback to latest attempt if no specific attemptId or not found
                if (!targetAttempt) {
                    targetAttempt = rData.attempts[rData.attempts.length - 1];
                }

                if (targetAttempt) {
                    partAnswers = targetAttempt.userAnswers || {};
                    // Override resultData with this attempt's data for accurate review display
                    rData.score = targetAttempt.score;
                    rData.bandScore = targetAttempt.bandScore;
                    rData.userAnswers = partAnswers;
                }
            }

            if (rData.type === 'mock_full') {
                if (rData.subTests && rData.subTests[activeMockPart]) {
                    testIdToLoad = rData.subTests[activeMockPart];
                }
                if (rData.details) {
                    partAnswers = rData.details[`${activeMockPart}Answers`] || {};
                }
            }

            setCurrentAnswers(partAnswers);

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

            if (testIdToLoad) {
                const testRef = doc(db, "tests", testIdToLoad);
                const testSnap = await getDoc(testRef);

                if (!testSnap.exists()) {
                    setTestData({ title: "O'chirilgan Test", type: activeMockPart });
                } else {
                    const rawTestData = { id: testSnap.id, ...testSnap.data() };
                    // Normalize writing tasks
                    if ((rawTestData.type?.toLowerCase() === 'writing' || activeMockPart === 'writing') && !rawTestData.writingTasks) {
                        rawTestData.writingTasks = [
                            ...(rawTestData.task1 ? [{ id: 1, title: 'Task 1', prompt: rawTestData.task1, minWords: 150, image: rawTestData.image_url || rawTestData.image || rawTestData.task1_image }] : []),
                            ...(rawTestData.task2 ? [{ id: 2, title: 'Task 2', prompt: rawTestData.task2, minWords: 250, image: rawTestData.task2_image }] : [])
                        ];
                        if (rawTestData.writingTasks.length === 0) {
                            const mainPrompt = rawTestData.passage || rawTestData.prompt || rawTestData.instruction || rawTestData.content;
                            if (mainPrompt) rawTestData.writingTasks = [{ id: 1, title: 'Writing Task', prompt: mainPrompt, minWords: 150, image: rawTestData.image_url || rawTestData.image }];
                        }
                    }
                    setTestData(rawTestData);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [id, activeMockPart, navigate, userData]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSaveGrade = async () => {
        if (activeMockPart === 'writing' && (!task1Band || !task2Band)) return alert("T1 va T2 ballarini kiriting!");
        if (activeMockPart === 'speaking' && adminScore === "") return alert("Iltimos, ball qo'ying!");

        setIsSaving(true);
        try {
            const resultRef = doc(db, "results", id);
            let scoreVal = Number(adminScore);
            let t1 = Number(task1Band);
            let t2 = Number(task2Band);

            if (activeMockPart === 'writing') scoreVal = calculateOverallBand(t1, t2, t2);

            const updatePayload = {
                score: scoreVal,
                bandScore: scoreVal,
                task1Band: t1 || 0,
                task2Band: t2 || 0,
                feedback: adminFeedback,
                status: 'graded'
            };

            if (resultData.type === 'mock_full') {
                const newScores = { ...resultData.scores };
                if (activeMockPart === 'reading' || activeMockPart === 'listening') {
                    const sectionResults = calculateSectionScore(testData, currentAnswers);
                    const band = calculateBandScore(sectionResults.correct, activeMockPart, sectionResults.total);
                    if (activeMockPart === 'reading') { newScores.reading = sectionResults.correct; newScores.readingBand = band; }
                    else { newScores.listening = sectionResults.correct; newScores.listeningBand = band; }
                }
                if (activeMockPart === 'writing') { newScores.writingBand = scoreVal; newScores.writingFeedback = adminFeedback; }
                if (activeMockPart === 'speaking') { newScores.speakingBand = scoreVal; newScores.speakingFeedback = adminFeedback; }

                const sections = [];
                const check = (val) => val !== undefined && val !== null && !isNaN(Number(val));
                
                if (check(newScores.listeningBand)) sections.push(Number(newScores.listeningBand));
                if (check(newScores.readingBand)) sections.push(Number(newScores.readingBand));
                if (check(newScores.writingBand)) sections.push(Number(newScores.writingBand));
                if (check(newScores.speakingBand)) sections.push(Number(newScores.speakingBand));

                if (sections.length > 0) {
                    const roundedOverall = calculateOverallBand(sections);
                    newScores.overallBand = roundedOverall;
                    updatePayload.score = roundedOverall;
                    updatePayload.bandScore = roundedOverall;
                    updatePayload.overallBand = roundedOverall;
                }
                updatePayload.scores = newScores;
            }

            await updateDoc(resultRef, updatePayload);
            setResultData(prev => ({ ...prev, ...updatePayload }));
            alert("Baho saqlandi! ✅");
        } catch (err) { alert(err.message); } finally { setIsSaving(false); }
    };

    const handleAICheck = async () => {
        setIsAiLoading(true);
        try {
            const checkWriting = httpsCallable(functions, 'checkWriting');
            await checkWriting({ resultId: id });
            await fetchData();
            alert("AI Tekshiruv yakunlandi! ✨");
        } catch (err) {
            alert(err.message);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSeekTo = (partIndex, timestamp) => {
        if (!timestamp && timestamp !== 0) return;
        setListeningActivePart(partIndex);
        if (audioRefs.current[partIndex]) audioRefs.current[partIndex].seekTo(timestamp);
    };

    return {
        loading, testData, resultData, 
        activeMockPart, setActiveMockPart,
        currentAnswers,
        adminScore, setAdminScore,
        task1Band, setTask1Band,
        task2Band, setTask2Band,
        adminFeedback, setAdminFeedback,
        isSaving,
        isAiLoading,
        handleSaveGrade,
        handleAICheck,
        listeningActivePart, setListeningActivePart,
        audioTime, setAudioTime,
        volume, setVolume,
        audioRefs,
        handleSeekTo
    };
};

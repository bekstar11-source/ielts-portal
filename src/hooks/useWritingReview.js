import { useState, useEffect } from 'react';
import { db, functions } from '../firebase/firebase';
import { collection, doc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { calculateOverallBand } from '../utils/ieltsScoring';

export const useWritingReview = (userData) => {
    const [writings, setWritings] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    const fetchData = async () => {
        if (!userData) return;
        setLoading(true);
        try {
            let writingResults = [];
            let allStudents = [];

            if (userData?.role === 'admin') {
                const resultsSnap = await getDocs(query(collection(db, 'results'), where('type', 'in', ['writing', 'mock_full'])));
                writingResults = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                const userIds = [...new Set(writingResults.map(r => r.userId))].filter(Boolean);
                if (userIds.length > 0) {
                    // Fetch users in chunks of 30 (Firestore IN limit)
                    const chunks = [];
                    for (let i = 0; i < userIds.length; i += 30) {
                        chunks.push(userIds.slice(i, i + 30));
                    }

                    const userPromises = chunks.map(chunk => 
                        getDocs(query(collection(db, 'users'), where('__name__', 'in', chunk)))
                    );
                    
                    const snaps = await Promise.all(userPromises);
                    allStudents = snaps.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
            } else {
                const groupIds = userData?.assignedGroupIds || [];
                if (groupIds.length > 0) {
                    const uniqueStudentIds = new Set();
                    for (const gId of groupIds) {
                        const gDoc = await getDoc(doc(db, "groups", gId));
                        if (gDoc.exists()) {
                            const gData = gDoc.data();
                            (gData.studentIds || []).forEach(id => uniqueStudentIds.add(id));
                        }
                    }
                    const studentIdsArray = Array.from(uniqueStudentIds);
                    if (studentIdsArray.length > 0) {
                        // Fetch students
                        const sChunks = [];
                        for (let i = 0; i < studentIdsArray.length; i += 30) sChunks.push(studentIdsArray.slice(i, i + 30));
                        const sSnaps = await Promise.all(sChunks.map(chunk => getDocs(query(collection(db, 'users'), where('__name__', 'in', chunk)))));
                        allStudents = sSnaps.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));

                        // Fetch results
                        const rSnaps = await Promise.all(sChunks.map(chunk => getDocs(query(collection(db, 'results'), where('userId', 'in', chunk), where('type', 'in', ['writing', 'mock_full'])))));
                        writingResults = rSnaps.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));
                    }
                }
            }

            setStudents(allStudents);
            setWritings(writingResults.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveFeedback = async (resultId, data) => {
        setSaving(true);
        try {
            const resRef = doc(db, 'results', resultId);
            const resSnap = await getDoc(resRef);
            const resData = resSnap.data();

            const t1 = parseFloat(data.task1Band);
            const t2 = parseFloat(data.task2Band);
            
            // Check which tasks were actually submitted by student
            let ans = resData.userAnswers || resData.writingAnswers || {};
            if (resData.attempts && Array.isArray(resData.attempts) && resData.attempts.length > 0) {
                const lastAttempt = resData.attempts[resData.attempts.length - 1];
                ans = lastAttempt.userAnswers || lastAttempt.writingAnswers || ans;
            }
            if (resData.details?.writingAnswers) {
                ans = resData.details.writingAnswers || ans;
            }
            if (!ans.task1 && resData.task1) ans.task1 = resData.task1;
            if (!ans.task1 && resData.writingAnswer) ans.task1 = resData.writingAnswer;
            if (!ans.task2 && resData.task2) ans.task2 = resData.task2;

            const hasT1 = !!ans.task1;
            const hasT2 = !!ans.task2;

            let writingOverall = 0;
            if (hasT1 && hasT2) {
                const raw = (t1 + 2 * t2) / 3;
                let integerPart = Math.floor(raw);
                const fractionalPart = raw - integerPart;
                if (fractionalPart >= 0.75) writingOverall = integerPart + 1;
                else if (fractionalPart >= 0.25) writingOverall = integerPart + 0.5;
                else writingOverall = integerPart;
            } else if (hasT1) {
                writingOverall = t1;
            } else if (hasT2) {
                writingOverall = t2;
            }

            const updates = {
                task1Band: hasT1 ? t1 : null,
                task2Band: hasT2 ? t2 : null,
                writingBand: writingOverall,
                task1Details: data.task1Details || null,
                task2Details: data.task2Details || null,
                teacherFeedback: data.feedback || '',
                reviewedAt: new Date().toISOString(),
                reviewedByTeacher: userData?.uid,
                status: 'graded'
            };

            // Calculate overall band for Mock Exam
            if (resData.type === 'mock_full') {
                const s = resData.scores || {};
                
                // Robust extraction of scores
                const parseScore = (val) => {
                    const n = parseFloat(val);
                    return (val === undefined || val === null || isNaN(n)) ? 0 : n;
                };

                const lBand = parseScore(s.listeningBand ?? s.listening_band ?? resData.listeningBand);
                const rBand = parseScore(s.readingBand ?? s.reading_band ?? resData.readingBand);
                const wBand = writingOverall;
                const sBand = parseScore(s.speakingBand ?? s.speaking_band ?? resData.speakingBand);
                
                // For a Mock Exam, we expect at least L, R, and W
                const sections = [lBand, rBand, wBand];
                
                // Only include Speaking if it was actually attempted or has a score
                if (sBand > 0 || s.speakingBand !== undefined || resData.speakingBand !== undefined) {
                    sections.push(sBand);
                }
                
                const mockOverall = calculateOverallBand(sections);
                
                updates.bandScore = mockOverall;
                updates.overallBand = mockOverall;
                updates['scores.writingBand'] = wBand;
                updates['scores.overallBand'] = mockOverall;
            }

            await updateDoc(resRef, updates);
            await fetchData();
            return true;
        } catch (e) {
            console.error(e);
            throw e;
        } finally {
            setSaving(false);
        }
    };

    const handleAICheck = async (resultId) => {
        setAiLoading(true);
        try {
            const checkWriting = httpsCallable(functions, 'checkWriting');
            const result = await checkWriting({ resultId });
            await fetchData();
            return result.data;
        } catch (e) {
            console.error(e);
            alert("AI Tekshiruvda xatolik: " + e.message);
            throw e;
        } finally {
            setAiLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userData]);

    return {
        writings,
        students,
        loading,
        saving,
        aiLoading,
        handleSaveFeedback,
        handleAICheck,
        refresh: fetchData
    };
};

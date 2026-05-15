import { useState, useEffect } from 'react';
import { db, functions } from '../firebase/firebase';
import { collection, doc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

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
            const raw = (t1 + 2 * t2) / 3;
            let writingOverall = Math.floor(raw);
            const rem = raw - writingOverall;
            if (rem >= 0.75) writingOverall += 1;
            else if (rem >= 0.25) writingOverall += 0.5;

            const updates = {
                task1Band: t1,
                task2Band: t2,
                writingBand: writingOverall,
                teacherFeedback: data.feedback || '',
                reviewedAt: new Date().toISOString(),
                reviewedByTeacher: userData?.uid,
                status: 'graded'
            };

            // Calculate overall band for Mock Exam
            if (resData.type === 'mock_full') {
                const lBand = parseFloat(resData.scores?.listeningBand || 0);
                const rBand = parseFloat(resData.scores?.readingBand || 0);
                const wBand = writingOverall;
                const sBand = parseFloat(resData.scores?.speakingBand || 0);
                
                // IELTS Overall is (L+R+W+S)/4.
                // We count how many sections are present
                const sections = [];
                if (lBand > 0) sections.push(lBand);
                if (rBand > 0) sections.push(rBand);
                if (wBand > 0) sections.push(wBand);
                if (sBand > 0) sections.push(sBand);
                
                const avg = sections.length > 0 ? sections.reduce((a, b) => a + b, 0) / sections.length : 0;
                let mockOverall = Math.floor(avg);
                const oRem = avg - mockOverall;
                if (oRem >= 0.75) mockOverall += 1;
                else if (oRem >= 0.25) mockOverall += 0.5;
                
                updates.bandScore = mockOverall;
                updates.overallBand = mockOverall;
                // Also update nested scores object for consistency
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

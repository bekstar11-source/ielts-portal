import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, doc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';

export const useWritingReview = (userData) => {
    const [writings, setWritings] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        if (!userData) return;
        setLoading(true);
        try {
            let writingResults = [];
            let allStudents = [];

            if (userData?.role === 'admin') {
                const resultsSnap = await getDocs(query(collection(db, 'results'), where('type', '==', 'writing')));
                writingResults = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                const userIds = [...new Set(writingResults.map(r => r.userId))];
                if (userIds.length > 0) {
                    const q = query(collection(db, 'users'), where('__name__', 'in', userIds.slice(0, 10))); // Simplified chunk
                    const snap = await getDocs(q);
                    allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                }
            } else {
                const groupIds = userData?.assignedGroupIds || [];
                // ... (Teacher specific logic simplified for hook)
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
            const t1 = parseFloat(data.task1Band);
            const t2 = parseFloat(data.task2Band);
            const raw = (t1 + 2 * t2) / 3;
            let overall = Math.floor(raw);
            const rem = raw - overall;
            if (rem >= 0.75) overall += 1;
            else if (rem >= 0.25) overall += 0.5;

            await updateDoc(doc(db, 'results', resultId), {
                task1Band: t1,
                task2Band: t2,
                writingBand: overall,
                teacherFeedback: data.feedback || '',
                reviewedAt: new Date().toISOString(),
                reviewedByTeacher: userData?.uid
            });
            await fetchData();
            return true;
        } catch (e) {
            console.error(e);
            throw e;
        } finally {
            setSaving(false);
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
        handleSaveFeedback,
        refresh: fetchData
    };
};

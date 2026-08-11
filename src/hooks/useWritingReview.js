import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { db, functions } from '../firebase/firebase';
import {
    collection, doc, documentId, getDoc, getDocs, limit as fsLimit,
    orderBy, query, where, updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { calculateOverallBand } from '../utils/ieltsScoring';
import { useTeacherWorkspace } from './useTeacherWorkspace';
import { chunkIds } from '../utils/teacherResults';

/** Admin ko'rinishida bir marta olinadigan yozma ishlar chegarasi. */
const ADMIN_WRITINGS_CAP = 500;

// Results store `date` either as a Firestore Timestamp or an ISO string
// (submitMockExam/submitTestAnswers use new Date().toISOString()), so both
// shapes need to be normalized before comparing.
export const dateToMillis = (d) => {
    if (!d) return 0;
    if (typeof d.toDate === 'function') return d.toDate().getTime();
    if (typeof d.seconds === 'number') return d.seconds * 1000;
    const t = new Date(d).getTime();
    return isNaN(t) ? 0 : t;
};

const toWritings = (results) => results
    .filter(r => (r.type === 'writing' || r.type === 'mock_full') &&
        !(r.type === 'writing' && (r.parentResultId || r.mockKey)))
    .sort((a, b) => dateToMillis(b.date) - dateToMillis(a.date));

export const useWritingReview = (userData) => {
    const isAdmin = userData?.role === 'admin';

    // O'QITUVCHI: sahifa o'zi hech narsa o'qimaydi — panelning umumiy
    // keshidan foydalanadi. Ilgari bu yerda barcha o'quvchilarning BARCHA
    // natijalari chegarasiz olinib, keyin mijoz tomonida writing/mock ga
    // filtrlanardi — ya'ni Dashboard/Tests/GroupStats o'qigan narsa yana
    // bir marta to'lanardi (va har "Saqlash" dan keyin yana bir marta).
    const workspace = useTeacherWorkspace({
        uid: userData?.uid,
        enabled: Boolean(userData) && !isAdmin,
    });

    // ADMIN: butun platforma bo'yicha so'rov — bu yerda kesh emas, CHEGARA
    // muhim (ilgari `limit` umuman yo'q edi).
    const [adminData, setAdminData] = useState({ writings: [], students: [] });
    const [adminLoading, setAdminLoading] = useState(isAdmin);

    const [saving, setSaving] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    const fetchAdminData = async () => {
        setAdminLoading(true);
        try {
            const resultsSnap = await getDocs(query(
                collection(db, 'results'),
                where('type', 'in', ['writing', 'mock_full']),
                orderBy('date', 'desc'),
                fsLimit(ADMIN_WRITINGS_CAP)
            ));
            const writingResults = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const userIds = [...new Set(writingResults.map(r => r.userId))].filter(Boolean);
            const snaps = await Promise.all(
                chunkIds(userIds).map(chunk =>
                    getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)))
                )
            );

            setAdminData({
                writings: toWritings(writingResults),
                students: snaps.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() }))),
            });
        } catch (e) {
            console.error(e);
            toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
        } finally {
            setAdminLoading(false);
        }
    };

    const teacherWritings = useMemo(
        () => (isAdmin ? [] : toWritings(workspace.results)),
        [isAdmin, workspace.results]
    );

    const writings = isAdmin ? adminData.writings : teacherWritings;
    const students = isAdmin ? adminData.students : workspace.students;
    const loading = isAdmin ? adminLoading : workspace.loading;

    const fetchData = () => (isAdmin ? fetchAdminData() : workspace.refresh());

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

            if (Number.isNaN(writingOverall)) {
                throw new Error("Topshirilgan vazifalar uchun band tanlanmagan");
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
            toast.success("Baholash saqlandi");
            return true;
        } catch (e) {
            console.error(e);
            toast.error("Saqlashda xatolik yuz berdi: " + e.message);
            throw e;
        } finally {
            setSaving(false);
        }
    };

    const handleAICheck = async (resultId) => {
        setAiLoading(true);
        try {
            // Vision bilan tahlil 70s (SDK standarti) dan uzoq ketadi —
            // aks holda so'rov "deadline-exceeded" bilan uzilardi.
            const checkWriting = httpsCallable(functions, 'checkWriting', { timeout: 300000 });
            const result = await checkWriting({ resultId });
            await fetchData();
            toast.success("AI tahlili tayyor");
            return result.data;
        } catch (e) {
            console.error(e);
            toast.error("AI tekshiruvda xatolik: " + e.message);
            throw e;
        } finally {
            setAiLoading(false);
        }
    };

    // O'qituvchi tarmog'ini react-query o'zi boshqaradi; bu yerda faqat
    // admin so'rovi qo'lda ishga tushiriladi.
    useEffect(() => {
        if (isAdmin) fetchAdminData();
    }, [isAdmin, userData?.uid]);

    return {
        writings,
        students,
        loading,
        isRefreshing: isAdmin ? false : workspace.isRefreshing,
        saving,
        aiLoading,
        handleSaveFeedback,
        handleAICheck,
        refresh: fetchData
    };
};

/**
 * O'quvchining mock imtihonlari ro'yxati.
 *
 * Sahifa ilgari bu mantiqni o'zida saqlardi; endi yuklash, birlashtirish va
 * saralash bitta joyda — MockEntry faqat ko'rsatish bilan shug'ullanadi.
 */

import { useCallback, useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, updateDoc, where, deleteField } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { mockSortDate, toDate } from '../components/student/mock/mockHelpers';

/**
 * Tayinlov (`mockTests`) + natija (`results`) ni bitta obyektga qo'shadi.
 * Tayinlovning `id`, `title`, `startDate` maydonlari saqlanib qoladi:
 * natijani ustiga yoyish ularni o'chirib yuborardi va karta "sakrab" ketardi.
 */
function mergeResult(mock, result) {
    if (!result) return { ...mock, isCompleted: false };
    return {
        ...mock,
        ...result,
        id: mock.id,
        title: mock.title || result.title,
        startDate: mock.startDate || result.startDate,
        mockKey: mock.mockKey || result.mockKey,
        scheduledDate: mock.scheduledDate || null,
        resultId: result.id,
        completedAt: result.completedAt || result.submittedAt || result.createdAt || null,
        isCompleted: true,
        status: 'completed',
        resultStatus: result.status || 'pending_review',
    };
}

export default function useStudentMocks(userId) {
    const [mocks, setMocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadToken, setReloadToken] = useState(0);

    const refresh = useCallback(() => setReloadToken((n) => n + 1), []);

    useEffect(() => {
        if (!userId) {
            setMocks([]);
            setLoading(false);
            return undefined;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                const [userSnap, resultsSnap] = await Promise.all([
                    getDoc(doc(db, 'users', userId)),
                    getDocs(query(
                        collection(db, 'results'),
                        where('userId', '==', userId),
                        where('type', '==', 'mock_full'),
                    )),
                ]);

                if (cancelled) return;

                const userData = userSnap.exists() ? userSnap.data() : {};
                // Rejalashtirilgan sanalar alohida `mockSchedules` map'ida turadi:
                // `mockTests` massivini faqat server yozadi, aks holda o'quvchi
                // o'ziga xohlagan imtihonni ochib olishi mumkin bo'lardi.
                const schedules = userData.mockSchedules || {};
                const results = resultsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

                // `arrayUnion` bir xil kalitni ikki marta qo'shib yuborishi mumkin —
                // ro'yxatda dublikat kartalar paydo bo'lmasligi uchun id bo'yicha filtrlaymiz.
                const seen = new Set();
                const assignments = (userData.mockTests || []).filter((m) => {
                    const key = m?.id || m?.mockKey;
                    if (!key || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                const merged = assignments.map((assignment) => {
                    const withSchedule = {
                        ...assignment,
                        scheduledDate: schedules[assignment.id] || null,
                    };
                    const result = results.find((r) => (
                        (withSchedule.mockKey && r.mockKey === withSchedule.mockKey) ||
                        (withSchedule.resultId && r.id === withSchedule.resultId)
                    ));
                    return mergeResult(withSchedule, result);
                });

                setMocks(merged);
            } catch (err) {
                console.error('Mock ro\'yxatini yuklashda xatolik:', err);
                if (!cancelled) setError(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [userId, reloadToken]);

    /** Yaqinlashayotganlar — eng yaqin sana birinchi, sanasizlar oxirida. */
    const upcoming = mocks
        .filter((m) => !m.isCompleted)
        .sort((a, b) => {
            const aDate = toDate(a.scheduledDate);
            const bDate = toDate(b.scheduledDate);
            if (aDate && bDate) return aDate - bDate;
            if (aDate) return -1;
            if (bDate) return 1;
            return mockSortDate(b) - mockSortDate(a);
        });

    /** O'tganlar — eng yangisi birinchi. */
    const past = mocks
        .filter((m) => m.isCompleted)
        .sort((a, b) => mockSortDate(b) - mockSortDate(a));

    /**
     * Sanani belgilaydi yoki (date = null bo'lsa) olib tashlaydi.
     * Faqat `mockSchedules` yoziladi — `mockTests` himoyalangan.
     */
    const setSchedule = useCallback(async (mockId, date) => {
        if (!userId || !mockId) return;
        await updateDoc(doc(db, 'users', userId), {
            [`mockSchedules.${mockId}`]: date ? date.toISOString() : deleteField(),
        });
        setMocks((prev) => prev.map((m) => (
            m.id === mockId ? { ...m, scheduledDate: date ? date.toISOString() : null } : m
        )));
    }, [userId]);

    return { mocks, upcoming, past, loading, error, refresh, setSchedule };
}

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';

import { db, storage, functions } from '../firebase/firebase';

/**
 * O'qituvchi uchun to'langan Speaking tekshiruvlari navbati.
 *
 * Yozish IMKONI YO'Q: band va izoh `submitSpeakingReview` callable orqali
 * ketadi — narx, to'lov holati va yakuniy ballar serverda hal bo'ladi
 * (firestore.rules da `speakingSessions` klientga yopiq).
 */
export function useSpeakingReviewQueue({ teacherId } = {}) {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [answers, setAnswers] = useState({});
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // To'langan va hali tekshirilmagan sessiyalar.
            const snap = await getDocs(
                query(
                    collection(db, 'speakingSessions'),
                    where('teacherReview.status', '==', 'paid'),
                    orderBy('updatedAt', 'desc'),
                    limit(50)
                )
            );

            let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            // Guruhi bor o'quvchi o'z o'qituvchisiga tushadi; egasi
            // belgilanmagan buyurtmani istalgan o'qituvchi olishi mumkin.
            if (teacherId) {
                items = items.filter((item) => {
                    const owner = item.teacherReview?.teacherId;
                    return !owner || owner === teacherId;
                });
            }
            setSessions(items);
        } catch (e) {
            console.error('Speaking review queue error:', e);
            setError("Navbatni yuklab bo'lmadi.");
        } finally {
            setLoading(false);
        }
    }, [teacherId]);

    useEffect(() => {
        load();
    }, [load]);

    /** Bitta sessiyaning javoblarini (audio havolasi bilan) o'qiydi. */
    const loadAnswers = useCallback(async (sessionId) => {
        if (answers[sessionId]) return;
        try {
            const snap = await getDocs(
                collection(db, 'speakingSessions', sessionId, 'answers')
            );
            const rows = await Promise.all(
                snap.docs.map(async (d) => {
                    const data = { id: d.id, ...d.data() };
                    if (data.audioPath) {
                        try {
                            data.audioUrl = await getDownloadURL(ref(storage, data.audioPath));
                        } catch {
                            // Audio muddati o'tib tozalangan bo'lishi mumkin.
                            data.audioUrl = '';
                        }
                    }
                    return data;
                })
            );
            setAnswers((prev) => ({ ...prev, [sessionId]: rows }));
        } catch (e) {
            console.error('Speaking answers load error:', e);
            setAnswers((prev) => ({ ...prev, [sessionId]: [] }));
        }
    }, [answers]);

    /**
     * Tekshiruvni yakunlaydi.
     * @param {{ sessionId: string, comment: string, bands?: object, answers?: Array }} payload
     */
    const submit = useCallback(async (payload) => {
        setSaving(true);
        setError('');
        try {
            const fn = httpsCallable(functions, 'submitSpeakingReview');
            await fn(payload);
            setSessions((prev) => prev.filter((item) => item.id !== payload.sessionId));
            return true;
        } catch (e) {
            console.error('submitSpeakingReview error:', e);
            setError(e.message || "Saqlab bo'lmadi.");
            return false;
        } finally {
            setSaving(false);
        }
    }, []);

    return { sessions, answers, loading, saving, error, reload: load, loadAnswers, submit };
}

export default useSpeakingReviewQueue;

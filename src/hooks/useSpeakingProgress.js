import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

import { db } from '../firebase/firebase';

const EMPTY = { byTopic: {}, overallBand: null, answerCount: 0, sessionCount: 0 };

/**
 * O'quvchining Speaking natijalari mavzular kesimida.
 *
 * Speaking xonasi ro'yxati "boshlanmagan / davom etmoqda / ball past"
 * bo'yicha filtrlanadi va har qatorda oxirgi urinish ko'rinadi — buning
 * uchun sessiyalarni mavzu bo'yicha yig'ib olish kerak. `SpeakingHistory`
 * o'sha kolleksiyani o'qiydi, lekin faqat oxirgi 10 tasini va ro'yxat
 * ko'rinishida; bu yerda ko'proq sessiya olinadi va mavzuga xaritalanadi.
 *
 * @param {string} [uid]
 * @param {any} [refreshKey] - o'zgarganda qayta o'qiladi (sessiya tugagach).
 * @returns {{ byTopic: Record<string, { band: number|null, lastAt: Date|null, attempts: number }>,
 *   overallBand: number|null, answerCount: number, sessionCount: number, loading: boolean }}
 */
export function useSpeakingProgress(uid, refreshKey) {
    const [state, setState] = useState(EMPTY);
    const [loading, setLoading] = useState(Boolean(uid));

    useEffect(() => {
        if (!uid) {
            setState(EMPTY);
            setLoading(false);
            return undefined;
        }

        let alive = true;
        setLoading(true);

        getDocs(
            query(
                collection(db, 'speakingSessions'),
                where('uid', '==', uid),
                orderBy('createdAt', 'desc'),
                limit(60)
            )
        )
            .then((snap) => {
                if (!alive) return;

                const byTopic = {};
                let bandSum = 0;
                let bandCount = 0;
                let answerCount = 0;

                snap.docs.forEach((docSnap) => {
                    const session = docSnap.data();
                    // O'qituvchi tekshirgan bo'lsa uning bahosi ustun turadi —
                    // tarixda ham shu tartib.
                    const band = session.teacherReview?.bands?.overall ?? session.overallBand ?? null;
                    const createdAt = session.createdAt?.toDate?.() || null;
                    answerCount += session.answeredCount || 0;

                    if (typeof band === 'number') {
                        bandSum += band;
                        bandCount += 1;
                    }

                    const topicId = session.topicId;
                    if (!topicId) return;

                    const prev = byTopic[topicId];
                    if (!prev) {
                        // Sessiyalar createdAt bo'yicha kamayish tartibida keladi,
                        // shuning uchun mavzuning birinchi uchraganini eng oxirgi
                        // urinish deb olamiz.
                        byTopic[topicId] = {
                            band: typeof band === 'number' ? band : null,
                            lastAt: createdAt,
                            attempts: 1,
                        };
                    } else {
                        prev.attempts += 1;
                        if (prev.band === null && typeof band === 'number') prev.band = band;
                    }
                });

                setState({
                    byTopic,
                    overallBand: bandCount > 0 ? bandSum / bandCount : null,
                    answerCount,
                    sessionCount: snap.size,
                });
            })
            .catch((error) => {
                // Natijalar o'qilmasa ham mavzular ro'yxati ishlayveradi.
                console.error('Speaking progress error:', error);
                if (alive) setState(EMPTY);
            })
            .finally(() => {
                if (alive) setLoading(false);
            });

        return () => {
            alive = false;
        };
    }, [uid, refreshKey]);

    return { ...state, loading };
}

export default useSpeakingProgress;

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';

import { db } from '../firebase/firebase';
import { SPEAKING_TOPICS } from '../data/speakingQuestions';

/**
 * Statik mavzular + o'qituvchi qo'shgan mavzular.
 *
 * O'qituvchi savollari `speakingQuestions` kolleksiyasida va statik ro'yxat
 * bilan bir xil shaklda saqlanadi, shuning uchun ularni ishlatadigan
 * komponentlar ikkalasini farqlamaydi — faqat `authorName` bo'lsa,
 * ro'yxatda "o'qituvchi savoli" belgisi chiqadi.
 *
 * Ko'rinish qoidasi: mavzu guruhga biriktirilgan bo'lsa faqat o'sha guruh
 * o'quvchilariga, biriktirilmagan bo'lsa hammaga.
 *
 * @param {{ groupId?: string }} [user]
 */
export function useSpeakingTopics(user) {
    const [topics, setTopics] = useState(SPEAKING_TOPICS);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const snap = await getDocs(
                query(
                    collection(db, 'speakingQuestions'),
                    where('published', '==', true),
                    orderBy('createdAt', 'desc'),
                    limit(60)
                )
            );

            const groupId = user?.groupId || null;
            const custom = snap.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((topic) => !topic.groupId || topic.groupId === groupId)
                .filter((topic) => Array.isArray(topic.questions) && topic.questions.length > 0);

            setTopics([...custom, ...SPEAKING_TOPICS]);
        } catch (error) {
            // O'qituvchi savollari yuklanmasa ham statik baza ishlayveradi.
            console.error('Speaking topics load error:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.groupId]);

    useEffect(() => {
        load();
    }, [load]);

    return { topics, loading, reload: load };
}

export default useSpeakingTopics;

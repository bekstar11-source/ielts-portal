import { useCallback, useRef, useState } from "react";

/**
 * @param {{current: number}} [elapsedRef] Testda o'tgan soniyalarni beruvchi ref.
 *        Berilsa, har bir savolga BIRINCHI javob berilgan daqiqa yozib boriladi.
 *
 *        Nega birinchisi va nega ref: keyingi tahrirlar emas, birinchi javob
 *        o'quvchining test bo'ylab qanday harakatlanganini ko'rsatadi (savolni
 *        tashlab ketib, oxirida qaytib kelgani ham shu yerda ko'rinadi). Ref esa
 *        shuning uchunki `useTestAnswers` taymerdan OLDIN chaqiriladi — qiymatni
 *        to'g'ridan-to'g'ri uzatib bo'lmaydi.
 */
export function useTestAnswers(elapsedRef = null) {
    const [userAnswers, setUserAnswers] = useState({});
    const [writingEssay, setWritingEssay] = useState("");
    const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());

    // State emas, ref: bu ma'lumot faqat topshirish paytida o'qiladi va uni
    // state qilish har bir javobda ortiqcha qayta chizishga olib kelardi.
    const answerTimesRef = useRef({});

    const handleSelectAnswer = (questionId, option, isReviewing = false) => {
        if (isReviewing) return;

        if (elapsedRef && answerTimesRef.current[questionId] === undefined) {
            const elapsed = Number(elapsedRef.current);
            if (Number.isFinite(elapsed) && elapsed >= 0) {
                answerTimesRef.current[questionId] = Math.round(elapsed);
            }
        }

        setUserAnswers(prev => {
            if (prev[questionId] === option) return prev;
            return { ...prev, [questionId]: option };
        });
    };

    /** Testni qaytadan boshlashda vaqt yozuvlari ham tozalanishi kerak. */
    const resetAnswerTimes = useCallback(() => {
        answerTimesRef.current = {};
    }, []);

    const getAnswerTimes = useCallback(() => ({ ...answerTimesRef.current }), []);

    const toggleFlag = (questionId) => {
        setFlaggedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) newSet.delete(questionId);
            else newSet.add(questionId);
            return newSet;
        });
    };

    return {
        userAnswers,
        setUserAnswers,
        writingEssay,
        setWritingEssay,
        flaggedQuestions,
        setFlaggedQuestions,
        handleSelectAnswer,
        toggleFlag,
        getAnswerTimes,
        resetAnswerTimes
    };
}

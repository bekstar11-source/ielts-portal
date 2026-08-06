import { useState, useEffect, useCallback } from "react";
import { testStorageSuffix } from "../../utils/TestUtils";

export function useTestTimer(testId, userId, testMode, initialTime = 3600, isActive = false, partNumber = null) {
    const [timeLeft, setTimeLeft] = useState(initialTime);

    // Taymer kaliti — full test uchun suffikssiz, part uchun `_part_N`.
    const timerKey = (testId && userId)
        ? `timer_${userId}_${testId}${testStorageSuffix(partNumber)}`
        : null;

    useEffect(() => {
        if (!isActive || !timerKey) return;

        const savedTime = sessionStorage.getItem(timerKey);
        const parsed = savedTime === null ? NaN : parseInt(savedTime, 10);
        if (!Number.isNaN(parsed)) {
            setTimeLeft(parsed);
        } else {
            setTimeLeft(testMode === 'practice' ? 0 : initialTime);
        }
    }, [timerKey, initialTime, isActive, testMode]);

    useEffect(() => {
        if (!isActive || !testMode) return;
        if (testMode === 'exam' && timeLeft <= 0) return;

        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                const newVal = testMode === 'practice' ? prev + 1 : prev - 1;
                if (timerKey) sessionStorage.setItem(timerKey, String(newVal));
                return newVal;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [timeLeft, isActive, testMode, timerKey]);

    // Testni qaytadan boshlashda: saqlangan vaqtni ham, state'ni ham tozalaymiz.
    // Faqat storage'ni o'chirish yetarli emas edi — state eski qiymatda qolib ketardi.
    const resetTimer = useCallback((mode = testMode) => {
        if (timerKey) sessionStorage.removeItem(timerKey);
        setTimeLeft(mode === 'practice' ? 0 : initialTime);
    }, [initialTime, testMode, timerKey]);

    return { timeLeft, setTimeLeft, resetTimer };
}

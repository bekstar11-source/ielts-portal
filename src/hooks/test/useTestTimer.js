import { useState, useEffect } from "react";

export function useTestTimer(testId, userId, testMode, initialTime = 3600, isActive = false, partNumber = null) {
    const [timeLeft, setTimeLeft] = useState(initialTime);

    useEffect(() => {
        if (!isActive || !testId || !userId) return;

        // Load saved time from sessionStorage
        const timerKey = `timer_${userId}_${testId}${partNumber ? `_part_${partNumber}` : ''}`;
        const savedTime = sessionStorage.getItem(timerKey);
        if (savedTime) {
            setTimeLeft(parseInt(savedTime));
        } else {
            setTimeLeft(testMode === 'practice' ? 0 : initialTime);
        }
    }, [testId, userId, initialTime, isActive, testMode, partNumber]);

    useEffect(() => {
        if (!isActive || !testMode) return;
        if (testMode === 'exam' && timeLeft <= 0) return;

        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                const newVal = testMode === 'practice' ? prev + 1 : prev - 1;
                const timerKey = `timer_${userId}_${testId}${partNumber ? `_part_${partNumber}` : ''}`;
                sessionStorage.setItem(timerKey, newVal);
                return newVal;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [timeLeft, isActive, userId, testId, testMode, partNumber]);

    return { timeLeft, setTimeLeft };
}

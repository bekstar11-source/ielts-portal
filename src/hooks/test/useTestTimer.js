import { useState, useEffect } from "react";

export function useTestTimer(testId, userId, testMode, initialTime = 3600, isActive = false) {
    const [timeLeft, setTimeLeft] = useState(initialTime);

    useEffect(() => {
        if (!isActive || !testId || !userId) return;

        // Load saved time from sessionStorage
        const savedTime = sessionStorage.getItem(`timer_${userId}_${testId}`);
        if (savedTime) setTimeLeft(parseInt(savedTime));
        else setTimeLeft(initialTime);
    }, [testId, userId, initialTime, isActive]);

    useEffect(() => {
        if (!isActive || !testMode) return;
        if (testMode === 'exam' && timeLeft <= 0) return;

        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                const newVal = testMode === 'practice' ? prev + 1 : prev - 1;
                sessionStorage.setItem(`timer_${userId}_${testId}`, newVal);
                return newVal;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [timeLeft, isActive, userId, testId, testMode]);

    return { timeLeft, setTimeLeft };
}

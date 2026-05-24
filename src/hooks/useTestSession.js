// src/hooks/useTestSession.js
import { useState, useEffect } from "react";

export function useTestSession(storageKey) {
  const [answers, setAnswers] = useState({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 1. Initial Load: Session xotirasini tekshirish
  useEffect(() => {
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        setAnswers(JSON.parse(savedData));
      } catch (e) {
        console.error("Error parsing session data", e);
      }
    }
    setIsDataLoaded(true);
  }, [storageKey]);



  // 3. Javoblar o'zgarganda saqlash
  useEffect(() => {
    if (isDataLoaded && Object.keys(answers).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    }
  }, [answers, isDataLoaded, storageKey]);

  // --- ACTIONS ---

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  return {
    answers,
    handleAnswerChange,
    isDataLoaded,
    showResumeModal: false,
    confirmResume: () => {},
    confirmRestart: () => {
      localStorage.removeItem(storageKey);
      setAnswers({});
    }
  };
}
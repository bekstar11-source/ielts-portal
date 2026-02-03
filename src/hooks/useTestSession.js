// src/hooks/useTestSession.js
import { useState, useEffect } from "react";

export function useTestSession(storageKey) {
  const [answers, setAnswers] = useState({});
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 1. Initial Load: Brauzer xotirasini tekshirish
  useEffect(() => {
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      // Agar eski javoblar bo'lsa, Modalni chiqaramiz
      setShowResumeModal(true);
    } else {
      // Agar yo'q bo'lsa, to'g'ridan-to'g'ri boshlaymiz
      setIsDataLoaded(true);
    }
  }, [storageKey]);

  // 2. Refresh Prevention: Sahifadan chiqib ketayotganda ogohlantirish
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Standart brauzer ogohlantiruvi
      e.preventDefault();
      e.returnValue = ""; 
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // 3. Javoblar o'zgarganda saqlash (faqat Continue qilingan bo'lsa)
  useEffect(() => {
    if (isDataLoaded && Object.keys(answers).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    }
  }, [answers, isDataLoaded, storageKey]);

  // --- ACTIONS ---

  const confirmResume = () => {
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      setAnswers(JSON.parse(savedData));
    }
    setShowResumeModal(false);
    setIsDataLoaded(true);
  };

  const confirmRestart = () => {
    localStorage.removeItem(storageKey); // Xotirani tozalash
    setAnswers({}); // Stateni tozalash
    setShowResumeModal(false);
    setIsDataLoaded(true);
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  return {
    answers,
    handleAnswerChange,
    showResumeModal,
    confirmResume,
    confirmRestart,
    isDataLoaded
  };
}
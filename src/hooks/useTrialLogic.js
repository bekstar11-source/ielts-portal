import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { track } from "../lib/analytics";

/**
 * Landing page'dagi bepul trial mantiqi.
 *
 * `useDiagnosticLogic` dan tubdan farq qiladi va bu ATAYLAB:
 *   • test Firestore'dan emas, `getTrialTest` callable'dan olinadi
 *     (javob kalitlari serverda olib tashlanadi)
 *   • ball KLIENTDA umuman hisoblanmaydi — `submitTrial` hisoblaydi
 *
 * Diagnostikada ikkalasi ham klientda: ro'yxatdan o'tgan o'quvchi uchun bu
 * shunchaki noqulaylik, mehmon uchun esa chegirmani bepul "yutib" olish yo'li
 * bo'lardi.
 */

/** Bosqichlar orasida javoblar shu yerda saqlanadi (sahifa yangilansa yo'qolmasin). */
const STORAGE_KEY = "trialProgress";

const STAGE_ORDER = ["reading", "listening"];

function loadProgress() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || { answers: {}, timeSpent: {} };
  } catch {
    return { answers: {}, timeSpent: {} };
  }
}

function saveProgress(progress) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* sessionStorage yopiq bo'lsa (private mode) — trial baribir ishlayveradi,
       faqat sahifa yangilanganda javoblar yo'qoladi. */
  }
}

export function clearTrialProgress() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* e'tiborsiz */ }
}

export function useTrialLogic() {
  const { stage } = useParams();
  const navigate = useNavigate();
  const { user, startGuestSession } = useAuth();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const [timeLeft, setTimeLeft] = useState(null);
  const [duration, setDuration] = useState(0);
  const [textSize, setTextSize] = useState("text-base");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activePart, setActivePart] = useState(0);
  const [audioTime, setAudioTime] = useState(0);

  const stageIndex = STAGE_ORDER.indexOf(stage);
  const isLastStage = stageIndex === STAGE_ORDER.length - 1;

  // ─── Testni yuklash ───────────────────────────────────────────────────────
  useEffect(() => {
    if (stageIndex === -1) {
      setError("Noma'lum bosqich.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Mehmon to'g'ridan-to'g'ri havola bilan kelgan bo'lishi mumkin —
        // sessiyani shu yerda ham kafolatlaymiz, faqat intro sahifasida emas.
        await startGuestSession();

        const getTrialTest = httpsCallable(functions, "getTrialTest");
        const { data } = await getTrialTest({ stage });
        if (cancelled) return;

        const testData = data.test || {};
        if (testData.type) testData.type = String(testData.type).toLowerCase();

        setTest(testData);
        setDuration(data.durationSeconds);
        setTimeLeft(data.durationSeconds);

        // Oldingi bosqichdan qaytib kelingan bo'lsa javoblarni tiklaymiz.
        const progress = loadProgress();
        setUserAnswers(progress.answers[stage] || {});

        // Bosqich haqiqatan OCHILDI (test yuklandi). Drop-off shu event bilan
        // keyingi `trial_stage_complete` orasidagi farqdan hisoblanadi.
        track("trial_stage_view", { stage });
      } catch (err) {
        if (cancelled) return;
        console.error("Trial test yuklashda xatolik:", err);
        track("trial_stage_error", { stage, reason: err?.code || err?.message });
        setError(err.message || "Testni yuklab bo'lmadi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [stage, stageIndex, startGuestSession]);

  // ─── Taymer ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !test || timeLeft === null || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [timeLeft, loading, test]);

  const handleSelectAnswer = useCallback((questionId, option) => {
    setUserAnswers((prev) => (prev[questionId] === option ? prev : { ...prev, [questionId]: option }));
  }, []);

  const toggleFlag = useCallback((questionId) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }, []);

  const handleToggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.error(err));
      setIsFullScreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  }, []);

  /**
   * Bosqichni yakunlaydi.
   *
   * Oxirgi bosqich bo'lmasa — javoblarni saqlab keyingisiga o'tadi.
   * Oxirgisi bo'lsa — hammasini `submitTrial` ga yuboradi.
   */
  const finishStage = useCallback(async () => {
    const progress = loadProgress();
    progress.answers[stage] = userAnswers;
    progress.timeSpent[stage] = Math.max(0, duration - (timeLeft ?? duration));
    saveProgress(progress);

    track("trial_stage_complete", {
      stage,
      answered: Object.keys(userAnswers).length,
      time_spent: progress.timeSpent[stage],
      timed_out: timeLeft === 0,
    });

    if (!isLastStage) {
      navigate(`/trial/${STAGE_ORDER[stageIndex + 1]}`);
      return;
    }

    setSaving(true);
    try {
      const submitTrial = httpsCallable(functions, "submitTrial");
      const { data } = await submitTrial({
        answers: progress.answers,
        timeSpent: progress.timeSpent,
      });

      // Natija faqat javob sifatida keladi — `trial_results` hujjatini klient
      // o'qiy olmaydi. Shuning uchun uni natija sahifasiga state orqali
      // uzatamiz va sessionStorage'ga ham qo'yamiz (sahifa yangilansa qolsin).
      try {
        sessionStorage.setItem("trialResult", JSON.stringify(data));
      } catch { /* e'tiborsiz */ }

      track("trial_complete", {
        band: Number(data?.overallBand) || undefined,
        reward_earned: Boolean(data?.rewardEarned),
      });

      clearTrialProgress();
      navigate("/trial/result", { state: { result: data }, replace: true });
    } catch (err) {
      console.error("Trial submit xatolik:", err);
      track("trial_submit_error", { reason: err?.code || err?.message });
      setError(err.message || "Natijani hisoblab bo'lmadi.");
      setSaving(false);
    }
  }, [stage, stageIndex, isLastStage, userAnswers, duration, timeLeft, navigate]);

  // Vaqt tugasa bosqich avtomatik yakunlanadi.
  useEffect(() => {
    if (timeLeft === 0 && test && !saving) finishStage();
  }, [timeLeft, test, saving, finishStage]);

  return {
    stage, stageIndex, isLastStage, totalStages: STAGE_ORDER.length,
    test, loading, error, saving,
    userAnswers, handleSelectAnswer,
    flaggedQuestions, toggleFlag,
    timeLeft, textSize, setTextSize,
    isFullScreen, handleToggleFullScreen,
    activePart, setActivePart, audioTime, setAudioTime,
    finishStage,
    isGuestSession: Boolean(user?.isAnonymous),
  };
}

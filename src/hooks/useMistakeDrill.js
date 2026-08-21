// src/hooks/useMistakeDrill.js
//
// "Xatolar ustida mashq" sahifasining holati.
//
// O'QISH NARXI
// ────────────
// Xatolar sessiyalari analitika sahifasi bilan BITTA kesh kalitini bo'lishadi
// (`useMistakeSessions`), ya'ni tahlilni ko'rib mashqqa o'tgan o'quvchi
// hujjatlarni qayta o'qimaydi. Sovuq kirishda esa sahifa bir necha sahifa
// oldindan yuklaydi: mashq uchun yetarli hovuz kerak, va bu foydalanuvchi
// ATAYLAB bosgan amal — analitika sahifasidan farqli, bu yerda o'qish oqlanadi.
//
// TAKRORLASH HOLATI
// ─────────────────
// `drillProgress/{uid}` — bitta hujjat, bitta o'qish va seans oxirida bitta
// yozuv. Har bir element uchun alohida hujjat ochish har mashqda o'nlab o'qishga
// aylanardi. Bu hujjatni klient yozadi: u faqat o'quvchining o'z mashq
// jadvali va uni "aldash" hech kimga zarar keltirmaydi.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../firebase/firebase';
import { classifyMistake } from '../utils/mistakePatterns';
import { buildDrillItems, nextSchedule, checkDrillAnswer, DRILL_SIZE } from '../utils/drill';
import { useMistakeSessions, flattenSessions } from './useMistakeSessions';

/**
 * Nechta sahifa oldindan yuklanadi.
 *
 * 3 sahifa = 24 sessiya ≈ 120–360 ta xato. 10 ta elementlik seans uchun bundan
 * ortig'i hovuzni kengaytirmaydi, faqat o'qishni qimmatlashtiradi.
 */
const MAX_PAGES = 3;

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    try {
      const d = value.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Takrorlash jadvali. Yo'q bo'lsa — bo'sh, ya'ni hamma element "muddati kelgan". */
function useDrillProgress(uid) {
  return useQuery({
    queryKey: ['drillProgress', uid],
    enabled: !!uid,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'drillProgress', uid));
      return snap.exists() ? snap.data()?.items || {} : {};
    }
  });
}

export function useMistakeDrill(user) {
  const uid = user?.uid;
  const queryClient = useQueryClient();

  const sessions = useMistakeSessions(uid, true);
  const { data: progress, isLoading: progressLoading } = useDrillProgress(uid);

  // Hovuzni to'ldirish uchun bir necha sahifa oldindan olinadi.
  const pageCount = sessions.data?.pages?.length || 0;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = sessions;
  useEffect(() => {
    if (pageCount > 0 && pageCount < MAX_PAGES && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [pageCount, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Xatolarni tasniflab, mashq elementlariga aylantiramiz ──
  const mistakes = useMemo(() => {
    const out = [];
    flattenSessions(sessions.data).forEach((session) => {
      const when = toDate(session.date);
      (session.mistakes || []).forEach((m, idx) => {
        const classified = classifyMistake(m);
        if (!classified.correctText || !classified.pattern) return;
        out.push({
          key: `${session.id}-${m.questionId ?? idx}`,
          family: m.questionType || 'other',
          testTitle: session.testTitle || null,
          date: when,
          ...classified
        });
      });
    });
    return out;
  }, [sessions.data]);

  const pool = useMemo(() => buildDrillItems(mistakes, progress || {}), [mistakes, progress]);

  // ── Seans ──
  // Ro'yxat seans boshlanganda BIR MARTA muzlatiladi: `pool` har javobdan keyin
  // qayta hisoblansa, element o'rtasida ro'yxat siljib ketardi.
  const [queue, setQueue] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [revealed, setRevealed] = useState(false);

  const start = useCallback(() => {
    setQueue(pool.due.slice(0, DRILL_SIZE));
    setIndex(0);
    setAnswers([]);
    setRevealed(false);
  }, [pool.due]);

  const current = queue && index < queue.length ? queue[index] : null;
  const finished = !!queue && index >= queue.length;

  /** Javobni tekshiradi va natijani yozib qo'yadi (keyingisiga o'tmaydi). */
  const submitAnswer = useCallback((input) => {
    if (!current || revealed) return null;
    const correct = checkDrillAnswer(input, current.target);
    setAnswers((prev) => [...prev, { key: current.key, target: current.target, input, correct }]);
    setRevealed(true);
    return correct;
  }, [current, revealed]);

  /**
   * Takrorlash jadvalini saqlaydi.
   *
   * Effektda emas, seans tugagan HODISADA chaqiriladi: effekt varianti "bir
   * marta yozildi" qo'riqchisini talab qilardi, hodisa esa tabiatan bir marta
   * sodir bo'ladi.
   */
  const persist = useCallback((finalAnswers) => {
    if (!uid || finalAnswers.length === 0) return;

    const now = Date.now();
    const updated = { ...(progress || {}) };
    finalAnswers.forEach((answer) => {
      updated[answer.key] = nextSchedule(updated[answer.key], answer.correct, now);
    });

    setDoc(doc(db, 'drillProgress', uid), { items: updated, updatedAt: now }, { merge: true })
      .then(() => queryClient.setQueryData(['drillProgress', uid], updated))
      .catch((error) => {
        // Jadval saqlanmasa mashq baribir bajarilgan — o'quvchi natijasini
        // yo'qotmasligi kerak. Keyingi seansda elementlar shunchaki qaytadan
        // "muddati kelgan" bo'lib chiqadi.
        console.error('drillProgress saqlanmadi:', error);
      });
  }, [uid, progress, queryClient]);

  const next = useCallback(() => {
    setRevealed(false);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (queue && nextIndex >= queue.length) persist(answers);
  }, [index, queue, answers, persist]);

  const correctCount = answers.filter((a) => a.correct).length;

  return {
    loading: sessions.isLoading || progressLoading,
    error: sessions.error?.message || null,

    // Hovuz holati
    dueCount: pool.due.length,
    totalCount: pool.total,
    skippedCount: pool.skipped,

    // Seans
    started: !!queue,
    finished,
    current,
    revealed,
    index,
    size: queue?.length || 0,
    answers,
    correctCount,

    start,
    submitAnswer,
    next
  };
}

export default useMistakeDrill;

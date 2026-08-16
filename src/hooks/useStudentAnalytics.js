// src/hooks/useStudentAnalytics.js
//
// Analitika sahifasining yagona ma'lumot manbai.
//
// Ikkita manbani birlashtiradi:
//   1. `results` — natija hujjatlaridagi `typeStats: { <family>: { total, correct } }`.
//      Bu MAXRAJni beradi: "5 ta xato" ko'pmi yoki ozmi — faqat shu turdagi umumiy
//      savollar soni bilan aytish mumkin.
//   2. `users/{uid}/mistakeSessions` — xatolarning O'ZI (qaysi savol, nima yozgan,
//      to'g'ri javob nima). Foiz "nimani" ko'rsatadi, bu esa "nega"sini.
//
// Ikkalasi ham keraklik sabab: faqat foiz — mavhum, faqat xatolar ro'yxati — maxrajsiz.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

import { db } from '../firebase/firebase';
import { mergeTypeStats } from '../utils/questionTypes';
import { classifyMistake, summarizePatterns } from '../utils/mistakePatterns';

/** Foiz chiqarish uchun minimal savol soni — 2 ta savoldan xulosa chiqarilmaydi. */
export const MIN_SAMPLE = 5;

/**
 * Nechta oxirgi xato sessiyasi o'qiladi.
 *
 * Bu son to'g'ridan-to'g'ri Firestore o'qishlari soni: har bir sessiya — bitta
 * hujjat. Bitta sessiyada odatda 5–15 ta xato bo'ladi, ya'ni 30 ta sessiya
 * ~150–450 ta xatoni beradi — naqsh tahlili uchun bundan ortig'i statistikani
 * yaxshilamaydi, faqat hisobni qimmatlashtiradi.
 */
const SESSION_LIMIT = 30;

/**
 * Xatolar tarixi FAQAT test topshirilganda o'zgaradi — soniyalab yangilanadigan
 * ma'lumot emas. Shuning uchun global 5 daqiqalik standart o'rniga uzunroq oyna
 * olinadi: sahifaga qayta-qayta kirish qo'shimcha o'qish keltirib chiqarmaydi.
 */
const STALE_MS = 1000 * 60 * 30;
const GC_MS = 1000 * 60 * 60;

/** Trend hisobida "yaqinda" deb qaraladigan natijalar soni. */
const RECENT_WINDOW = 5;

const SKILLS = ['reading', 'listening'];

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

/** `{ family: {total, correct} }` → UI qatorlari. */
function statsToRows(aggregated) {
  return Object.entries(aggregated)
    .map(([family, stat]) => {
      const total = stat.total || 0;
      const correct = Math.min(stat.correct || 0, total);
      return {
        family,
        total,
        correct,
        wrong: total - correct,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : null,
        reliable: total >= MIN_SAMPLE
      };
    })
    .filter((r) => r.total > 0);
}

/**
 * Reading/Listening xatolarini o'qiydi. Speaking sessiyalari boshqa tuzilishga ega
 * (`userAnswer`/`explanation`) va alohida ekranda ko'rsatiladi — bu yerda tashlanadi.
 *
 * DIQQAT: bitta omborda `date` ikki xil turda yotadi — `submitTestAnswers` ISO
 * SATR yozadi, `evaluateSpeaking` esa Timestamp. Firestore turlarni tartiblaganda
 * satrlarni Timestamp'dan keyinga qo'yadi, ya'ni DESC saralashda satrli (reading/
 * listening) yozuvlar birinchi keladi — bizga aynan shular kerak. Shu sabab
 * `limit` speaking yozuvlari tufayli "yeb ketilmaydi". Agar kelajakda submit
 * tomoni Timestamp'ga o'tkazilsa, bu yerga `where('skill','!=','speaking')`
 * (yoki alohida so'rov) qo'shish kerak bo'ladi.
 */
function useMistakeSessions(uid, enabled) {
  return useQuery({
    queryKey: ['mistakeSessions', uid],
    enabled: !!uid && enabled,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, 'users', uid, 'mistakeSessions'),
          orderBy('date', 'desc'),
          limit(SESSION_LIMIT)
        )
      );
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.skill !== 'speaking');
    }
  });
}

/**
 * @param {object} user Firebase auth foydalanuvchisi
 * @param {Array} results `useStudentData` dan kelgan natijalar
 * @param {boolean} [enabled=true] Xatolar tarixi yuklansinmi. Pro bo'lmagan
 *        foydalanuvchida bo'limlar xiralashgan namuna bilan ko'rsatiladi, ya'ni
 *        haqiqiy ma'lumot kerak emas — so'rovni o'chirish behuda Firestore
 *        o'qishlarini va sahifa kutishini olib tashlaydi.
 */
export function useStudentAnalytics(user, results, enabled = true) {
  const { data: sessions, isLoading, error } = useMistakeSessions(user?.uid, enabled);

  const analytics = useMemo(() => {
    const resultList = Array.isArray(results) ? results : [];
    const sessionList = Array.isArray(sessions) ? sessions : [];

    // ── 1. Savol turlari kesimidagi aniqlik ────────────────────────────────
    const withStats = resultList
      .filter((r) => r?.typeStats && Object.keys(r.typeStats).length > 0)
      .sort((a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0));

    let aggregated = {};
    withStats.forEach((r) => {
      aggregated = mergeTypeStats(aggregated, r.typeStats);
    });

    // Trend: oxirgi N ta natija vs undan oldingilar. Ikkala oynada ham yetarli
    // savol bo'lgandagina ko'rsatiladi — aks holda "+30%" tasodifiy sakrash bo'ladi.
    let recentStats = {};
    let earlierStats = {};
    withStats.slice(0, RECENT_WINDOW).forEach((r) => {
      recentStats = mergeTypeStats(recentStats, r.typeStats);
    });
    withStats.slice(RECENT_WINDOW).forEach((r) => {
      earlierStats = mergeTypeStats(earlierStats, r.typeStats);
    });

    const accuracyOf = (bucket, family) => {
      const stat = bucket[family];
      if (!stat || stat.total < MIN_SAMPLE) return null;
      return Math.round((Math.min(stat.correct, stat.total) / stat.total) * 100);
    };

    const typeRows = statsToRows(aggregated)
      .map((row) => {
        const recent = accuracyOf(recentStats, row.family);
        const earlier = accuracyOf(earlierStats, row.family);
        return {
          ...row,
          trend: recent !== null && earlier !== null ? recent - earlier : null
        };
      })
      .sort((a, b) => {
        // Avval ishonchli namunalar, ular ichida eng past aniqlik yuqorida —
        // sahifa ochilganda birinchi ko'rinadigan narsa eng muhim muammo bo'lsin.
        if (a.reliable !== b.reliable) return a.reliable ? -1 : 1;
        return a.accuracy - b.accuracy;
      });

    const totalAnswered = typeRows.reduce((sum, r) => sum + r.total, 0);
    const totalCorrect = typeRows.reduce((sum, r) => sum + r.correct, 0);
    const weakest = typeRows.filter((r) => r.reliable && r.accuracy < 70).slice(0, 3);
    const reliableRows = typeRows.filter((r) => r.reliable);
    const strongest = reliableRows.length > 0 ? reliableRows[reliableRows.length - 1] : null;

    // ── 2. Xatolarning o'zi ────────────────────────────────────────────────
    const mistakes = [];
    sessionList.forEach((session) => {
      const when = toDate(session.date);
      (session.mistakes || []).forEach((m, idx) => {
        const classified = classifyMistake(m);
        // Kalitsiz yozuvlar tahlilni buzadi — ular xato emas, test tuzilishidagi bo'shliq.
        if (!classified.correctText) return;
        // Sababi aniqlanmagan yozuv (javob kalitga aynan teng) — ko'rsatilsa chalg'itadi.
        if (!classified.pattern) return;
        mistakes.push({
          key: `${session.id}-${m.questionId ?? idx}`,
          questionId: m.questionId ?? null,
          family: m.questionType || 'other',
          testId: session.testId || null,
          testTitle: session.testTitle || null,
          date: when,
          ...classified
        });
      });
    });
    mistakes.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

    const patterns = summarizePatterns(mistakes);

    // Takrorlanayotgan xatolar: bir xil to'g'ri javobni bir necha marta o'tkazib
    // yuborish — bu tasodif emas, aniq bo'shliq.
    const repeatMap = new Map();
    mistakes.forEach((m) => {
      const key = m.correctText.trim().toLowerCase();
      if (!key) return;
      const prev = repeatMap.get(key);
      if (prev) prev.count += 1;
      else repeatMap.set(key, { correctText: m.correctText, family: m.family, count: 1 });
    });
    const repeated = [...repeatMap.values()]
      .filter((r) => r.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // ── 3. Ko'nikmalar kesimi ──────────────────────────────────────────────
    const skills = SKILLS.map((skill) => {
      const rows = resultList.filter((r) => String(r?.type || '').toLowerCase() === skill);
      const total = rows.reduce((sum, r) => sum + (Number(r.totalQuestions) || 0), 0);
      const correct = rows.reduce(
        (sum, r) => sum + (Number(r.latestScore ?? r.score ?? 0) || 0),
        0
      );
      return {
        skill,
        tests: rows.length,
        total,
        correct,
        accuracy: total > 0 ? Math.round((Math.min(correct, total) / total) * 100) : null
      };
    }).filter((s) => s.tests > 0);

    // ── 4. Sarflangan vaqt ────────────────────────────────────────────────
    const durations = [];
    resultList.forEach((r) => {
      const attempts = Array.isArray(r?.attempts) ? r.attempts : [];
      attempts.forEach((a) => {
        const secs = Number(a?.timeSpent);
        if (secs > 0) durations.push(secs);
      });
    });
    const avgMinutes = durations.length
      ? Math.round(durations.reduce((sum, s) => sum + s, 0) / durations.length / 60)
      : null;

    return {
      typeRows,
      weakest,
      strongest,
      totalAnswered,
      totalCorrect,
      totalWrong: totalAnswered - totalCorrect,
      overallAccuracy:
        totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null,
      mistakes,
      patterns,
      repeated,
      skills,
      avgMinutes,
      testsAnalyzed: withStats.length,
      // Turlar kesimi ko'rsatishga arziydigan ma'lumot yig'ilganmi.
      hasTypeData: totalAnswered >= MIN_SAMPLE,
      // Xatolar jurnali uchun alohida shart — u typeStats'siz eski natijalarda ham ishlaydi.
      hasMistakeData: mistakes.length > 0
    };
  }, [results, sessions]);

  return { ...analytics, loading: isLoading, error: error?.message || null };
}

export default useStudentAnalytics;

// src/hooks/useStudentAnalytics.js
//
// Analitika sahifasining yagona ma'lumot manbai.
//
// ISHLASH TARTIBI
// ───────────────
// Barcha ko'rsatkichlar `analyticsSummaries/{uid}` jamlanmasidan chiqadi — bu
// bitta hujjat va uni server topshiriq paytida yig'adi. Ilgari shu sahifa 50 ta
// natija hujjatini, butun podcast urinishlari ro'yxatini va 30 ta xato
// sessiyasini o'qirdi; endi birinchi ekran uchun bitta o'qish yetadi.
//
// Xatolarning O'ZI (qaysi savol, nima yozgan, to'g'risi nima) jamlanmaga
// sig'maydi va sig'ishi ham shart emas: foydalanuvchilarning katta qismi
// "Xatolar jurnali" bo'limigacha aylantirmaydi. Shuning uchun u ALOHIDA va
// KECHIKTIRILGAN so'rov bilan yuklanadi — `loadMistakes()` chaqirilgunga qadar
// hech narsa o'qilmaydi.
//
// Ikkala manba ham kerakligi saqlanib qoladi: foiz "nimani" ko'rsatadi, xatolar
// ro'yxati esa "nega"sini.

import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';

import { db } from '../firebase/firebase';
import { classifyMistake, summarizePatternCounts } from '../utils/mistakePatterns';
import { computeBandImpact } from '../utils/bandImpact';
import { wilsonInterval } from '../utils/wilson';
import { buildWeeklyTrend } from '../utils/weeklyTrend';
import { useAnalyticsSummary } from './useAnalyticsSummary';

/**
 * Foizni umuman KO'RSATISH uchun minimal savol soni.
 *
 * Bu faqat ko'rsatish chegarasi. "Bu tur kuchsiz" degan QARORNI endi namuna
 * hajmi emas, Wilson ishonch oralig'i belgilaydi — pastdagi `WEAK_THRESHOLD`
 * ga qarang.
 */
export const MIN_SAMPLE = 5;

/**
 * Tur "kuchsiz" deb belgilanishi uchun ishonch oralig'ining YUQORI chegarasi
 * shu foizdan past bo'lishi kerak — ya'ni "eng yaxshi holatda ham 70% dan past".
 *
 * Ilgari bu shart shunchaki `accuracy < 70` edi va 5 tadan 2 tasi (40%) ham
 * "eng kuchsiz tur" bo'lib chiqardi. Endi bunday qator o'tmaydi: uning yuqori
 * chegarasi 73%.
 */
export const WEAK_THRESHOLD = 70;

/**
 * Bir "sahifa"da nechta xato sessiyasi o'qiladi.
 *
 * Har bir sessiya — bitta hujjat, ya'ni bitta o'qish. Bitta sessiyada odatda
 * 5–15 ta xato bo'ladi, demak 8 ta sessiya ~40–120 ta xatoni beradi — birinchi
 * ekran uchun yetarli. Qolgani "Yana ko'rsatish" bilan kursor orqali olinadi,
 * ya'ni allaqachon o'qilgan hujjatlar qayta o'qilmaydi.
 */
const SESSION_PAGE = 8;

/** Xatolar tarixi faqat test topshirilganda o'zgaradi — uzun kesh oynasi. */
const STALE_MS = 1000 * 60 * 30;
const GC_MS = 1000 * 60 * 60;

/** Trendni hisoblashda "yaqinda" deb qaraladigan haftalar soni. */
const TREND_WINDOW = 4;

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

/**
 * Xato sessiyalarini kechiktirilgan va sahifalab o'qiydi.
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
  return useInfiniteQuery({
    queryKey: ['mistakeSessions', uid],
    enabled: !!uid && enabled,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const constraints = [orderBy('date', 'desc')];
      if (pageParam) constraints.push(startAfter(pageParam));
      constraints.push(limit(SESSION_PAGE));

      const snap = await getDocs(
        query(collection(db, 'users', uid, 'mistakeSessions'), ...constraints)
      );

      return {
        sessions: snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.skill !== 'speaking'),
        // Kursor — keyingi sahifa shu hujjatdan keyin boshlanadi.
        cursor: snap.docs.length === SESSION_PAGE ? snap.docs[snap.docs.length - 1] : null
      };
    },
    getNextPageParam: (lastPage) => lastPage.cursor
  });
}

/** Jamlanmadagi haftalarni eskidan yangiga qarab tartiblaydi. */
function sortedWeeks(weeks) {
  return Object.entries(weeks || {})
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, bucket]) => ({ key, ...bucket }));
}

/** Bir necha haftalik chelakni bitta `{family: {total, correct}}` ga yig'adi. */
function foldWeeks(weekList) {
  const out = {};
  weekList.forEach((week) => {
    Object.entries(week.byType || {}).forEach(([family, stat]) => {
      const prev = out[family] || { total: 0, correct: 0 };
      out[family] = {
        total: prev.total + (Number(stat?.total) || 0),
        correct: prev.correct + (Number(stat?.correct) || 0)
      };
    });
  });
  return out;
}

/**
 * @param {object} user Firebase auth foydalanuvchisi
 * @param {boolean} [enabled=true] Haqiqiy ma'lumot yuklansinmi. Pro bo'lmagan
 *        foydalanuvchida bo'limlar xiralashgan namuna bilan ko'rsatiladi, ya'ni
 *        so'rovni o'chirish behuda Firestore o'qishlarini olib tashlaydi.
 */
export function useStudentAnalytics(user, enabled = true) {
  const uid = user?.uid;
  const { summary, loading: summaryLoading, error: summaryError } = useAnalyticsSummary(uid, enabled);

  // Xatolar jurnali ko'rinishga kirmaguncha hech narsa o'qilmaydi.
  const [wantMistakes, setWantMistakes] = useState(false);
  const loadMistakes = useCallback(() => setWantMistakes(true), []);

  const sessionsQuery = useMistakeSessions(uid, enabled && wantMistakes);

  const analytics = useMemo(() => {
    // ── 1. Savol turlari kesimidagi aniqlik ────────────────────────────────
    const weeks = sortedWeeks(summary.weeks);
    const recentWeeks = weeks.slice(-TREND_WINDOW);
    const earlierWeeks = weeks.slice(-TREND_WINDOW * 2, -TREND_WINDOW);
    const recentStats = foldWeeks(recentWeeks);
    const earlierStats = foldWeeks(earlierWeeks);

    const accuracyOf = (bucket, family) => {
      const stat = bucket[family];
      if (!stat || stat.total < MIN_SAMPLE) return null;
      return Math.round((Math.min(stat.correct, stat.total) / stat.total) * 100);
    };

    const typeRows = Object.entries(summary.byType || {})
      .map(([family, stat]) => {
        const total = Number(stat?.total) || 0;
        const correct = Math.min(Number(stat?.correct) || 0, total);
        const recent = accuracyOf(recentStats, family);
        const earlier = accuracyOf(earlierStats, family);
        return {
          family,
          total,
          correct,
          wrong: total - correct,
          accuracy: total > 0 ? Math.round((correct / total) * 100) : null,
          // Ishonch oralig'i: shu foizga qanchalik tayanish mumkin.
          wilson: wilsonInterval(correct, total),
          reliable: total >= MIN_SAMPLE,
          // Ikkala oynada ham yetarli savol bo'lgandagina ko'rsatiladi — aks holda
          // "+30%" tasodifiy sakrash bo'lardi.
          trend: recent !== null && earlier !== null ? recent - earlier : null
        };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => {
        // Avval ishonchli namunalar, ular ichida ENG ANIQ muammo yuqorida.
        //
        // Saralash xom foiz bo'yicha emas, oraliqning yuqori chegarasi bo'yicha:
        // 50 tadan 20 tasi (40%) va 10 tadan 4 tasi (40%) bir xil foiz beradi,
        // lekin birinchisi ancha ishonchli muammo. Yuqori chegara buni o'zi
        // hal qiladi — 52% va 65%.
        if (a.reliable !== b.reliable) return a.reliable ? -1 : 1;
        return a.wilson.high - b.wilson.high;
      });

    const totalAnswered = typeRows.reduce((sum, r) => sum + r.total, 0);
    const totalCorrect = typeRows.reduce((sum, r) => sum + r.correct, 0);
    // "Eng yaxshi holatda ham 70% dan past" — shundagina bu haqiqiy bo'shliq.
    const weakest = typeRows
      .filter((r) => r.reliable && r.wilson.high < WEAK_THRESHOLD)
      .slice(0, 3);

    // Eng kuchli tur esa teskari savolga javob beradi: "eng yomon holatda ham
    // qancha?" — shuning uchun QUYI chegara bo'yicha tanlanadi.
    const strongest = typeRows
      .filter((r) => r.reliable)
      .reduce((best, row) => (!best || row.wilson.low > best.wilson.low ? row : best), null);

    // ── 2. Xato sabablari ─────────────────────────────────────────────────
    // Sanoq jamlanmadan keladi: xatolar ro'yxati yuklanmagan bo'lsa ham
    // "xatolaringizning 40% imlo" degan xulosa ko'rsatiladi.
    const patterns = summarizePatternCounts(summary.patterns);

    // ── 3. Xatolarning o'zi (kechiktirilgan) ──────────────────────────────
    const mistakes = [];
    (sessionsQuery.data?.pages || []).forEach((page) => {
      page.sessions.forEach((session) => {
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
    });
    mistakes.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

    // ── 4. Takrorlanayotgan xatolar ───────────────────────────────────────
    // Bir xil to'g'ri javobni bir necha marta o'tkazib yuborish — bu tasodif
    // emas, aniq bo'shliq. Jamlanmada allaqachon sanab qo'yilgan.
    const repeated = (summary.repeated || [])
      .filter((row) => (row?.count || 0) > 1)
      .slice(0, 6)
      .map((row) => ({ correctText: row.text, family: row.family, count: row.count }));

    // ── 5. Ko'nikmalar kesimi ─────────────────────────────────────────────
    const skills = SKILLS.map((skill) => {
      const stat = summary.skills?.[skill];
      if (!stat) return null;
      const total = Number(stat.total) || 0;
      const correct = Math.min(Number(stat.correct) || 0, total);
      return {
        skill,
        tests: Number(stat.tests) || 0,
        total,
        correct,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : null,
        bestBand: Number(stat.bestBand) || 0,
        lastBand: stat.lastBand ?? null,
        // Ball ta'siri hisobi uchun — `correct` bilan bir xil semantikada
        // (test bo'yicha deduplikatsiya qilingan).
        nearMiss: Number(stat.nearMiss) || 0,
        mistakes: Number(stat.mistakes) || 0
      };
    }).filter((s) => s && s.tests > 0);

    // ── 6. Ball ta'siri ───────────────────────────────────────────────────
    // "Yaqin marra" xatolarini tuzatish bandni qanchaga ko'taradi. Foiz
    // harakatga undamaydi, band esa undaydi.
    const bandImpact = computeBandImpact(skills);

    // ── 7. Vaqt o'qi ──────────────────────────────────────────────────────
    // Oilalar `typeRows` tartibida uzatiladi — ya'ni eng kuchsizi birinchi
    // katakda turadi. O'quvchi eng ko'p e'tibor beradigan joy aynan o'sha.
    const trend = buildWeeklyTrend(weeks, { families: typeRows.map((r) => r.family) });

    // ── 8. Sarflangan vaqt ────────────────────────────────────────────────
    const timeTotals = weeks.reduce(
      (acc, week) => ({
        minutes: acc.minutes + (Number(week.minutes) || 0),
        attempts: acc.attempts + (Number(week.attempts) || 0)
      }),
      { minutes: 0, attempts: 0 }
    );
    const avgMinutes = timeTotals.attempts > 0
      ? Math.round(timeTotals.minutes / timeTotals.attempts)
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
      // Umumiy xatolar soni — jamlanmadan. `mistakes.length` ga tayanib bo'lmaydi:
      // u ro'yxat yuklanmaguncha 0 bo'ladi.
      totalMistakes: Number(summary.nearMiss?.ofTotal) || 0,
      patterns,
      repeated,
      skills,
      bandImpact,
      trend,
      weeks,
      avgMinutes,
      testsAnalyzed: Number(summary.testsCounted) || 0,
      // Turlar kesimi ko'rsatishga arziydigan ma'lumot yig'ilganmi.
      hasTypeData: totalAnswered >= MIN_SAMPLE,
      // Xatolar jurnali uchun alohida shart. Ro'yxatning O'ZIGA emas, jamlanmadagi
      // sanoqqa qaraydi — aks holda hali yuklanmagan bo'lim "xato yo'q" deb
      // ko'rinardi.
      hasMistakeData: (summary.nearMiss?.ofTotal || 0) > 0
    };
  }, [summary, sessionsQuery.data]);

  return {
    ...analytics,
    loading: summaryLoading,
    error: summaryError || sessionsQuery.error?.message || null,

    // Xatolar jurnali uchun boshqaruv.
    loadMistakes,
    mistakesLoading: sessionsQuery.isLoading || sessionsQuery.isFetchingNextPage,
    mistakesRequested: wantMistakes,
    hasMoreMistakes: !!sessionsQuery.hasNextPage,
    loadMoreMistakes: sessionsQuery.fetchNextPage
  };
}

export default useStudentAnalytics;

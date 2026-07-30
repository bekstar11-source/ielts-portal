import { useMemo } from 'react';
import { mergeTypeStats } from '../utils/questionTypes';

/**
 * Savol turlari kesimidagi xatolar tahlili (Pro funksiyasi).
 *
 * Manba — natija hujjatidagi `typeStats: { <family>: { total, correct } }`.
 * Uni server `submitTestAnswers` / `submitMockExam` da yozadi.
 *
 * DIQQAT: funksiya joriy qilingunga qadar topshirilgan natijalarda `typeStats`
 * yo'q va ularni qayta tiklab bo'lmaydi — xatolar `users/{uid}/mistakeSessions`
 * da alohida yotibdi, u yerda ham savol turi eski yozuvlarda saqlanmagan.
 * Shuning uchun tahlil YANGI topshiriqlardan boshlab to'ldiriladi.
 */

/** Foiz hisoblash uchun minimal savol soni — 2 ta savoldan "40% xato" degan xulosa chiqmaydi. */
const MIN_SAMPLE = 5;

export function useMistakeAnalysis(results) {
  return useMemo(() => {
    const list = Array.isArray(results) ? results : [];

    let aggregated = {};
    let resultsWithStats = 0;

    list.forEach((res) => {
      if (res?.typeStats && Object.keys(res.typeStats).length > 0) {
        aggregated = mergeTypeStats(aggregated, res.typeStats);
        resultsWithStats += 1;
      }
    });

    const rows = Object.entries(aggregated)
      .map(([family, stat]) => {
        const total = stat.total || 0;
        const correct = Math.min(stat.correct || 0, total);
        return {
          family,
          total,
          correct,
          wrong: total - correct,
          accuracy: total > 0 ? Math.round((correct / total) * 100) : null,
          // Kam savolli turlarda foizga ishonib bo'lmaydi — UI buni ko'rsatadi.
          reliable: total >= MIN_SAMPLE
        };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => {
        // Avval ishonchli va eng past aniqlikdagilar.
        if (a.reliable !== b.reliable) return a.reliable ? -1 : 1;
        return a.accuracy - b.accuracy;
      });

    const totalAnswered = rows.reduce((sum, r) => sum + r.total, 0);
    const totalCorrect = rows.reduce((sum, r) => sum + r.correct, 0);

    // Eng kuchsiz turlar: ishonchli namunaga ega va aniqligi 70% dan past.
    const weakest = rows.filter((r) => r.reliable && r.accuracy < 70).slice(0, 3);
    // Eng kuchli tur — motivatsiya uchun.
    const strongest = rows.filter((r) => r.reliable).slice(-1)[0] || null;

    return {
      rows,
      weakest,
      strongest,
      totalAnswered,
      totalCorrect,
      overallAccuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null,
      resultsWithStats,
      // Tahlil ko'rsatishga arziydigan ma'lumot yig'ilganmi.
      hasData: totalAnswered >= MIN_SAMPLE
    };
  }, [results]);
}

export default useMistakeAnalysis;

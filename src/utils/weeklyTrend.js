// src/utils/weeklyTrend.js
//
// Haftalik chelaklarni grafik qatorlariga aylantiradi.
//
// Ma'lumot jamlanmada allaqachon bor (`summary.weeks`), ya'ni bu bo'lim BITTA
// qo'shimcha Firestore o'qishi ham talab qilmaydi.
//
// NEGA BAND EMAS, ANIQLIK
// ───────────────────────
// `/statistics` band ballari grafigini ko'rsatadi — bu NATIJA. Analitika sahifasi
// esa SABABNI ko'rsatadi. Shu sabab bu yerda band takrorlanmaydi: savol turlari
// kesimidagi aniqlik chiziladi. "Headings 48% → 71%" — o'quvchi aynan qaysi
// ko'nikmasi o'sganini ko'radi, band esa buni umumiy songa yashiradi.
//
// UCHTA QOIDA
// ───────────
//   1. Mashq qilinmagan hafta ham o'qda turadi. Faqat to'la haftalarni ko'rsatish
//      uzilishni yashiradi va uch hafta dam olgan o'quvchi uzluksiz o'sayotgandek
//      ko'rinadi.
//   2. Kam savolli hafta NUQTA BERMAYDI. Bir haftada 3 ta headings savoliga javob
//      bergan o'quvchida aniqlik 0% yoki 100% bo'ladi — bu tebranish, trend emas.
//   3. Kamida ikkita nuqtasi yo'q qator umuman chizilmaydi: bitta nuqta chiziq
//      emas, va "trend" deb ko'rsatilsa yolg'on bo'ladi.

import { TREND_WEEKS, lastWeekKeys } from './isoWeek.js';

export { TREND_WEEKS };

/** Bitta hafta nuqta berishi uchun kerakli minimal savol soni. */
export const MIN_WEEK_SAMPLE = 5;

/** Qator chizilishi uchun kerakli minimal nuqta soni. */
const MIN_POINTS = 2;

/** Nechta savol oilasi ko'rsatiladi — undan ortig'i sahifani o'qib bo'lmas qiladi. */
const MAX_FAMILIES = 6;

function accuracy(correct, total) {
  if (!total || total < MIN_WEEK_SAMPLE) return null;
  return Math.round((Math.min(correct, total) / total) * 100);
}

/**
 * Nuqtalar ro'yxatidan qator quradi: birinchi/oxirgi qiymat va o'zgarish.
 * Bo'sh haftalar `null` bo'lib qoladi — grafik ularni uzilish sifatida chizadi.
 */
function toSeries(id, points) {
  const filled = points.filter((p) => p.value !== null);
  if (filled.length < MIN_POINTS) return null;

  const first = filled[0].value;
  const last = filled[filled.length - 1].value;

  return {
    id,
    points,
    first,
    last,
    change: last - first,
    // Nuqtalar soni — UI "3 haftalik ma'lumot" deb ogohlantirishi uchun.
    filledCount: filled.length,
    min: Math.min(...filled.map((p) => p.value)),
    max: Math.max(...filled.map((p) => p.value))
  };
}

/**
 * @param {Array} weeks Jamlanmadagi haftalar (`useStudentAnalytics` dan, o'sish tartibida)
 * @param {object} [options]
 * @param {string[]} [options.families] Ko'rsatiladigan savol oilalari, muhimlik tartibida
 * @param {Date} [options.now] Oxirgi hafta shu sanani o'z ichiga oladi (sinov uchun)
 * @returns {{keys: string[], overall: object|null, families: object[], hasData: boolean}}
 */
export function buildWeeklyTrend(weeks, { families = [], now = new Date() } = {}) {
  const keys = lastWeekKeys(TREND_WEEKS, now);
  const byKey = new Map((Array.isArray(weeks) ? weeks : []).map((w) => [w.key, w]));

  const overall = toSeries(
    'overall',
    keys.map((key) => {
      const week = byKey.get(key);
      return {
        key,
        value: accuracy(week?.correct || 0, week?.total || 0),
        total: week?.total || 0
      };
    })
  );

  const familySeries = families
    .slice(0, MAX_FAMILIES)
    .map((family) =>
      toSeries(
        family,
        keys.map((key) => {
          const stat = byKey.get(key)?.byType?.[family];
          return {
            key,
            value: accuracy(stat?.correct || 0, stat?.total || 0),
            total: stat?.total || 0
          };
        })
      )
    )
    .filter(Boolean);

  return {
    keys,
    overall,
    families: familySeries,
    hasData: !!overall || familySeries.length > 0
  };
}

/**
 * Qiymatlar qatorini sparkline uchun UZLUKSIZ bo'laklarga ajratadi.
 *
 * Koordinatalar 0–100 oralig'ida (SVG `viewBox` birliklari): `x` — hafta
 * indeksi, `y` — teskarilangan foiz, ya'ni 100% tepada turadi.
 *
 * `null` qiymatlar bo'lakni UZADI. Ularni tashlab, qolgan nuqtalarni ketma-ket
 * ulash eng oson yo'l bo'lardi va aynan shu narsa grafikni yolg'onchi qiladi:
 * uch hafta dam olgan o'quvchining chizig'i uzluksiz o'sish bo'lib ko'rinardi.
 *
 * @param {Array<number|null>} values
 * @returns {Array<Array<{x: number, y: number}>>}
 */
export function toSparklineSegments(values) {
  const list = Array.isArray(values) ? values : [];
  const count = list.length;
  const segments = [];
  let run = [];

  list.forEach((value, index) => {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      if (run.length > 0) segments.push(run);
      run = [];
      return;
    }
    run.push({ x: count > 1 ? (index / (count - 1)) * 100 : 50, y: 100 - value });
  });

  if (run.length > 0) segments.push(run);
  return segments;
}

export default buildWeeklyTrend;

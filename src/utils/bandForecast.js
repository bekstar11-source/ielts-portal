// src/utils/bandForecast.js
//
// "Maqsadimga qachon yetaman?" — o'quvchi eng ko'p so'raydigan savol.
//
// NEGA BU XAVFLI VA QANDAY XAVFSIZ QILINDI
// ────────────────────────────────────────
// Prognoz — sahifadagi eng oson yolg'on gapiradigan joy. Ikki haftalik ma'lumot
// asosida "6 haftada 7.0 ga chiqasiz" deyish oson, va u bajarilmaganda o'quvchi
// butun tahlilga ishonishni to'xtatadi. Shu sabab uchta qat'iy shart bor:
//
//   1. Kamida `MIN_WEEKS` haftalik HAQIQIY ma'lumot. Ikki nuqtadan chiziq
//      o'tkazish mumkin, lekin u trend emas.
//   2. O'sish sur'ati musbat va sezilarli bo'lishi kerak. Tekis yoki pasayayotgan
//      natijada muddat aytilmaydi — "hech qachon" degan javob foydasiz va
//      ruhtushkunlikka olib keladi; uning o'rniga bo'shliq ko'rsatiladi.
//   3. Muddat CHEGARALANADI. Chiziqli ekstrapolyatsiya kichik sur'atda 200 hafta
//      chiqaradi; bunday son ma'lumot emas, shovqin.
//
// USUL: eng kichik kvadratlar bilan haftalik aniqlikka to'g'ri chiziq mos
// keltiriladi, so'ng aniqlik xom ballga va band'ga o'giriladi. Murakkabroq
// model (eksponensial to'yinish) haqiqatga yaqinroq bo'lardi, lekin 6–12
// nuqtada uni ishonchli baholab bo'lmaydi — soddasi halolroq.

import { calculateBandScore } from './ieltsScoring.js';

/** Prognoz uchun kerakli minimal haftalar soni (ma'lumot bor haftalar). */
export const MIN_WEEKS = 6;

/** Haftasiga shu foizdan sekin o'sish "o'sish" deb hisoblanmaydi. */
const MIN_SLOPE = 0.4;

/** Prognoz aytiladigan eng uzoq muddat. */
const MAX_WEEKS_AHEAD = 52;

/** IELTS band shkalasi. */
const MIN_BAND = 1;
const MAX_BAND = 9;

/**
 * Eng kichik kvadratlar: `y = intercept + slope * x`.
 * `x` — hafta indeksi, `y` — aniqlik foizi.
 */
function linearFit(points) {
  const n = points.length;
  if (n < 2) return null;

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  return { slope, intercept: (sumY - slope * sumX) / n };
}

/** Aniqlik foizini band'ga o'giradi (40 savollik testga keltirib). */
function accuracyToBand(accuracy, skill) {
  const raw = Math.round((Math.min(Math.max(accuracy, 0), 100) / 100) * 40);
  return calculateBandScore(raw, skill, 40);
}

/**
 * @param {object} input
 * @param {Array} input.weeks Haftalik chelaklar (`{key, total, correct}`), o'sish tartibida
 * @param {string} input.skill 'reading' | 'listening' — band jadvali uchun
 * @param {number|null} input.target Maqsad band (0.5 qadamli)
 * @returns {object|null} prognoz, yoki ishonchli aytib bo'lmasa `null`
 */
export function forecastBand({ weeks, skill, target }) {
  const points = (Array.isArray(weeks) ? weeks : [])
    .filter((w) => (Number(w?.total) || 0) > 0)
    .map((w, index) => ({
      x: index,
      y: (Math.min(Number(w.correct) || 0, Number(w.total)) / Number(w.total)) * 100
    }));

  if (points.length < MIN_WEEKS) {
    return { ready: false, weeksOfData: points.length, needed: MIN_WEEKS };
  }

  const fit = linearFit(points);
  if (!fit) return { ready: false, weeksOfData: points.length, needed: MIN_WEEKS };

  const currentAccuracy = fit.intercept + fit.slope * (points.length - 1);
  const currentBand = accuracyToBand(currentAccuracy, skill);
  if (currentBand === null) return null;

  const base = {
    ready: true,
    weeksOfData: points.length,
    slope: Math.round(fit.slope * 10) / 10,
    currentBand,
    target: target ?? null
  };

  if (target === null || target === undefined) return base;

  const goal = Math.min(Math.max(Number(target), MIN_BAND), MAX_BAND);
  if (currentBand >= goal) return { ...base, reached: true, weeksToTarget: 0 };

  // O'sish yo'q — muddat aytilmaydi, faqat bo'shliq ko'rsatiladi.
  if (fit.slope < MIN_SLOPE) {
    return { ...base, reached: false, stalled: true, weeksToTarget: null, gap: goal - currentBand };
  }

  // Maqsad band'ga yetish uchun kerakli aniqlikni qidiramiz: band jadvali
  // pog'onali, shuning uchun teskari formula emas, oddiy o'tish qidiruvi.
  let neededAccuracy = null;
  for (let accuracy = Math.ceil(currentAccuracy); accuracy <= 100; accuracy += 1) {
    if (accuracyToBand(accuracy, skill) >= goal) {
      neededAccuracy = accuracy;
      break;
    }
  }
  if (neededAccuracy === null) {
    return { ...base, reached: false, unreachable: true, weeksToTarget: null, gap: goal - currentBand };
  }

  const weeksAhead = Math.ceil((neededAccuracy - currentAccuracy) / fit.slope);
  if (!Number.isFinite(weeksAhead) || weeksAhead > MAX_WEEKS_AHEAD) {
    return { ...base, reached: false, tooFar: true, weeksToTarget: null, gap: goal - currentBand };
  }

  return {
    ...base,
    reached: false,
    weeksToTarget: Math.max(1, weeksAhead),
    neededAccuracy,
    gap: goal - currentBand
  };
}

export default forecastBand;

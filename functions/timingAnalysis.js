// functions/timingAnalysis.js
//
// ⚠️ AVTOMATIK NUSXA — QO'LDA TAHRIRLAMANG.
// Manba: src/utils/timingAnalysis.js. O'zgartirish kiritish uchun o'sha faylni tahrirlang
// va `npm run mirror` ni ishga tushiring.

//
// "Vaqt yetmadi" — o'quvchilar eng ko'p aytadigan gap, va sahifada uni
// tasdiqlaydigan ham, rad etadigan ham hech nima yo'q edi.
//
// NIMANI O'LCHASH MUMKIN, NIMANI YO'Q
// ───────────────────────────────────
// "7-savolga 90 soniya sarfladingiz" degan ma'lumotni berish MUMKIN EMAS va
// uni ko'rsatish yolg'on bo'lardi: IELTS Reading'da butun passage va barcha
// savollar bir ekranda turadi, o'quvchi ular orasida erkin sakraydi. Qaysi
// savolga qarab turgani kuzatilmaydi.
//
// Kuzatiladigan narsa — javob QACHON yozilgani. Har bir savol uchun birinchi
// javob berilgan daqiqa saqlanadi va shundan quyidagilar chiqadi:
//
//   • Javoblarning test davomiyligi bo'ylab taqsimoti (choraklar bo'yicha).
//   • Oxirgi chorakdagi sur'at — oldingilarga nisbatan keskin tezlashganmi.
//   • Javobsiz qolgan savollar test OXIRIDA to'planganmi.
//
// Uchalasi birga "vaqt yetmadi" degan da'voni tekshiradi. Shoshilish belgisi
// bo'lmasa-yu, o'quvchi baribir past ball olsa — muammo vaqtda emas.
//
// ⚠️ Bu fayl serverga nusxalanadi (`npm run mirror`): hisob topshirish paytida
// bajariladi, natija esa klientda ko'rsatiladi.

/** Tahlil o'tkazishga arziydigan minimal javob soni. */
const MIN_ANSWERS_FOR_TIMING = 8;

/**
 * Oxirgi chorak sur'ati oldingilardan shu marta tez bo'lsa — shoshilish.
 *
 * 1.6 ataylab qat'iy emas: testning oxirida sur'at biroz tezlashishi normal
 * (oson savollar oxirida qolgan bo'lishi mumkin). Muammo deb belgilash uchun
 * farq aniq ko'rinib turishi kerak.
 */
const RUSH_RATIO = 1.6;

/** Javobsizlarning shuncha ulushi oxirgi chorakda bo'lsa — vaqt yetmagan. */
const RAN_OUT_SHARE = 0.6;

/** Medianani qaytaradi (bo'sh ro'yxatda `null`). */
function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Bitta urinishning vaqt manzarasini quradi.
 *
 * @param {object} input
 * @param {Object<string, number>} input.answerTimes Savol → javob berilgan soniya
 * @param {Array<string|number>} input.questionOrder Testdagi savollar, TARTIB BILAN.
 *        Javobsizlar qayerda to'planganini aniqlash uchun kerak.
 * @param {number} input.timeSpent Umumiy sarflangan soniya
 * @returns {object|null} tahlil, yoki ma'lumot yetarli bo'lmasa `null`
 */
function analyzeAttemptTiming({ answerTimes, questionOrder, timeSpent }) {
  const times = answerTimes && typeof answerTimes === 'object' ? answerTimes : {};
  const order = Array.isArray(questionOrder) ? questionOrder.map(String) : [];
  const duration = Number(timeSpent) || 0;

  const answered = order.filter((id) => Number.isFinite(Number(times[id])));
  if (answered.length < MIN_ANSWERS_FOR_TIMING || duration <= 0 || order.length === 0) {
    return null;
  }

  // ── Javoblarning choraklar bo'yicha taqsimoti ──
  const quarters = [0, 0, 0, 0];
  answered.forEach((id) => {
    const t = Math.min(Math.max(Number(times[id]), 0), duration);
    // `duration` ning o'zi oxirgi chorakka tushishi kerak, 5-indeksga emas.
    const q = Math.min(3, Math.floor((t / duration) * 4));
    quarters[q] += 1;
  });

  // ── Sur'at: oxirgi chorak vs qolgani ──
  // Javoblarni yozilish vaqti bo'yicha tartiblab, qo'shni javoblar orasidagi
  // oraliqlarni olamiz. Median ishlatiladi: bitta uzoq tanaffus (masalan
  // o'quvchi chalg'igan) o'rtachani buzib yuboradi, medianani esa yo'q.
  const sortedTimes = answered
    .map((id) => Number(times[id]))
    .sort((a, b) => a - b);

  // Chegara VAQT bo'yicha emas, JAVOBLAR SONI bo'yicha: "oxirgi chorak vaqt"
  // ichida ham normal sur'atdagi javoblar bo'lishi mumkin va ular shoshilgan
  // burstni yuvib yuboradi. "Oxirgi to'rtdan bir javob" esa aynan sur'at
  // o'zgarishini o'lchaydi.
  const gaps = [];
  for (let i = 1; i < sortedTimes.length; i += 1) {
    const gap = sortedTimes[i] - sortedTimes[i - 1];
    if (gap >= 0) gaps.push(gap);
  }
  const splitAt = Math.floor(gaps.length * 0.75);
  const earlyGaps = gaps.slice(0, splitAt);
  const lateGaps = gaps.slice(splitAt);

  const medianEarly = median(earlyGaps);
  const medianLate = median(lateGaps);
  const rushed =
    medianEarly !== null &&
    medianLate !== null &&
    medianLate > 0 &&
    medianEarly / medianLate >= RUSH_RATIO;

  // ── Javobsizlar test oxirida to'planganmi ──
  const blanks = order.filter((id) => !Number.isFinite(Number(times[id])));
  const lastQuarterStart = Math.floor(order.length * 0.75);
  const blanksAtEnd = blanks.filter((id) => order.indexOf(id) >= lastQuarterStart).length;
  const ranOut = blanks.length > 0 && blanksAtEnd / blanks.length >= RAN_OUT_SHARE;

  return {
    answered: answered.length,
    total: order.length,
    blanks: blanks.length,
    blanksAtEnd,
    quarters,
    medianEarly: medianEarly === null ? null : Math.round(medianEarly),
    medianLate: medianLate === null ? null : Math.round(medianLate),
    rushed,
    ranOut,
    durationSec: Math.round(duration)
  };
}

/**
 * Jamlanmadagi vaqt statistikasini o'qishga tayyor shaklga keltiradi.
 *
 * @param {object|null} timing `summary.timing`
 * @returns {object|null}
 */
function summarizeTiming(timing) {
  const tests = Number(timing?.tests) || 0;
  if (!timing || tests === 0) return null;

  const quarters = Array.isArray(timing.quarters) ? timing.quarters : [0, 0, 0, 0];
  const answered = quarters.reduce((sum, n) => sum + (Number(n) || 0), 0);

  return {
    tests,
    rushedTests: Number(timing.rushed) || 0,
    ranOutTests: Number(timing.ranOut) || 0,
    // Choraklar ulush sifatida — testlar soni har xil bo'lgani uchun xom son
    // taqqoslashga yaramaydi.
    shares: answered > 0
      ? quarters.map((n) => Math.round(((Number(n) || 0) / answered) * 100))
      : [0, 0, 0, 0],
    // Muammo deb ko'rsatish uchun u KO'PCHILIK testlarda takrorlanishi kerak.
    // Bitta shoshilgan test — kayfiyat, uchtadan ikkitasi — odat.
    hasRushHabit: tests >= 2 && (Number(timing.rushed) || 0) / tests >= 0.5,
    hasRanOutHabit: tests >= 2 && (Number(timing.ranOut) || 0) / tests >= 0.5
  };
}

module.exports = { MIN_ANSWERS_FOR_TIMING, analyzeAttemptTiming, summarizeTiming };

/**
 * O'qituvchi panelidagi natijalar bilan ishlash uchun YAGONA manba.
 *
 * Ilgari bu mantiq 3 joyda so'zma-so'z takrorlangan edi
 * (TeacherAllResults, MonitorTestPage, TeacherGroupStats) va ular
 * bir-biridan chetga chiqib ketgandi — masalan "past natija" chegarasi
 * bir joyda bor, boshqasida yo'q; band o'rtachasi bir joyda `12/40` kabi
 * xom ballni ham qo'shib yuborardi.
 */

import { toDate } from './subscription';

/** Natijadagi eng oxirgi urinish (yoki `null`). */
export function getLatestAttempt(result) {
  const attempts = Array.isArray(result?.attempts) ? result.attempts : [];
  return attempts.length > 0 ? attempts[attempts.length - 1] : null;
}

/**
 * Testga sarflangan vaqt (soniyada). Manbalar ustuvorligi:
 * `timeSpent` → oxirgi urinishning `timeSpent` → `duration` (daqiqa) →
 * `startedAt`/`date` orasidagi farq.
 */
export function getTimeSpentSeconds(result) {
  if (!result) return 0;

  let dbTimeSpent = result.timeSpent;
  if (dbTimeSpent === undefined) {
    dbTimeSpent = getLatestAttempt(result)?.timeSpent;
  }
  if (dbTimeSpent) return Number(dbTimeSpent) || 0;

  if (result.duration) return Number(result.duration) * 60;

  const start = toDate(result.startedAt);
  const end = toDate(result.date);
  if (start && end) return Math.max(0, Math.floor((end - start) / 1000));

  return 0;
}

/**
 * Bu to'liq test emas, balki part/passage/section mashqimi.
 * Part testlar 10 daqiqadan tez yechilishi normal, shuning uchun ular
 * "tez yechilgan" qoidabuzarligiga tushmaydi.
 */
export function isPartTest(result) {
  if (!result) return false;
  if (result.partNumber != null) return true;
  const title = (result.testTitle || '').toLowerCase();
  return title.includes('part') || title.includes('passage') || title.includes('section');
}

/** Natija baholanganmi (`graded` yoki `published`). */
export function isGraded(result) {
  return result?.status === 'graded' || result?.status === 'published';
}

/** Qo'lda tekshirishni talab qiladigan turlar — qolgani avtomatik baholanadi. */
export const REVIEWABLE_TYPES = ['writing', 'mock_full'];

/**
 * Natija O'QITUVCHI tekshiruvini kutyaptimi.
 *
 * Reading/Listening avtomatik baholanadi va hech qachon `graded` statusini
 * olmaydi. Shu sababli "graded emas → kutilmoqda" degan sodda tekshiruv
 * ularni ham navbatga qo'shib yuborardi: "Tekshirish kutilmoqda" kartasi 3
 * desa, o'sha filtr yuzlab qatorni ochardi. Navbat faqat `writing` va
 * `mock_full` dan iborat.
 */
export function isAwaitingReview(result) {
  return REVIEWABLE_TYPES.includes(result?.type) && !isGraded(result);
}

/**
 * Qoidabuzarlik tekshiruvi — natijadagi `violation` maydoni yoki
 * to'liq testning 10 daqiqadan tez yakunlanishi.
 * @returns {{ hasViolation: boolean, violationText: string|null, timeSpentSeconds: number }}
 */
export function detectViolation(result) {
  const timeSpentSeconds = getTimeSpentSeconds(result);

  const isFast =
    !isPartTest(result) &&
    isGraded(result) &&
    timeSpentSeconds > 0 &&
    timeSpentSeconds < 600 &&
    result?.type !== 'speaking';

  const hasViolation = Boolean(result?.violation) || isFast;

  let violationText = null;
  if (result?.violation === 'tab_closed') violationText = 'Tab yopilgan (erta yakunlangan)';
  else if (result?.violation === 'tab_switch') violationText = 'Tab almashtirilgan';
  else if (result?.violation) violationText = result.violation;
  else if (isFast) violationText = 'Tez yechilgan (< 10 daq)';

  return { hasViolation, violationText, timeSpentSeconds };
}

/**
 * Natijadan IELTS band (0–9) ni ajratib oladi.
 *
 * `score` maydoni "32/40" yoki "32" kabi XOM ball bo'lishi mumkin — u band
 * emas, shuning uchun o'rtacha hisobiga qo'shilmaydi. `null` qaytsa,
 * natijada band yo'q degani.
 */
export function getBandValue(result) {
  if (!result) return null;

  const type = String(result.type || '').toLowerCase();
  const explicit = result.bandScore ?? result.overallBand ?? result.writingBand ?? result.speakingBand;
  if (explicit !== undefined && explicit !== null && explicit !== '') {
    const n = parseFloat(explicit);
    if (!isNaN(n) && n > 0 && n <= 9) return n;

    // Band 0 — faqat BAHOLANGAN reading/listening da haqiqiy natija (hamma javob xato).
    // Qolgan turlarda 0 "hali baholanmagan" degani: `submitTestAnswers` writing/speaking
    // uchun ham `bandScore: 0` yozadi, va u o'rtachaga qo'shilsa guruh statistikasi
    // asossiz ravishda pasayib ketardi.
    if (n === 0 && isGraded(result) && (type === 'reading' || type === 'listening')) return 0;
  }

  // `score` faqat band ko'rinishida bo'lsagina qabul qilinadi ("6.5"),
  // "32/40" kabi xom ball emas.
  const raw = result.score;
  if (raw === undefined || raw === null || raw === '' || raw === '-') return null;
  const str = String(raw).trim();
  if (str.includes('/')) return null;
  const n = parseFloat(str);
  if (!isNaN(n) && n > 0 && n <= 9) return n;

  return null;
}

/** Band 5.5 dan past bo'lsa — "past natija". */
export function isLowBand(band) {
  return band !== null && band !== undefined && !isNaN(band) && band < 5.5;
}

/** Sekundni "12 daq 30 sek" ko'rinishiga keltiradi. */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins} daq ${secs} sek`;
}

/** Guruh(lar)dagi barcha o'quvchi ID lari (takrorlanmaydigan). */
export function collectStudentIds(groups) {
  return [...new Set((groups || []).flatMap(g => g.studentIds || []))];
}

/** Firestore `in` so'rovi uchun massivni bo'laklarga bo'ladi (limit 30). */
export function chunkIds(ids, size = 30) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

/** Muddat allaqachon o'tib ketganmi — tayinlashni bloklash uchun. */
export function isDeadlinePast(value) {
  if (!value) return false;
  const ts = new Date(value).getTime();
  return !Number.isNaN(ts) && ts <= Date.now();
}

/**
 * `<input type="datetime-local">` uchun qiymat — MAHALLIY vaqt zonasida.
 *
 * `toISOString().slice(0,16)` UTC qaytaradi: Toshkentda (UTC+5) tanlangan
 * 18:00 input'da 13:00 bo'lib ko'rinadi va shu ko'rinishda saqlanib ketadi.
 */
export function toDateTimeLocalValue(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

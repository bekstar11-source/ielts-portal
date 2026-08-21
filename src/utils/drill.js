// src/utils/drill.js
//
// Xatolar ustida mashq — mashqni XATOLARNING O'ZIDAN yig'adi.
//
// NIMA QURISH MUMKIN VA NIMA MUMKIN EMAS
// ──────────────────────────────────────
// `mistakeSessions` da savol MATNI saqlanmaydi — faqat o'quvchi yozgan javob,
// to'g'ri javob va savol turi. Shu sababdan:
//
//   • "Matnda bu haqda aytilganmi?" turidagi mashq QURIB BO'LMAYDI. TRUE/FALSE/
//     NOT GIVEN yoki Matching Headings savolini passage'siz berish ma'nosiz —
//     o'quvchi taxmin qiladi, o'rganmaydi. Bunday xatolar mashqqa umuman
//     kiritilmaydi; ular uchun to'g'ri yo'l — testni kontekstda qayta ko'rish
//     (`/review/:resultId`, Faza 1 da qo'shilgan).
//
//   • "Yaqin marra" xatolari (imlo, birlik/ko'plik, so'z shakli, so'z limiti)
//     uchun esa mashq TO'LIQ quriladi va u aynan kerakli mashq: o'quvchi
//     javobni allaqachon TOPGAN, faqat yozilishida adashgan. Passage kerak emas,
//     chunki muammo tushunishda emas.
//
// Shu ajratuv tasodifiy emas: sahifadagi "ball ta'siri" bo'limi aynan shu
// xatolar uchun "+0.5 band" deb va'da beradi. Mashq o'sha va'dani bajaradi.
//
// KO'RSATISH TARTIBI
// ──────────────────
// Avval to'g'ri shakl ko'rsatiladi, keyin yashiriladi va yozib berish so'raladi.
// Teskarisi — xato variantni ko'rsatib "to'g'risi nima?" deb so'rash — noto'g'ri
// yozuvni ko'z xotirasida mustahkamlaydi. O'quvchining o'z xato varianti faqat
// JAVOBDAN KEYIN, taqqoslash uchun ko'rsatiladi.

import { normalizeString } from './ieltsScoring.js';
import { NEAR_MISS_PATTERNS } from './mistakePatterns.js';

/** Bitta mashq seansidagi savollar soni. */
export const DRILL_SIZE = 10;

/**
 * Takrorlash oralig'i (kun) — Leitner qutilari.
 *
 * To'g'ri javob keyingi pog'onaga ko'taradi, xato esa boshiga qaytaradi.
 * Oxirgi pog'ona 21 kun: undan uzoq oraliq IELTS'ga tayyorgarlik muddatidan
 * oshib ketadi va so'z umuman qaytib kelmasdi.
 */
export const INTERVALS_DAYS = [1, 3, 7, 21];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Javobdan keyingi yangi holat.
 *
 * @param {{streak?: number}} state Joriy holat
 * @param {boolean} correct
 * @param {number} [now] Hozirgi vaqt (ms)
 * @returns {{streak: number, due: number}}
 */
export function nextSchedule(state, correct, now = Date.now()) {
  const streak = Math.max(0, Number(state?.streak) || 0);
  const nextStreak = correct ? Math.min(streak + 1, INTERVALS_DAYS.length) : 0;
  // `nextStreak` 0 bo'lsa birinchi oraliq (1 kun) olinadi.
  const days = INTERVALS_DAYS[Math.max(0, nextStreak - 1)] ?? INTERVALS_DAYS[0];

  return { streak: nextStreak, due: now + days * DAY_MS };
}

/** Element mashqqa yaroqlimi. */
function isDrillable(mistake) {
  if (!mistake || !NEAR_MISS_PATTERNS.includes(mistake.pattern)) return false;

  const target = String(mistake.correctText || '').trim();
  if (!target) return false;

  // Bir necha muqobil javobli kalit ("museum / gallery") — qaysi birini
  // yozish kerakligi noaniq, ya'ni tekshirib bo'lmaydi.
  if (target.includes('/')) return false;

  // Juda uzun javob imlo mashqi emas, ko'chirish mashqi bo'lib qoladi.
  return target.length <= 40;
}

/**
 * Xatolar ro'yxatidan mashq elementlarini yig'adi.
 *
 * Bir xil to'g'ri javob bir necha marta uchrasa, u BITTA element bo'ladi va
 * takrorlanish soni saqlanadi — o'quvchiga bir seansda bitta so'zni uch marta
 * yozdirish mashq emas, jazо.
 *
 * @param {Array} mistakes Tasniflangan xatolar (`useStudentAnalytics` dan)
 * @param {object} [progress] `{ [key]: { streak, due } }`
 * @param {number} [now]
 * @returns {{items: Array, due: Array, total: number, skipped: number}}
 */
export function buildDrillItems(mistakes, progress = {}, now = Date.now()) {
  const byTarget = new Map();
  let skipped = 0;

  (Array.isArray(mistakes) ? mistakes : []).forEach((mistake) => {
    if (!isDrillable(mistake)) {
      skipped += 1;
      return;
    }

    const target = String(mistake.correctText).trim();
    const key = normalizeString(target);
    if (!key) return;

    const existing = byTarget.get(key);
    if (existing) {
      existing.count += 1;
      // Eng oxirgi xato varianti saqlanadi — o'quvchi aynan uni eslaydi.
      if ((mistake.date?.getTime?.() || 0) > (existing.lastSeen || 0)) {
        existing.userText = mistake.userText || existing.userText;
        existing.lastSeen = mistake.date?.getTime?.() || existing.lastSeen;
      }
      return;
    }

    byTarget.set(key, {
      key,
      target,
      userText: mistake.userText || '',
      pattern: mistake.pattern,
      family: mistake.family || 'other',
      testTitle: mistake.testTitle || null,
      count: 1,
      lastSeen: mistake.date?.getTime?.() || 0
    });
  });

  const items = [...byTarget.values()].map((item) => {
    const state = Object.prototype.hasOwnProperty.call(progress, item.key)
      ? progress[item.key]
      : null;
    return {
      ...item,
      streak: Math.max(0, Number(state?.streak) || 0),
      due: Number(state?.due) || 0
    };
  });

  const due = items
    .filter((item) => item.due <= now)
    .sort((a, b) => {
      // Avval hech qachon mashq qilinmaganlar, keyin eng ko'p takrorlanganlar.
      if (a.streak !== b.streak) return a.streak - b.streak;
      return b.count - a.count;
    });

  return { items, due, total: items.length, skipped };
}

/**
 * Javobni tekshiradi.
 *
 * `normalizeString` ishlatiladi — ball hisobida ham xuddi shu funksiya. Katta/
 * kichik harf va tinish belgilari bu yerda ham hisobga olinmaydi, aks holda
 * mashq testdan qattiqroq bo'lib qolardi.
 */
export function checkDrillAnswer(input, target) {
  const a = normalizeString(input);
  const b = normalizeString(target);
  return a.length > 0 && a === b;
}

export default buildDrillItems;

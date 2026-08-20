// src/utils/isoWeek.js
//
// ISO-8601 hafta kalitlari ("2026-W34") bilan ishlash.
//
// Nega kalendar oyi emas, hafta: o'quvchining mashq ritmi haftalik — dam olish
// kunlari ko'proq ishlaydi — va oy chegarasi bu ritmni o'rtasidan kesib o'tadi.
// ISO haftasi dushanbadan boshlanadi va yil chegarasini to'g'ri hal qiladi:
// "2026-W01" 2025-yilning 29-dekabrini ham o'z ichiga oladi.
//
// Kalit ataylab nol bilan to'ldirilgan ("W02", "W10" emas) — shunda leksikografik
// tartib xronologik tartib bilan ustma-ust tushadi va jamlanmadagi eski
// haftalarni kesish oddiy `sort()` ga aylanadi.
//
// ⚠️ Bu fayl serverga ham nusxalanadi (`npm run mirror`): jamlanmani YOZUVCHI
// va uni O'QIB grafik chizuvchi tomon bir xil hafta chegaralarini ko'rishi shart,
// aks holda oxirgi hafta grafikda bo'sh ko'rinardi.

/** Grafikda ko'rsatiladigan haftalar soni. */
export const TREND_WEEKS = 12;

/**
 * Sanani ISO hafta kalitiga aylantiradi.
 *
 * @param {Date} date
 * @returns {string} "2026-W34"
 */
export function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Payshanbaga siljitamiz: ISO haftasi qaysi YILGA tegishli ekani shu kun bilan
  // aniqlanadi (dekabr oxiri keyingi yilning 1-haftasi bo'lishi mumkin).
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Kalitdan o'sha haftaning dushanbasini qaytaradi.
 *
 * Grafik o'qidagi yorliqlar uchun kerak ("18-avg"). ISO ta'rifi bo'yicha
 * 1-hafta 4-yanvarni o'z ichiga olgan hafta — hisob shundan boshlanadi.
 *
 * @param {string} key
 * @returns {Date|null} noto'g'ri kalitda `null`
 */
export function weekKeyToMonday(key) {
  const match = /^(\d{4})-W(\d{2})$/.exec(String(key || ''));
  if (!match) return null;

  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;

  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1) + (week - 1) * 7);
  return monday;
}

/**
 * Oxirgi `count` ta hafta kalitini eskidan yangiga qarab qaytaradi.
 *
 * MASHQ QILINMAGAN HAFTALAR HAM KIRADI. Bu ataylab: faqat ma'lumot bor
 * haftalarni ko'rsatish uzilishlarni yashiradi va uch hafta dam olgan o'quvchi
 * uzluksiz o'sayotgandek ko'rinadi.
 *
 * @param {number} count
 * @param {Date} [from=new Date()] oxirgi hafta shu sanani o'z ichiga oladi
 * @returns {string[]}
 */
export function lastWeekKeys(count, from = new Date()) {
  const keys = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));

  for (let i = 0; i < count; i += 1) {
    keys.push(isoWeekKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }

  return keys.reverse();
}

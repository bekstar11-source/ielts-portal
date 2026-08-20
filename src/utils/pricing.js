// src/utils/pricing.js
//
// Narxlar va chegirma sozlamalari bo'yicha YAGONA klient manbasi.
//
// ─── NEGA BU FAYL PAYDO BO'LDI ──────────────────────────────────────────────
//
// Narx klientda 4 xil joyda qo'lda yozilgan edi va ular BIR-BIRIGA MOS EMASDI:
//
//   src/pages/public/Pricing.jsx   35 000 / 49 000   ← to'g'ri (server bilan bir xil)
//   src/locales/translations.js    149 000 / 299 000 / 549 000
//   src/components/common/SchemaMarkup.jsx  149 000  ← Google'ga chiqadigan narx
//
// Ya'ni landing page o'quvchiga 299 000 deb ko'rsatib, "Tanlash" tugmasi uni
// 35 000 turadigan sahifaga olib borardi. Bunday tafovut nafaqat ishonchni
// buzadi, balki chegirmani ham ma'nosiz qiladi: 20% chegirma 299 000 dan
// hisoblanadi deb o'ylagan o'quvchi keyin butunlay boshqa raqamni ko'radi.
//
// ⚠️ `PLAN_PRICES` `functions/pricing.js` bilan QO'LDA sinxron bo'lishi shart.
// Bu yerdagi raqam faqat KO'RSATISH uchun; to'lanadigan haqiqiy summani har
// doim Telegram bot hisoblaydi (`sendSubscriptionInvoice`).

import { applySignupDiscount, DISCOUNT_CYCLES } from './subscription';

/** `{planId}_{billing}` → so'mdagi narx. `functions/pricing.js` bilan bir xil. */
export const PLAN_PRICES = {
  standard_monthly: 35000,
  standard_tri: 89000,
  pro_monthly: 49000,
  pro_tri: 129000,
};

/** Davr necha oyni qoplaydi (`functions/pricing.js` dagi `BILLING_DAYS` bilan bir xil). */
export const BILLING_MONTHS = {
  monthly: 1,
  tri: 3,
};

/**
 * Ro'yxatdan o'tish chegirmasining OMMAVIY nusxasi.
 *
 * ⚠️ `functions/signupDiscount.js` dagi `DISCOUNT_CONFIG` bilan bir xil.
 *
 * NEGA KLIENTDA HAM KERAK: landing page'ni ko'rayotgan odam hali ro'yxatdan
 * o'tmagan, ya'ni `users/{uid}.signupDiscount` hujjati YO'Q va `config/trial`
 * ni ham o'qiy olmaydi (`firestore.rules` da ruxsat yo'q). Taklifni ko'rsatish
 * uchun yagona yo'l — koddagi nusxa. Hisob ochilgandan keyin haqiqiy taklif
 * `getSignupDiscount(userData)` dan olinadi.
 */
export const SIGNUP_DISCOUNT = {
  percent: 20,
  // `subscription.js` dan — oy soni ikki faylda takrorlanmasin.
  cycles: DISCOUNT_CYCLES,
  days: 7,
  eligibleBillings: ['monthly'],
};

/** Noma'lum tarif/davr uchun `null` — chaqiruvchi tekshirsin. */
export function getPlanPrice(planId, billing) {
  const price = PLAN_PRICES[`${planId}_${billing}`];
  return typeof price === 'number' ? price : null;
}

/**
 * Chegirma qo'llangan narx (ommaviy sahifalar uchun).
 *
 * Chegirma faqat `eligibleBillings` dagi davrlarda ishlaydi — 3 oylik paketni
 * chegirmali qilib ko'rsatish o'quvchini botdagi to'liq narx bilan yuzlashtirib
 * qo'yardi.
 */
export function getPublicDiscountPrice(planId, billing = 'monthly') {
  if (!SIGNUP_DISCOUNT.eligibleBillings.includes(billing)) return null;
  const base = getPlanPrice(planId, billing);
  if (base === null) return null;
  return applySignupDiscount(base, SIGNUP_DISCOUNT.percent);
}

/** 89 000 (3 oy) → 29 667 (oyiga). Taqqoslash halol bo'lishi uchun. */
export function perMonthPrice(price, billing) {
  const months = BILLING_MONTHS[billing] || 1;
  return Math.round((Number(price) || 0) / months);
}

/* ─────────────────────────────────────────────────────────────
 * O'QITUVCHI GURUH OBUNALARI
 *
 * ⚠️ `functions/pricing.js` dagi `TEACHER_TIERS` bilan QO'LDA sinxron bo'lishi
 * shart — bu yerdagi raqam kartada, u yerdagisi Telegram chekida chiqadi.
 *
 * Ilgari jadval `src/pages/teacher/TeacherSubscription.jsx` va
 * `functions/telegramBot.js` da mustaqil yozilgan edi va chiziqli narxga
 * asoslangandi (har uch tarifda 50 000/o'quvchi) — ya'ni o'quvchi Pro'ni o'zi
 * 49 000 ga olgani o'qituvchi tarifidan ARZON tushardi. Endi hajm oshgani sari
 * bir o'quvchi narxi tushadi.
 * ───────────────────────────────────────────────────────────── */

/** Tarif ID → { name, maxStudents, price }. Tartib — kartalar tartibi. */
export const TEACHER_TIERS = {
  tier_10: { name: 'Kichik Guruh', maxStudents: 10, price: 300000 },
  tier_20: { name: "O'rta Guruh", maxStudents: 20, price: 500000 },
  tier_30: { name: 'Katta Guruh', maxStudents: 30, price: 660000 },
  tier_50: { name: "O'quv Markaz", maxStudents: 50, price: 1000000 },
};

/** O'qituvchi obunasining muddati (kun). */
export const TEACHER_BILLING_DAYS = 30;

/** Bir o'quvchi uchun narx — "so'm / o'quvchi" ko'rinishida chiqadi. */
export function teacherPricePerStudent(tier) {
  if (!tier?.maxStudents) return 0;
  return Math.round(tier.price / tier.maxStudents);
}

/**
 * Chakana Pro bilan taqqoslaganda tejaladigan foiz.
 * Kartada "chakana narxdan 39% arzon" deb ko'rsatiladi — o'qituvchi uchun
 * tarifni tanlashning asosiy sababi shu.
 */
export function teacherSavingsPercent(tier) {
  const retail = getPlanPrice('pro', 'monthly');
  const perStudent = teacherPricePerStudent(tier);
  if (!retail || !perStudent) return 0;
  return Math.round(((retail - perStudent) / retail) * 100);
}

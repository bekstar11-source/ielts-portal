// functions/pricing.js
//
// Obuna narxlari bo'yicha YAGONA manba (server tomoni).
//
// Ilgari narxlar `telegramBot.js` ichida FORMATLANGAN MATN sifatida turardi
// (`standard_monthly: "35 000"`) — ular bilan hech qanday hisob-kitob qilib
// bo'lmasdi, shuning uchun chegirma qo'shishning iloji yo'q edi. Endi narx —
// raqam, formatlash esa chop etish paytida bir marta bajariladi.
//
// ⚠️ Bu jadval `src/pages/public/Pricing.jsx` dagi `PLANS` bilan QO'LDA
// sinxron bo'lishi shart. Klientdagi narx faqat KO'RSATISH uchun; to'lanadigan
// haqiqiy summani har doim shu fayl belgilaydi (bot xabarida chiqadigan raqam).
// Loyihada xuddi shunday juftlik allaqachon bor: `src/utils/subscription.js`
// ↔ `functions/subscription.js`.

/** `{planId}_{billing}` → so'mdagi narx. */
const PLAN_PRICES = {
  standard_monthly: 35000,
  standard_tri: 89000,
  pro_monthly: 49000,
  pro_tri: 129000,
};

/** Obuna muddati (kun). `telegramBot.js` dagi tasdiqlash mantig'i bilan bir xil. */
const BILLING_DAYS = {
  monthly: 30,
  tri: 90,
};

/** 89000 → "89 000". */
function formatSom(amount) {
  return new Intl.NumberFormat("uz-UZ").format(Number(amount) || 0);
}

/** Noma'lum tarif/davr uchun `null` qaytaradi — chaqiruvchi buni tekshirsin. */
function getPlanPrice(planId, billing) {
  const price = PLAN_PRICES[`${planId}_${billing}`];
  return typeof price === "number" ? price : null;
}

/**
 * Chegirmali narx.
 *
 * 100 so'mgacha PASTGA yaxlitlanadi: 89 000 dan 50% = 44 500 (butun chiqadi),
 * lekin kelajakda toq narx qo'yilsa "44 512 so'm" kabi summa paydo bo'lmasin —
 * odam kartaga o'tkazishda shunday raqamni terishdan adashadi.
 */
function applyDiscount(price, percent) {
  const p = Number(percent) || 0;
  if (p <= 0) return price;
  // ⚠️ `price * (1 - p/100)` EMAS: 89000 * (1 - 0.3) suzuvchi nuqtada
  // 62299.999... beradi va 100 gacha pastga yaxlitlash uni 62 200 ga
  // tushiradi — 100 so'm bekorga yo'qoladi. Butun sonda ko'paytirib,
  // keyin bo'lish bu xatoni butunlay yo'q qiladi.
  const discounted = Math.round((price * (100 - p)) / 100);
  return Math.floor(discounted / 100) * 100;
}

module.exports = {
  PLAN_PRICES,
  BILLING_DAYS,
  formatSom,
  getPlanPrice,
  applyDiscount,
};

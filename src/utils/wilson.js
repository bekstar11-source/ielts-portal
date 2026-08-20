// src/utils/wilson.js
//
// Kichik namunadagi foizni qanchalik jiddiy qabul qilish mumkinligini hisoblaydi.
//
// MUAMMO
// ──────
// "Matching Headings — 40%" degan qator ikki xil ma'noni bildirishi mumkin:
// 5 tadan 2 tasi, yoki 50 tadan 20 tasi. Birinchisi deyarli shovqin — yana bitta
// to'g'ri javob foizni 60% ga ko'taradi. Ikkinchisi esa aniq bo'shliq. Oddiy
// foiz ikkalasini bir xil ko'rsatadi va sahifa eng muhim qarorini — "eng kuchsiz
// turingiz shu" — tasodifga asoslab qo'yadi.
//
// YECHIM
// ──────
// Wilson score interval — nisbat uchun ishonch oralig'i. Oddiy normal
// yaqinlashuvdan farqli, u kichik namunada ham va p 0 yoki 1 ga yaqin bo'lganda
// ham buzilmaydi (0/8 uchun "0% ± 0" degan bema'nilik chiqarmaydi).
//
// QAYSI CHEGARA QAYERDA — bu eng muhim qismi
// ──────────────────────────────────────────
// Chegaralarni almashtirib yuborish oson va natija teskari bo'ladi:
//
//   • ENG KUCHSIZ turni tanlashda YUQORI chegara ishlatiladi. Savol shu: "eng
//     yaxshi holatda ham bu tur 70% dan pastmi?" Agar ha — bu haqiqiy bo'shliq.
//     Quyi chegarani ishlatish teskari xato bo'lardi: kam namunali turlarning
//     quyi chegarasi past bo'ladi, ya'ni ular AVTOMATIK "eng kuchsiz" bo'lib
//     chiqardi — aynan biz oldini olmoqchi bo'lgan narsa.
//
//   • ENG KUCHLI turni tanlashda QUYI chegara: "eng yomon holatda ham qancha?"
//
// Ikkalasi ham "ehtiyotkor tomonga" qarab ishlaydi: o'quvchiga na asossiz
// tashvish, na asossiz maqtov beriladi.

/**
 * Ishonch darajasi: 90% (z = 1.645).
 *
 * 95% (z = 1.96) ilmiy nashr uchun standart, lekin bu yerda vazifa boshqa —
 * mashq uchun yo'nalish tanlash. 95% da oraliq shunchalik keng bo'ladiki, 30–40
 * savoldan kam ishlagan o'quvchida hech qanday tur "kuchsiz" deb belgilanmaydi
 * va sahifa jim qoladi. Noto'g'ri turni tavsiya qilish narxi bu yerda past
 * (o'quvchi bir necha ortiqcha mashq bajaradi), jim qolish narxi esa yuqori.
 */
export const Z_90 = 1.6448536269514722;

/**
 * Wilson score interval.
 *
 * @param {number} correct
 * @param {number} total
 * @param {number} [z=Z_90]
 * @returns {{low: number, high: number, center: number, margin: number}}
 *          Barchasi foizda (0–100). `margin` — oraliq kengligining yarmi,
 *          ko'rsatish uchun; oraliq assimetrik bo'lgani uchun u taxminiy.
 */
export function wilsonInterval(correct, total, z = Z_90) {
  const n = Number(total) || 0;
  if (n <= 0) return { low: 0, high: 100, center: 0, margin: 50 };

  const hits = Math.min(Math.max(Number(correct) || 0, 0), n);
  const p = hits / n;

  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const centre = p + z2 / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);

  const low = Math.max(0, (centre - spread) / denominator);
  const high = Math.min(1, (centre + spread) / denominator);

  return {
    low: Math.round(low * 100),
    high: Math.round(high * 100),
    center: Math.round(p * 100),
    margin: Math.round(((high - low) / 2) * 100)
  };
}

export default wilsonInterval;

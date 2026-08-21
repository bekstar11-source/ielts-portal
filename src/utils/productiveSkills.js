// src/utils/productiveSkills.js
//
// Writing va Speaking jamlanmasini ekranga tayyor shaklga keltiradi.
//
// Jamlanmada mezonlar YIG'INDI sifatida saqlanadi (`criteriaSum`), o'rtacha
// emas. Sabab: yangi topshiriq kelganda oldindan hisoblangan o'rtachani qayta
// hisoblash uchun baribir eski sonni bilish kerak, va har safar yaxlitlangan
// qiymatni qayta yaxlitlash xatoni to'playdi. Bo'lish faqat shu yerda, ko'rsatish
// oldidan bir marta bajariladi.
//
// Band 0.5 qadam bilan ko'rsatiladi — IELTS shkalasi shunday. "5.7" degan band
// mavjud emas va uni ekranga chiqarish o'quvchini chalg'itadi.

/** Mezonlar tartibi ekranda: eng past birinchi. `overall` alohida ko'rsatiladi. */
const OVERALL = 'overall';

/**
 * @param {object|null} stat Jamlanmadagi `skills.writing` yoki `skills.speaking`
 * @param {object} [extra] Qatorga qo'shiladigan qo'shimcha maydonlar
 * @returns {{tasks: number, criteria: Array, weakest: object|null, overall: number|null}|null}
 *          Topshiriq bo'lmasa `null` — bo'lim umuman ko'rsatilmaydi.
 */
export function buildProductiveSkill(stat, extra = {}) {
  const tasks = Number(stat?.tasks) || 0;
  if (!stat || tasks === 0) return null;

  const criteria = Object.entries(stat.criteriaSum || {})
    .map(([name, sum]) => {
      const average = (Number(sum) || 0) / tasks;
      // IELTS shkalasi 0.5 qadamli.
      return { name, band: Math.round(average * 2) / 2 };
    })
    .filter((c) => c.band > 0)
    .sort((a, b) => a.band - b.band);

  return {
    tasks,
    criteria,
    // Eng past mezon — `overall` hisobga olinmaydi: u alohida mezon emas,
    // qolganlarining xulosasi, va deyarli har doim o'rtada turadi.
    weakest: criteria.find((c) => c.name !== OVERALL) || null,
    overall: criteria.find((c) => c.name === OVERALL)?.band ?? null,
    ...extra
  };
}

export default buildProductiveSkill;

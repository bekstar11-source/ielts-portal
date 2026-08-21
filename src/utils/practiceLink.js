// src/utils/practiceLink.js
//
// Tahlildagi xulosani MASHQGA ulaydigan ko'prik.
//
// Analitika sahifasining eng katta xavfi — o'quvchi raqamlarni ko'rib, "tushunarli"
// deb chiqib ketishi. "Matching Headings — 48%" degan xulosaning qiymati nolga
// teng, agar o'sha turdagi mashqni topish uchun yana besh marta bosish kerak
// bo'lsa. Bu yerdagi vazifa: xulosadan to'g'ridan-to'g'ri filtrlangan ro'yxatga.
//
// IKKI TILNI BOG'LASH
// ───────────────────
// Analitika KANONIK oilalar bilan ishlaydi (`headings`, `true_false_ng`) —
// ular `questionTypes.js` da aniqlangan va bazadagi o'nlab xilma-xil `type`
// satrini bitta nomga keltiradi.
//
// Mashq sahifasidagi filtr esa BAZA turlari bilan ishlaydi (`HEADINGS`,
// `TRUE/FALSE/NG`) — ular `PracticeFilters.jsx` dagi variantlarning `dbTypes`
// ro'yxatlariga aynan mos kelishi shart, aks holda havola filtrni yoqadi-yu,
// tegishli katakcha belgilanmay qoladi va sahifa buzuq ko'rinadi.
//
// ⚠️ `PracticeFilters.jsx` dagi `dbTypes` o'zgarsa, bu jadval ham o'zgarishi kerak.

/**
 * Obyektning O'ZIDAGI kalitni tekshiradi.
 *
 * To'g'ridan-to'g'ri `MAP[key]` yozish xavfli: `"__proto__"` yoki
 * `"constructor"` kaliti merosdan kelgan qiymatni qaytaradi va u `truthy`
 * bo'ladi. Bu yerda kalit URL'dan keladi, ya'ni istalgan satr bo'lishi mumkin —
 * natijada filtr massiv o'rniga obyekt qabul qilib, mashq sahifasi qulab tushardi.
 */
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/** Kanonik oila → mashq filtridagi baza turlari. */
export const FAMILY_TO_DB_TYPES = {
  headings: ['HEADINGS'],
  true_false_ng: ['TRUE/FALSE/NG'],
  yes_no_ng: ['YES/NO/NG'],
  multiple_choice: ['MCQ'],
  short_answer: ['SHORT ANSWER'],
  matching: ['MATCHING', 'PARA MATCH'],
  map_diagram: ['MAP', 'PLAN', 'DIAGRAM'],
  flow_chart: ['FLOW CHART'],
  completion: ['NOTES', 'GAP FILL', 'TABLE', 'SUMMARY', 'SENTENCE']
  // `other` ataylab yo'q: u "tanib bo'lmadi" degani, va uni filtrga aylantirib
  // bo'lmaydi. Havolasiz qadam havolasi buzuq qadamdan yaxshi.
};

/** Ko'nikma → mashq ro'yxati sahifasi. */
const SKILL_ROUTES = {
  reading: '/reading/parts',
  listening: '/listening/parts'
};

/**
 * Faqat bitta ko'nikmada uchraydigan oilalar.
 *
 * IELTS'da Matching Headings va TRUE/FALSE/NOT GIVEN faqat Reading'da bo'ladi —
 * `PracticeFilters` ham bu variantlarni faqat reading uchun ko'rsatadi.
 * Qolgan oilalar (completion, matching, MCQ) ikkala bo'limda ham uchraydi,
 * shuning uchun ular uchun o'quvchining ko'proq ishlagan bo'limi tanlanadi.
 */
const FAMILY_ONLY_IN = {
  headings: 'reading',
  true_false_ng: 'reading',
  yes_no_ng: 'reading'
};

/**
 * Shu oila uchun qaysi bo'limga yo'naltirish kerakligini aniqlaydi.
 *
 * @param {string} family Kanonik savol oilasi
 * @param {Array<{skill: string, total: number}>} skills Ko'nikmalar kesimi
 * @returns {string|null}
 */
export function preferredSkillFor(family, skills) {
  if (family && own(FAMILY_ONLY_IN, family)) return FAMILY_ONLY_IN[family];

  // Ko'proq savol ishlangan bo'lim — u yerda mashq ham ko'proq bo'lishi ehtimoli yuqori.
  const candidates = (Array.isArray(skills) ? skills : []).filter(
    (s) => s?.skill && own(SKILL_ROUTES, s.skill)
  );
  if (candidates.length === 0) return null;

  return candidates.reduce((best, s) => ((s.total || 0) > (best.total || 0) ? s : best)).skill;
}

/**
 * Savol turi bo'yicha filtrlangan mashq ro'yxatiga havola.
 *
 * URL'da baza turlari emas, KANONIK oila uzatiladi (`?qtype=headings`): havola
 * o'qiladigan bo'lib qoladi va baza turlari o'zgarsa ham buzilmaydi — ularni
 * sahifaning o'zi `FAMILY_TO_DB_TYPES` orqali yechadi.
 *
 * @param {string} skill 'reading' | 'listening'
 * @param {string} family Kanonik savol oilasi
 * @returns {string|null} havola, yoki `null` — bunday kombinatsiya uchun sahifa yo'q
 */
export function buildPracticeLink(skill, family) {
  const skillKey = String(skill || '').toLowerCase();
  const route = own(SKILL_ROUTES, skillKey) ? SKILL_ROUTES[skillKey] : null;
  if (!route) return null;
  if (!family || !own(FAMILY_TO_DB_TYPES, family)) return null;
  return `${route}?qtype=${encodeURIComponent(family)}`;
}

/**
 * URL parametridan filtr qiymatini yechadi.
 *
 * Mashq sahifasi `selectedQuestionTypes` holatiga aynan shu massivni qo'yadi.
 *
 * @param {string|null} qtype `?qtype=` qiymati
 * @returns {string[]} baza turlari; tanilmagan qiymatda bo'sh massiv
 */
export function resolveQtypeParam(qtype) {
  if (!qtype) return [];
  const key = String(qtype).trim();
  return own(FAMILY_TO_DB_TYPES, key) ? FAMILY_TO_DB_TYPES[key] : [];
}

export default buildPracticeLink;

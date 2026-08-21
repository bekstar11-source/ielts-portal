// src/utils/writingErrors.js
//
// Writing xatolarining kanonik turlari.
//
// `checkWriting` har bir xato uchun tuzatish va tushuntirish qaytaradi, lekin
// ular BITTA javob doirasida qoladi: o'quvchi Task 2 ni topshiradi, o'ntacha
// tuzatishni o'qiydi va unutadi. Takrorlanayotgani esa faqat turlar bo'yicha
// yig'ilgandagina ko'rinadi — "artikllar: 22 ta xato" degan jumla bitta javobdan
// hech qachon chiqmaydi.
//
// NEGA ANIQ RO'YXAT KERAK
// ───────────────────────
// Turni AI belgilaydi. Cheklovsiz qoldirilsa, u har javobda yangi nom o'ylab
// topadi ("verb tense", "tenses", "past tense", "tense usage") va jamlanma
// o'nlab bir martalik qatorga bo'linib ketadi — ya'ni umuman ishlamaydi.
// Shuning uchun ro'yxat yopiq va tanilmagan tur `other` ga tushadi.
//
// ⚠️ Bu fayl serverga nusxalanadi (`npm run mirror`): promptdagi ro'yxat va
// jamlanmadagi kalitlar bir xil bo'lishi shart.

/** Grammatika xatolari. */
const GRAMMAR_TYPES = [
  'tense',        // zamon
  'article',      // artikl (a / an / the)
  'preposition',  // predlog
  'agreement',    // ega-kesim moslashuvi
  'plural',       // birlik/ko'plik
  'word_order',   // so'z tartibi
  'sentence'      // gap tuzilishi (bo'lak, qo'shma gap)
];

/** Leksika xatolari. */
const LEXICAL_TYPES = [
  'word_choice',  // noto'g'ri so'z tanlangan
  'collocation',  // so'zlar birikmasi
  'formality',    // uslub (og'zaki so'z akademik matnda)
  'repetition',   // takror
  'spelling'      // imlo
];

/** Barcha kanonik turlar + zaxira. */
export const WRITING_ERROR_TYPES = [...GRAMMAR_TYPES, ...LEXICAL_TYPES, 'other'];

/** Promptga qo'yiladigan ro'yxat — AI faqat shulardan tanlashi kerak. */
export const WRITING_ERROR_TYPE_LIST = [...GRAMMAR_TYPES, ...LEXICAL_TYPES].join(' | ');

/**
 * AI qaytargan turni kanonik nomga keltiradi.
 *
 * Kichik og'ishlar kechiriladi ("Past Tense" → `tense`), chunki modelni har
 * safar aynan bir xil satr yozishga majburlash ishonchsiz. Tanib bo'lmagani
 * `other` ga tushadi — u yerda ham foydali: "boshqa" ulushi kattalashsa,
 * ro'yxatni kengaytirish kerakligi ko'rinadi.
 *
 * @param {string} raw
 * @returns {string} WRITING_ERROR_TYPES dan biri
 */
export function canonicalWritingError(raw) {
  const t = String(raw || '').toLowerCase().replace(/[\s-]+/g, '_').trim();
  if (!t) return 'other';

  // Aynan mos kelsa — shuning o'zi.
  if (WRITING_ERROR_TYPES.includes(t)) return t;

  if (t.includes('tense')) return 'tense';
  if (t.includes('article')) return 'article';
  if (t.includes('preposition')) return 'preposition';
  if (t.includes('agreement') || t.includes('subject_verb')) return 'agreement';
  if (t.includes('plural') || t.includes('singular')) return 'plural';
  if (t.includes('word_order') || t.includes('order')) return 'word_order';
  if (t.includes('sentence') || t.includes('fragment') || t.includes('clause')) return 'sentence';
  if (t.includes('collocation')) return 'collocation';
  if (t.includes('formal') || t.includes('register') || t.includes('informal')) return 'formality';
  if (t.includes('repetit') || t.includes('repeat')) return 'repetition';
  if (t.includes('spell')) return 'spelling';
  // `word_choice` tekshiruvi oxirida: "wrong word", "vocabulary" ham shu yerga.
  if (t.includes('word') || t.includes('vocab') || t.includes('lexic')) return 'word_choice';

  return 'other';
}

// src/utils/questionTypes.js
//
// Testlardagi xom `type` satrlari juda xilma-xil: bitta savol turi bazada
// `MCQ`, `multiple_choice`, `multi_choice_box`, `MULTIPLE CHOICE` ko'rinishida
// uchraydi. Xatolar tahlilida ularni bitta oilaga keltirmasak, o'quvchi bir xil
// savol turini uch xil qator sifatida ko'radi va statistika ma'nosini yo'qotadi.
//
// ⚠️ Bu fayl `functions/questionTypes.js` bilan bir xil bo'lishi shart —
// kanonik turlar server (ball hisobi) va klient (tahlil UI) da bir xil
// nomlanmasa, yig'ilgan statistika ikkiga bo'linib ketadi.

/** Tahlilda ko'rsatiladigan kanonik savol oilalari. */
export const QUESTION_FAMILIES = [
  'multiple_choice',
  'true_false_ng',
  'yes_no_ng',
  'headings',
  'matching',
  'completion',
  'flow_chart',
  'map_diagram',
  'short_answer',
  'other'
];

/** Tarjima kalitlari (`t('questionTypes.<family>')`). */
export const QUESTION_FAMILY_LABEL_KEY = Object.fromEntries(
  QUESTION_FAMILIES.map((f) => [f, `questionTypes.${f}`])
);

/**
 * Xom turni kanonik oilaga keltiradi.
 *
 * Tartib muhim: `matching_headings` ham "matching" ni o'z ichiga oladi, shuning
 * uchun headings tekshiruvi umumiy matching dan OLDIN turadi. Xuddi shunday
 * `flow_chart_matching` ham matching emas, flow chart deb qaraladi.
 *
 * @param {string} rawType
 * @returns {string} QUESTION_FAMILIES dan biri
 */
export function canonicalQuestionType(rawType) {
  if (!rawType) return 'other';

  // Bazada `TRUE/FALSE/NG` kabi slashli yozuvlar ham bor — slashni ham
  // ajratkich deb qaraymiz, aks holda ular hech bir oilaga tushmasdi.
  const t = String(rawType).toLowerCase().replace(/[_\-/]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return 'other';

  if (t.includes('heading')) return 'headings';
  if (t.includes('flow chart') || t.includes('flowchart')) return 'flow_chart';
  if (t.includes('map') || t.includes('plan') || t.includes('diagram') || t.includes('labeling') || t.includes('labelling')) {
    return 'map_diagram';
  }
  if (t.includes('true false') || t.includes('tfng') || t === 'tf') return 'true_false_ng';
  if (t.includes('yes no') || t.includes('ynng')) return 'yes_no_ng';
  if (t.includes('short answer')) return 'short_answer';

  // Variant tanlash oilasi. `selection` / `pick two` / `multi choice box` —
  // bularning barchasi o'quvchi uchun bitta ko'nikma: variantlardan tanlash.
  if (
    t.includes('mcq') ||
    t.includes('multiple choice') ||
    t.includes('multi choice') ||
    t.includes('pick ') ||
    t.includes('multi two') || t.includes('multi three') ||
    t.includes('multi four') || t.includes('multi five') ||
    t.includes('selection')
  ) {
    return 'multiple_choice';
  }

  if (t.includes('matching') || t.includes('para match') || t.includes('match')) return 'matching';

  if (
    t.includes('completion') ||
    t.includes('gap fill') ||
    t.includes('gapfill') ||
    t.includes('note') ||
    t.includes('table') ||
    t.includes('form') ||
    t.includes('summary') ||
    t.includes('sentence')
  ) {
    return 'completion';
  }

  return 'other';
}

/**
 * `{ family: { total, correct } }` ko'rinishidagi bir nechta statistikani qo'shadi.
 * Natijalar bo'yicha yig'ishda ishlatiladi.
 */
export function mergeTypeStats(target = {}, incoming = {}) {
  const out = { ...target };
  Object.entries(incoming || {}).forEach(([family, stat]) => {
    if (!stat) return;
    const total = Number(stat.total) || 0;
    const correct = Number(stat.correct) || 0;
    if (total <= 0) return;
    const prev = out[family] || { total: 0, correct: 0 };
    out[family] = { total: prev.total + total, correct: prev.correct + correct };
  });
  return out;
}

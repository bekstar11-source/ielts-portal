// src/utils/questionTypeRegistry.js
//
// `group.type` — bazada SXEMASIZ erkin matn. Bitta savol turi `map_labeling`,
// `map-labeling`, `MAP LABELING`, `map` ko'rinishlarida uchraydi. Ilgari har bir
// joy uni o'zicha o'qirdi:
//
//   · ListeningRightPane  — ANIQ TENGLIK  (`type === 'map_labeling'`)
//   · Reading QuestionGroup — SUBSTRING   (`type.includes('flow')`)
//   · ieltsScoring        — substring, `_`→bo'shliq
//   · questionTypes       — substring, `_ - /`→bo'shliq
//
// Natijada bitta JSON to'rt xil javob olardi: `"type": "summary"` reading'da
// to'g'ri chizilardi, listening'da esa hech bir shoxga tushmay MCQ ga o'tib
// ketardi va variantsiz MCQ **bo'sh** render bo'lardi — talaba savolni ko'rar,
// lekin javob yoza olmasdi. Ball hisobi esa uni baribir maxrajga qo'shardi.
//
// Shu sabab tur → renderer moslamasi FAQAT shu yerda yozilgan. Dispatcher ham,
// admin validatori ham ayni shu ro'yxatdan o'qiydi: validator "bu turni
// renderer taniydimi?" degan savolga dispatcher bilan bir xil javob beradi.

/**
 * Turni taqqoslash uchun yagona ko'rinishga keltiradi.
 * `"Map-Labeling"` / `"map labeling"` / `"MAP_LABELING"` → `"map_labeling"`.
 */
export const normalizeTypeKey = (raw) =>
  String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-–—]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

/**
 * Listening renderer'lari va ular taniydigan tur yozuvlari.
 *
 * ⚠️ Bu yerga faqat DALILGA asoslangan yozuv qo'shiladi: yo dispatcher'da
 * allaqachon bor edi, yo bazadagi testda uchradi. Taxminiy moslama qo'shish —
 * savolni noto'g'ri renderer'ga berish demak, bu esa jim buzilishning aynan
 * o'zi. Noma'lum tur `null` qaytarsin va ko'rinadigan xato bersin.
 */
export const LISTENING_RENDERERS = {
  MapLabeling: ['map_labeling', 'map'],
  Matching: ['matching'],
  TableCompletion: ['table_completion', 'table'],
  NoteCompletion: [
    'note_completion',
    'note',
    'gap_fill',
    'sentence_completion',
    'summary_completion',
    // `"type": "summary"` bazadagi haqiqiy testlarda uchraydi (matched_test_prod.json).
    // Reading uni `includes('summary')` bilan tanirdi, listening esa yo'q —
    // aynan shu nomutanosiblik guruhni MCQ ga tushirib yuborardi.
    'summary',
    'form_completion'
  ],
  FlowChart: ['flow_chart', 'flowchart', 'flow_chart_completion'],
  // `choice` / `multi_choice` ataylab YO'Q: ular `canonicalQuestionType` da
  // hech bir oilaga tushmaydi (→ "other"), ya'ni renderer taniydigan, lekin
  // xatolar tahlili tanimaydigan tur bo'lib qolardi. Yangi yozuv qo'shishdan
  // oldin `questionTypeRegistry.test.js` dagi moslik testi ishlashi shart.
  MultipleChoice: ['mcq', 'multiple_choice', 'standard_mcq']
};

/** `{ map_labeling: 'MapLabeling', ... }` — tez qidirish uchun teskari jadval. */
const LISTENING_BY_TYPE = Object.entries(LISTENING_RENDERERS).reduce((acc, [renderer, types]) => {
  types.forEach((t) => { acc[t] = renderer; });
  return acc;
}, {});

/** Dispatcher taniydigan barcha listening tur yozuvlari (validator uchun). */
export const KNOWN_LISTENING_TYPES = Object.keys(LISTENING_BY_TYPE);

/**
 * Tur nomiga qarab listening renderer'ini aniqlaydi.
 *
 * Ko'p variantli (checkbox) turlar bu yerda YO'Q: ular `isMultiAnswerType`
 * bilan aniqlanadi, chunki render (SelectionBox) va ball hisobi ayni bir
 * predikatga tayanishi shart — ikkita alohida ro'yxat muqarrar siljiydi.
 *
 * @param {string} rawType
 * @returns {string|null} renderer nomi, tanilmasa `null`
 */
export const resolveListeningRenderer = (rawType) =>
  LISTENING_BY_TYPE[normalizeTypeKey(rawType)] ?? null;

/**
 * Guruhda variant ro'yxati bormi? MCQ renderer'i `options.map(...)` qiladi —
 * variantsiz guruh javob maydonisiz, ya'ni JAVOB BERIB BO'LMAYDIGAN holda
 * chiziladi. Shuning uchun "tur noma'lum, lekin MCQ bo'lishi mumkin" taxmini
 * faqat variantlar haqiqatan mavjud bo'lganda o'rinli.
 */
export const hasAnyOptions = (group) => {
  if (!group || typeof group !== 'object') return false;
  if (Array.isArray(group.options) && group.options.length > 0) return true;
  return ['questions', 'items', 'groups'].some((key) =>
    Array.isArray(group[key]) && group[key].some((child) => hasAnyOptions(child))
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// READING TASNIFI
//
// Reading dispatcher'i listening'dan boshqacha ishlaydi va bu ATAYLAB shunday:
// bitta guruh bir vaqtda bir nechta xususiyatga ega bo'ladi (jadval + variantlar
// ro'yxati), va tur nomidan tashqari KO'RSATMA MATNI ham signal beradi —
// `"...complete the flow-chart below"` deb yozilgan guruhning `type` i ko'pincha
// shunchaki `gap_fill` bo'ladi. Shu sabab bu yerda bitta renderer emas, bayroqlar
// to'plami qaytariladi.
//
// Nega registrda: ilgari bu mantiq `QuestionGroup.jsx` ichida, JSX orasida
// yozilgan edi — testlab bo'lmasdi va `nextGroup` uchun xuddi shu ro'yxat
// ikkinchi marta qo'lda takrorlanardi.
// ─────────────────────────────────────────────────────────────────────────────

const CHOICE_HINTS = ['mcq', 'choice', 'multi', 'tfng', 'yesno', 'true_false', 'yes_no'];

/** Variant-tanlash guruhimi? `nextGroup` uchun ham ishlatiladi (chegara chizig'i). */
export const isReadingChoiceGroup = (group, isMultiAnswer) => {
  const type = String(group?.type || '').toLowerCase();
  return Boolean(isMultiAnswer) || CHOICE_HINTS.some((t) => type.includes(t));
};

/**
 * "Choose the correct heading for each paragraph" — chap panelga drop-zone
 * chiziladigan yagona tur.
 */
export const isMatchingHeadingsGroup = (group) => {
  if (!group) return false;
  const type = String(group.type || '').toLowerCase();
  const instr = String(group.instruction || '').toLowerCase();
  return type.includes('matching') && (type.includes('heading') || instr.includes('heading'));
};

/**
 * "Which paragraph contains the following information?" — ma'lumotni paragrafga
 * moslashtirish. Sarlavha moslashtirish HAR DOIM ustun turadi, chunki uning
 * ko'rsatmasida ham "paragraph" so'zi uchraydi.
 */
export const isMatchingParagraphGroup = (group) => {
  if (!group || isMatchingHeadingsGroup(group)) return false;
  const type = String(group.type || '').toLowerCase();
  const instr = String(group.instruction || '').toLowerCase();
  return type.includes('matching') && (
    type.includes('paragraph') ||
    instr.includes('paragraph') ||
    instr.includes('contain') ||
    instr.includes('mention')
  );
};

/**
 * Reading guruhini tasniflaydi.
 *
 * @param {object} group
 * @param {boolean} isMultiAnswer  `ieltsScoring.isMultiAnswerType(group.type)` —
 *   tashqaridan uzatiladi, chunki render va ball hisobi AYNI predikatga
 *   tayanishi shart (ikkita alohida ro'yxat muqarrar siljiydi).
 */
export const classifyReadingGroup = (group, isMultiAnswer) => {
  const type = String(group?.type || '').toLowerCase();
  const instr = String(group?.instruction || '').toLowerCase();
  const options = Array.isArray(group?.options) ? group.options : [];
  const hasOptions = options.length > 0;

  const isMatchingHeading = isMatchingHeadingsGroup(group);
  const isMatchingParagraph = isMatchingParagraphGroup(group);

  const isSummary = (type === 'gap_fill' || type.includes('summary') || type === 'summary_box')
    && !type.includes('note') && !type.includes('flow');
  const isFlowChart = type.includes('flow') || instr.includes('flow-chart') || instr.includes('flow chart');

  // Variantlar shunchaki "A", "B", "C" harflaridan iboratmi? Bunday ro'yxatni
  // alohida quti bo'lib chizish ma'nosiz — u savolning o'zida ko'rinadi.
  const isJustLetters = hasOptions && options.every((opt) => {
    const text = String(typeof opt === 'object' ? opt.text : opt).trim();
    return text.length <= 3 || /^[A-Z][.)]?\s*$/i.test(text);
  });

  return {
    isMultiSelect: Boolean(isMultiAnswer),
    isChoiceType: isReadingChoiceGroup(group, isMultiAnswer),
    isMatching: type.includes('matching')
      || Boolean(group?.items?.some((i) => i.text && i.text.includes('[DROP]'))),
    isSummary,
    isFlowChart,
    isTable: type.includes('table'),
    isDiagram: type.includes('diagram') || type.includes('labeling'),
    isTFNG: type.includes('tfng') || type.includes('yesno')
      || type.includes('true_false') || type.includes('yes_no'),
    isMatchingHeading,
    isMatchingParagraph,
    isJustLetters,
    isMatchingGrid: type.includes('matching') && !isMatchingHeading && !isMatchingParagraph && hasOptions,
    showStaticOptions: ((type.includes('matching') && !isMatchingParagraph) || isSummary || isFlowChart)
      && hasOptions && !isJustLetters
  };
};

/**
 * Reading guruhi uchun ASOSIY renderer nomini qaytaradi.
 *
 * `classifyReadingGroup` bayroqlar to'plamini beradi; bu funksiya esa ular
 * ustidagi USTUVORLIK TARTIBINI aniqlaydi. Tartib `QuestionGroup.jsx` dagi
 * ichma-ich ternarylardan olingan va u yerda O'ZGARMAGAN — shunchaki
 * testlanadigan joyga ko'chirilgan. Ilgari "qaysi komponent chiziladi?" degan
 * savolga faqat JSX ni o'qib javob berish mumkin edi, ya'ni golden corpus
 * reading tomonini umuman tekshira olmasdi.
 *
 * `MatchingOptionsBox` bu ro'yxatda yo'q — u asosiy renderer emas, yonida
 * qo'shimcha chiziladigan quti (`showStaticOptions` bayrog'i).
 *
 * @returns {'MatchingGrid'|'MatchingHeadings'|'Table'|'DiagramLabeling'|'SummaryGapFill'|'FlowChart'|'Choice'|'GapFill'}
 */
export const resolveReadingRenderer = (group, isMultiAnswer) => {
  const f = classifyReadingGroup(group, isMultiAnswer);
  const hasOptions = Array.isArray(group?.options) && group.options.length > 0;

  if (f.isMatchingGrid) return 'MatchingGrid';
  if (f.isMatchingHeading && hasOptions) return 'MatchingHeadings';
  if (f.isTable) return 'Table';
  if (f.isDiagram) return 'DiagramLabeling';
  if (f.isSummary && !f.isFlowChart) return 'SummaryGapFill';
  if (f.isFlowChart) return 'FlowChart';
  if (f.isChoiceType && !f.isMatching) return 'Choice';
  return 'GapFill';
};

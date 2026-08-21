// src/utils/questionTypeRegistry.test.js
//
//   npm run test:utils
//
// Registry — tur → renderer moslamasining yagona manbasi. Bu yerdagi testlar
// ikki narsani qo'riqlaydi:
//
//   1. Yozilish ko'rinishlari (defis / bo'shliq / katta harf) bir xil turga
//      keladi — aynan shu farq tufayli guruhlar dispatcher'dan tushib qolardi.
//   2. Registry, ball hisobi (`ieltsScoring`) va tahlil tasnifi
//      (`questionTypes`) BIR-BIRIGA ZID emas. Uchtasi mustaqil fayl, va ular
//      siljiganda hech qanday xatolik chiqmaydi — faqat talabaning bandi
//      noto'g'ri chiqadi. Shuning uchun moslikni test ushlab turadi.

import test from 'node:test';
import assert from 'node:assert';

import {
  normalizeTypeKey,
  resolveListeningRenderer,
  hasAnyOptions,
  classifyReadingGroup,
  KNOWN_LISTENING_TYPES,
  LISTENING_RENDERERS
} from './questionTypeRegistry.js';
import { isMultiAnswerType } from './ieltsScoring.js';
import { canonicalQuestionType } from './questionTypes.js';

test('yozilish ko\'rinishlari bitta kalitga keladi', () => {
  for (const variant of ['map_labeling', 'map-labeling', 'MAP LABELING', ' Map-Labeling ', 'map—labeling']) {
    assert.equal(normalizeTypeKey(variant), 'map_labeling', variant);
  }
});

test('bo\'sh / yaroqsiz kirish xatolik bermaydi', () => {
  for (const bad of [null, undefined, '', '   ', 0, {}]) {
    assert.doesNotThrow(() => normalizeTypeKey(bad));
    assert.equal(resolveListeningRenderer(bad), null);
  }
});

test('defisli va katta harfli yozuvlar ham renderer topadi', () => {
  // Ilgari dispatcher ANIQ TENGLIK ishlatardi — bularning hammasi tushib qolardi.
  assert.equal(resolveListeningRenderer('map-labeling'), 'MapLabeling');
  assert.equal(resolveListeningRenderer('TABLE_COMPLETION'), 'TableCompletion');
  assert.equal(resolveListeningRenderer('flow-chart'), 'FlowChart');
  assert.equal(resolveListeningRenderer('Note Completion'), 'NoteCompletion');
});

test('bazadagi haqiqiy testlarda uchragan turlar taniladi', () => {
  // matched_test_prod.json dan olingan yozuvlar. `summary` ilgari listening
  // dispatcher'ida yo'q edi va jim ravishda MCQ ga tushardi.
  assert.equal(resolveListeningRenderer('summary'), 'NoteCompletion');
  assert.equal(resolveListeningRenderer('note_completion'), 'NoteCompletion');
  assert.equal(resolveListeningRenderer('mcq'), 'MultipleChoice');
  assert.equal(resolveListeningRenderer('matching'), 'Matching');
});

test('tanilmagan tur null qaytaradi (jim MCQ ga tushmaydi)', () => {
  assert.equal(resolveListeningRenderer('qandaydir_yangi_tur'), null);
  assert.equal(resolveListeningRenderer('short_answer'), null);
});

test('bitta tur ikkita renderer\'ga biriktirilmagan', () => {
  const seen = new Map();
  for (const [renderer, types] of Object.entries(LISTENING_RENDERERS)) {
    for (const t of types) {
      assert.ok(!seen.has(t), `"${t}" ikki joyda: ${seen.get(t)} va ${renderer}`);
      seen.set(t, renderer);
    }
  }
});

test('registrdagi kalitlar allaqachon normal ko\'rinishda yozilgan', () => {
  // Aks holda kalit hech qachon topilmaydi: qidiruv normallashtirilgan
  // qiymat bilan boradi, registrdagi yozuv esa xom holida qoladi.
  for (const t of KNOWN_LISTENING_TYPES) {
    assert.equal(normalizeTypeKey(t), t, `registrdagi "${t}" normal emas`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MOSLIK INVARIANTLARI — uchta mustaqil fayl bir xil qaror qabul qilishi shart
// ─────────────────────────────────────────────────────────────────────────────

test('registrdagi hech bir tur ball hisobida "ko\'p javobli" emas', () => {
  // Dispatcher avval `isMultiAnswerType` ni tekshiradi va SelectionBox chizadi.
  // Agar registrdagi tur ham shu shartga tushsa, registr yozuvi hech qachon
  // ishlamaydi — o'lik qoida bo'lib qoladi va keyingi o'quvchini chalg'itadi.
  for (const t of KNOWN_LISTENING_TYPES) {
    assert.equal(isMultiAnswerType(t), false, `"${t}" SelectionBox tomonidan tutib olinadi`);
  }
});

test('registrdagi hech bir tur tahlilda "other" oilasiga tushmaydi', () => {
  // `canonicalQuestionType` xatolar tahlili uchun turni oilaga biriktiradi.
  // Renderer taniydigan, lekin tahlil tanimaydigan tur — talaba statistikada
  // "boshqa" degan ma'nosiz qatorni ko'radi degani.
  for (const t of KNOWN_LISTENING_TYPES) {
    assert.notEqual(canonicalQuestionType(t), 'other', `"${t}" tahlilda "other" ga tushadi`);
  }
});

test('renderer va tahlil oilasi bir-biriga mos', () => {
  const EXPECTED_FAMILY = {
    MapLabeling: 'map_diagram',
    Matching: 'matching',
    TableCompletion: 'completion',
    NoteCompletion: 'completion',
    FlowChart: 'flow_chart',
    MultipleChoice: 'multiple_choice'
  };
  for (const [renderer, types] of Object.entries(LISTENING_RENDERERS)) {
    for (const t of types) {
      assert.equal(
        canonicalQuestionType(t),
        EXPECTED_FAMILY[renderer],
        `"${t}" → ${renderer}, lekin tahlil oilasi "${canonicalQuestionType(t)}"`
      );
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────

test('hasAnyOptions variantlarni ichma-ich topadi', () => {
  assert.equal(hasAnyOptions({ options: [{ label: 'A' }] }), true);
  assert.equal(hasAnyOptions({ questions: [{ options: [{ label: 'A' }] }] }), true);
  assert.equal(hasAnyOptions({ groups: [{ items: [{ options: ['A', 'B'] }] }] }), true);
});

test('hasAnyOptions variantsiz guruhni false deb biladi', () => {
  // Aynan shu holat xavfli: MCQ renderer'i `options.map()` qiladi, ya'ni
  // variantsiz guruh JAVOB MAYDONISIZ chiziladi.
  assert.equal(hasAnyOptions({ items: [{ id: '1', answer: 'book' }] }), false);
  assert.equal(hasAnyOptions({ options: [] }), false);
  assert.equal(hasAnyOptions(null), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// READING TASNIFI
//
// Bu bayroqlar ilgari `QuestionGroup.jsx` ichida, JSX orasida hisoblanardi va
// testlab bo'lmasdi. Quyidagilar registrga ko'chirishda xatti-harakat
// o'zgarmaganini qulflaydi (ko'chirish paytida 5376 kombinatsiya differensial
// tekshirildi — nol farq).
// ─────────────────────────────────────────────────────────────────────────────

const classify = (group) => classifyReadingGroup(group, isMultiAnswerType(group.type));

test('reading: tur nomidan tanib olinadigan bayroqlar', () => {
  assert.equal(classify({ type: 'table_completion' }).isTable, true);
  assert.equal(classify({ type: 'diagram_labeling' }).isDiagram, true);
  assert.equal(classify({ type: 'true_false' }).isTFNG, true);
  assert.equal(classify({ type: 'mcq' }).isChoiceType, true);
  assert.equal(classify({ type: 'pick_two' }).isMultiSelect, true);
});

test('reading: KO\'RSATMA MATNI ham signal beradi', () => {
  // `type` shunchaki `gap_fill` bo'lib, flow-chart ekani faqat ko'rsatmada
  // yozilgan holat bazada uchraydi — shuning uchun bu qoida saqlanadi.
  assert.equal(classify({ type: 'gap_fill', instruction: 'Complete the flow-chart below' }).isFlowChart, true);
  assert.equal(classify({ type: 'matching', instruction: 'Choose the correct heading' }).isMatchingHeading, true);
  assert.equal(classify({ type: 'matching', instruction: 'Which paragraph contains...' }).isMatchingParagraph, true);
});

test('reading: sarlavha moslashtirish paragraf moslashtirishdan USTUN', () => {
  // Sarlavha ko'rsatmasida ham "paragraph" so'zi uchraydi — tartib buzilsa,
  // chap paneldagi drop-zone noto'g'ri guruhga chizilardi.
  const g = { type: 'matching', instruction: 'Choose the correct heading for each paragraph' };
  assert.equal(classify(g).isMatchingHeading, true);
  assert.equal(classify(g).isMatchingParagraph, false);
});

test('reading: `note` va `flow` summary\'ni bekor qiladi', () => {
  assert.equal(classify({ type: 'summary_completion' }).isSummary, true);
  assert.equal(classify({ type: 'note_summary' }).isSummary, false);
  assert.equal(classify({ type: 'summary_flow' }).isSummary, false);
});

test('reading: [DROP] belgisi turdan qat\'i nazar matching qiladi', () => {
  assert.equal(classify({ type: 'gap_fill', items: [{ id: '1', text: 'x [DROP]' }] }).isMatching, true);
  assert.equal(classify({ type: 'gap_fill', items: [{ id: '1', text: 'oddiy' }] }).isMatching, false);
});

test('reading: faqat harflardan iborat variantlar alohida quti bo\'lib chizilmaydi', () => {
  // "A", "B", "C" ro'yxati savolning o'zida ko'rinadi — uni takrorlash ortiqcha.
  assert.equal(classify({ type: 'matching', options: ['A', 'B', 'C'] }).isJustLetters, true);
  assert.equal(classify({ type: 'matching', options: ['A', 'B', 'C'] }).showStaticOptions, false);
  assert.equal(classify({ type: 'matching', options: ['the alone condition', 'migration'] }).showStaticOptions, true);
});

test('reading: variantsiz guruh grid ham, static quti ham emas', () => {
  const g = classify({ type: 'matching' });
  assert.equal(g.isMatchingGrid, false);
  assert.equal(g.showStaticOptions, false);
});

test('reading: yaroqsiz kirish xatolik bermaydi', () => {
  for (const bad of [null, undefined, {}, { type: null }, { options: 'matn' }]) {
    assert.doesNotThrow(() => classifyReadingGroup(bad, false));
  }
});

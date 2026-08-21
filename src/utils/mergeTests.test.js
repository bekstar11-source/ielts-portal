// src/utils/mergeTests.test.js
//
//   npm run test:utils
//
// BIRLASHTIRISH (merge) — testlarni qo'shib, savollarni 1..N qilib qayta
// raqamlaydi. Bu yerdagi invariant oddiy va qat'iy:
//
//   birlashtirilgan testdagi savollar = manba testlardagi savollar yig'indisi,
//   raqamlari 1 dan N gacha KETMA-KET va TAKRORLANMAS.
//
// Nega muhim: javoblar `userAnswers[id]` bo'yicha saqlanadi. Ikkita savol bir
// xil ID olsa, talabaning ikkinchi javobi birinchisini BOSIB KETADI — va
// bunda hech qanday xatolik chiqmaydi. Ball hisobi esa takroriy ID ni bir
// marta sanaydi, ya'ni savollarning bir qismi jimgina yo'qoladi.
//
// ⚠️ Kutilgan son MANBA testlardan hisoblanadi, natijadan emas — aks holda
// tekshiruv doiraviy bo'lib qoladi va aynan yo'qolgan savollarni ko'rmaydi.

import test from 'node:test';
import assert from 'node:assert';

import { mergeTestsLogic } from './TestUtils.js';
import { collectQuestionNumbers, evaluateTest } from './ieltsScoring.js';

const mkTest = (id, title, groups) => ({
  id,
  title,
  type: 'reading',
  passages: [{ id: 'p1', title: `${title} P1`, content: 'matn', partNumber: 1 }],
  questions: groups.map((g) => ({ passageId: 'p1', ...g }))
});

/** Ikkita bir xil testni birlashtirib, invariantni tekshiradi. */
const assertMergeKeepsAll = (nom, groups) => {
  const a = mkTest('A', 'Test A', groups);
  const b = mkTest('B', 'Test B', groups);

  const kutilgan =
    collectQuestionNumbers({ questions: a.questions }).size +
    collectQuestionNumbers({ questions: b.questions }).size;

  const merged = { type: 'reading', ...mergeTestsLogic([a, b], 'Merged') };
  const nums = [...collectQuestionNumbers({ questions: merged.questions })].sort((x, y) => x - y);

  assert.equal(nums.length, kutilgan, `${nom}: ${kutilgan} ta savol kutilgan, ${nums.length} ta qoldi`);
  assert.deepEqual(
    nums,
    Array.from({ length: kutilgan }, (_, i) => i + 1),
    `${nom}: raqamlar 1..${kutilgan} ketma-ketligida emas`
  );
  assert.equal(
    evaluateTest(merged, {}).totalQ, kutilgan,
    `${nom}: ball maxraji manba savollari soniga teng emas`
  );
};

test('merge: oddiy items', () => {
  assertMergeKeepsAll('oddiy', [
    { type: 'mcq', id: '1-3', items: [1, 2, 3].map((n) => ({ id: String(n), answer: 'A' })) }
  ]);
});

test('merge: diapazon ID (pick_two) ikki raqamni oladi', () => {
  assertMergeKeepsAll('diapazon', [
    { type: 'mcq', id: '1-2', items: [{ id: '1', answer: 'A' }, { id: '2', answer: 'B' }] },
    { type: 'pick_two', id: '3-4', items: [{ id: '3-4', answer: 'C,D' }] }
  ]);
});

test('merge: en tire va vergulli ID lar', () => {
  assertMergeKeepsAll('en tire', [{ type: 'pick_two', id: '1–2', items: [{ id: '1–2', answer: 'A,B' }] }]);
  assertMergeKeepsAll('vergul', [{ type: 'pick_two', id: '1,2', items: [{ id: '1,2', answer: 'A,B' }] }]);
});

test('merge: jadval qatorlari (rows → cells)', () => {
  assertMergeKeepsAll('jadval', [
    {
      type: 'table_completion',
      id: '1-2',
      rows: [
        { cells: [{ text: 'x' }, { id: '1', answer: 'a' }] },
        { cells: [{ text: 'y' }, { id: '2', answer: 'b' }] }
      ]
    }
  ]);
});

test('merge: katakchada id bor, `parts` esa FAQAT MATN', () => {
  // ⚠️ REGRESSIYA. Qayta raqamlash "bolasi bor ⇒ konteyner" deb qaraganda bu
  // katakchaning `id` si O'ZGARMASDAN qolardi. Ikkala manba testda ham u "1"
  // bo'lib qolib, savollar bir-birini bosib ketardi: 4 ta savoldan 2 tasi
  // ball hisobidan jimgina tushib qolardi.
  assertMergeKeepsAll('matnli parts', [
    {
      type: 'table_completion',
      id: '1-2',
      rows: [{
        cells: [
          { id: '1', answer: 'a', parts: [{ type: 'text', text: 'No. ' }] },
          { id: '2', answer: 'b' }
        ]
      }]
    }
  ]);
});

test('merge: aralash katakcha — `parts` ichida input', () => {
  assertMergeKeepsAll('input parts', [
    {
      type: 'table_completion',
      id: '1-2',
      rows: [{
        cells: [
          { parts: [{ type: 'text', text: 'No. ' }, { type: 'input', id: '1', answer: 'a' }] },
          { parts: [{ type: 'input', id: '2', answer: 'b' }] }
        ]
      }]
    }
  ]);
});

test('merge: bitta katakchada bir nechta savol', () => {
  assertMergeKeepsAll('multi katakcha', [
    {
      type: 'table_completion',
      id: '1-2',
      rows: [{ cells: [{ isMultiQuestion: true, content: [{ id: '1', answer: 'a' }, { id: '2', answer: 'b' }] }] }]
    }
  ]);
});

test('merge: sarlavha katakchalari savol raqamini yemaydi', () => {
  assertMergeKeepsAll('sarlavhalar', [
    {
      type: 'note_completion',
      id: '1-2',
      groups: [{ items: [{ id: 'heading_1', text: 'Bo\'lim' }, { id: '1', answer: 'a' }, { id: '2', answer: 'b' }] }]
    }
  ]);
});

test('merge: uchta test birlashtirilganda ham ketma-ketlik buzilmaydi', () => {
  const g = [{ type: 'mcq', id: '1-2', items: [{ id: '1', answer: 'A' }, { id: '2', answer: 'B' }] }];
  const tests = ['A', 'B', 'C'].map((x) => mkTest(x, `Test ${x}`, g));
  const merged = { type: 'reading', ...mergeTestsLogic(tests, 'Merged') };
  const nums = [...collectQuestionNumbers({ questions: merged.questions })].sort((x, y) => x - y);
  assert.deepEqual(nums, [1, 2, 3, 4, 5, 6]);
  assert.equal(merged.passages.length, 3);
});

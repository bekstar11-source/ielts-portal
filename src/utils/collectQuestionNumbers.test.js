// src/utils/collectQuestionNumbers.test.js
//
//   npm run test:utils
//
// Savol sanagich — "bu testda nechta savol bor?" degan savolning YAGONA javobi.
// Undan `getActualQuestionCount` (test kartochkasi), `useStudentData`
// (dashboard) va `getRangeLabel` ("Questions 27–30" sarlavhasi) oziqlanadi.
//
// Ilgari uchalasi alohida yozilgan edi va turlicha yurardi. Ular ball
// maxrajidan farq qilganda hech qanday xatolik chiqmaydi — talaba "40 ta
// savol" yozuvini ko'rib, 37 talik maxrajga baholanadi.

import test from 'node:test';
import assert from 'node:assert';

import { collectQuestionNumbers } from './ieltsScoring.js';

const nums = (node) => [...collectQuestionNumbers(node)].sort((a, b) => a - b);

test('oddiy items', () => {
  assert.deepEqual(nums({ items: [{ id: '1' }, { id: '2' }] }), [1, 2]);
});

test('diapazon ID bir nechta savolni bildiradi (defis va en tire)', () => {
  assert.deepEqual(nums({ items: [{ id: '35-36' }] }), [35, 36]);
  assert.deepEqual(nums({ items: [{ id: '35–36' }] }), [35, 36]);
  assert.deepEqual(nums({ items: [{ id: '23,24' }] }), [23, 24]);
});

test('guruhning O\'Z id si sanalmaydi', () => {
  // Bazada guruh ID lari "1–6" ko'rinishida. Ular elementlari bilan mos
  // kelmasa (masalan guruhda dekorativ element bor), sanoq shishib ketardi.
  assert.deepEqual(
    nums({ questions: [{ id: '1–6', type: 'mcq', items: [{ id: '1' }, { id: '2' }] }] }),
    [1, 2]
  );
});

test('passage id si savol raqami sifatida sanalmaydi', () => {
  // Passage ID lari bazada "1" / "2" / "3" — savol raqamlari bilan to'qnashadi.
  const t = {
    passages: [{ id: '1', title: 'P1', content: 'matn' }, { id: '2', title: 'P2', content: 'matn' }],
    questions: [{ passageId: '1', items: [{ id: '30' }, { id: '31' }] }]
  };
  assert.deepEqual(nums(t), [30, 31]);
});

test('jadval qatorlari — ikkala yozilish ham bir xil natija beradi', () => {
  const asArrays = { rows: [[{ text: 'Item' }, { id: '1' }], [{ text: 'Cost' }, { id: '2' }]] };
  const asObjects = { rows: [{ cells: [{ text: 'Item' }, { id: '1' }] }, { cells: [{ text: 'Cost' }, { id: '2' }] }] };
  assert.deepEqual(nums(asArrays), [1, 2]);
  assert.deepEqual(nums(asArrays), nums(asObjects));
});

test('aralash katakcha: `parts` ichidagi input sanaladi, katakchaning o\'zi emas', () => {
  const t = { rows: [{ cells: [{ id: '99', parts: [{ type: 'text' }, { type: 'input', id: '5' }] }] }] };
  assert.deepEqual(nums(t), [5]);
});

test('bitta katakchada bir nechta savol', () => {
  const t = { rows: [{ cells: [{ isMultiQuestion: true, content: [{ id: '7' }, { id: '8' }] }] }] };
  assert.deepEqual(nums(t), [7, 8]);
});

test('raqamsiz ID lar e\'tiborsiz qoladi', () => {
  assert.deepEqual(nums({ items: [{ id: 'p1' }, { id: 'loc_3' }, { id: '4' }] }), [4]);
});

test('takroriy raqam bir marta sanaladi', () => {
  // Jadval katakchasi kalitni `items` da saqlab, `rows` da faqat joyini
  // ko'rsatishi mumkin — bitta savol ikkala joyda uchraydi.
  const t = { items: [{ id: '3' }], rows: [[{ id: '3' }]] };
  assert.deepEqual(nums(t), [3]);
});

test('katakchada id bor, `parts` esa faqat matndan iborat', () => {
  // ⚠️ Nozik holat. `getCellQuestions` bunday katakchani SAVOL deb qaytaradi
  // (parts ichida input yo'q → katakchaning o'zi savol), `evaluateTest` unga
  // ball beradi. Sanagich uni "konteyner" deb hisoblasa, savol chizilardi va
  // baholanardi, lekin "40 ta savol" hisobiga kirmasdi.
  const t = { rows: [{ cells: [{ id: '5', answer: 'x', parts: [{ type: 'text', text: 'No. ' }] }] }] };
  assert.deepEqual(nums(t), [5]);
});

test('katakchada id bor, `parts` ichida input ham bor — INPUT ustun', () => {
  // Bu yerda esa savol — input, katakchaning o'zi emas.
  const t = { rows: [{ cells: [{ id: '99', parts: [{ type: 'input', id: '6', answer: 'x' }] }] }] };
  assert.deepEqual(nums(t), [6]);
});

test('bo\'sh konteyner tugunning o\'z id sini yashirmaydi', () => {
  assert.deepEqual(nums({ items: [{ id: '7', answer: 'x', items: [] }] }), [7]);
  assert.deepEqual(nums({ items: [{ id: '8', answer: 'x', content: 'matn satri' }] }), [8]);
});

test('yaroqsiz kirish xatolik bermaydi', () => {
  for (const bad of [null, undefined, 0, '', 'matn', []]) {
    assert.doesNotThrow(() => collectQuestionNumbers(bad));
    assert.equal(collectQuestionNumbers(bad).size, 0);
  }
});

test('sikl bo\'lmagan chuqur ichma-ichlik', () => {
  const t = { sections: [{ groups: [{ questions: [{ items: [{ id: '12' }] }] }] }] };
  assert.deepEqual(nums(t), [12]);
});

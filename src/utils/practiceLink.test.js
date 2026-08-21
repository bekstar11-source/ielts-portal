// src/utils/practiceLink.test.js
//
//   npm run test:utils
//
// Bu havolalar buzilganda hech qanday xatolik chiqmaydi — o'quvchi shunchaki
// bo'sh yoki noto'g'ri filtrlangan ro'yxatga tushadi va tahlilga bo'lgan
// ishonchni yo'qotadi. Eng nozik joyi — kanonik oila nomlarini mashq
// sahifasidagi baza turlariga o'girish.

import test from 'node:test';
import assert from 'node:assert';

import {
  buildPracticeLink,
  preferredSkillFor,
  resolveQtypeParam,
  FAMILY_TO_DB_TYPES
} from './practiceLink.js';
import { QUESTION_FAMILIES } from './questionTypes.js';

test('havola kanonik oila bilan quriladi', () => {
  assert.strictEqual(buildPracticeLink('reading', 'headings'), '/reading/parts?qtype=headings');
  assert.strictEqual(
    buildPracticeLink('listening', 'completion'),
    '/listening/parts?qtype=completion'
  );
});

test('sahifasi yo\'q kombinatsiyada havola berilmaydi', () => {
  // Havolasiz qadam — buzuq havolali qadamdan yaxshi.
  assert.strictEqual(buildPracticeLink('writing', 'completion'), null);
  assert.strictEqual(buildPracticeLink('reading', 'other'), null);
  assert.strictEqual(buildPracticeLink('reading', null), null);
  assert.strictEqual(buildPracticeLink(null, 'headings'), null);
});

test('faqat Reading da uchraydigan turlar Listening ga yo\'naltirilmaydi', () => {
  // O'quvchi asosan Listening ishlagan bo'lsa ham, Matching Headings u yerda yo'q.
  const listeningHeavy = [
    { skill: 'listening', total: 400 },
    { skill: 'reading', total: 40 }
  ];

  assert.strictEqual(preferredSkillFor('headings', listeningHeavy), 'reading');
  assert.strictEqual(preferredSkillFor('true_false_ng', listeningHeavy), 'reading');
  assert.strictEqual(preferredSkillFor('yes_no_ng', listeningHeavy), 'reading');
});

test('ikkala bo\'limda uchraydigan turda ko\'proq ishlangani tanlanadi', () => {
  const listeningHeavy = [
    { skill: 'listening', total: 400 },
    { skill: 'reading', total: 40 }
  ];
  const readingHeavy = [
    { skill: 'listening', total: 40 },
    { skill: 'reading', total: 400 }
  ];

  assert.strictEqual(preferredSkillFor('completion', listeningHeavy), 'listening');
  assert.strictEqual(preferredSkillFor('completion', readingHeavy), 'reading');
});

test('ko\'nikma ma\'lumoti bo\'lmasa yo\'nalish tanlanmaydi', () => {
  assert.strictEqual(preferredSkillFor('completion', []), null);
  assert.strictEqual(preferredSkillFor('completion', undefined), null);
  // Writing/Speaking mashq ro'yxati bu yerda yo'q — ular hisobga olinmaydi.
  assert.strictEqual(preferredSkillFor('completion', [{ skill: 'writing', total: 100 }]), null);
});

test('URL parametri baza turlariga yechiladi', () => {
  assert.deepStrictEqual(resolveQtypeParam('headings'), ['HEADINGS']);
  assert.deepStrictEqual(resolveQtypeParam('true_false_ng'), ['TRUE/FALSE/NG']);
  assert.deepStrictEqual(resolveQtypeParam('map_diagram'), ['MAP', 'PLAN', 'DIAGRAM']);
});

test('yaroqsiz parametr filtrni yoqmaydi', () => {
  // Bo'sh massiv = "filtr yo'q", ya'ni to'liq ro'yxat. Buzuq havola
  // o'quvchini bo'sh ekranga tushirmasligi kerak.
  assert.deepStrictEqual(resolveQtypeParam('nonsense'), []);
  assert.deepStrictEqual(resolveQtypeParam(''), []);
  assert.deepStrictEqual(resolveQtypeParam(null), []);
  assert.deepStrictEqual(resolveQtypeParam('__proto__'), []);
});

test('har bir kanonik oila uchun filtr mos keladi', () => {
  // `questionTypes.js` ga yangi oila qo'shilsa va bu yerga unutilsa, tahlildagi
  // qator havolasiz qolib ketardi — buni faqat shu tekshiruv ushlaydi.
  const missing = QUESTION_FAMILIES.filter(
    (family) => family !== 'other' && !FAMILY_TO_DB_TYPES[family]
  );

  assert.deepStrictEqual(missing, [], `filtr mosligi yo'q oilalar: ${missing.join(', ')}`);
});

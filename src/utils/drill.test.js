// src/utils/drill.test.js
//
//   npm run test:utils
//
// Ikkita xavf. Birinchisi — mashqqa YARAMAYDIGAN xatoni kiritib qo'yish:
// passage'siz "TRUE yoki NOT GIVEN?" degan savol o'quvchini taxmin qilishga
// majburlaydi va u hech nima o'rganmaydi. Ikkinchisi — takrorlash jadvali
// noto'g'ri ishlab, so'z yo juda tez qaytishi, yo umuman qaytmasligi.

import test from 'node:test';
import assert from 'node:assert';

import {
  buildDrillItems,
  nextSchedule,
  checkDrillAnswer,
  INTERVALS_DAYS,
  DRILL_SIZE
} from './drill.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

const mistake = (over = {}) => ({
  key: Math.random().toString(),
  pattern: 'spelling',
  correctText: 'government',
  userText: 'goverment',
  family: 'completion',
  testTitle: 'Cambridge 18',
  date: new Date(NOW),
  ...over
});

test('faqat "yaqin marra" xatolari mashqqa kiradi', () => {
  const { items, skipped } = buildDrillItems([
    mistake({ pattern: 'spelling', correctText: 'government' }),
    mistake({ pattern: 'singular_plural', correctText: 'children' }),
    mistake({ pattern: 'word_form', correctText: 'analysis' }),
    mistake({ pattern: 'extra_words', correctText: 'museum' }),
    // Bular passage'siz mashq qilib bo'lmaydi:
    mistake({ pattern: 'ng_overclaim', correctText: 'NOT GIVEN' }),
    mistake({ pattern: 'wrong_option', correctText: 'vii' }),
    mistake({ pattern: 'off_target', correctText: 'bicycle' }),
    mistake({ pattern: 'no_answer', correctText: 'museum' })
  ], {}, NOW);

  assert.strictEqual(items.length, 4);
  assert.strictEqual(skipped, 4);
  assert.ok(!items.some((i) => i.target === 'NOT GIVEN'), 'NOT GIVEN mashqqa kirmasligi kerak');
});

test('tekshirib bo\'lmaydigan javoblar tashlanadi', () => {
  const { items } = buildDrillItems([
    // Muqobil javob — qaysi birini yozish kerakligi noaniq.
    mistake({ correctText: 'museum / gallery' }),
    // Juda uzun — bu imlo emas, ko'chirish mashqi bo'lardi.
    mistake({ correctText: 'a'.repeat(41) }),
    mistake({ correctText: '   ' })
  ], {}, NOW);

  assert.deepStrictEqual(items, []);
});

test('takrorlanuvchi xato bitta elementga birlashadi', () => {
  const { items } = buildDrillItems([
    mistake({ correctText: 'government', userText: 'goverment', date: new Date(NOW - DAY) }),
    mistake({ correctText: 'Government', userText: 'govermnet', date: new Date(NOW) }),
    mistake({ correctText: 'government', userText: 'govenment', date: new Date(NOW - 2 * DAY) })
  ], {}, NOW);

  assert.strictEqual(items.length, 1, 'bir seansda bitta so\'zni uch marta yozdirish mashq emas');
  assert.strictEqual(items[0].count, 3);
  assert.strictEqual(items[0].userText, 'govermnet', 'eng oxirgi xato varianti saqlanadi');
});

test('muddati kelmagan element mashqqa tushmaydi', () => {
  const items = [mistake({ correctText: 'government' }), mistake({ correctText: 'children' })];
  const progress = {
    government: { streak: 2, due: NOW + 5 * DAY }, // hali erta
    children: { streak: 1, due: NOW - DAY } // muddati o'tgan
  };

  const { due, total } = buildDrillItems(items, progress, NOW);

  assert.strictEqual(total, 2);
  assert.strictEqual(due.length, 1);
  assert.strictEqual(due[0].target, 'children');
});

test('hech qachon mashq qilinmagan element birinchi keladi', () => {
  const items = [
    mistake({ correctText: 'government' }),
    mistake({ correctText: 'children' }),
    mistake({ correctText: 'temperature' })
  ];
  const progress = {
    government: { streak: 3, due: NOW - DAY },
    children: { streak: 1, due: NOW - DAY }
    // temperature — yangi
  };

  const { due } = buildDrillItems(items, progress, NOW);

  assert.strictEqual(due[0].target, 'temperature');
  assert.strictEqual(due[1].target, 'children');
  assert.strictEqual(due[2].target, 'government');
});

test('takrorlash jadvali to\'g\'ri javobda uzayadi', () => {
  let state = { streak: 0, due: 0 };

  state = nextSchedule(state, true, NOW);
  assert.strictEqual(state.streak, 1);
  assert.strictEqual(state.due, NOW + INTERVALS_DAYS[0] * DAY);

  state = nextSchedule(state, true, NOW);
  assert.strictEqual(state.streak, 2);
  assert.strictEqual(state.due, NOW + INTERVALS_DAYS[1] * DAY);

  state = nextSchedule(state, true, NOW);
  assert.strictEqual(state.due, NOW + INTERVALS_DAYS[2] * DAY);

  state = nextSchedule(state, true, NOW);
  assert.strictEqual(state.due, NOW + INTERVALS_DAYS[3] * DAY);

  // Oxirgi pog'onadan yuqoriga chiqmaydi.
  state = nextSchedule(state, true, NOW);
  assert.strictEqual(state.streak, INTERVALS_DAYS.length);
  assert.strictEqual(state.due, NOW + INTERVALS_DAYS[3] * DAY);
});

test('xato javob jadvalni boshiga qaytaradi', () => {
  const state = nextSchedule({ streak: 3 }, false, NOW);
  assert.strictEqual(state.streak, 0);
  assert.strictEqual(state.due, NOW + INTERVALS_DAYS[0] * DAY, 'ertaga yana so\'raladi');
});

test('javob tekshiruvi ball hisobi bilan bir xil qat\'iylikda', () => {
  assert.strictEqual(checkDrillAnswer('government', 'government'), true);
  assert.strictEqual(checkDrillAnswer('  Government ', 'government'), true, 'katta harf muhim emas');
  assert.strictEqual(checkDrillAnswer('government.', 'government'), true, 'tinish belgisi muhim emas');
  assert.strictEqual(checkDrillAnswer('goverment', 'government'), false);
  assert.strictEqual(checkDrillAnswer('', 'government'), false);
  assert.strictEqual(checkDrillAnswer('   ', 'government'), false);
});

test('bo\'sh kirish xatolik bermaydi', () => {
  assert.deepStrictEqual(buildDrillItems([], {}, NOW).due, []);
  assert.deepStrictEqual(buildDrillItems(undefined, undefined, NOW).items, []);
  assert.strictEqual(buildDrillItems([mistake()], { __proto__: { streak: 9 } }, NOW).items[0].streak, 0);
});

test('seans hajmi mashq qilinadigan miqdorda', () => {
  // 10 ta — bir o'tirishda bajariladigan, lekin sezilarli hajm.
  assert.ok(DRILL_SIZE >= 5 && DRILL_SIZE <= 20);
});

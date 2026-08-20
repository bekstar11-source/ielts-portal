// src/utils/bandImpact.test.js
//
//   npm run test:utils
//
// Bu hisob to'g'ridan-to'g'ri o'quvchiga ko'rsatiladigan VA'DAGA aylanadi
// ("6.0 → 6.5"). Noto'g'ri son bu yerda xatolik bermaydi — u shunchaki yolg'on
// gapiradi va sahifaga bo'lgan ishonchni yo'qotadi. Shu sabab chegara holatlar
// alohida qotirilgan.

import test from 'node:test';
import assert from 'node:assert';

import { computeBandImpact, MIN_QUESTIONS_FOR_IMPACT } from './bandImpact.js';

test('yaqin marra xatolari bandni ko\'taradi', () => {
  // Reading: 80 tadan 50 tasi to'g'ri → 40 ga keltirilganda 25 → band 6.0.
  // 8 ta yaqin marra tuzatilsa 58/80 → 29 → band 6.5.
  const impact = computeBandImpact([
    { skill: 'reading', total: 80, correct: 50, nearMiss: 8, mistakes: 30 }
  ]);

  assert.strictEqual(impact.best.current, 6.0);
  assert.strictEqual(impact.best.potential, 6.5);
  assert.strictEqual(impact.best.gain, 0.5);
  assert.strictEqual(impact.totalNearMiss, 8);
});

test('band chegarasini kesib o\'tmasa yutuq ko\'rsatilmaydi', () => {
  // 1 ta yaqin marra 25 → 25 (yaxlitlashdan keyin) — band o'zgarmaydi.
  const impact = computeBandImpact([
    { skill: 'reading', total: 80, correct: 50, nearMiss: 1, mistakes: 30 }
  ]);

  assert.strictEqual(impact.rows.length, 1, 'qator hisoblanadi');
  assert.strictEqual(impact.rows[0].gain, 0);
  assert.strictEqual(impact.best, null, 'yutuqsiz qator "eng yaxshi" bo\'la olmaydi');
});

test('namuna kichik bo\'lsa umuman hisoblanmaydi', () => {
  const impact = computeBandImpact([
    { skill: 'reading', total: MIN_QUESTIONS_FOR_IMPACT - 1, correct: 10, nearMiss: 8, mistakes: 29 }
  ]);

  assert.deepStrictEqual(impact.rows, []);
  assert.strictEqual(impact.best, null);
});

test('eng katta yutuqli ko\'nikma birinchi keladi', () => {
  const impact = computeBandImpact([
    // Listening: 40 tadan 30 → 7.0; +2 = 32 → 7.5 (yutuq 0.5)
    { skill: 'listening', total: 40, correct: 30, nearMiss: 2, mistakes: 10 },
    // Reading: 40 tadan 23 → 6.0; +7 = 30 → 7.0 (yutuq 1.0)
    { skill: 'reading', total: 40, correct: 23, nearMiss: 7, mistakes: 17 }
  ]);

  assert.strictEqual(impact.best.skill, 'reading');
  assert.strictEqual(impact.best.gain, 1.0);
  assert.strictEqual(impact.rows[1].skill, 'listening');
  assert.strictEqual(impact.totalNearMiss, 9);
});

test('nearMiss xatolar sonidan oshsa qisiladi', () => {
  // Buzuq ma'lumot: 40 tadan 38 tasi to'g'ri, lekin 20 ta "yaqin marra" da'vosi.
  // Ko'pi bilan 2 ta bo'lishi mumkin — aks holda band 9.0 deb va'da qilinardi.
  const impact = computeBandImpact([
    { skill: 'reading', total: 40, correct: 38, nearMiss: 20, mistakes: 2 }
  ]);

  assert.strictEqual(impact.best.nearMiss, 2);
  assert.strictEqual(impact.best.potential, 9.0);
});

test('reading va listening jadvallari farqlanadi', () => {
  // 26 xom ball: reading → 6.0, listening → 6.5. Bir xil son, boshqa band.
  const reading = computeBandImpact([
    { skill: 'reading', total: 40, correct: 23, nearMiss: 3, mistakes: 17 }
  ]);
  const listening = computeBandImpact([
    { skill: 'listening', total: 40, correct: 23, nearMiss: 3, mistakes: 17 }
  ]);

  assert.strictEqual(reading.best, null, 'reading: 23→26 hamon 6.0');
  assert.strictEqual(listening.best.potential, 6.5);
});

test('reading/listening dan boshqa ko\'nikma tashlanadi', () => {
  const impact = computeBandImpact([
    { skill: 'writing', total: 80, correct: 50, nearMiss: 8, mistakes: 30 }
  ]);

  assert.deepStrictEqual(impact.rows, [], 'band jadvali faqat reading/listening uchun bor');
});

test('bo\'sh yoki noto\'g\'ri kirish xatolik bermaydi', () => {
  assert.deepStrictEqual(computeBandImpact(undefined).rows, []);
  assert.deepStrictEqual(computeBandImpact([]).rows, []);
  assert.deepStrictEqual(computeBandImpact([null, {}]).rows, []);
});

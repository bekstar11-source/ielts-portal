// src/utils/bandForecast.test.js
//
//   npm run test:utils
//
// Prognoz — sahifadagi eng oson yolg'on gapiradigan joy. Bajarilmagan va'da
// ("6 haftada 7.0 ga chiqasiz") butun tahlilga bo'lgan ishonchni yo'qotadi.
// Shu sabab bu yerdagi testlarning ko'pi prognoz QACHON BERILMASLIGI haqida.

import test from 'node:test';
import assert from 'node:assert';

import { forecastBand, MIN_WEEKS } from './bandForecast.js';

/** `count` ta hafta: aniqlik `from` dan boshlab har hafta `step` ga o'sadi. */
function weeks(count, from, step, total = 40) {
  return Array.from({ length: count }, (_, i) => ({
    key: `2026-W${String(i + 10).padStart(2, '0')}`,
    total,
    correct: Math.round((total * (from + step * i)) / 100)
  }));
}

test('ma\'lumot yetarli bo\'lmasa prognoz berilmaydi', () => {
  const result = forecastBand({ weeks: weeks(MIN_WEEKS - 1, 50, 2), skill: 'reading', target: 7 });

  assert.strictEqual(result.ready, false);
  assert.strictEqual(result.needed, MIN_WEEKS);
  assert.strictEqual(result.weeksOfData, MIN_WEEKS - 1);
});

test('bo\'sh haftalar hisobga olinmaydi', () => {
  // 8 ta yozuv, lekin ularning yarmida savol yo'q — ya'ni haqiqiy nuqta 4 ta.
  const sparse = weeks(8, 50, 2).map((w, i) => (i % 2 === 0 ? w : { ...w, total: 0, correct: 0 }));
  const result = forecastBand({ weeks: sparse, skill: 'reading', target: 7 });

  assert.strictEqual(result.ready, false);
  assert.strictEqual(result.weeksOfData, 4);
});

test('barqaror o\'sishda muddat aytiladi', () => {
  // 50% dan boshlab haftasiga 2% — 8 hafta.
  const result = forecastBand({ weeks: weeks(8, 50, 2), skill: 'reading', target: 7 });

  assert.strictEqual(result.ready, true);
  assert.ok(result.slope >= 1.5, `sur'at ${result.slope} — o'sish aniqlanishi kerak`);
  assert.ok(result.weeksToTarget > 0);
  assert.ok(result.weeksToTarget <= 52);
  assert.strictEqual(result.reached, false);
});

test('maqsadga yetilgan bo\'lsa muddat 0', () => {
  // 88% barqaror — Reading'da bu 8.5 atrofida.
  const result = forecastBand({ weeks: weeks(8, 88, 0.1), skill: 'reading', target: 6.5 });

  assert.strictEqual(result.reached, true);
  assert.strictEqual(result.weeksToTarget, 0);
});

test('o\'sish bo\'lmasa muddat aytilmaydi', () => {
  // Tekis natija: "hech qachon" degan javob foydasiz, uning o'rniga bo'shliq.
  const result = forecastBand({ weeks: weeks(10, 60, 0), skill: 'reading', target: 8 });

  assert.strictEqual(result.stalled, true);
  assert.strictEqual(result.weeksToTarget, null);
  assert.ok(result.gap > 0, 'bo\'shliq ko\'rsatilishi kerak');
});

test('pasayayotgan natijada ham muddat aytilmaydi', () => {
  const result = forecastBand({ weeks: weeks(10, 75, -1.5), skill: 'reading', target: 8 });

  assert.strictEqual(result.stalled, true);
  assert.strictEqual(result.weeksToTarget, null);
});

test('juda sekin o\'sishda muddat chegaralanadi', () => {
  // Haftasiga 0.5% — 9.0 ga yetish uchun yillar kerak. Bunday son ma'lumot emas.
  const result = forecastBand({ weeks: weeks(12, 55, 0.5), skill: 'reading', target: 9 });

  assert.strictEqual(result.weeksToTarget, null);
  assert.ok(result.tooFar || result.unreachable || result.stalled);
});

test('maqsad ko\'rsatilmasa faqat joriy holat qaytadi', () => {
  const result = forecastBand({ weeks: weeks(8, 60, 1), skill: 'reading', target: null });

  assert.strictEqual(result.ready, true);
  assert.ok(result.currentBand > 0);
  assert.strictEqual(result.target, null);
  assert.strictEqual(result.weeksToTarget, undefined, 'maqsadsiz muddat ham yo\'q');
});

test('Reading va Listening jadvallari farqlanadi', () => {
  const reading = forecastBand({ weeks: weeks(8, 65, 0.05), skill: 'reading', target: 7 });
  const listening = forecastBand({ weeks: weeks(8, 65, 0.05), skill: 'listening', target: 7 });

  // 65% ≈ 26 xom ball: Reading'da 6.0, Listening'da 6.5.
  assert.ok(listening.currentBand > reading.currentBand);
});

test('yaroqsiz kirish xatolik bermaydi', () => {
  assert.strictEqual(forecastBand({ weeks: [], skill: 'reading', target: 7 }).ready, false);
  assert.strictEqual(forecastBand({ weeks: undefined, skill: 'reading', target: 7 }).ready, false);
  // Band jadvali yo'q ko'nikma.
  assert.strictEqual(forecastBand({ weeks: weeks(8, 60, 1), skill: 'writing', target: 7 }), null);
});

// src/utils/weeklyTrend.test.js
//
//   npm run test:utils
//
// Grafik yolg'on gapirishi juda oson: uzilishni to'ldirib chizsa, dam olgan
// o'quvchi tinimsiz o'sayotgandek ko'rinadi; kam savolli haftani nuqta qilsa,
// tasodifiy 100% "yutuq" bo'lib qoladi. Shu ikkisi bu yerda qotirilgan.

import test from 'node:test';
import assert from 'node:assert';

import { buildWeeklyTrend, toSparklineSegments, MIN_WEEK_SAMPLE, TREND_WEEKS } from './weeklyTrend.js';
import { isoWeekKey, lastWeekKeys, weekKeyToMonday } from './isoWeek.js';

const NOW = new Date('2026-08-20T12:00:00Z'); // 2026-W34

/** Berilgan hafta kalitiga chelak yasaydi. */
const week = (key, total, correct, byType = {}) => ({ key, total, correct, byType });

test('ISO hafta kaliti va dushanba bir-biriga mos', () => {
  const keys = lastWeekKeys(TREND_WEEKS, NOW);
  assert.strictEqual(keys.length, TREND_WEEKS);
  assert.strictEqual(keys[keys.length - 1], '2026-W34', 'oxirgi hafta bugungisi');

  // Har bir kalit o'z dushanbasiga va qaytib o'ziga aylanishi kerak.
  keys.forEach((key) => {
    const monday = weekKeyToMonday(key);
    assert.ok(monday, `${key} uchun dushanba topilishi kerak`);
    assert.strictEqual(monday.getUTCDay(), 1, `${key} dushanbaga tushishi kerak`);
    assert.strictEqual(isoWeekKey(monday), key, `${key} aylanma o'girishda saqlanishi kerak`);
  });
});

test('yil chegarasidagi haftalar to\'g\'ri', () => {
  // 2025-12-29 (dushanba) ISO bo'yicha 2026-W01.
  assert.strictEqual(isoWeekKey(new Date('2025-12-29T00:00:00Z')), '2026-W01');
  assert.strictEqual(weekKeyToMonday('2026-W01').toISOString().slice(0, 10), '2025-12-29');
});

test('mashq qilinmagan hafta o\'qda qoladi, lekin nuqta bermaydi', () => {
  const trend = buildWeeklyTrend(
    [week('2026-W30', 40, 30), week('2026-W34', 40, 36)],
    { now: NOW }
  );

  assert.strictEqual(trend.overall.points.length, TREND_WEEKS, 'o\'q to\'liq 12 hafta');
  const filled = trend.overall.points.filter((p) => p.value !== null);
  assert.strictEqual(filled.length, 2, 'faqat ikkita haqiqiy nuqta');

  // Oradagi haftalar `null` — grafik ularni uzilish qilib chizadi.
  const w31 = trend.overall.points.find((p) => p.key === '2026-W31');
  assert.strictEqual(w31.value, null);
});

test('kam savolli hafta nuqta bermaydi', () => {
  const trend = buildWeeklyTrend(
    [
      week('2026-W32', MIN_WEEK_SAMPLE - 1, 0), // tebranish — hisobga olinmaydi
      week('2026-W33', 40, 20),
      week('2026-W34', 40, 32)
    ],
    { now: NOW }
  );

  const w32 = trend.overall.points.find((p) => p.key === '2026-W32');
  assert.strictEqual(w32.value, null, '5 tadan kam savol trend emas');
  assert.strictEqual(trend.overall.first, 50, 'birinchi haqiqiy nuqta W33 dan');
  assert.strictEqual(trend.overall.last, 80);
  assert.strictEqual(trend.overall.change, 30);
});

test('bitta nuqtali qator chizilmaydi', () => {
  const trend = buildWeeklyTrend([week('2026-W34', 40, 30)], { now: NOW });
  assert.strictEqual(trend.overall, null, 'bitta nuqta trend emas');
  assert.strictEqual(trend.hasData, false);
});

test('savol oilalari alohida qator sifatida chiqadi', () => {
  const trend = buildWeeklyTrend(
    [
      week('2026-W32', 40, 20, {
        headings: { total: 10, correct: 3 },
        completion: { total: 30, correct: 17 }
      }),
      week('2026-W34', 40, 32, {
        headings: { total: 10, correct: 7 },
        completion: { total: 30, correct: 25 }
      })
    ],
    { families: ['headings', 'completion'], now: NOW }
  );

  const headings = trend.families.find((f) => f.id === 'headings');
  assert.strictEqual(headings.first, 30);
  assert.strictEqual(headings.last, 70);
  assert.strictEqual(headings.change, 40);
  assert.strictEqual(headings.min, 30);
  assert.strictEqual(headings.max, 70);
  assert.strictEqual(trend.families.length, 2);
});

test('yetarli ma\'lumoti yo\'q oila tashlanadi', () => {
  const trend = buildWeeklyTrend(
    [
      week('2026-W32', 40, 20, { headings: { total: 2, correct: 1 } }),
      week('2026-W34', 40, 32, { headings: { total: 3, correct: 2 } })
    ],
    { families: ['headings'], now: NOW }
  );

  assert.deepStrictEqual(trend.families, [], 'ikkala hafta ham namuna chegarasidan past');
});

test('oynadan tashqaridagi eski haftalar kirmaydi', () => {
  const trend = buildWeeklyTrend(
    [week('2026-W10', 40, 40), week('2026-W33', 40, 20), week('2026-W34', 40, 32)],
    { now: NOW }
  );

  assert.ok(!trend.overall.points.some((p) => p.key === '2026-W10'));
  assert.strictEqual(trend.overall.first, 50, 'W10 dagi 100% hisobga olinmaydi');
});

test('bo\'sh kirish xatolik bermaydi', () => {
  assert.strictEqual(buildWeeklyTrend([], { now: NOW }).hasData, false);
  assert.strictEqual(buildWeeklyTrend(undefined, { now: NOW }).hasData, false);
});

test('sparkline uzilishlarni bo\'laklarga ajratadi', () => {
  // Ikki bo'lak: [0,1] va [3,4] — 2-indeks uzilish.
  const segments = toSparklineSegments([80, 70, null, 60, 90]);

  assert.strictEqual(segments.length, 2, 'uzilish ikkita bo\'lak beradi');
  assert.strictEqual(segments[0].length, 2);
  assert.strictEqual(segments[1].length, 2);

  // x — hafta indeksi 0–100 ga keltirilgan, y — teskarilangan foiz.
  assert.deepStrictEqual(segments[0][0], { x: 0, y: 20 }, '80% tepaga yaqin');
  assert.deepStrictEqual(segments[1][1], { x: 100, y: 10 }, '90% eng tepada');
});

test('yolg\'iz nuqta o\'z bo\'lagida qoladi', () => {
  const segments = toSparklineSegments([null, 50, null]);
  assert.strictEqual(segments.length, 1);
  assert.strictEqual(segments[0].length, 1, 'chiziq emas, nuqta');
});

test('to\'liq bo\'sh qator bo\'lak bermaydi', () => {
  assert.deepStrictEqual(toSparklineSegments([null, null]), []);
  assert.deepStrictEqual(toSparklineSegments([]), []);
  assert.deepStrictEqual(toSparklineSegments(undefined), []);
});

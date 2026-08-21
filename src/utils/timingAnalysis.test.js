// src/utils/timingAnalysis.test.js
//
//   npm run test:utils
//
// Bu tahlil o'quvchiga "sizda vaqt muammosi bor" deb aytadi. Noto'g'ri
// aniqlangan holat zararli: o'quvchi bor bo'lmagan muammoni tuzatishga hafta
// sarflaydi. Shuning uchun har bir signalning YOLG'ON ISHLAMASLIGI ham
// qotirilgan — normal sur'at, kam ma'lumot va tekis taqsimot.

import test from 'node:test';
import assert from 'node:assert';

import {
  analyzeAttemptTiming,
  summarizeTiming,
  MIN_ANSWERS_FOR_TIMING
} from './timingAnalysis.js';

const ORDER = Array.from({ length: 40 }, (_, i) => String(i + 1));

/** Bir tekis sur'atda javob berilgan urinish. */
function evenAttempt(gap = 45) {
  const times = {};
  ORDER.forEach((id, i) => {
    times[id] = (i + 1) * gap;
  });
  return times;
}

test('tekis sur\'at muammo deb belgilanmaydi', () => {
  const result = analyzeAttemptTiming({
    answerTimes: evenAttempt(45),
    questionOrder: ORDER,
    timeSpent: 1800
  });

  assert.strictEqual(result.rushed, false);
  assert.strictEqual(result.ranOut, false);
  assert.strictEqual(result.answered, 40);
  assert.strictEqual(result.blanks, 0);
  // Choraklar taxminan teng bo'lishi kerak.
  result.quarters.forEach((n) => assert.ok(n >= 9 && n <= 11, `chorak ${n} tekis emas`));
});

test('oxirgi javoblardagi keskin tezlashish aniqlanadi', () => {
  const times = {};
  ORDER.slice(0, 30).forEach((id, i) => {
    times[id] = (i + 1) * 50;
  });
  // Oxirgi 10 tasi 10 soniyadan — aniq shoshilish.
  ORDER.slice(30).forEach((id, i) => {
    times[id] = 1500 + (i + 1) * 10;
  });

  const result = analyzeAttemptTiming({ answerTimes: times, questionOrder: ORDER, timeSpent: 1620 });

  assert.strictEqual(result.rushed, true);
  assert.ok(result.medianEarly > result.medianLate);
});

test('javobsizlar test oxirida to\'plansa "vaqt yetmadi"', () => {
  const times = {};
  ORDER.slice(0, 32).forEach((id, i) => {
    times[id] = (i + 1) * 50;
  });
  // Oxirgi 8 savol umuman javobsiz.

  const result = analyzeAttemptTiming({ answerTimes: times, questionOrder: ORDER, timeSpent: 1700 });

  assert.strictEqual(result.blanks, 8);
  assert.strictEqual(result.blanksAtEnd, 8);
  assert.strictEqual(result.ranOut, true);
});

test('tarqoq javobsizlar "vaqt yetmadi" emas', () => {
  // Bilmaganini tashlab ketgan o'quvchi — bu bilim muammosi, vaqt emas.
  const times = {};
  ORDER.forEach((id, i) => {
    if (i % 5 !== 0) times[id] = (i + 1) * 40;
  });

  const result = analyzeAttemptTiming({ answerTimes: times, questionOrder: ORDER, timeSpent: 1700 });

  assert.strictEqual(result.blanks, 8);
  assert.strictEqual(result.ranOut, false, 'tarqoq javobsizlar vaqt muammosi emas');
});

test('kam javobli urinish umuman tahlil qilinmaydi', () => {
  const times = {};
  ORDER.slice(0, MIN_ANSWERS_FOR_TIMING - 1).forEach((id, i) => {
    times[id] = (i + 1) * 30;
  });

  assert.strictEqual(
    analyzeAttemptTiming({ answerTimes: times, questionOrder: ORDER, timeSpent: 600 }),
    null
  );
});

test('vaqtsiz yoki bo\'sh urinish xatolik bermaydi', () => {
  assert.strictEqual(
    analyzeAttemptTiming({ answerTimes: evenAttempt(), questionOrder: ORDER, timeSpent: 0 }),
    null
  );
  assert.strictEqual(analyzeAttemptTiming({ answerTimes: {}, questionOrder: ORDER, timeSpent: 1800 }), null);
  assert.strictEqual(analyzeAttemptTiming({ answerTimes: null, questionOrder: null, timeSpent: 1800 }), null);
});

test('davomiylikdan oshgan vaqt oxirgi chorakka tushadi', () => {
  // Taymer va javob vaqti bir soniyaga farq qilsa ham, 5-chorak paydo bo'lmasligi kerak.
  const times = { ...evenAttempt(45) };
  times['40'] = 5000; // davomiylikdan ancha katta

  const result = analyzeAttemptTiming({ answerTimes: times, questionOrder: ORDER, timeSpent: 1800 });
  assert.strictEqual(result.quarters.length, 4);
  assert.strictEqual(result.quarters.reduce((a, b) => a + b, 0), 40);
});

test('jamlanma odatni faqat takrorda belgilaydi', () => {
  // Bitta shoshilgan test — kayfiyat. Ikkitadan bittasi — hali odat emas.
  const once = summarizeTiming({ tests: 2, rushed: 1, ranOut: 0, quarters: [10, 10, 10, 10] });
  assert.strictEqual(once.hasRushHabit, true, 'ikkitadan bittasi chegarada — belgilanadi');

  const rare = summarizeTiming({ tests: 5, rushed: 1, ranOut: 0, quarters: [10, 10, 10, 10] });
  assert.strictEqual(rare.hasRushHabit, false, 'beshtadan bittasi odat emas');

  const habit = summarizeTiming({ tests: 4, rushed: 3, ranOut: 0, quarters: [10, 10, 10, 10] });
  assert.strictEqual(habit.hasRushHabit, true);
});

test('bitta testdan odat xulosasi chiqmaydi', () => {
  const single = summarizeTiming({ tests: 1, rushed: 1, ranOut: 1, quarters: [5, 5, 5, 25] });
  assert.strictEqual(single.hasRushHabit, false);
  assert.strictEqual(single.hasRanOutHabit, false);
  // Taqsimot esa baribir ko'rsatiladi — u xulosa emas, faktning o'zi.
  assert.deepStrictEqual(single.shares, [13, 13, 13, 63]);
});

test('vaqt ma\'lumoti bo\'lmasa bo\'lim ko\'rsatilmaydi', () => {
  assert.strictEqual(summarizeTiming(null), null);
  assert.strictEqual(summarizeTiming({ tests: 0 }), null);
  assert.strictEqual(summarizeTiming(undefined), null);
});

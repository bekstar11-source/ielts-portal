import test from 'node:test';
import assert from 'node:assert';

import {
    scorePlacement,
    tallyByLevel,
    orderQuestionsByLevel,
    PASS_RATIO,
    MIN_QUESTIONS_PER_LEVEL,
} from './placementScoring.js';

/** `n` ta javob yasaydi, shundan `correct` tasi to'g'ri. */
const ans = (level, correct, total) =>
    Array.from({ length: total }, (_, i) => ({ level, correct: i < correct }));

test('tallyByLevel daraja bo\'yicha to\'g\'ri sanaydi', () => {
    const t = tallyByLevel([...ans('A2', 3, 4), ...ans('B1', 1, 2)]);
    assert.deepStrictEqual(t.A2, { correct: 3, total: 4, ratio: 0.75 });
    assert.deepStrictEqual(t.B1, { correct: 1, total: 2, ratio: 0.5 });
});

test('tallyByLevel noma\'lum darajani tashlab ketadi', () => {
    const t = tallyByLevel([{ level: 'Z9', correct: true }, { level: null, correct: true }]);
    assert.deepStrictEqual(t, {});
});

test('javob bo\'lmasa daraja NULL — buzilgan test xulosaga aylanmasin', () => {
    const r = scorePlacement([]);
    assert.strictEqual(r.level, null);
    assert.strictEqual(r.totalQuestions, 0);
    assert.strictEqual(r.nextLevel, null);
});

test('pillapoya: A1 va A2 o\'tilgan, B1 yiqilgan → daraja A2', () => {
    const r = scorePlacement([
        ...ans('A1', 4, 4),
        ...ans('A2', 3, 4),
        ...ans('B1', 1, 4),
        ...ans('B2', 0, 4),
    ]);
    assert.strictEqual(r.level, 'A2');
    assert.deepStrictEqual(r.passed, ['A1', 'A2']);
    assert.strictEqual(r.nextLevel, 'B1');
});

test('yuqori darajani tasodifan bilgan odam SAKRAB ketmaydi', () => {
    // Bu ballash mantig'ining asosiy maqsadi: A2 ni bilmagan odam, C1
    // savollarini tasodifan topgan bo'lsa ham, C1 deb baholanmaydi.
    const r = scorePlacement([
        ...ans('A1', 4, 4),
        ...ans('A2', 1, 4),   // yiqildi
        ...ans('B1', 4, 4),
        ...ans('C1', 4, 4),
    ]);
    assert.strictEqual(r.level, 'A1');
    assert.strictEqual(r.nextLevel, 'A2');
});

test('hamma daraja o\'tilsa keyingi daraja bir pog\'ona yuqori bo\'ladi', () => {
    const r = scorePlacement([
        ...ans('A1', 4, 4), ...ans('A2', 4, 4), ...ans('B1', 4, 4),
        ...ans('B2', 4, 4), ...ans('C1', 4, 4),
    ]);
    assert.strictEqual(r.level, 'C1');
    assert.strictEqual(r.nextLevel, 'C2');
});

test('eng past darajadan ham o\'tolmagan odam A1 oladi, null emas', () => {
    // U testni ISHLADI — unga aniq javob berishimiz kerak.
    const r = scorePlacement(ans('A1', 0, 5));
    assert.strictEqual(r.level, 'A1');
    assert.strictEqual(r.nextLevel, 'A1');
});

test('bankda yo\'q daraja pillapoyani UZMAYDI', () => {
    // A1 savoli umuman bo'lmasa ham, A2→B1 zanjiri ishlashi kerak.
    const r = scorePlacement([...ans('A2', 4, 4), ...ans('B1', 4, 4), ...ans('B2', 0, 4)]);
    assert.strictEqual(r.level, 'B1');
    assert.strictEqual(r.nextLevel, 'B2');
});

test('savoli kam daraja hisobga olinmaydi — 1/1 bu 100% emas, bu tasodif', () => {
    const r = scorePlacement([
        ...ans('A1', 4, 4),
        ...ans('A2', 1, 1),   // MIN dan kam → o'tkazib yuboriladi
        ...ans('B1', 4, 4),
    ]);
    assert.strictEqual(r.level, 'B1');
    assert.ok(!r.passed.includes('A2'));
    assert.ok(MIN_QUESTIONS_PER_LEVEL > 1);
});

test('chegara aniq PASS_RATIO da o\'tadi', () => {
    // 3/5 = 0.6 — aynan chegara. `>=` bo'lgani uchun o'tishi kerak.
    assert.strictEqual(PASS_RATIO, 0.6);
    assert.strictEqual(scorePlacement(ans('A1', 3, 5)).level, 'A1');
    assert.strictEqual(scorePlacement(ans('A1', 2, 5)).level, 'A1'); // yiqildi → eng past
    assert.deepStrictEqual(scorePlacement(ans('A1', 2, 5)).passed, []);
});

test('umumiy hisob qaytariladi', () => {
    const r = scorePlacement([...ans('A1', 3, 4), ...ans('A2', 2, 4)]);
    assert.strictEqual(r.totalCorrect, 5);
    assert.strictEqual(r.totalQuestions, 8);
});

test('orderQuestionsByLevel oson→qiyin tartiblaydi', () => {
    const q = [{ level: 'C1' }, { level: 'A1' }, { level: 'B1' }, { level: 'A2' }];
    assert.deepStrictEqual(
        orderQuestionsByLevel(q).map((x) => x.level),
        ['A1', 'A2', 'B1', 'C1']
    );
});

test('orderQuestionsByLevel asl massivni o\'zgartirmaydi', () => {
    const q = [{ level: 'C1' }, { level: 'A1' }];
    orderQuestionsByLevel(q);
    assert.strictEqual(q[0].level, 'C1');
});

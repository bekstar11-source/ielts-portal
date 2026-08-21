// functions/backfillTableCompletionScores.test.js
//
//   npm run test:functions
//
// `backfill_table_completion_scores.cjs` uchun testlar. Skript ildizda turadi,
// test esa shu yerda — test yuguruvchi faqat `functions/*.test.js` ni ko'radi.
//
// Migratsiya bir marta ishlaydi va o'quvchilarning saqlangan ballarini
// o'zgartiradi: xato bo'lsa uni "qaytarib olish" imkoni yo'q. Shuning uchun
// tekshiruv darvozasi (test tahrirlangan bo'lsa TEGMASLIK) va xom javoblarning
// o'zgarmasligi shu yerda qat'iy sinaladi.

const test = require('node:test');
const assert = require('node:assert');

const { recomputeGradedResult, latestAttemptIndex, encNumber } = require('../backfill_table_completion_scores.cjs');

// Massiv ko'rinishidagi qatorli jadval — aynan shu shakl eski dvigatelda
// butunlay ko'rinmay qolardi.
const tableTest = {
    id: 't1',
    type: 'listening',
    passages: [{ id: 'p1' }, { id: 'p2' }],
    questions: [
        {
            passageId: 'p1',
            type: 'note_completion',
            items: [{ id: '1', answer: 'book' }, { id: '2', answer: 'red' }]
        },
        {
            passageId: 'p2',
            type: 'table_completion',
            rows: [
                [{ text: 'Item' }, { id: '3', answer: 'pen' }],
                [{ text: 'Cost' }, { id: '4', answer: '50' }]
            ]
        }
    ]
};

/** Firestore xom hujjatini yasaydi (faqat kerakli maydonlar). */
const rawResult = ({ score, answers, totalQuestions, band = 9 }) => ({
    userId: { stringValue: 'u1' },
    testId: { stringValue: 't1' },
    type: { stringValue: 'listening' },
    totalQuestions: { integerValue: String(totalQuestions) },
    score: { integerValue: String(score) },
    bandScore: { doubleValue: band },
    attempts: {
        arrayValue: {
            values: [{
                mapValue: {
                    fields: {
                        attemptId: { stringValue: 'a1' },
                        date: { stringValue: '2026-01-01T00:00:00.000Z' },
                        score: { integerValue: String(score) },
                        bandScore: { doubleValue: band },
                        userAnswers: {
                            mapValue: {
                                fields: Object.fromEntries(
                                    Object.entries(answers).map(([k, v]) => [k, { stringValue: v }])
                                )
                            }
                        }
                    }
                }
            }]
        }
    }
});

const decoded = (raw) => ({
    userId: 'u1',
    testId: 't1',
    type: 'listening',
    totalQuestions: Number(raw.totalQuestions.integerValue),
    score: Number(raw.score.integerValue),
    bandScore: raw.bandScore.doubleValue,
    attempts: raw.attempts.arrayValue.values.map((a) => ({
        attemptId: 'a1',
        date: '2026-01-01T00:00:00.000Z',
        score: Number(a.mapValue.fields.score.integerValue),
        bandScore: a.mapValue.fields.bandScore.doubleValue,
        userAnswers: Object.fromEntries(
            Object.entries(a.mapValue.fields.userAnswers.mapValue.fields).map(([k, v]) => [k, v.stringValue])
        )
    }))
});

test('jadval savollari qo\'shilib, ball va savollar soni tuzatiladi', () => {
    // Eski dvigatel jadvalni ko'rmagan: 2 ta savol, 2 tasi to'g'ri.
    const answers = { 1: 'book', 2: 'red', 3: 'pen', 4: '50' };
    const raw = rawResult({ score: 2, totalQuestions: 2, answers });

    const out = recomputeGradedResult(decoded(raw), raw, tableTest);

    assert.equal(out.status, 'changed');
    assert.deepEqual(out.changes.totalQuestions, [2, 4]);
    assert.deepEqual(out.changes.score, [2, 4]);
});

test('test tahrirlangan bo\'lsa hujjatga TEGILMAYDI', () => {
    // Saqlangan ball eski dvigatel natijasiga ham mos kelmaydi → sabab boshqa.
    const answers = { 1: 'book', 2: 'red', 3: 'pen', 4: '50' };
    const raw = rawResult({ score: 7, totalQuestions: 2, answers });

    const out = recomputeGradedResult(decoded(raw), raw, tableTest);

    assert.equal(out.status, 'unverified');
    assert.match(out.reason, /eski dvigatel/);
});

test('jadvali yo\'q testda hech narsa o\'zgarmaydi', () => {
    const plainTest = {
        id: 't1',
        type: 'listening',
        passages: [{ id: 'p1' }],
        questions: [{ passageId: 'p1', type: 'note_completion', items: [{ id: '1', answer: 'book' }] }]
    };
    const raw = rawResult({ score: 1, totalQuestions: 1, answers: { 1: 'book' } });

    assert.equal(recomputeGradedResult(decoded(raw), raw, plainTest).status, 'unchanged');
});

test('talabaning javoblari qayta kodlanmaydi — xom qiymat aynan saqlanadi', () => {
    const answers = { 1: 'book', 2: 'red', 3: 'pen', 4: '50' };
    const raw = rawResult({ score: 2, totalQuestions: 2, answers });
    const originalAnswers = raw.attempts.arrayValue.values[0].mapValue.fields.userAnswers;

    const out = recomputeGradedResult(decoded(raw), raw, tableTest);
    const patchedAnswers = out.patch.attempts.arrayValue.values[0].mapValue.fields.userAnswers;

    // Aynan O'SHA obyekt bo'lishi shart, nusxa emas: migratsiya javoblarga tegmaydi.
    assert.strictEqual(patchedAnswers, originalAnswers);
});

test('javoblari saqlanmagan eski urinish qayta hisoblanmaydi', () => {
    const raw = rawResult({ score: 2, totalQuestions: 2, answers: { 1: 'book' } });
    const data = decoded(raw);
    // Eski sxema: urinishda javoblar saqlanmagan → qayta hisoblab bo'lmaydi.
    delete raw.attempts.arrayValue.values[0].mapValue.fields.userAnswers;
    delete data.attempts[0].userAnswers;

    const out = recomputeGradedResult(data, raw, tableTest);
    assert.equal(out.status, 'skipped');
});

test('eng so\'nggi urinish sana bo\'yicha tanlanadi, massiv tartibi bo\'yicha emas', () => {
    const attempts = [
        { date: '2026-03-01T00:00:00.000Z' },
        { date: '2026-01-01T00:00:00.000Z' }
    ];
    assert.equal(latestAttemptIndex(attempts), 0);
});

test('son turi saqlanadi: double bo\'lgan band double bo\'lib qoladi', () => {
    assert.deepEqual(encNumber(7, { doubleValue: 6.5 }), { doubleValue: 7 });
    assert.deepEqual(encNumber(7, { integerValue: '6' }), { integerValue: '7' });
    assert.deepEqual(encNumber(6.5, { integerValue: '6' }), { doubleValue: 6.5 });
});

// ── Mock imtihon (`type: "mock_full"`) ───────────────────────────────────────

const { recomputeMockResult } = require('../backfill_table_completion_scores.cjs');

const readingTest = {
    id: 'r1',
    type: 'reading',
    passages: [{ id: 'rp1' }],
    questions: [{ passageId: 'rp1', type: 'mcq', questions: [{ id: '1', answer: 'A', options: ['A. x', 'B. y'] }] }]
};

const mockRaw = (listeningScore, readingScore, overall) => ({
    type: { stringValue: 'mock_full' },
    userId: { stringValue: 'u1' },
    subTests: { mapValue: { fields: { listening: { stringValue: 't1' }, reading: { stringValue: 'r1' } } } },
    scores: {
        mapValue: {
            fields: {
                listening: { integerValue: String(listeningScore) },
                reading: { integerValue: String(readingScore) },
                overallBand: { doubleValue: overall }
            }
        }
    },
    bandScore: { doubleValue: overall },
    overallBand: { doubleValue: overall },
    details: {
        mapValue: {
            fields: {
                listeningAnswers: { mapValue: { fields: {} } },
                readingAnswers: { mapValue: { fields: {} } }
            }
        }
    }
});

const mockData = (listeningScore, readingScore, overall, answers) => ({
    type: 'mock_full',
    userId: 'u1',
    subTests: { listening: 't1', reading: 'r1' },
    scores: { listening: listeningScore, reading: readingScore, overallBand: overall },
    details: { listeningAnswers: answers, readingAnswers: { 1: 'A' } }
});

const loader = (id) => Promise.resolve(id === 't1' ? tableTest : readingTest);

test('mock natijasida jadval savollari qo\'shiladi va overall band qayta hisoblanadi', async () => {
    const answers = { 1: 'book', 2: 'red', 3: 'pen', 4: '50' };
    // Eski dvigatel: listeningda faqat 2 ta savol ko'ringan, ikkalasi to'g'ri.
    const out = await recomputeMockResult(mockData(2, 1, 9, answers), mockRaw(2, 1, 9), loader);

    assert.equal(out.status, 'changed');
    assert.deepEqual(out.changes.listening, [2, 4]);
    // Reading o'zgarmaydi — unda jadval yo'q.
    assert.deepEqual(out.changes.reading, [1, 1]);
});

test('mock: saqlangan ball eski dvigatelnikiga mos kelmasa tegilmaydi', async () => {
    const answers = { 1: 'book', 2: 'red', 3: 'pen', 4: '50' };
    const out = await recomputeMockResult(mockData(9, 1, 9, answers), mockRaw(9, 1, 9), loader);
    assert.equal(out.status, 'unverified');
});

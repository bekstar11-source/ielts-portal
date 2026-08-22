import test from 'node:test';
import assert from 'node:assert';

import { buildMultilevelQuestions, validateMultilevelTest } from './multilevelTest.js';
import { mlAnswerSeconds } from './multilevelSpeaking.js';

const fullTest = () => ({
    part1: {
        personal: ['What is your favorite food?', 'Describe your home town.', "What's your favorite weather?"],
        photoPaths: ['multilevel/a.jpg', 'multilevel/b.jpg'],
        photoQuestions: [
            'What do you see in these pictures?',
            'Why people like to travel by plane?',
            'Which transport do you prefer?',
        ],
    },
    part2: {
        photoPath: 'multilevel/decision.jpg',
        bullets: ['Describe a hard decision you made.', 'Tell about the factors.', 'Why is it hard?'],
    },
    part3: {
        topic: 'Advantages and disadvantages of video games on children.',
        pros: ['Think faster', 'Teamwork', 'Eye focus'],
        cons: ['Ignore school', 'Violence', 'Long hours'],
    },
});

test('to\'liq testdan 8 ta savol chiqadi', () => {
    const qs = buildMultilevelQuestions(fullTest());
    assert.strictEqual(qs.length, 8);
    assert.deepStrictEqual(
        qs.map((q) => q.part),
        [1, 1, 1, 1, 1, 1, 2, 3]
    );
});

test('rasm savollari indeksi shaxsiylardan keyin davom etadi', () => {
    const qs = buildMultilevelQuestions(fullTest());
    const photo = qs.filter((q) => q.kind === 'photo');
    assert.deepStrictEqual(photo.map((q) => q.index), [3, 4, 5]);
    // Birinchi rasm savoliga 45 s, qolganiga 30 s.
    assert.strictEqual(mlAnswerSeconds(1, photo[0].index), 45);
    assert.strictEqual(mlAnswerSeconds(1, photo[1].index), 30);
});

test('kontekst savolga yopishadi', () => {
    const qs = buildMultilevelQuestions(fullTest());
    assert.deepStrictEqual(qs[3].photoPaths, ['multilevel/a.jpg', 'multilevel/b.jpg']);
    assert.strictEqual(qs[0].photoPaths, undefined);
    assert.strictEqual(qs[6].bullets.length, 3);
    assert.strictEqual(qs[7].prosCons.pros.length, 3);
});

test('bo\'sh satrlar tashlab yuboriladi', () => {
    const doc = fullTest();
    doc.part1.personal = ['Bitta savol', '   ', ''];
    const qs = buildMultilevelQuestions(doc);
    assert.strictEqual(qs.filter((q) => q.kind === 'personal').length, 1);
    // Indeks siljiydi: endi rasm savollari 1 dan boshlanadi.
    assert.strictEqual(qs.find((q) => q.kind === 'photo').index, 1);
});

test('to\'ldirilmagan qism savol bermaydi', () => {
    assert.strictEqual(buildMultilevelQuestions({}).length, 0);
    assert.strictEqual(buildMultilevelQuestions(null).length, 0);
    // Faqat bir tomonli jadval 3-qismni bermaydi.
    const doc = fullTest();
    doc.part3.cons = [];
    assert.strictEqual(buildMultilevelQuestions(doc).some((q) => q.part === 3), false);
});

test('to\'liq test tekshiruvdan o\'tadi', () => {
    assert.deepStrictEqual(validateMultilevelTest(fullTest()), []);
});

test('tekshiruv yetishmagan joyni aytadi', () => {
    const doc = fullTest();
    doc.part1.personal = ['bitta'];
    doc.part2.photoPath = '';
    doc.part3.pros = ['faqat', 'ikkita'];
    const problems = validateMultilevelTest(doc);
    assert.strictEqual(problems.length, 3);
    assert.ok(problems.some((p) => p.includes('shaxsiy savol')));
    assert.ok(problems.some((p) => p.includes('rasm yuklanmagan')));
    assert.ok(problems.some((p) => p.includes('Pros')));
});

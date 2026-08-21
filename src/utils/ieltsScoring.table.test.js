// src/utils/ieltsScoring.table.test.js
//
//   npm run test:utils
//
// Table completion savollari jadval katakchalarida yashiringan. Ular ball
// hisobidan tushib qolsa hech qanday xatolik chiqmaydi — talaba shunchaki
// 40 o'rniga 34 ta savollik testni ko'radi va bandi sun'iy o'zgaradi.
// Shu sabab jadvalning bazada uchraydigan HAR BIR yozilish ko'rinishi
// shu yerda tekshiriladi.

import test from 'node:test';
import assert from 'node:assert';

import { evaluateTest } from './ieltsScoring.js';
import { extractTableQuestions } from './tableQuestions.js';

const listeningWith = (group) => ({
    type: 'listening',
    passages: [{ id: 'p1' }],
    questions: [{ passageId: 'p1', ...group }]
});

test('massiv ko\'rinishidagi qatorlar ham sanaladi (rows: [[cell, cell]])', () => {
    const group = {
        type: 'table_completion',
        rows: [
            [{ text: 'Item' }, { id: '1', answer: 'book' }],
            [{ text: 'Cost' }, { id: '2', answer: '50' }]
        ]
    };
    const { totalQ, correctCount } = evaluateTest(listeningWith(group), { '1': 'book', '2': '50' });
    assert.equal(totalQ, 2);
    assert.equal(correctCount, 2);
});

test('obyekt ko\'rinishidagi qatorlar bilan bir xil natija beradi', () => {
    const asArrays = { type: 'table_completion', rows: [[{ id: '1', answer: 'book' }]] };
    const asObjects = { type: 'table_completion', rows: [{ cells: [{ id: '1', answer: 'book' }] }] };

    const a = evaluateTest(listeningWith(asArrays), { '1': 'book' });
    const b = evaluateTest(listeningWith(asObjects), { '1': 'book' });
    assert.deepEqual([a.totalQ, a.correctCount], [b.totalQ, b.correctCount]);
});

test('matn+input aralash katakcha `isMixed` bayrog\'isiz ham savol deb sanaladi', () => {
    const group = {
        type: 'table_completion',
        rows: [{ cells: [{ parts: [{ type: 'text', content: 'Cost: ' }, { type: 'input', id: '3', answer: '50' }] }] }]
    };
    const { totalQ } = evaluateTest(listeningWith(group), {});
    assert.equal(totalQ, 1);
});

test('jadval savollari "completion" oilasiga tushadi, "other" ga emas', () => {
    const group = {
        type: 'table_completion',
        rows: [{ cells: [{ isMixed: true, parts: [{ type: 'input', id: '4', answer: '50' }] }] }]
    };
    const { typeStats, mistakes } = evaluateTest(listeningWith(group), { '4': 'xato' });
    assert.deepEqual(typeStats, { completion: { total: 1, correct: 0 } });
    assert.equal(mistakes[0].questionType, 'completion');
});

test('ichki guruhdagi jadval ham hisobga olinadi', () => {
    const group = { type: 'table_completion', groups: [{ rows: [[{ id: '5', answer: 'x' }]] }] };
    assert.equal(evaluateTest(listeningWith(group), {}).totalQ, 1);
});

test('bitta katakchadagi bir nechta savol (isMultiQuestion) alohida sanaladi', () => {
    const group = {
        type: 'table_completion',
        rows: [{ cells: [{ isMultiQuestion: true, content: [{ id: '6', answer: 'a' }, { id: '7', answer: 'b' }] }] }]
    };
    assert.equal(evaluateTest(listeningWith(group), {}).totalQ, 2);
});

test('extractTableQuestions har ikkala qator ko\'rinishini bir xil ochadi', () => {
    const rows = [
        [{ text: 'sarlavha' }, { id: '1', answer: 'a' }],
        { cells: [{ parts: [{ type: 'input', id: '2', answer: 'b' }] }] },
        { cells: [{ isMultiQuestion: true, content: [{ id: '3' }, { id: '4' }] }] }
    ];
    assert.deepEqual(extractTableQuestions(rows).map(q => String(q.id)), ['1', '2', '3', '4']);
});

test('matnli (savol bo\'lmagan) katakchalar sanoqqa kirmaydi', () => {
    const rows = [[{ text: 'Name' }, { text: 'Price' }]];
    assert.deepEqual(extractTableQuestions(rows), []);
});

test('javob kaliti `items` da, joylashuv `rows` da bo\'lsa savol IKKI marta sanalmaydi', () => {
    // Bu tuzilma bazada bor: katakcha faqat id ga havola qiladi, kalit esa items da.
    const group = {
        type: 'table_completion',
        items: [{ id: '8', answer: 'library' }],
        rows: [[{ text: 'Joy' }, { parts: [{ type: 'input', id: '8' }] }]]
    };
    const { totalQ, correctCount, missingKeys } = evaluateTest(listeningWith(group), { '8': 'library' });
    assert.equal(totalQ, 1);
    assert.equal(correctCount, 1);
    assert.deepEqual(missingKeys, []);
});

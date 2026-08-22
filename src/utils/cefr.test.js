import test from 'node:test';
import assert from 'node:assert';

import { CEFR_ORDER, normalizeCefr, cefrIndex, clampCefr, isHigherCefr } from './cefr.js';

test('normalizeCefr kanonik kodga keltiradi', () => {
    assert.strictEqual(normalizeCefr('b2'), 'B2');
    assert.strictEqual(normalizeCefr('  C1 '), 'C1');
    assert.strictEqual(normalizeCefr('Z9'), null);
    assert.strictEqual(normalizeCefr(null), null);
    assert.strictEqual(normalizeCefr(undefined), null);
});

test('cefrIndex tartibni beradi', () => {
    assert.strictEqual(cefrIndex('A1'), 0);
    assert.strictEqual(cefrIndex('C2'), CEFR_ORDER.length - 1);
    assert.strictEqual(cefrIndex('yo\'q'), -1);
});

test('isHigherCefr taqqoslaydi', () => {
    assert.strictEqual(isHigherCefr('B2', 'B1'), true);
    assert.strictEqual(isHigherCefr('B1', 'B2'), false);
    assert.strictEqual(isHigherCefr('B1', 'B1'), false);
    assert.strictEqual(isHigherCefr('XX', 'B1'), false);
});

test('clampCefr mavjud darajalar ichiga keltiradi', () => {
    const available = ['B1', 'B2', 'C1'];
    // A2 o'quvchisiga maqola yo'q — eng pastini beramiz.
    assert.strictEqual(clampCefr('A2', available), 'B1');
    assert.strictEqual(clampCefr('A1', available), 'B1');
    // C2 uchun eng yuqorisi.
    assert.strictEqual(clampCefr('C2', available), 'C1');
    // Aniq mos kelganlar o'zgarmaydi.
    assert.strictEqual(clampCefr('B2', available), 'B2');
    assert.strictEqual(clampCefr('c1', available), 'C1');
});

test('clampCefr chekka holatlarda yiqilmaydi', () => {
    assert.strictEqual(clampCefr('B1', []), null);
    assert.strictEqual(clampCefr('B1', undefined), null);
    assert.strictEqual(clampCefr(null, ['B1']), null);
    assert.strictEqual(clampCefr('XX', ['B1']), null);
});

test('clampCefr oradagi darajani PASTGA yaxlitlaydi', () => {
    // Faqat A2 va C1 mavjud bo'lsa, B2 o'quvchisi A2 ni oladi: ko'tarolmaydigan
    // matndan ko'ra yengilrog'i xavfsiz.
    assert.strictEqual(clampCefr('B2', ['A2', 'C1']), 'A2');
});

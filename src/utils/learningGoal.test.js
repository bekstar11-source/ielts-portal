import test from 'node:test';
import assert from 'node:assert';

import {
    GOALS,
    getGoal,
    showsIeltsContent,
    asksIeltsTarget,
    toCefrLevel,
} from './learningGoal.js';

test("maydoni yo'q eski foydalanuvchi IELTS deb qaraladi", () => {
    // Bu eng muhim test: mavjud hisoblarda `goal` yo'q va ular uchun hech
    // narsa o'zgarmasligi kerak. Aks holda butun baza uchun migratsiya
    // kerak bo'lardi.
    assert.strictEqual(getGoal(undefined), GOALS.IELTS);
    assert.strictEqual(getGoal({}), GOALS.IELTS);
    assert.strictEqual(getGoal({ goal: null }), GOALS.IELTS);
});

test("noma'lum qiymat ham IELTS ga tushadi", () => {
    assert.strictEqual(getGoal({ goal: 'kids' }), GOALS.IELTS);
    assert.strictEqual(getGoal({ goal: '' }), GOALS.IELTS);
});

test('haqiqiy maqsadlar o\'zgarmaydi', () => {
    assert.strictEqual(getGoal({ goal: 'general' }), GOALS.GENERAL);
    assert.strictEqual(getGoal({ goal: 'unsure' }), GOALS.UNSURE);
    assert.strictEqual(getGoal({ goal: 'ielts' }), GOALS.IELTS);
});

test('"hali bilmayman" IELTS kontentini KO\'RADI, lekin band SO\'RALMAYDI', () => {
    // Qaror qilmagan odamni IELTS'dan chetlatmaymiz, lekin undan javobi
    // yo'q savolni ham so'ramaymiz — tasodifiy tanlangan band statistikani
    // buzardi.
    const unsure = { goal: 'unsure' };
    assert.strictEqual(showsIeltsContent(unsure), true);
    assert.strictEqual(asksIeltsTarget(unsure), false);
});

test('sof general foydalanuvchida IELTS ekranlari yopiladi', () => {
    const general = { goal: 'general' };
    assert.strictEqual(showsIeltsContent(general), false);
    assert.strictEqual(asksIeltsTarget(general), false);
});

test('onboarding javobi CEFR ga o\'giriladi', () => {
    assert.strictEqual(toCefrLevel('Beginner'), 'A2');
    assert.strictEqual(toCefrLevel('Intermediate'), 'B1');
    assert.strictEqual(toCefrLevel('Upper-Intermediate'), 'B2');
    assert.strictEqual(toCefrLevel('Advanced'), 'C1');
    assert.strictEqual(toCefrLevel('Nonsense'), null);
    assert.strictEqual(toCefrLevel(undefined), null);
});

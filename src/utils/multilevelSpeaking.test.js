import test from 'node:test';
import assert from 'node:assert';

import {
    ML_LEVELS,
    ML_LEVEL_RANGE,
    normalizeMlLevel,
    scoreToMlLevel,
    clampScoreToMlLevel,
    mlPositionInLevel,
    aggregateMlSpeaking,
} from './multilevelSpeaking.js';

/** To'rt mezonni bir xil qilib yasaydi, kerakligini keyin ustiga yozamiz. */
const crit = (over = {}) => ({
    fluency: { level: 'B2', score: 65 },
    lexical: { level: 'B2', score: 65 },
    grammar: { level: 'B2', score: 65 },
    pronunciation: { level: 'B2', score: 65 },
    ...over,
});

test('daraja oynalari uzluksiz va bo\'shliqsiz', () => {
    let prevMax = -1;
    for (const level of ML_LEVELS) {
        const [min, max] = ML_LEVEL_RANGE[level];
        assert.strictEqual(min, prevMax + 1, `${level} oynasida bo'shliq bor`);
        assert.ok(max >= min);
        prevMax = max;
    }
    assert.strictEqual(prevMax, 100);
});

test('normalizeMlLevel turli yozuvlarni qabul qiladi', () => {
    assert.strictEqual(normalizeMlLevel('b2'), 'B2');
    assert.strictEqual(normalizeMlLevel(' C1 '), 'C1');
    assert.strictEqual(normalizeMlLevel('below A2'), 'below_A2');
    assert.strictEqual(normalizeMlLevel('below-a2'), 'below_A2');
    // A1 alohida daraja emas — Multilevel shkalasida eng pastga tushadi.
    assert.strictEqual(normalizeMlLevel('A1'), 'below_A2');
    assert.strictEqual(normalizeMlLevel('B3'), null);
    assert.strictEqual(normalizeMlLevel(null), null);
});

test('scoreToMlLevel chegara ballarni to\'g\'ri joylaydi', () => {
    assert.strictEqual(scoreToMlLevel(0), 'below_A2');
    assert.strictEqual(scoreToMlLevel(39), 'A2');
    assert.strictEqual(scoreToMlLevel(40), 'B1');
    assert.strictEqual(scoreToMlLevel(79), 'B2');
    assert.strictEqual(scoreToMlLevel(80), 'C1');
    assert.strictEqual(scoreToMlLevel(1000), 'C1');
    assert.strictEqual(scoreToMlLevel('salom'), null);
});

test('ball darajaga zid bo\'lsa, daraja ustun turadi', () => {
    // Model "B2" dedi-yu, B1 ballini berdi — deskriptorga tayangan daraja qoladi.
    assert.strictEqual(clampScoreToMlLevel(45, 'B2'), 60);
    assert.strictEqual(clampScoreToMlLevel(95, 'B1'), 59);
    assert.strictEqual(clampScoreToMlLevel(65, 'B2'), 65);
    // Ball umuman yo'q bo'lsa — daraja o'rtasi.
    assert.strictEqual(clampScoreToMlLevel(undefined, 'B1'), 50);
});

test('mlPositionInLevel daraja ichidagi joyni beradi', () => {
    assert.strictEqual(mlPositionInLevel(60, 'B2'), 0);
    assert.strictEqual(mlPositionInLevel(79, 'B2'), 100);
    assert.strictEqual(mlPositionInLevel(70, 'B2'), 53);
});

test('yakuniy daraja eng past mezon bo\'yicha chiqadi', () => {
    const out = aggregateMlSpeaking(crit({ pronunciation: { level: 'B1', score: 45 } }));
    assert.strictEqual(out.level, 'B1');
    assert.strictEqual(out.weakest, 'pronunciation');
});

test('yakuniy ball darajasining oynasidan chiqmaydi', () => {
    // O'rtacha 60 dan yuqori, lekin daraja B1 — ball B1 tepasida to'xtaydi.
    const out = aggregateMlSpeaking(crit({ pronunciation: { level: 'B1', score: 45 } }));
    assert.strictEqual(out.level, scoreToMlLevel(out.score));
    assert.strictEqual(out.score, 59);
});

test('daraja teng bo\'lsa eng zaifni ball hal qiladi', () => {
    const out = aggregateMlSpeaking(
        crit({ grammar: { level: 'B2', score: 61 }, lexical: { level: 'B2', score: 63 } })
    );
    assert.strictEqual(out.weakest, 'grammar');
});

test('bir xil mezonlarda ball o\'zgarmaydi', () => {
    const out = aggregateMlSpeaking(crit());
    assert.strictEqual(out.level, 'B2');
    assert.strictEqual(out.score, 65);
});

test('mezon yetishmasa yoki buzuq bo\'lsa null qaytadi', () => {
    const missing = crit();
    delete missing.grammar;
    assert.strictEqual(aggregateMlSpeaking(missing), null);
    assert.strictEqual(aggregateMlSpeaking({ ...crit(), fluency: { level: 'X' } }), null);
    assert.strictEqual(aggregateMlSpeaking(null), null);
});

test('daraja yo\'q, faqat ball bo\'lsa ham ishlaydi', () => {
    const out = aggregateMlSpeaking({
        fluency: { score: 85 },
        lexical: { score: 82 },
        grammar: { score: 81 },
        pronunciation: { score: 88 },
    });
    assert.strictEqual(out.level, 'C1');
});

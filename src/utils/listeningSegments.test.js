// src/utils/listeningSegments.test.js
//
//   npm run test:utils
//
// Bu yerdagi asosiy shart: hisob-kitob AYNAN o'quvchi pleyeridagidek bo'lsin.
// "Admin nima belgilagan bo'lsa, imtihonda ham shu" — testlar shuni qo'riqlaydi.

import test from 'node:test';
import assert from 'node:assert';

import { parseAudioTimeInput, formatAudioTimePrecise } from './audioTime.js';
import {
    analyzeListeningParts,
    resolvePartBounds,
    LEGACY_PART_SECONDS,
    worstIssueLevel,
} from './listeningSegments.js';

const codes = (part) => part.issues.map(i => i.code);

test('mm:ss, hh:mm:ss va kasrli qiymatlar o\'qiladi', () => {
    assert.strictEqual(parseAudioTimeInput('6:05').seconds, 365);
    assert.strictEqual(parseAudioTimeInput('1:07:30').seconds, 4050);
    assert.strictEqual(parseAudioTimeInput('27:42.5').seconds, 1662.5);
    // Ikki nuqtasiz son — soniya.
    assert.strictEqual(parseAudioTimeInput('365').seconds, 365);
});

test('noto\'g\'ri yozuv jimgina 0 ga aylanmaydi', () => {
    for (const bad of ['6;05', 'abc', '-5', '6:05:07:01']) {
        assert.strictEqual(parseAudioTimeInput(bad).valid, false, bad);
    }
    // 60 dan katta soniya — deyarli har doim terish xatosi.
    assert.strictEqual(parseAudioTimeInput('6:75').reason, 'range');
    assert.strictEqual(parseAudioTimeInput('').empty, true);
});

test('yaxlitlangan qiymat qayta o\'qilganda o\'zgarmaydi', () => {
    for (const sec of [0, 365, 814.4, 1662.5]) {
        assert.strictEqual(parseAudioTimeInput(formatAudioTimePrecise(sec)).seconds, sec);
    }
});

test('bo\'sh maydon imtihonda eski 7:30 lik taxminga tushadi', () => {
    // Umumiy audio (passage.audio yo'q) — TestHeader'dagi legacy default.
    const b = resolvePartBounds({}, 2, 1800);
    assert.strictEqual(b.start, 2 * LEGACY_PART_SECONDS);
    assert.strictEqual(b.end, 3 * LEGACY_PART_SECONDS);
    assert.strictEqual(b.usesFallbackStart, true);

    // Partning o'z audiosi bo'lsa — 0 dan fayl oxirigacha.
    const own = resolvePartBounds({ audio: 'p1.mp3' }, 2, 400);
    assert.strictEqual(own.start, 0);
    assert.strictEqual(own.end, 400);
    assert.strictEqual(own.cuts, false);
});

test('part davomiyligi sukunat bilan birga hisoblanadi', () => {
    const b = resolvePartBounds({ audio: 'a.mp3', startTime: '6:05', endTime: '13:34', extraSilentTime: 30 }, 1, 1700);
    assert.strictEqual(b.start, 365);
    assert.strictEqual(b.end, 814);
    assert.strictEqual(b.duration, 479); // 449 + 30
});

test('bo\'shliq va ustma-ustlik topiladi', () => {
    const passages = [
        { audio: 'a.mp3', startTime: '0:00', endTime: '6:05' },
        { audio: 'a.mp3', startTime: '6:05', endTime: '13:34' },
        { audio: 'a.mp3', startTime: '13:35', endTime: '20:47' }, // 1s bo'shliq
        { audio: 'a.mp3', startTime: '20:46', endTime: '27:42.5' }, // 1s ustma-ustlik
    ];
    const parts = analyzeListeningParts(passages, 4, { fileDuration: 1700 });

    assert.deepStrictEqual(codes(parts[0]), []);
    assert.ok(codes(parts[1]).includes('gap-after'));
    assert.strictEqual(parts[2].gapBefore, 1);
    assert.ok(codes(parts[2]).includes('overlap-after'));
    assert.strictEqual(parts[3].overlapBefore, 1);
});

test('aniq mos chegaralarda ogohlantirish yo\'q', () => {
    const passages = [
        { audio: 'a.mp3', startTime: '0:00', endTime: '6:05' },
        { audio: 'a.mp3', startTime: '6:05', endTime: '13:34' },
    ];
    const parts = analyzeListeningParts(passages, 2, { fileDuration: 900 });
    assert.deepStrictEqual(parts.flatMap(codes), []);
    assert.strictEqual(worstIssueLevel(parts[0].issues), null);
});

test('audio uzunligidan chiqib ketgan part belgilanadi', () => {
    const parts = analyzeListeningParts(
        [{ audio: 'a.mp3', startTime: '0:00', endTime: '30:00' },
         { audio: 'a.mp3', startTime: '31:00', endTime: '35:00' }],
        2,
        { fileDuration: 1700 }
    );
    assert.ok(codes(parts[0]).includes('end-beyond-file'));
    assert.ok(codes(parts[1]).includes('start-beyond-file'));
});

test('tugash boshlanishdan oldin bo\'lsa xato beriladi', () => {
    const parts = analyzeListeningParts([{ audio: 'a.mp3', startTime: '10:00', endTime: '2:00' }], 1, {});
    assert.ok(codes(parts[0]).includes('end-before-start'));
    assert.strictEqual(worstIssueLevel(parts[0].issues), 'error');
});

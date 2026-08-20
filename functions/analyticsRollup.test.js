// functions/analyticsRollup.test.js
//
//   node --test functions/
//
// Bu yerdagi mantiq jimgina buzilishi mumkin bo'lgan turdan: noto'g'ri qo'shilgan
// delta xatolik bermaydi, shunchaki o'quvchiga noto'g'ri statistika ko'rsatadi va
// buni faqat oylar o'tib payqash mumkin. Shu sabab uchta eng nozik joy —
// deduplikatsiya, kesish va idempotentlik — testlar bilan qotirilgan.
//
// Faqat sof funksiyalar sinaladi (`mergeDelta`, `build*Delta`); `applyRollup` va
// `rebuildSummary` Firestore talab qiladi va bu yerga kirmaydi.

const test = require("node:test");
const assert = require("node:assert");

const {
    mergeDelta,
    emptySummary,
    isoWeekKey,
    buildTestDelta,
    buildWritingDelta,
    buildSpeakingDelta
} = require("./analyticsRollup");

test("isoWeekKey ISO-8601 qoidasiga amal qiladi", () => {
    assert.strictEqual(isoWeekKey(new Date("2026-08-20T00:00:00Z")), "2026-W34");
    assert.strictEqual(isoWeekKey(new Date("2026-01-01T00:00:00Z")), "2026-W01");
    // Yil chegarasi: 2025-yil 29-dekabr (dushanba) ISO bo'yicha 2026-yilning 1-haftasi.
    assert.strictEqual(isoWeekKey(new Date("2025-12-29T00:00:00Z")), "2026-W01");
    // Kalitlar leksikografik tartibda ham xronologik bo'lishi shart (kesish shunga tayanadi).
    assert.ok("2026-W02" < "2026-W10");
});

test("birinchi urinish to'liq hisobga olinadi", () => {
    const summary = mergeDelta(emptySummary(), buildTestDelta({
        skill: "reading",
        typeStats: { headings: { total: 6, correct: 2 }, completion: { total: 8, correct: 7 } },
        mistakes: [
            { userResponse: "goverment", correctAnswer: "government", questionType: "completion" },
            { userResponse: "", correctAnswer: "museum", questionType: "completion" },
            { userResponse: "iv", correctAnswer: "vii", questionType: "headings" }
        ],
        partBreakdown: [{ total: 6, mistakes: 4 }, { total: 8, mistakes: 1 }],
        band: 6.0,
        timeSpent: 3600,
        date: new Date("2026-08-20T10:00:00Z"),
        isFirstAttempt: true,
        sourceId: "a1"
    }));

    assert.deepStrictEqual(summary.byType.headings, { total: 6, correct: 2 });
    assert.strictEqual(summary.skills.reading.total, 14);
    assert.strictEqual(summary.skills.reading.correct, 9);
    assert.strictEqual(summary.skills.reading.bestBand, 6);
    assert.strictEqual(summary.patterns.spelling, 1);
    assert.strictEqual(summary.patterns.no_answer, 1);
    assert.strictEqual(summary.patterns.wrong_option, 1);
    assert.strictEqual(summary.nearMiss.count, 1, "faqat imlo yaqin marra");
    assert.strictEqual(summary.nearMiss.ofTotal, 3);
    assert.strictEqual(summary.weeks["2026-W34"].minutes, 60);
    assert.deepStrictEqual(summary.byPart.reading[1], { total: 8, wrong: 1 });
});

test("qayta urinish jamlanmani ikkilantirmaydi", () => {
    let summary = mergeDelta(emptySummary(), buildTestDelta({
        skill: "reading",
        typeStats: { headings: { total: 6, correct: 2 } },
        partBreakdown: [{ total: 6, mistakes: 4 }],
        band: 6.0,
        date: new Date("2026-08-20T10:00:00Z"),
        isFirstAttempt: true,
        sourceId: "a1"
    }));

    summary = mergeDelta(summary, buildTestDelta({
        skill: "reading",
        typeStats: { headings: { total: 6, correct: 5 } },
        prevTypeStats: { headings: { total: 6, correct: 2 } },
        partBreakdown: [{ total: 6, mistakes: 1 }],
        prevPartBreakdown: [{ total: 6, mistakes: 4 }],
        band: 7.5,
        date: new Date("2026-08-21T10:00:00Z"),
        isFirstAttempt: false,
        sourceId: "a2"
    }));

    // Oxirgi urinish semantikasi: savol soni o'zgarmadi, to'g'ri javob yangilandi.
    assert.deepStrictEqual(summary.byType.headings, { total: 6, correct: 5 });
    assert.deepStrictEqual(summary.byPart.reading, [{ total: 6, wrong: 1 }]);
    assert.strictEqual(summary.skills.reading.tests, 1);
    assert.strictEqual(summary.skills.reading.total, 6);
    assert.strictEqual(summary.testsCounted, 1);

    // Hafta esa XOM faoliyat: ikkala urinish ham sanaladi.
    assert.strictEqual(summary.weeks["2026-W34"].attempts, 2);
});

test("band pasaysa bestBand saqlanadi, lastBand yangilanadi", () => {
    let summary = mergeDelta(emptySummary(), buildTestDelta({
        skill: "listening",
        typeStats: { completion: { total: 10, correct: 9 } },
        band: 8.0,
        date: new Date("2026-08-20T10:00:00Z"),
        isFirstAttempt: true,
        sourceId: "b1"
    }));
    summary = mergeDelta(summary, buildTestDelta({
        skill: "listening",
        typeStats: { completion: { total: 10, correct: 4 } },
        prevTypeStats: { completion: { total: 10, correct: 9 } },
        band: 4.5,
        date: new Date("2026-08-21T10:00:00Z"),
        isFirstAttempt: false,
        sourceId: "b2"
    }));

    assert.strictEqual(summary.skills.listening.bestBand, 8);
    assert.strictEqual(summary.skills.listening.lastBand, 4.5);
    assert.deepStrictEqual(summary.byType.completion, { total: 10, correct: 4 });
});

test("weeks 16 hafta bilan cheklanadi va eng eskisi kesiladi", () => {
    let summary = emptySummary();
    for (let i = 0; i < 30; i += 1) {
        const date = new Date(Date.UTC(2026, 0, 5 + i * 7)); // har hafta dushanba
        summary = mergeDelta(summary, buildTestDelta({
            skill: "reading",
            typeStats: { completion: { total: 1, correct: 1 } },
            date,
            isFirstAttempt: true,
            sourceId: `w${i}`
        }));
    }

    const keys = Object.keys(summary.weeks).sort();
    assert.strictEqual(keys.length, 16);
    assert.strictEqual(keys[keys.length - 1], isoWeekKey(new Date(Date.UTC(2026, 0, 5 + 29 * 7))));
    // Eng eski haftalar o'chgan bo'lishi kerak.
    assert.ok(!summary.weeks["2026-W02"]);
});

test("repeated 30 ta bilan cheklanadi va takrorlar birlashadi", () => {
    let summary = emptySummary();

    // Bir xil xato uch marta, ustiga 40 ta noyob xato.
    for (let i = 0; i < 3; i += 1) {
        summary = mergeDelta(summary, buildTestDelta({
            skill: "reading",
            typeStats: { completion: { total: 1, correct: 0 } },
            mistakes: [{ userResponse: "goverment", correctAnswer: "government", questionType: "completion" }],
            date: new Date("2026-08-20T10:00:00Z"),
            isFirstAttempt: true,
            sourceId: `r${i}`
        }));
    }
    for (let i = 0; i < 40; i += 1) {
        summary = mergeDelta(summary, buildTestDelta({
            skill: "reading",
            typeStats: { completion: { total: 1, correct: 0 } },
            mistakes: [{ userResponse: `wrong${i}`, correctAnswer: `answer${i}`, questionType: "completion" }],
            date: new Date("2026-08-20T10:00:00Z"),
            isFirstAttempt: true,
            sourceId: `u${i}`
        }));
    }

    assert.strictEqual(summary.repeated.length, 30);
    // Eng ko'p takrorlangani birinchi o'rinda turishi kerak — ro'yxat shu tartibda ko'rsatiladi.
    assert.strictEqual(summary.repeated[0].text, "government");
    assert.strictEqual(summary.repeated[0].count, 3);
});

test("appliedIds oxirgi 25 ta bilan cheklanadi", () => {
    let summary = emptySummary();
    for (let i = 0; i < 40; i += 1) {
        summary = mergeDelta(summary, buildTestDelta({
            skill: "reading",
            typeStats: { completion: { total: 1, correct: 1 } },
            date: new Date("2026-08-20T10:00:00Z"),
            isFirstAttempt: true,
            sourceId: `s${i}`
        }));
    }
    assert.strictEqual(summary.appliedIds.length, 25);
    assert.strictEqual(summary.appliedIds[24], "s39");
    assert.ok(!summary.appliedIds.includes("s0"));
});

test("writing deltasi ikkala taskning o'rtachasini oladi", () => {
    const delta = buildWritingDelta({
        aiReview: {
            task1: {
                criteria: { taskAchievement: { band: 6 }, grammar: { band: 5 } },
                grammarErrors: [{ type: "tense" }, { type: "article" }],
                lexicalErrors: []
            },
            task2: {
                criteria: { taskAchievement: { band: 7 }, grammar: { band: 6 } },
                grammarErrors: [{ type: "article" }],
                lexicalErrors: [{}]
            }
        },
        sourceId: "w1"
    });

    assert.strictEqual(delta.writing.criteria.taskAchievement, 6.5);
    assert.strictEqual(delta.writing.criteria.grammar, 5.5);
    assert.strictEqual(delta.writing.errorTypes.article, 2);
    assert.strictEqual(delta.writing.errorTypes.other, 1, "turi yo'q xato 'other' ga tushadi");

    const summary = mergeDelta(emptySummary(), delta);
    assert.strictEqual(summary.skills.writing.tasks, 1);
    assert.strictEqual(summary.skills.writing.criteriaSum.taskAchievement, 6.5);
});

test("writing o'rtachasi yig'indi/son sifatida saqlanadi", () => {
    const make = (band, sourceId) => buildWritingDelta({
        aiReview: { task1: { criteria: { grammar: { band } } } },
        sourceId
    });

    let summary = mergeDelta(emptySummary(), make(5, "w1"));
    summary = mergeDelta(summary, make(7, "w2"));

    assert.strictEqual(summary.skills.writing.tasks, 2);
    assert.strictEqual(summary.skills.writing.criteriaSum.grammar, 12);
    // Klient o'rtachani shu ikki sondan chiqaradi — yaxlitlash xatosi to'planmaydi.
    assert.strictEqual(summary.skills.writing.criteriaSum.grammar / summary.skills.writing.tasks, 6);
});

test("speaking tuzatishlari takrorlanuvchi xatolarga tushadi", () => {
    const delta = buildSpeakingDelta({
        bands: { fluency: 6, grammar: 5.5 },
        corrections: [{ better: "I have been living" }, { better: "  " }],
        date: new Date("2026-08-20T10:00:00Z"),
        sourceId: "sp1"
    });

    assert.strictEqual(delta.repeated.length, 1, "bo'sh tuzatish tashlanadi");
    assert.strictEqual(delta.repeated[0].family, "speaking");

    const summary = mergeDelta(emptySummary(), delta);
    assert.strictEqual(summary.skills.speaking.tasks, 1);
    assert.strictEqual(summary.skills.speaking.criteriaSum.fluency, 6);
});

test("kalitsiz va sababsiz xatolar tasnifdan tashqarida qoladi", () => {
    const delta = buildTestDelta({
        skill: "reading",
        typeStats: { completion: { total: 3, correct: 0 } },
        mistakes: [
            { userResponse: "museum", correctAnswer: "museum/gallery", questionType: "completion" }, // aynan mos → sabab yo'q
            { userResponse: "anything", correctAnswer: "", questionType: "completion" },             // kalit yo'q
            { userResponse: "childs", correctAnswer: "children", questionType: "completion" }        // hisobga olinadi
        ],
        date: new Date("2026-08-20T10:00:00Z"),
        isFirstAttempt: true,
        sourceId: "m1"
    });

    assert.strictEqual(delta.nearMiss.ofTotal, 1);
    assert.strictEqual(delta.patterns.singular_plural, 1);
});

test("ko'nikma kesimidagi nearMiss qayta urinishda ikkilanmaydi", () => {
    const attempt = (correct, sourceId, prevStats) => buildTestDelta({
        skill: "reading",
        typeStats: { completion: { total: 40, correct } },
        prevTypeStats: prevStats ? { completion: { total: 40, correct: prevStats.correct } } : null,
        // 40 tadan (40 - correct) tasi xato, ularning yarmi "yaqin marra" (imlo).
        mistakes: Array.from({ length: 40 - correct }, (_, i) =>
            i % 2 === 0
                ? { userResponse: "goverment", correctAnswer: "government", questionType: "completion" }
                : { userResponse: "xyz", correctAnswer: `answer${i}`, questionType: "completion" }
        ),
        prevMistakeStats: prevStats?.mistakeStats || null,
        band: 6,
        date: new Date("2026-08-20T10:00:00Z"),
        isFirstAttempt: !prevStats,
        sourceId
    });

    let summary = mergeDelta(emptySummary(), attempt(30, "n1", null));
    const first = summary.skills.reading;
    assert.strictEqual(first.total, 40);
    assert.strictEqual(first.correct, 30);
    assert.strictEqual(first.mistakes, 10);
    assert.strictEqual(first.nearMiss, 5, "10 ta xatoning yarmi imlo");

    // Xuddi shu testni qayta ishlash — sonlar O'RNIGA qo'yiladi, ustiga qo'shilmaydi.
    summary = mergeDelta(summary, attempt(34, "n2", {
        correct: 30,
        mistakeStats: { nearMiss: 5, classified: 10 }
    }));
    const second = summary.skills.reading;
    assert.strictEqual(second.total, 40, "savol soni o'zgarmaydi");
    assert.strictEqual(second.correct, 34);
    assert.strictEqual(second.mistakes, 6);
    assert.strictEqual(second.nearMiss, 3);
});

test("nearMiss hech qachon xatolar sonidan oshmaydi", () => {
    // Buzuq delta: nearMiss to'g'ri javoblardan ham ko'p. Jamlanma uni qisishi kerak,
    // aks holda "tuzatsangiz +3 band" degan bema'ni va'da chiqardi.
    const summary = mergeDelta(emptySummary(), {
        skills: { reading: { tests: 1, total: 40, correct: 38, mistakes: 99, nearMiss: 99 } }
    });

    assert.strictEqual(summary.skills.reading.mistakes, 2, "xatolar total - correct dan oshmaydi");
    assert.strictEqual(summary.skills.reading.nearMiss, 2, "nearMiss xatolardan oshmaydi");
});

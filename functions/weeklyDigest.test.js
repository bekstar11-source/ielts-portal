// functions/weeklyDigest.test.js
//
//   npm run test:functions
//
// Xabar Telegram orqali ketadi va uni qaytarib bo'lmaydi. Ikki xavf: bo'sh yoki
// ma'nosiz xabar yuborish (o'quvchi botni bloklaydi) va noto'g'ri haftani
// ko'rsatish. Ikkalasi ham shu yerda qotirilgan.

const test = require("node:test");
const assert = require("node:assert");

const { buildDigest, previousWeekKey, chatIdFromUid } = require("./weeklyDigest");

const summary = (over = {}) => ({
    weeks: { "2026-W34": { total: 80, correct: 56 } },
    byType: { headings: { total: 40, correct: 18 }, completion: { total: 60, correct: 50 } },
    nearMiss: { count: 14, ofTotal: 30 },
    timing: { tests: 3, rushed: 0, ranOut: 0, quarters: [10, 10, 10, 10] },
    ...over
});

test("chat id faqat Telegram hisoblaridan chiqadi", () => {
    assert.strictEqual(chatIdFromUid("telegram_12345"), "12345");
    // Email bilan ro'yxatdan o'tganda Telegram bog'lanishi yo'q.
    assert.strictEqual(chatIdFromUid("abc123"), null);
    assert.strictEqual(chatIdFromUid(""), null);
    assert.strictEqual(chatIdFromUid(undefined), null);
});

test("o'tgan hafta kaliti to'g'ri", () => {
    // 2026-08-24 dushanba (W35), undan oldingi hafta — W34.
    assert.strictEqual(previousWeekKey(new Date("2026-08-24T09:00:00Z")), "2026-W34");
    // Yil chegarasi ham buzilmasligi kerak.
    assert.strictEqual(previousWeekKey(new Date("2026-01-05T09:00:00Z")), "2026-W01");
});

test("faol haftada xulosa quriladi", () => {
    const text = buildDigest(summary(), "2026-W34");

    assert.ok(text.includes("80"), "savollar soni bo'lishi kerak");
    assert.ok(text.includes("70%"), "aniqlik bo'lishi kerak");
    assert.ok(text.includes("Matching Headings"), "tur xom nomi bilan chiqmasligi kerak");
    assert.ok(!text.includes("headings"), "kanonik kalit xabarga tushmasligi kerak");
});

test("kam ishlangan haftada xabar yuborilmaydi", () => {
    // Bo'sh haftada "5 ta savol ishladingiz" deb bezovta qilish — botni
    // bloklashning eng tez yo'li.
    assert.strictEqual(buildDigest(summary({ weeks: { "2026-W34": { total: 5, correct: 4 } } }), "2026-W34"), null);
    assert.strictEqual(buildDigest(summary({ weeks: {} }), "2026-W34"), null);
    assert.strictEqual(buildDigest(null, "2026-W34"), null);
});

test("tavsiya BITTA bo'ladi", () => {
    // Uchta maslahat yuborilsa, hech biri bajarilmaydi.
    const text = buildDigest(summary({
        nearMiss: { count: 20, ofTotal: 30 },
        timing: { tests: 4, rushed: 3, ranOut: 3, quarters: [10, 10, 10, 10] }
    }), "2026-W34");

    const advice = ["✍️", "⏱", "🎯"].filter((marker) => text.includes(marker));
    assert.strictEqual(advice.length, 1, `bitta tavsiya kutilgan, ${advice.length} ta topildi`);
});

test("yaqin marra ulushi past bo'lsa boshqa tavsiya beriladi", () => {
    const text = buildDigest(summary({
        nearMiss: { count: 2, ofTotal: 30 },
        timing: { tests: 4, rushed: 0, ranOut: 3, quarters: [10, 10, 10, 10] }
    }), "2026-W34");

    assert.ok(text.includes("⏱"), "vaqt odati bo'lsa u haqda aytilishi kerak");
});

test("kam namunali tur 'eng kuchsiz' deb ko'rsatilmaydi", () => {
    const text = buildDigest(summary({
        byType: { headings: { total: 4, correct: 0 }, completion: { total: 60, correct: 50 } }
    }), "2026-W34");

    assert.ok(!text.includes("Matching Headings"), "4 ta savoldan xulosa chiqmaydi");
});

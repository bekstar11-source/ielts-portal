// functions/buildBenchmarks.test.js
//
//   npm run test:functions
//
// Ikki xavf. Birinchisi MAXFIYLIK: kichik guruhda "o'rtacha" bitta odamning
// natijasiga aylanadi va boshqa o'quvchining ma'lumotini oshkor qiladi.
// Ikkinchisi ZARARLI TAQQOSLASH: band 5.0 dagi o'quvchini band 8.0 dagilar
// bilan solishtirish har bir qatorda "orqadasiz" deb yozadi va foydasiz.

const test = require("node:test");
const assert = require("node:assert");

const {
    computeBenchmarks,
    bandBucket,
    MIN_COHORT,
    MIN_QUESTIONS_PER_USER
} = require("./buildBenchmarks");

/**
 * Bitta o'quvchi jamlanmasi.
 *
 * Foizlar 50 savolga ALOQA QOLDIRMASDAN bo'linishi kerak (60% → 30 ta), aks
 * holda fikstura yaxlitlanadi va test kodni emas, o'z arifmetikasini tekshiradi.
 */
const student = (band, families) => ({
    skills: { reading: { bestBand: band } },
    byType: Object.fromEntries(
        Object.entries(families).map(([family, accuracy]) => [
            family,
            { total: 50, correct: Math.round((50 * accuracy) / 100) }
        ])
    )
});

/** `count` ta bir xil o'quvchi. */
const cohort = (count, band, families) =>
    Array.from({ length: count }, () => student(band, families));

test("daraja guruhlari butun band bo'yicha", () => {
    assert.strictEqual(bandBucket(6.5), "6");
    assert.strictEqual(bandBucket(6.0), "6");
    assert.strictEqual(bandBucket(7.9), "7");
    // Chekka guruhlar birlashtiriladi — u yerda o'quvchi kam.
    assert.strictEqual(bandBucket(4.5), "4");
    assert.strictEqual(bandBucket(3.0), "4");
    assert.strictEqual(bandBucket(8.5), "8");
    assert.strictEqual(bandBucket(9.0), "8");
    assert.strictEqual(bandBucket(0), null);
});

test("yetarli guruh o'rtachasi hisoblanadi", () => {
    const { buckets } = computeBenchmarks(cohort(MIN_COHORT, 6.5, { headings: 60, completion: 80 }));

    assert.ok(buckets["6"], "band 6 guruhi bo'lishi kerak");
    assert.strictEqual(buckets["6"].users, MIN_COHORT);
    assert.strictEqual(buckets["6"].families.headings, 60);
    assert.strictEqual(buckets["6"].families.completion, 80);
});

test("kichik guruh umuman e'lon qilinmaydi", () => {
    // Maxfiylik: 19 kishilik guruhda o'rtacha ayrim odamlarni oshkor qiladi.
    const { buckets } = computeBenchmarks(cohort(MIN_COHORT - 1, 6.5, { headings: 60 }));
    assert.deepStrictEqual(buckets, {});
});

test("darajalar aralashtirilmaydi", () => {
    const { buckets } = computeBenchmarks([
        ...cohort(MIN_COHORT, 5.5, { headings: 40 }),
        ...cohort(MIN_COHORT, 7.5, { headings: 86 })
    ]);

    assert.strictEqual(buckets["5"].families.headings, 40);
    assert.strictEqual(buckets["7"].families.headings, 86);
    assert.ok(!buckets["6"], "oraliq guruh o'ylab topilmaydi");
});

test("kam ishlagan o'quvchi guruhga kirmaydi", () => {
    const light = {
        skills: { reading: { bestBand: 6.5 } },
        byType: { headings: { total: MIN_QUESTIONS_PER_USER - 1, correct: 10 } }
    };
    const { buckets, sampled } = computeBenchmarks([...cohort(MIN_COHORT, 6.5, { headings: 60 }), light]);

    assert.strictEqual(sampled, MIN_COHORT, "yengil o'quvchi namunaga kirmasligi kerak");
    assert.strictEqual(buckets["6"].users, MIN_COHORT);
});

test("kam namunali savol turi o'rtachaga qo'shilmaydi", () => {
    // 50 ta savolli `completion` bor, `headings` esa atigi 5 ta — u o'rtachani buzardi.
    const mixed = Array.from({ length: MIN_COHORT }, () => ({
        skills: { reading: { bestBand: 6.5 } },
        byType: {
            completion: { total: 50, correct: 40 },
            headings: { total: 5, correct: 0 }
        }
    }));

    const { buckets } = computeBenchmarks(mixed);

    assert.strictEqual(buckets["6"].families.completion, 80);
    assert.ok(!("headings" in buckets["6"].families), "5 ta savolli tur e'lon qilinmaydi");
});

test("daraja ikkala ko'nikmadan eng yaxshisi bo'yicha", () => {
    // Faqat Listening ishlagan o'quvchi Reading bandi yo'qligi uchun
    // guruhsiz qolmasligi kerak.
    const listeningOnly = Array.from({ length: MIN_COHORT }, () => ({
        skills: { reading: { bestBand: 0 }, listening: { bestBand: 7.0 } },
        byType: { completion: { total: 50, correct: 35 } }
    }));

    const { buckets } = computeBenchmarks(listeningOnly);
    assert.ok(buckets["7"], "Listening bandi bo'yicha guruhlanishi kerak");
});

test("bo'sh va yaroqsiz kirish xatolik bermaydi", () => {
    assert.deepStrictEqual(computeBenchmarks([]).buckets, {});
    assert.deepStrictEqual(computeBenchmarks(undefined).buckets, {});
    assert.deepStrictEqual(computeBenchmarks([null, {}, { byType: {} }]).buckets, {});
});

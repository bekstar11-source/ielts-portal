// functions/analyticsRollup.js
//
// O'quvchi analitikasining YAGONA o'qish manbai — `analyticsSummaries/{uid}`.
//
// NEGA KERAK
// ──────────
// `/analytics` sahifasi ilgari har ochilishida 50 ta `results` hujjatini, butun
// `podcastAttempts` ro'yxatini va 30 ta `mistakeSessions` ni o'qirdi — ya'ni
// bitta ko'rish ~85–150 Firestore o'qishiga tushardi, holbuki ekranda ko'rinadigan
// hamma narsa bir necha o'nlab songa sig'adi. Bu yerdagi g'oya oddiy: hisob-kitob
// O'QISH paytida emas, YOZISH paytida qilinadi. Topshiriq tugaganda summary
// hujjati yangilanadi; sahifa esa bitta `getDoc` bilan ochiladi.
//
// NEGA TRANZAKSIYA, `increment()` EMAS
// ────────────────────────────────────
// `FieldValue.increment()` o'qishsiz ishlaydi va birinchi qarashda arzonroq. Uch
// sabab bilan undan voz kechildi:
//   1. Kesish. `weeks` va `repeated` cheksiz o'sib, hujjat 1 MB limitiga borardi.
//      Kesish uchun joriy holatni bilish shart.
//   2. Idempotentlik. Klient bir topshiriqni ikki marta yuborsa, `increment`
//      statistikani ikkilantirardi. `appliedIds` ni tekshirish uchun o'qish kerak.
//   3. Qayta topshirish. Quyidagi "oxirgi urinish" semantikasi ayirishni talab
//      qiladi — `increment` bilan buni boshqarish mumkin, lekin kesish va
//      idempotentlik baribir o'qishni majburlaydi.
// Narxi: topshiriq boshiga +1 o'qish. Topshiriq kamdan-kam, sahifa ochish esa
// tez-tez sodir bo'ladi — almashuv aniq foydali.
//
// SEMANTIKA (uchtasi ataylab har xil)
// ───────────────────────────────────
//   • `byType`, `byPart`, `skills` — TEST BO'YICHA DEDUPLIKATSIYA qilingan:
//     faqat oxirgi urinish hisobga olinadi. Bu `submitTestAnswers` dagi mavjud
//     qaror bilan bir xil (bitta testni 5 marta ishlagan o'quvchi umumiy
//     manzarani buzmasligi kerak). Shu sabab delta manfiy bo'lishi mumkin —
//     oldingi urinish ayiriladi.
//   • `weeks` — XOM FAOLIYAT: har bir urinish sanaladi. Bu vaqt qatori, va
//     testni qayta ishlash ham haqiqiy mehnat. Bu yerda ayirish yo'q.
//   • `patterns`, `repeated`, `nearMiss` (global) — HAR BIR XATO: `mistakeSessions`
//     append-only ombor, shuning uchun jamlanma ham o'sib boradi. Bu sonlar
//     "qanday xato qilaman" savoliga javob beradi va ulushlar sifatida o'qiladi.
//
// ISTISNO: `skills[skill].nearMiss` va `.mistakes` — DEDUPLIKATSIYA qilingan.
// Ular ball arifmetikasida ishlatiladi (`correct + nearMiss` → band), ya'ni
// `correct`/`total` bilan bir xil semantikada bo'lishi SHART. Aks holda bitta
// testni besh marta ishlagan o'quvchida `nearMiss` `total` dan oshib ketib,
// "yaqin marra xatolarini tuzatsangiz +2.0 band" degan bema'ni va'da chiqardi.

const admin = require("firebase-admin");

const { mergeTypeStats } = require("./questionTypes");
const { classifyMistake, NEAR_MISS_PATTERNS } = require("./mistakePatterns");
const { normalizeString } = require("./ieltsScoring");
const { canonicalWritingError } = require("./writingErrors.js");
const { isoWeekKey } = require("./isoWeek.js");

/** Summary hujjatlari yotadigan to'plam. */
const COLLECTION = "analyticsSummaries";

/**
 * Sxema versiyasi. Klient buni tekshiradi: kutilganidan past bo'lsa, summary
 * eskirgan deb hisoblanadi va qayta quriladi. Sxemaga mos kelmaydigan
 * o'zgarish kiritilsa — shuni oshiring.
 */
const SUMMARY_VERSION = 3;

/** Nechta hafta saqlanadi. 16 hafta ≈ 4 oy — trend uchun yetarli, hujjat kichik qoladi. */
const WEEK_LIMIT = 16;

/** Takrorlanuvchi xatolar ro'yxatining uzunligi. */
const REPEATED_LIMIT = 30;

/** Idempotentlik uchun eslab qolinadigan oxirgi manba ID lari soni. */
const APPLIED_LIMIT = 25;

/** Qayta qurishda o'qiladigan xato sessiyalarining chegarasi. */
const REBUILD_SESSION_LIMIT = 200;

/** Qayta qurishda o'qiladigan natijalar chegarasi. */
const REBUILD_RESULT_LIMIT = 100;

/**
 * Writing mezonlari (`checkWriting` shu kalitlarni qaytaradi).
 *
 * Speaking'da mezonlar boshqacha (`fluency`, `pronunciation`, …), shuning uchun
 * jamlanma tomonida qat'iy ro'yxat ishlatilmaydi — `addCriteria` kelgan har
 * qanday yaroqli kalitni qabul qiladi.
 */
const WRITING_CRITERIA = ["taskAchievement", "coherence", "lexical", "grammar", "overall"];

/**
 * Firestore maydon nomi sifatida xavfsiz kalitlar.
 *
 * Mezon nomlari AI javobidan keladi. Kutilmagan kalit (nuqta yoki qiyalik chiziq
 * bilan) Firestore'da ichma-ich yo'l sifatida talqin qilinib, hujjat tuzilishini
 * buzardi — shuning uchun oddiy identifikatorlardan boshqasi tashlanadi.
 */
const SAFE_KEY = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;

// ───────────────────────────────────────────────────────────────────────────
// Yordamchilar
// ───────────────────────────────────────────────────────────────────────────

function toDate(value) {
    if (!value) return null;
    if (typeof value?.toDate === "function") {
        try {
            const d = value.toDate();
            return isNaN(d.getTime()) ? null : d;
        } catch {
            return null;
        }
    }
    if (typeof value?.seconds === "number") return new Date(value.seconds * 1000);
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

/** `{family: {total, correct}}` juftliklarini qo'shadi; manfiy natija 0 ga qisiladi. */
function addTypeStats(base, incoming) {
    const out = { ...(base || {}) };
    Object.entries(incoming || {}).forEach(([family, stat]) => {
        if (!stat) return;
        const prev = out[family] || { total: 0, correct: 0 };
        const total = Math.max(0, prev.total + (Number(stat.total) || 0));
        const correct = Math.max(0, Math.min(total, prev.correct + (Number(stat.correct) || 0)));
        if (total === 0) delete out[family];
        else out[family] = { total, correct };
    });
    return out;
}

/**
 * Ikki kesim orasidagi FARQNI qaytaradi — natija manfiy bo'lishi mumkin.
 *
 * `addTypeStats` bu yerda ishlamaydi: u jamlanma uchun mo'ljallangan va
 * natijani 0 ga qisadi. Qayta urinishda `total` farqi deyarli har doim 0
 * bo'ladi (savollar soni o'zgarmaydi), `correct` farqi esa musbat — qisish
 * aynan shu farqni yo'q qilib yuborardi.
 */
function diffTypeStats(prev, next) {
    const out = {};
    const families = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
    families.forEach((family) => {
        const a = prev?.[family] || {};
        const b = next?.[family] || {};
        const total = (Number(b.total) || 0) - (Number(a.total) || 0);
        const correct = (Number(b.correct) || 0) - (Number(a.correct) || 0);
        if (total !== 0 || correct !== 0) out[family] = { total, correct };
    });
    return out;
}

/** Bo'limlar kesimidagi farq. `diffTypeStats` bilan bir xil sabab bo'yicha alohida. */
function diffParts(prev, next) {
    const length = Math.max(prev?.length || 0, next?.length || 0);
    const out = [];
    for (let i = 0; i < length; i += 1) {
        const a = prev?.[i] || {};
        const b = next?.[i] || {};
        out.push({
            total: (Number(b.total) || 0) - (Number(a.total) || 0),
            wrong: (Number(b.wrong) || 0) - (Number(a.wrong) || 0)
        });
    }
    return out;
}

/** Sonli xaritalarni qo'shadi (`patterns`, `errorTypes`). Manfiyga tushmaydi. */
function addCounts(base, incoming) {
    const out = { ...(base || {}) };
    Object.entries(incoming || {}).forEach(([key, value]) => {
        const next = (Number(out[key]) || 0) + (Number(value) || 0);
        if (next <= 0) delete out[key];
        else out[key] = next;
    });
    return out;
}

/** Bo'lim (passage/section) kesimini elementma-element qo'shadi. */
function addParts(base, incoming) {
    const out = { ...(base || {}) };
    Object.entries(incoming || {}).forEach(([skill, parts]) => {
        if (!Array.isArray(parts)) return;
        const prev = Array.isArray(out[skill]) ? out[skill] : [];
        const merged = [];
        const length = Math.max(prev.length, parts.length);
        for (let i = 0; i < length; i += 1) {
            const a = prev[i] || { total: 0, wrong: 0 };
            const b = parts[i] || { total: 0, wrong: 0 };
            const total = Math.max(0, (a.total || 0) + (b.total || 0));
            const wrong = Math.max(0, Math.min(total, (a.wrong || 0) + (b.wrong || 0)));
            merged.push({ total, wrong });
        }
        out[skill] = merged;
    });
    return out;
}

/**
 * Takrorlanuvchi xatolarni birlashtiradi va eng ko'p uchraydigan 30 tasini qoldiradi.
 *
 * Kalit sifatida normallashtirilgan matn ishlatiladi ("Government" va "government"
 * bitta yozuv), ko'rsatiladigan matn esa oxirgi ko'ringan variantda qoladi.
 */
function addRepeated(base, incoming) {
    const map = new Map();
    (Array.isArray(base) ? base : []).forEach((row) => {
        if (row?.key) map.set(row.key, { ...row });
    });

    (Array.isArray(incoming) ? incoming : []).forEach((row) => {
        if (!row?.key) return;
        const prev = map.get(row.key);
        if (prev) {
            prev.count += row.count || 1;
            prev.text = row.text || prev.text;
            prev.family = row.family || prev.family;
            if (row.lastSeen) prev.lastSeen = row.lastSeen;
        } else {
            map.set(row.key, { ...row, count: row.count || 1 });
        }
    });

    return [...map.values()]
        .sort((a, b) => b.count - a.count || (b.lastSeen || 0) - (a.lastSeen || 0))
        .slice(0, REPEATED_LIMIT);
}

/** Haftalik chelaklarni qo'shadi va eng eskilarini kesadi. */
function addWeeks(base, incoming) {
    const out = { ...(base || {}) };
    Object.entries(incoming || {}).forEach(([key, bucket]) => {
        const prev = out[key] || { total: 0, correct: 0, minutes: 0, attempts: 0, byType: {} };
        out[key] = {
            total: Math.max(0, prev.total + (Number(bucket.total) || 0)),
            correct: Math.max(0, prev.correct + (Number(bucket.correct) || 0)),
            minutes: Math.max(0, prev.minutes + (Number(bucket.minutes) || 0)),
            attempts: Math.max(0, prev.attempts + (Number(bucket.attempts) || 0)),
            byType: addTypeStats(prev.byType, bucket.byType),
            ...(bucket.band ? { band: bucket.band } : prev.band ? { band: prev.band } : {})
        };
    });

    // Eng yangi WEEK_LIMIT ta hafta qoladi. Kalit leksikografik tartibda ham
    // xronologik ("2026-W02" < "2026-W10"), chunki hafta raqami nol bilan to'ldirilgan.
    const keys = Object.keys(out).sort();
    if (keys.length > WEEK_LIMIT) {
        keys.slice(0, keys.length - WEEK_LIMIT).forEach((key) => delete out[key]);
    }
    return out;
}

/**
 * Vaqt statistikasini qo'shadi.
 *
 * `weeks` kabi XOM FAOLIYAT: har bir urinish sanaladi, deduplikatsiya yo'q.
 * Sabab — bu ko'nikma emas, ODAT o'lchovi: bitta testni uch marta ishlab, uch
 * marta oxirida shoshgan o'quvchida muammo aynan shu takrorda ko'rinadi.
 */
function addTiming(base, incoming) {
    const prev = base || { tests: 0, rushed: 0, ranOut: 0, quarters: [0, 0, 0, 0] };
    const prevQuarters = Array.isArray(prev.quarters) ? prev.quarters : [0, 0, 0, 0];
    const nextQuarters = Array.isArray(incoming?.quarters) ? incoming.quarters : [0, 0, 0, 0];

    return {
        tests: Math.max(0, prev.tests + (Number(incoming?.tests) || 0)),
        rushed: Math.max(0, prev.rushed + (Number(incoming?.rushed) || 0)),
        ranOut: Math.max(0, prev.ranOut + (Number(incoming?.ranOut) || 0)),
        quarters: [0, 1, 2, 3].map((i) =>
            Math.max(0, (Number(prevQuarters[i]) || 0) + (Number(nextQuarters[i]) || 0))
        )
    };
}

/** Reading/Listening ko'nikma jamlanmasini qo'shadi. */
function addTestSkill(base, incoming) {
    const prev = base || {
        tests: 0, total: 0, correct: 0, bestBand: 0, lastBand: null, nearMiss: 0, mistakes: 0
    };
    const total = Math.max(0, prev.total + (Number(incoming.total) || 0));
    const correct = Math.max(0, Math.min(total, prev.correct + (Number(incoming.correct) || 0)));

    // Yaqin marra xatolari `correct` bilan bir xil semantikada bo'lishi SHART:
    // ular ball arifmetikasida ishlatiladi (`correct + nearMiss` → band). Ikkalasi
    // ham test bo'yicha deduplikatsiya qilingan, ya'ni yig'indi `total` dan oshmaydi.
    const mistakes = Math.max(0, Math.min(total - correct, prev.mistakes + (Number(incoming.mistakes) || 0)));

    return {
        tests: Math.max(0, prev.tests + (Number(incoming.tests) || 0)),
        total,
        correct,
        mistakes,
        nearMiss: Math.max(0, Math.min(mistakes, prev.nearMiss + (Number(incoming.nearMiss) || 0))),
        bestBand: Math.max(Number(prev.bestBand) || 0, Number(incoming.band) || 0),
        lastBand: incoming.band != null ? Number(incoming.band) : prev.lastBand ?? null
    };
}

/**
 * Writing/Speaking mezonlarini qo'shadi.
 *
 * O'rtacha oldindan hisoblanmaydi — yig'indi va son saqlanadi, klient bo'ladi.
 * Sabab: oldindan hisoblangan o'rtachani yangi topshiriq bilan qayta hisoblash
 * uchun baribir eski sonni bilish kerak, va yaxlitlash xatosi to'planib boradi.
 */
function addCriteria(base, incoming) {
    const prev = base || { tasks: 0, criteriaSum: {}, latest: null };
    const criteriaSum = { ...prev.criteriaSum };

    Object.entries(incoming?.criteria || {}).forEach(([key, raw]) => {
        if (!SAFE_KEY.test(key)) return;
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) return;
        criteriaSum[key] = (Number(criteriaSum[key]) || 0) + value;
    });

    return {
        tasks: Math.max(0, prev.tasks + (Number(incoming.tasks) || 0)),
        criteriaSum,
        latest: incoming.criteria || prev.latest || null,
        errorTypes: addCounts(prev.errorTypes, incoming.errorTypes)
    };
}

// ───────────────────────────────────────────────────────────────────────────
// Delta quruvchilar — chaqiruvchi funksiyalar shu yerdan foydalanadi
// ───────────────────────────────────────────────────────────────────────────

/**
 * Reading/Listening topshirig'idan delta quradi.
 *
 * @param {object} input
 * @param {string} input.skill         'reading' | 'listening'
 * @param {object} input.typeStats     Joriy urinishning savol turlari kesimi
 * @param {object} [input.prevTypeStats] Shu test bo'yicha OLDINGI urinish kesimi.
 *        Berilsa, u ayiriladi — jamlanmada har testdan faqat oxirgi urinish qoladi.
 * @param {Array}  [input.mistakes]    `evaluateTest` qaytargan xom xatolar
 * @param {{nearMiss: number, classified: number}} [input.prevMistakeStats]
 *        Shu test bo'yicha OLDINGI urinishning `summarizeMistakeBatch` natijasi.
 *        Ko'nikma kesimidagi `nearMiss` shundan ayiriladi.
 * @param {Array}  [input.partBreakdown] `[{total, mistakes}]` passage kesimi
 * @param {number} [input.band]
 * @param {number} [input.timeSpent]   soniyada
 * @param {Date}   [input.date]
 * @param {boolean}[input.isFirstAttempt] Test birinchi marta ishlanayaptimi
 * @param {string} input.sourceId      Idempotentlik kaliti (attemptId)
 */
function buildTestDelta(input) {
    const {
        skill,
        typeStats = {},
        prevTypeStats = null,
        mistakes = [],
        prevMistakeStats = null,
        partBreakdown = [],
        prevPartBreakdown = null,
        band = 0,
        timeSpent = 0,
        timing = null,
        date = new Date(),
        isFirstAttempt = true,
        sourceId = null
    } = input;

    // Oxirgi urinish semantikasi: jamlanmaga faqat oldingi urinishdan farqi qo'shiladi.
    const byType = diffTypeStats(prevTypeStats, typeStats);

    const totals = Object.values(typeStats).reduce(
        (acc, stat) => ({
            total: acc.total + (Number(stat?.total) || 0),
            correct: acc.correct + (Number(stat?.correct) || 0)
        }),
        { total: 0, correct: 0 }
    );

    const prevTotals = Object.values(prevTypeStats || {}).reduce(
        (acc, stat) => ({
            total: acc.total + (Number(stat?.total) || 0),
            correct: acc.correct + (Number(stat?.correct) || 0)
        }),
        { total: 0, correct: 0 }
    );

    // Passage kesimi ham deduplikatsiya qilinadi — qayta urinishda faqat farq qo'shiladi.
    // `evaluateTest` uni `{total, mistakes}` shaklida beradi, jamlanmada esa `wrong`.
    const parts = diffParts(
        prevPartBreakdown?.map((p) => ({ total: p?.total, wrong: p?.mistakes })),
        partBreakdown.map((p) => ({ total: p?.total, wrong: p?.mistakes }))
    );

    const { patterns, repeated, nearMissCount, classifiedTotal } = classifyBatch(mistakes, date);

    return {
        sourceId,
        testsCounted: isFirstAttempt ? 1 : 0,

        byType,
        byPart: parts.length > 0 ? { [skill]: parts } : {},

        // Hafta — xom faoliyat, ayirishsiz.
        weeks: {
            [isoWeekKey(date)]: {
                total: totals.total,
                correct: totals.correct,
                minutes: Math.round((Number(timeSpent) || 0) / 60),
                attempts: 1,
                byType: typeStats,
                ...(band ? { band: Number(band) } : {})
            }
        },

        skills: {
            [skill]: {
                tests: isFirstAttempt ? 1 : 0,
                total: totals.total - prevTotals.total,
                correct: totals.correct - prevTotals.correct,
                // Deduplikatsiya: `correct` bilan bir xil semantika (yuqoridagi
                // ISTISNO izohiga qarang).
                nearMiss: nearMissCount - (Number(prevMistakeStats?.nearMiss) || 0),
                mistakes: classifiedTotal - (Number(prevMistakeStats?.classified) || 0),
                band: Number(band) || 0
            }
        },

        patterns,
        repeated,
        nearMiss: { count: nearMissCount, ofTotal: classifiedTotal },

        // Vaqt tahlili faqat yetarli javob bo'lganda quriladi — `null` bo'lsa
        // jamlanmaga umuman tegilmaydi.
        timing: timing
            ? {
                tests: 1,
                rushed: timing.rushed ? 1 : 0,
                ranOut: timing.ranOut ? 1 : 0,
                quarters: timing.quarters
            }
            : null
    };
}

/**
 * Writing tekshiruvidan delta quradi.
 *
 * `checkWriting` ikkita task uchun alohida `criteria` va xatolar ro'yxatini
 * qaytaradi. Bu yerda ular bitta topshiriq sifatida yig'iladi — o'quvchi uchun
 * "Writing bandim" bitta son.
 */
function buildWritingDelta({ aiReview, sourceId = null }) {
    const tasks = [aiReview?.task1, aiReview?.task2].filter(Boolean);
    if (tasks.length === 0) return null;

    const criteria = {};
    WRITING_CRITERIA.forEach((key) => {
        const values = tasks
            .map((task) => Number(task?.criteria?.[key]?.band))
            .filter((n) => Number.isFinite(n) && n > 0);
        if (values.length > 0) {
            criteria[key] = values.reduce((sum, n) => sum + n, 0) / values.length;
        }
    });

    // AI xatolarni tur bo'yicha belgilaydi ("tense", "article"). Tur bo'lmasa
    // "other" ga tushadi — bu maydon promptga qo'shilgunga qadar shunday qoladi.
    const errorTypes = {};
    tasks.forEach((task) => {
        [...(task?.grammarErrors || []), ...(task?.lexicalErrors || [])].forEach((err) => {
            // `checkWriting` turni allaqachon kanonik nomga keltiradi, lekin
            // qayta qurish eski hujjatlarni ham o'qiydi — o'sha yerda xom qiymat
            // uchrashi mumkin. Ikkinchi normalizatsiya arzon va jamlanmaning
            // bir xil kalitlar bilan to'ldirilishini kafolatlaydi.
            const key = canonicalWritingError(err?.type);
            errorTypes[SAFE_KEY.test(key) ? key : "other"] = (errorTypes[key] || 0) + 1;
        });
    });

    return {
        sourceId,
        writing: { tasks: 1, criteria, errorTypes }
    };
}

/** Speaking baholashidan delta quradi. */
function buildSpeakingDelta({ bands, corrections = [], date = new Date(), sourceId = null }) {
    const criteria = {};
    Object.entries(bands || {}).forEach(([key, value]) => {
        const num = Number(value);
        if (Number.isFinite(num) && num > 0) criteria[key] = num;
    });

    const repeated = corrections
        .map((item) => {
            const text = String(item?.better || "").trim();
            const key = normalizeString(text);
            if (!key) return null;
            return { key, text: text.slice(0, 120), family: "speaking", count: 1, lastSeen: date.getTime() };
        })
        .filter(Boolean);

    return {
        sourceId,
        speaking: { tasks: 1, criteria },
        repeated
    };
}

/**
 * Bitta urinishdagi xatolarni ikki songa siqadi: tasniflanganlari va ulardan
 * nechtasi "yaqin marra".
 *
 * Natija hujjatiga `mistakeStats` sifatida yoziladi, chunki keyingi urinishda
 * FARQNI hisoblash uchun oldingi urinishning shu ikki soni kerak bo'ladi —
 * xuddi `typeStats` kabi.
 *
 * @param {Array} mistakes `evaluateTest` qaytargan xom xatolar
 * @returns {{nearMiss: number, classified: number}}
 */
function summarizeMistakeBatch(mistakes) {
    const { nearMissCount, classifiedTotal } = classifyBatch(mistakes, new Date());
    return { nearMiss: nearMissCount, classified: classifiedTotal };
}

/**
 * Xom xatolar ro'yxatini sabablar kesimiga aylantiradi.
 *
 * Klientdagi `useStudentAnalytics` bilan bir xil qoidalar: kalitsiz yozuv va
 * sababi aniqlanmagan yozuv (javob kalitga aynan teng) tashlanadi — ular xato
 * emas, test tuzilishidagi bo'shliq.
 */
function classifyBatch(mistakes, date) {
    const patterns = {};
    const repeated = [];
    let classifiedTotal = 0;
    let nearMissCount = 0;

    (Array.isArray(mistakes) ? mistakes : []).forEach((raw) => {
        const classified = classifyMistake(raw);
        if (!classified.correctText || !classified.pattern) return;

        patterns[classified.pattern] = (patterns[classified.pattern] || 0) + 1;
        classifiedTotal += 1;
        if (NEAR_MISS_PATTERNS.includes(classified.pattern)) nearMissCount += 1;

        const key = normalizeString(classified.correctText);
        if (key) {
            repeated.push({
                key,
                text: classified.correctText.slice(0, 120),
                family: raw?.questionType || "other",
                count: 1,
                lastSeen: date.getTime()
            });
        }
    });

    return { patterns, repeated, nearMissCount, classifiedTotal };
}

// ───────────────────────────────────────────────────────────────────────────
// Yozish
// ───────────────────────────────────────────────────────────────────────────

/** Bo'sh summary. */
function emptySummary() {
    return {
        version: SUMMARY_VERSION,
        testsCounted: 0,
        byType: {},
        byPart: {},
        weeks: {},
        patterns: {},
        repeated: [],
        nearMiss: { count: 0, ofTotal: 0 },
        skills: {},
        timing: { tests: 0, rushed: 0, ranOut: 0, quarters: [0, 0, 0, 0] },
        appliedIds: []
    };
}

/** Deltani mavjud summary ustiga qo'yadi. Sof funksiya — tranzaksiyadan tashqarida ham sinaladi. */
function mergeDelta(summary, delta) {
    const base = summary || emptySummary();
    const next = {
        ...base,
        version: SUMMARY_VERSION,
        testsCounted: Math.max(0, (base.testsCounted || 0) + (delta.testsCounted || 0)),
        byType: addTypeStats(base.byType, delta.byType),
        byPart: addParts(base.byPart, delta.byPart),
        weeks: addWeeks(base.weeks, delta.weeks),
        patterns: addCounts(base.patterns, delta.patterns),
        repeated: addRepeated(base.repeated, delta.repeated),
        nearMiss: {
            count: Math.max(0, (base.nearMiss?.count || 0) + (delta.nearMiss?.count || 0)),
            ofTotal: Math.max(0, (base.nearMiss?.ofTotal || 0) + (delta.nearMiss?.ofTotal || 0))
        },
        skills: { ...(base.skills || {}) },
        timing: delta.timing ? addTiming(base.timing, delta.timing) : (base.timing || null)
    };

    Object.entries(delta.skills || {}).forEach(([skill, stat]) => {
        next.skills[skill] = addTestSkill(next.skills[skill], stat);
    });

    if (delta.writing) next.skills.writing = addCriteria(next.skills.writing, delta.writing);
    if (delta.speaking) next.skills.speaking = addCriteria(next.skills.speaking, delta.speaking);

    if (delta.sourceId) {
        next.appliedIds = [...(base.appliedIds || []), delta.sourceId].slice(-APPLIED_LIMIT);
    }

    return next;
}

/**
 * Deltani `analyticsSummaries/{uid}` ga qo'llaydi.
 *
 * Chaqiruvchi hech qachon bu chaqiruvni kutib qolmasligi kerak: analitikaning
 * yangilanmasligi topshiriqni bekor qilish uchun sabab emas. Shuning uchun
 * funksiya xatolikni o'zi yutadi va faqat `false` qaytaradi — chaqiruvchi
 * `await` qiladi, lekin `try/catch` yozishi shart emas.
 *
 * @returns {Promise<boolean>} qo'llandimi (takroriy chaqiruvda `false`)
 */
async function applyRollup(db, userId, delta) {
    if (!userId || !delta) return false;

    const ref = db.collection(COLLECTION).doc(userId);

    try {
        return await db.runTransaction(async (transaction) => {
            const snap = await transaction.get(ref);
            const current = snap.exists ? snap.data() : null;

            // Takroriy yuborish: bir xil urinish ikki marta hisoblanmasin.
            if (delta.sourceId && (current?.appliedIds || []).includes(delta.sourceId)) {
                return false;
            }

            const next = mergeDelta(current, delta);
            next.updatedAt = admin.firestore.FieldValue.serverTimestamp();

            transaction.set(ref, next);
            return true;
        });
    } catch (error) {
        // Analitika ikkinchi darajali: topshiriq allaqachon saqlangan, summary esa
        // keyingi topshiriqda yoki `rebuildSummary` da tiklanadi.
        console.error(`[analyticsRollup] applyRollup xatolik (uid=${userId}):`, error);
        return false;
    }
}

/**
 * Summary'ni tarixdan boshqatdan quradi.
 *
 * Ikki holatda chaqiriladi: (1) summary hali yo'q eski foydalanuvchi sahifani
 * ochganda — bir martalik migratsiya; (2) sxema versiyasi eskirganda.
 *
 * ANIQLIK HAQIDA: `results` da har testdan faqat oxirgi urinish `typeStats` i
 * turadi, ya'ni `byType`/`skills` inkremental yo'l bilan yig'ilganiga to'liq mos
 * keladi. `patterns` esa `mistakeSessions` dan tiklanadi va o'qish chegarasi
 * bilan cheklangan — juda faol o'quvchida bu sonlar haqiqiy umrbod jamlanmadan
 * past chiqishi mumkin. Bu ataylab qilingan almashuv: bir martalik migratsiya
 * uchun 200 ta o'qish yetarli, undan ortig'i foizlarni sezilarli o'zgartirmaydi.
 *
 * KO'NIKMA ATRIBUTSIYASI: eski `mistakeSessions` hujjatlarida `skill` maydoni
 * yo'q (u faqat shu o'zgarishdan keyin yozila boshladi). Shuning uchun sessiya
 * `testId` orqali natija hujjatiga ulanadi va ko'nikma o'shandan olinadi.
 * Natijalar oynasidan tashqarida qolgan juda eski sessiya faqat global
 * `patterns` ga qo'shiladi — ball ta'siri hisobiga kirmaydi. Bu to'g'ri tanlov:
 * noaniq atributsiya band arifmetikasini buzardi.
 */
async function rebuildSummary(db, userId) {
    const [resultsSnap, sessionsSnap] = await Promise.all([
        db.collection("results")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .limit(REBUILD_RESULT_LIMIT)
            .get()
            .catch(() => ({ docs: [] })),
        db.collection("users").doc(userId).collection("mistakeSessions")
            .orderBy("date", "desc")
            .limit(REBUILD_SESSION_LIMIT)
            .get()
            .catch(() => ({ docs: [] }))
    ]);

    let summary = emptySummary();

    // `mistakeSessions` ni ko'nikmaga ulash uchun: testId → 'reading' | 'listening'.
    const testSkill = new Map();

    resultsSnap.docs.forEach((doc) => {
        const data = doc.data();
        const skill = String(data.type || "").toLowerCase().trim();
        const date = toDate(data.createdAt) || toDate(data.date) || new Date();

        if (skill === "reading" || skill === "listening") {
            if (data.testId) testSkill.set(String(data.testId), skill);
            const typeStats = data.typeStats || {};
            const attempts = Array.isArray(data.attempts) ? data.attempts : [];
            const minutes = attempts.reduce((sum, a) => sum + (Number(a?.timeSpent) || 0), 0) / 60;

            summary = mergeDelta(summary, {
                testsCounted: Object.keys(typeStats).length > 0 ? 1 : 0,
                byType: typeStats,
                byPart: Array.isArray(data.partBreakdown) && data.partBreakdown.length > 0
                    ? { [skill]: data.partBreakdown.map((p) => ({
                        total: Number(p?.total) || 0,
                        wrong: Number(p?.mistakes) || 0
                    })) }
                    : {},
                weeks: {
                    [isoWeekKey(date)]: {
                        total: Number(data.totalQuestions) || 0,
                        correct: Number(data.latestScore ?? data.score) || 0,
                        minutes: Math.round(minutes),
                        attempts: attempts.length || 1,
                        byType: typeStats,
                        ...(data.latestBandScore ? { band: Number(data.latestBandScore) } : {})
                    }
                },
                skills: {
                    [skill]: {
                        tests: 1,
                        total: Number(data.totalQuestions) || 0,
                        correct: Number(data.latestScore ?? data.score) || 0,
                        band: Number(data.bestBandScore ?? data.bandScore) || 0
                    }
                }
            });
        }

        if (data.aiReview) {
            const delta = buildWritingDelta({ aiReview: data.aiReview });
            if (delta) summary = mergeDelta(summary, delta);
        }
    });

    // Ko'nikma kesimidagi `nearMiss` deduplikatsiya qilingan bo'lishi kerak, ya'ni
    // har testdan faqat ENG SO'NGGI sessiya. Sessiyalar sana bo'yicha kamayish
    // tartibida kelgani uchun birinchi uchragani eng yangisi bo'ladi.
    const newestSessionPerTest = new Set();

    sessionsSnap.docs.forEach((doc) => {
        const data = doc.data();
        const date = toDate(data.date) || new Date();

        if (data.skill === "speaking") {
            summary = mergeDelta(summary, buildSpeakingDelta({
                bands: data.bands,
                corrections: (data.mistakes || []).map((m) => ({ better: m.correctAnswer })),
                date
            }));
            return;
        }

        const { patterns, repeated, nearMissCount, classifiedTotal } = classifyBatch(data.mistakes, date);

        // Ko'nikma — sessiyaning o'zidan (yangi yozuvlar) yoki natija hujjatidan (eski).
        const skill = data.skill || testSkill.get(String(data.testId || ""));
        const isNewest = data.testId && !newestSessionPerTest.has(String(data.testId));
        if (data.testId) newestSessionPerTest.add(String(data.testId));

        summary = mergeDelta(summary, {
            patterns,
            repeated,
            nearMiss: { count: nearMissCount, ofTotal: classifiedTotal },
            skills: (skill === "reading" || skill === "listening") && isNewest
                ? { [skill]: { nearMiss: nearMissCount, mistakes: classifiedTotal } }
                : {}
        });
    });

    summary.rebuiltAt = admin.firestore.FieldValue.serverTimestamp();
    summary.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.collection(COLLECTION).doc(userId).set(summary);
    return summary;
}

module.exports = {
    COLLECTION,
    SUMMARY_VERSION,
    applyRollup,
    rebuildSummary,
    buildTestDelta,
    buildWritingDelta,
    buildSpeakingDelta,
    summarizeMistakeBatch,
    // Sinov va qayta ishlatish uchun ochilgan sof funksiyalar:
    mergeDelta,
    emptySummary,
    isoWeekKey
};

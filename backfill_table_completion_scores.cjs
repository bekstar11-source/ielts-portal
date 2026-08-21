/**
 * Bir martalik migratsiya: table completion xatosidan keyin saqlangan
 * natijalarni QAYTA hisoblaydi.
 *
 * MUAMMO
 * ──────
 * Jadval savollari (`table_completion`) ball hisobidan tushib qolardi:
 *   • massiv ko'rinishidagi qatorlar (`rows: [[cell, cell]]`) umuman ko'rilmasdi;
 *   • katakcha ichidagi input `other` turiga yozilardi;
 *   • kalit `items` da turgan savol "kalit yo'q" deb belgilanardi.
 * Natijada 40 talik test 34 talik bo'lib saqlangan va band noto'g'ri chiqqan.
 *
 * NEGA SHUNCHAKI QAYTA HISOBLAB QO'YMAYMIZ
 * ────────────────────────────────────────
 * Test hujjati topshiriqdan keyin TAHRIRLANGAN bo'lishi mumkin (admin javob
 * kalitini o'zgartirgan). Bunday natijani bugungi kalit bilan qayta hisoblash
 * tuzatish emas — tarixni buzish bo'lardi.
 *
 * Shuning uchun har bir urinish IKKI marta hisoblanadi:
 *   1. ESKI dvigatel bilan (git dan `--legacy-ref` bo'yicha olinadi);
 *   2. TUZATILGAN dvigatel bilan.
 * Agar eski dvigatel saqlangan ball bilan mos kelmasa — demak farq boshqa
 * sababdan (test tahrirlangan), bunday hujjatga TEGILMAYDI va u hisobotda
 * `unverified` deb ko'rsatiladi. Faqat "eski = saqlangan" bo'lgan hujjatlar
 * yoziladi, ya'ni yoziladigan farq aynan shu tuzatishning natijasi.
 *
 * ANALITIKA
 * ─────────
 * `analyticsSummaries` yozuv paytida jamlanadi (delta bilan), shuning uchun uni
 * "tuzatib" bo'lmaydi — lekin qayta QURISH mumkin. Skript ta'sirlangan
 * o'quvchilarning jamlanmasiga `version: 0` qo'yadi: klient versiyani mos
 * kelmadi deb ko'radi va `/analytics` ga kirganda `rebuildAnalyticsSummary`
 * ni chaqiradi — jamlanma tuzatilgan natijalardan qaytadan quriladi.
 *
 * Ishlatish:
 *   export GCLOUD_ACCESS_TOKEN=$(gcloud auth print-access-token)
 *   node backfill_table_completion_scores.cjs                  # faqat ko'rsatadi
 *   node backfill_table_completion_scores.cjs --user <uid>     # bitta o'quvchi
 *   node backfill_table_completion_scores.cjs --limit 50       # birinchi 50 ta hujjat
 *   node backfill_table_completion_scores.cjs --json hisobot.json
 *   node backfill_table_completion_scores.cjs --apply          # YOZADI
 *   node backfill_table_completion_scores.cjs --apply --fix-users  # + leaderboard bandlari
 *
 * TAVSIYA: avval `--user` bilan bitta o'quvchida sinab ko'ring, keyin to'liq ishga tushiring.
 */

const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT = 'ielts-portal-v1';

// Tuzatishdan OLDINGI `functions/ieltsScoring.js` shu commitda turibdi.
// Qattiq yozilgan: `HEAD` ishlatilsa, tuzatish commit qilingandan keyin skript
// eski dvigatel o'rniga yangisini yuklab, tekshiruvni ma'nosiz qilib qo'yardi.
const DEFAULT_LEGACY_REF = '1781fd25cd631eb07de065e487022317e9675406';

const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(name);
const flagValue = (name, fallback = null) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const APPLY = hasFlag('--apply');
const FIX_USERS = hasFlag('--fix-users');
const ONLY_USER = flagValue('--user');
const LIMIT = Number(flagValue('--limit', '0')) || 0;
const JSON_OUT = flagValue('--json');
const LEGACY_REF = flagValue('--legacy-ref', DEFAULT_LEGACY_REF);

const accessToken = process.env.GCLOUD_ACCESS_TOKEN;
if (!accessToken && require.main === module) {
    console.error("GCLOUD_ACCESS_TOKEN o'rnatilmagan.");
    console.error('Ishlatish: export GCLOUD_ACCESS_TOKEN=$(gcloud auth print-access-token)');
    process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Ikkala baholash dvigateli
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Eski dvigatelni git dan vaqtinchalik papkaga chiqaradi.
 * `ieltsScoring.js` yonida `questionTypes.js` ham bo'lishi shart — u nisbiy
 * yo'l bilan (`require("./questionTypes")`) chaqiriladi.
 */
function loadLegacyEngine(ref) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-scoring-'));
    for (const name of ['ieltsScoring.js', 'questionTypes.js']) {
        const source = execFileSync('git', ['show', `${ref}:functions/${name}`], {
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024
        });
        fs.writeFileSync(path.join(dir, name), source);
    }
    return require(path.join(dir, 'ieltsScoring.js'));
}

const legacy = loadLegacyEngine(LEGACY_REF);
const fixed = require('./functions/ieltsScoring.js');
const { summarizeMistakeBatch } = require('./functions/analyticsRollup.js');

// ─────────────────────────────────────────────────────────────────────────────
// Firestore REST
// ─────────────────────────────────────────────────────────────────────────────

const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function request(url, { method = 'GET', body = null } = {}) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = https.request(url, {
            method,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {})
            }
        }, (res) => {
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${data.slice(0, 400)}`));
                    else resolve(parsed);
                } catch (err) { reject(err); }
            });
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

/** Firestore qiymatini oddiy JS ga o'giradi. */
function dec(v) {
    if (v === null || v === undefined) return v;
    if ('nullValue' in v) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
    if ('mapValue' in v) {
        return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dec(x)]));
    }
    return null;
}

const decFields = (fields) => Object.fromEntries(Object.entries(fields || {}).map(([k, v]) => [k, dec(v)]));

/**
 * Sonni Firestore qiymatiga o'giradi.
 *
 * `original` berilsa, uning TURI saqlanadi: 7.0 band ilgari `doubleValue` bo'lib
 * yozilgan bo'lsa, uni `integerValue` ga aylantirmaymiz. Bu majburiy emas, lekin
 * migratsiyadan keyin hujjatlar bir xil ko'rinishda qolgani ma'qul.
 */
function encNumber(value, original = null) {
    const isInt = Number.isInteger(value);
    if (original && 'doubleValue' in original) return { doubleValue: value };
    if (original && 'integerValue' in original && isInt) return { integerValue: String(value) };
    return isInt ? { integerValue: String(value) } : { doubleValue: value };
}

function enc(value) {
    if (value === null || value === undefined) return { nullValue: null };
    if (typeof value === 'number') return encNumber(value);
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'string') return { stringValue: value };
    if (Array.isArray(value)) return { arrayValue: { values: value.map(enc) } };
    if (typeof value === 'object') {
        return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, enc(v)])) } };
    }
    return { nullValue: null };
}

/** Kolleksiyani sahifama-sahifa o'qiydi. */
async function* listCollection(collection, pageSize = 300) {
    let pageToken = null;
    do {
        const url = `${base}/${collection}?pageSize=${pageSize}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
        const res = await request(url);
        for (const doc of res.documents || []) yield doc;
        pageToken = res.nextPageToken || null;
    } while (pageToken);
}

/** Bitta o'quvchining natijalari (`--user` rejimi). */
async function queryUserResults(uid) {
    const res = await request(`${base}:runQuery`, {
        method: 'POST',
        body: {
            structuredQuery: {
                from: [{ collectionId: 'results' }],
                where: {
                    fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: uid } }
                }
            }
        }
    });
    return res.filter((r) => r.document).map((r) => r.document);
}

const testCache = new Map();
async function fetchTest(testId) {
    if (testCache.has(testId)) return testCache.get(testId);
    let test = null;
    try {
        const doc = await request(`${base}/tests/${testId}`);
        test = { id: testId, ...decFields(doc.fields) };
    } catch (err) {
        if (!/^404/.test(err.message)) throw err; // o'chirilgan test — qayta hisoblab bo'lmaydi
    }
    testCache.set(testId, test);
    return test;
}

// ─────────────────────────────────────────────────────────────────────────────
// Qayta hisoblash
// ─────────────────────────────────────────────────────────────────────────────

const num = (v) => (typeof v === 'number' && !isNaN(v) ? v : 0);
const sameStats = (a, b) => JSON.stringify(a || {}) === JSON.stringify(b || {});

/**
 * Urinishlarni sana bo'yicha tartiblab, ENG SO'NGGIsining indeksini qaytaradi.
 * `arrayUnion` odatda oxiriga qo'shadi, lekin tartibga kafolat bermaydi.
 */
function latestAttemptIndex(attempts) {
    let best = 0;
    let bestTime = -Infinity;
    attempts.forEach((a, i) => {
        const t = new Date(a?.date || 0).getTime();
        if (!isNaN(t) && t >= bestTime) { bestTime = t; best = i; }
    });
    return best;
}

/**
 * Oddiy (reading/listening) natija hujjatini qayta hisoblaydi.
 * @returns {{status: string, reason?: string, changes?: object, patch?: object}}
 */
function recomputeGradedResult(data, rawFields, test) {
    const partNumber = data.partNumber ? Number(data.partNumber) : null;
    const attempts = Array.isArray(data.attempts) ? data.attempts : [];

    if (attempts.length === 0) return { status: 'skipped', reason: 'urinishlar yozuvi yo\'q' };
    if (attempts.some((a) => !a || typeof a.userAnswers !== 'object' || a.userAnswers === null)) {
        return { status: 'skipped', reason: 'urinishda javoblar saqlanmagan (eski sxema)' };
    }

    const evaluated = attempts.map((a) => ({
        old: legacy.evaluateTest(test, a.userAnswers, partNumber),
        neu: fixed.evaluateTest(test, a.userAnswers, partNumber)
    }));

    // ── Tekshiruv darvozasi ──────────────────────────────────────────────────
    // Eski dvigatel saqlangan ballni AYNAN qaytarishi shart. Aks holda farq
    // boshqa sababdan (test tahrirlangan) va biz unga tegmaymiz.
    //
    // Faqat XOM BALL tekshiriladi, band emas: band ilgari boshqa jadval bo'yicha
    // hisoblangan bo'lishi mumkin (Reading uchun bir vaqtlar Listening jadvali
    // ishlatilgan). Bandni ham tekshirsak, deyarli barcha eski Reading natijasi
    // "tekshiruvdan o'tmadi" bo'lib qolardi. Band baribir xom balldan keltirib
    // chiqariladi, ya'ni qayta hisoblanganda o'zi to'g'rilanadi.
    for (let i = 0; i < attempts.length; i++) {
        const stored = num(attempts[i].score);
        if (evaluated[i].old.correctCount !== stored) {
            return {
                status: 'unverified',
                reason: `urinish #${i + 1}: eski dvigatel ${evaluated[i].old.correctCount} ball beradi, saqlangani ${stored} — test tahrirlangan bo'lishi mumkin`
            };
        }
    }

    // ⚠️ Solishtirish ESKI dvigatel bilan YANGISI o'rtasida, saqlangan hujjat bilan
    // emas. Aks holda `typeStats` maydoni umuman yo'q eski natijalar ham "o'zgargan"
    // deb topilib, tuzatishga aloqasi bo'lmagan minglab hujjat qayta yozilardi.
    // Yoziladigan yagona sabab — TUZATISH shu hujjatda biror narsani o'zgartirgani.
    const changedAttempts = evaluated.some((e) =>
        e.old.correctCount !== e.neu.correctCount ||
        e.old.totalQ !== e.neu.totalQ ||
        (e.old.band || 0) !== (e.neu.band || 0) ||
        !sameStats(e.old.typeStats, e.neu.typeStats)
    );
    if (!changedAttempts) return { status: 'unchanged' };

    // ── Yangi qiymatlar ──────────────────────────────────────────────────────
    const latest = latestAttemptIndex(attempts);
    const latestEval = evaluated[latest].neu;

    // `bestScore` — urinishlar bo'ylab maksimum (submitTestAnswers bilan bir xil qoida).
    let bestScore = -1;
    let bestBandScore = 0;
    evaluated.forEach((e) => {
        if (e.neu.correctCount > bestScore) {
            bestScore = e.neu.correctCount;
            bestBandScore = e.neu.band || 0;
        }
    });

    // Bo'limlar kesimi — oxirgi urinish bo'yicha.
    let partBreakdown;
    if (partNumber) {
        const passage = Array.isArray(test.passages) ? test.passages[partNumber - 1] : null;
        partBreakdown = [{
            passageId: passage?.id || null,
            total: latestEval.totalQ,
            mistakes: Math.max(0, latestEval.totalQ - latestEval.correctCount)
        }];
    } else if (Array.isArray(test.passages) && test.passages.length > 0) {
        partBreakdown = test.passages.map((passage, idx) => {
            const r = fixed.evaluateTest(test, attempts[latest].userAnswers, idx + 1);
            return {
                passageId: passage.id || null,
                total: r.totalQ,
                mistakes: Math.max(0, r.totalQ - r.correctCount)
            };
        });
    } else {
        partBreakdown = Array.isArray(data.partBreakdown) ? data.partBreakdown : [];
    }

    let mistakeStats = data.mistakeStats ?? null;
    try {
        mistakeStats = summarizeMistakeBatch(latestEval.mistakes);
    } catch { /* hisoblanmasa eskisi qoladi */ }

    // ── Hujjatga yoziladigan maydonlar ───────────────────────────────────────
    // `attempts` massivini butunligicha qayta yozamiz, LEKIN har bir urinishning
    // XOM qiymatlarini saqlab qolamiz va faqat o'zgargan yaproqlarni almashtiramiz.
    // Shu sabab `userAnswers` qayta kodlanmaydi — migratsiya ularga tegmaydi.
    const rawAttempts = rawFields.attempts?.arrayValue?.values || [];
    const newAttemptValues = rawAttempts.map((rawAttempt, i) => {
        const fields = { ...(rawAttempt.mapValue?.fields || {}) };
        const e = evaluated[i];
        if (!e) return rawAttempt;
        fields.score = encNumber(e.neu.correctCount, fields.score);
        fields.bandScore = encNumber(e.neu.band || 0, fields.bandScore);
        fields.typeStats = enc(e.neu.typeStats || {});
        return { mapValue: { fields } };
    });

    const patch = {
        totalQuestions: encNumber(latestEval.totalQ, rawFields.totalQuestions),
        bestScore: encNumber(bestScore, rawFields.bestScore),
        bestBandScore: encNumber(bestBandScore, rawFields.bestBandScore),
        latestScore: encNumber(latestEval.correctCount, rawFields.latestScore),
        latestBandScore: encNumber(latestEval.band || 0, rawFields.latestBandScore),
        score: encNumber(bestScore, rawFields.score),
        bandScore: encNumber(bestBandScore, rawFields.bandScore),
        typeStats: enc(latestEval.typeStats || {}),
        partBreakdown: enc(partBreakdown),
        mistakeStats: mistakeStats === null ? { nullValue: null } : enc(mistakeStats),
        attempts: { arrayValue: { values: newAttemptValues } }
    };

    return {
        status: 'changed',
        patch,
        changes: {
            totalQuestions: [num(data.totalQuestions), latestEval.totalQ],
            score: [num(data.score), bestScore],
            bandScore: [num(data.bandScore), bestBandScore],
            latestScore: [num(data.latestScore ?? data.score), latestEval.correctCount],
            latestBandScore: [num(data.latestBandScore ?? data.bandScore), latestEval.band || 0]
        },
        // `users.stats.totalBandScore` — topshiriq paytida SAQLANGAN bandlar yig'indisi.
        // Shuning uchun farq ham saqlangan qiymatdan olinadi (dvigatellar farqidan emas):
        // aks holda akkumulyator eski xato bilan qolib ketardi.
        bandSumDelta: evaluated.reduce((sum, e, i) => sum + ((e.neu.band || 0) - num(attempts[i].bandScore)), 0),
        skill: String(data.type || '').toLowerCase(),
        bestBandScore
    };
}

/**
 * Mock imtihon hujjati (`type: "mock_full"`).
 *
 * `loadTest` parametr sifatida olinadi — shu sabab mantiqni tarmoqqa chiqmasdan
 * sinash mumkin.
 */
async function recomputeMockResult(data, rawFields, loadTest = fetchTest) {
    const listeningId = data.subTests?.listening;
    const readingId = data.subTests?.reading;
    if (!listeningId || !readingId) return { status: 'skipped', reason: 'subTests to\'liq emas' };

    const lAns = data.details?.listeningAnswers;
    const rAns = data.details?.readingAnswers;
    if (!lAns || !rAns) return { status: 'skipped', reason: 'javoblar saqlanmagan' };

    const [lTest, rTest] = await Promise.all([loadTest(listeningId), loadTest(readingId)]);
    if (!lTest || !rTest) return { status: 'skipped', reason: 'test hujjati topilmadi (o\'chirilgan)' };

    const lOld = legacy.evaluateTest(lTest, lAns);
    const rOld = legacy.evaluateTest(rTest, rAns);
    const lNew = fixed.evaluateTest(lTest, lAns);
    const rNew = fixed.evaluateTest(rTest, rAns);

    const stored = data.scores || {};
    if (num(stored.listening) !== lOld.correctCount || num(stored.reading) !== rOld.correctCount) {
        return { status: 'unverified', reason: 'eski dvigatel saqlangan ballni qaytarmadi — testlar tahrirlangan bo\'lishi mumkin' };
    }

    // Band jadvali MODUL turidan olinadi — `submitMockExam` dagi bilan bir xil qoida.
    const lBand = fixed.calculateBandScore(lNew.correctCount, 'listening', lNew.totalQ) || 0;
    const rBand = fixed.calculateBandScore(rNew.correctCount, 'reading', rNew.totalQ) || 0;
    const overall = fixed.calculateOverallBand([lBand, rBand]);

    const unchanged =
        lNew.correctCount === lOld.correctCount && rNew.correctCount === rOld.correctCount &&
        lNew.totalQ === lOld.totalQ && rNew.totalQ === rOld.totalQ &&
        num(stored.overallBand) === overall;
    if (unchanged) return { status: 'unchanged' };

    const rawScores = rawFields.scores?.mapValue?.fields || {};
    const scoreFields = { ...rawScores };
    scoreFields.listening = encNumber(lNew.correctCount, rawScores.listening);
    scoreFields.reading = encNumber(rNew.correctCount, rawScores.reading);
    scoreFields.listeningTotal = encNumber(lNew.totalQ, rawScores.listeningTotal);
    scoreFields.readingTotal = encNumber(rNew.totalQ, rawScores.readingTotal);
    scoreFields.listeningBand = encNumber(lBand, rawScores.listeningBand);
    scoreFields.readingBand = encNumber(rBand, rawScores.readingBand);
    scoreFields.overallBand = encNumber(overall, rawScores.overallBand);

    const mergedTypeStats = {};
    [lNew.typeStats, rNew.typeStats].forEach((stats) => {
        Object.entries(stats || {}).forEach(([family, s]) => {
            const prev = mergedTypeStats[family] || { total: 0, correct: 0 };
            mergedTypeStats[family] = { total: prev.total + s.total, correct: prev.correct + s.correct };
        });
    });

    return {
        status: 'changed',
        patch: {
            scores: { mapValue: { fields: scoreFields } },
            bandScore: encNumber(overall, rawFields.bandScore),
            overallBand: encNumber(overall, rawFields.overallBand),
            typeStats: enc(mergedTypeStats)
        },
        changes: {
            listening: [lOld.correctCount, lNew.correctCount],
            reading: [rOld.correctCount, rNew.correctCount],
            overallBand: [num(stored.overallBand), overall]
        },
        bandSumDelta: 0, // mock ball `stats.totalBandScore` ga qo'shilmaydi
        skill: 'mock',
        bestBandScore: 0
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Yozish
// ─────────────────────────────────────────────────────────────────────────────

async function patchDoc(collection, docId, patch, extraQuery = '') {
    const mask = Object.keys(patch).map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    const query = extraQuery ? `${mask}&${extraQuery}` : mask;
    await request(`${base}/${collection}/${docId}?${query}`, { method: 'PATCH', body: { fields: patch } });
}

/**
 * Jamlanmani "eskirgan" deb belgilaydi — klient uni qaytadan quradi.
 * `rebuiltAt` ataylab orqaga suriladi: `rebuildAnalyticsSummary` da bir soatlik
 * sovish oynasi bor, yaqinda qurilgan jamlanma aks holda qayta qurilmasdi.
 */
async function invalidateSummary(uid) {
    try {
        // `currentDocument.exists=true` — PATCH mavjud bo'lmagan hujjatni YARATADI,
        // ya'ni hech qachon analitika ochmagan o'quvchida ham yarim bo'sh jamlanma
        // paydo bo'lardi. Shart qo'yilgach, bunday hujjat chetlab o'tiladi.
        await patchDoc('analyticsSummaries', uid, {
            version: { integerValue: '0' },
            rebuiltAt: { timestampValue: '2020-01-01T00:00:00Z' }
        }, 'currentDocument.exists=true');
        return true;
    } catch (err) {
        // 404 — hujjat yo'q; 400 FAILED_PRECONDITION — shart bajarilmadi (o'sha sabab).
        if (/^40[04]/.test(err.message)) return false;
        throw err;
    }
}

/**
 * Leaderboard bandlari va `stats.totalBandScore`.
 *
 * `perUser.bestBand` — o'quvchining SHU YURISHDA ko'rilgan barcha reading/listening
 * natijalari bo'yicha eng yuqori band (o'zgarganlari ham, o'zgarmaganlari ham).
 * Chaqiruvchi buni faqat `complete` o'quvchilar uchun chaqiradi.
 */
async function fixUserAggregates(uid, perUser) {
    const doc = await request(`${base}/users/${uid}`).catch(() => null);
    if (!doc) return null;
    const raw = doc.fields || {};
    const data = decFields(raw);

    const patch = {};
    const report = { uid, changes: {} };

    ['reading', 'listening'].forEach((skill) => {
        const field = skill === 'reading' ? 'bestReadingBand' : 'bestListeningBand';
        const best = perUser.bestBand[skill];
        if (best === undefined) return;
        const current = num(data[field]);
        // Undan past bo'lsa ham yozamiz: eski qiymat noto'g'ri ball asosida qo'yilgan edi.
        if (current !== best) {
            patch[field] = encNumber(best, raw[field]);
            report.changes[field] = [current, best];
        }
    });

    if (perUser.bandSumDelta !== 0) {
        const stats = raw.stats?.mapValue?.fields || {};
        const currentSum = num(dec(stats.totalBandScore));
        const nextSum = Math.max(0, Math.round((currentSum + perUser.bandSumDelta) * 100) / 100);
        const statsFields = { ...stats, totalBandScore: encNumber(nextSum, stats.totalBandScore) };
        patch.stats = { mapValue: { fields: statsFields } };
        report.changes.totalBandScore = [currentSum, nextSum];
    }

    if (Object.keys(patch).length === 0) return null;
    if (APPLY) await patchDoc('users', uid, patch);
    return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// Asosiy oqim
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (pair) => `${pair[0]} → ${pair[1]}`;

async function run() {
    console.log(`Loyiha: ${PROJECT}`);
    console.log(`Eski dvigatel: ${LEGACY_REF.slice(0, 10)} (functions/ieltsScoring.js)`);
    console.log(`Rejim: ${APPLY ? 'YOZISH (--apply)' : 'faqat ko\'rsatish (dry-run)'}`);
    if (ONLY_USER) console.log(`Filtr: userId = ${ONLY_USER}`);
    if (LIMIT) console.log(`Chegara: ${LIMIT} ta hujjat`);
    console.log('');

    const stats = { seen: 0, changed: 0, unchanged: 0, skipped: 0, unverified: 0, failed: 0 };
    const report = [];
    const perUser = new Map();

    const docs = ONLY_USER
        ? (await queryUserResults(ONLY_USER))[Symbol.iterator]()
        : listCollection('results');

    for await (const doc of docs) {
        if (LIMIT && stats.seen >= LIMIT) break;
        stats.seen += 1;

        const docId = doc.name.split('/').pop();
        const rawFields = doc.fields || {};
        const data = decFields(rawFields);
        const type = String(data.type || '').toLowerCase();

        let outcome;
        try {
            if (type === 'mock_full') {
                outcome = await recomputeMockResult(data, rawFields);
            } else if (type === 'reading' || type === 'listening') {
                if (!data.testId) {
                    outcome = { status: 'skipped', reason: 'testId yo\'q' };
                } else {
                    const test = await fetchTest(data.testId);
                    outcome = test
                        ? recomputeGradedResult(data, rawFields, test)
                        : { status: 'skipped', reason: 'test hujjati topilmadi (o\'chirilgan)' };
                }
            } else {
                outcome = { status: 'skipped', reason: `qayta hisoblanmaydigan tur: ${type || '(yo\'q)'}` };
            }
        } catch (err) {
            outcome = { status: 'failed', reason: err.message };
        }

        stats[outcome.status] = (stats[outcome.status] || 0) + 1;

        const uid = data.userId;
        const skill = String(data.type || '').toLowerCase();
        const isGraded = skill === 'reading' || skill === 'listening';
        if (uid && !perUser.has(uid)) perUser.set(uid, { bandSumDelta: 0, bestBand: {}, touched: false, complete: true });
        const entry = uid ? perUser.get(uid) : null;

        if (outcome.status === 'unverified' || outcome.status === 'failed') {
            // Bu hujjatning to'g'ri bandi noma'lum → o'quvchining eng yuqori bandini
            // qayta hisoblab bo'lmaydi (`--fix-users` uni chetlab o'tadi).
            if (entry && isGraded) entry.complete = false;
            report.push({ docId, userId: uid, status: outcome.status, reason: outcome.reason });
            console.log(`  ⚠ ${docId} [${outcome.status}] ${outcome.reason}`);
            continue;
        }

        // ⚠️ Eng yuqori band O'ZGARMAGAN natijalarni ham hisobga olishi SHART.
        // Aks holda boshqa testda 8.0 olgan o'quvchining bandi shu yerda qayta
        // hisoblangan 6.0 gacha TUSHIB ketardi — ya'ni migratsiya to'g'ri
        // ma'lumotni buzardi.
        if (entry && isGraded && outcome.status !== 'skipped') {
            const docBest = outcome.status === 'changed'
                ? (outcome.bestBandScore || 0)
                : num(data.bestBandScore ?? data.bandScore);
            entry.bestBand[skill] = Math.max(entry.bestBand[skill] ?? 0, docBest);
        }
        // Qayta hisoblab bo'lmagan (skipped) natija ham eng yuqori bandga da'vogar
        // bo'lishi mumkin, lekin uni tekshira olmaymiz — o'quvchi "to'liq emas".
        if (entry && isGraded && outcome.status === 'skipped') entry.complete = false;

        if (outcome.status !== 'changed') continue;

        const line = Object.entries(outcome.changes).map(([k, v]) => `${k}: ${fmt(v)}`).join(', ');
        console.log(`  ${APPLY ? '✓' : '[dry-run]'} ${docId} (${uid || '?'}) — ${line}`);
        const entryReport = { docId, userId: uid, status: 'changed', changes: outcome.changes };
        report.push(entryReport);

        if (APPLY) {
            try {
                await patchDoc('results', docId, outcome.patch);
            } catch (err) {
                stats.changed -= 1;
                stats.failed += 1;
                entryReport.status = 'failed';
                entryReport.reason = err.message;
                if (entry && isGraded) entry.complete = false;
                console.log(`    ✗ yozilmadi: ${err.message}`);
                continue;
            }
        }

        if (entry) {
            entry.touched = true;
            entry.bandSumDelta += outcome.bandSumDelta || 0;
        }
    }

    // ── Analitika jamlanmasi ─────────────────────────────────────────────────
    // Faqat natijasi HAQIQATDA o'zgargan o'quvchilar (`touched`).
    const touchedUsers = [...perUser.entries()].filter(([, e]) => e.touched);
    console.log('');
    console.log(`Ta'sirlangan o'quvchilar: ${touchedUsers.length} ta`);
    let invalidated = 0;
    if (touchedUsers.length > 0) {
        if (APPLY) {
            for (const [uid] of touchedUsers) {
                if (await invalidateSummary(uid)) invalidated += 1;
            }
            console.log(`  ✓ ${invalidated} ta analitika jamlanmasi eskirgan deb belgilandi ` +
                        `(o'quvchi /analytics ga kirganda qaytadan quriladi).`);
        } else {
            console.log(`  [dry-run] ${touchedUsers.length} ta analitika jamlanmasi eskirgan deb belgilanardi.`);
        }
    }

    // ── Foydalanuvchi darajasidagi jamlanmalar ───────────────────────────────
    if (FIX_USERS) {
        if (LIMIT) {
            console.log('\n⚠ --fix-users --limit bilan ishlamaydi: chegaralangan yurishda o\'quvchining ' +
                        'barcha natijalari ko\'rilmaydi, ya\'ni eng yuqori band noto\'g\'ri chiqadi.');
        } else {
            console.log('');
            for (const [uid, entry] of touchedUsers) {
                if (!entry.complete) {
                    console.log(`  ⊘ users/${uid} — o'tkazib yuborildi: bu o'quvchining ba'zi natijalari ` +
                                `qayta hisoblanmadi, eng yuqori bandni ishonchli aniqlab bo'lmaydi.`);
                    continue;
                }
                const fixedUser = await fixUserAggregates(uid, entry);
                if (fixedUser) {
                    const line = Object.entries(fixedUser.changes).map(([k, v]) => `${k}: ${fmt(v)}`).join(', ');
                    console.log(`  ${APPLY ? '✓' : '[dry-run]'} users/${uid} — ${line}`);
                }
            }
        }
    }

    // ── Xulosa ───────────────────────────────────────────────────────────────
    console.log('\n── Xulosa ──────────────────────────────');
    console.log(`  Ko'rilgan hujjatlar : ${stats.seen}`);
    console.log(`  O'zgartirilgan      : ${stats.changed}`);
    console.log(`  O'zgarishsiz        : ${stats.unchanged}`);
    console.log(`  Tashlab ketilgan    : ${stats.skipped}`);
    console.log(`  Tekshiruvdan o'tmadi: ${stats.unverified}  (test tahrirlangan — qo'lda ko'rib chiqing)`);
    console.log(`  Xatolik             : ${stats.failed}`);

    if (JSON_OUT) {
        fs.writeFileSync(JSON_OUT, JSON.stringify({ stats, report, ranAt: new Date().toISOString(), apply: APPLY }, null, 2));
        console.log(`\nTo'liq hisobot: ${JSON_OUT}`);
    }

    if (!APPLY && stats.changed > 0) {
        console.log('\nYozish uchun: node backfill_table_completion_scores.cjs --apply');
    }
}

// To'g'ridan-to'g'ri ishga tushirilgandagina yuriladi. `require` qilinganda esa
// faqat sof funksiyalarni beradi — migratsiya mantig'i tarmoqqa chiqmasdan
// sinaladi (`functions/backfillTableCompletionScores.test.js`).
if (require.main === module) {
    run().catch((err) => {
        console.error('Xatolik:', err.message);
        process.exit(1);
    });
}

module.exports = { recomputeGradedResult, recomputeMockResult, dec, enc, encNumber, decFields, latestAttemptIndex };

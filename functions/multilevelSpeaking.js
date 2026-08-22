// functions/multilevelSpeaking.js
//
// ⚠️ AVTOMATIK NUSXA — QO'LDA TAHRIRLAMANG.
// Manba: src/utils/multilevelSpeaking.js. O'zgartirish kiritish uchun o'sha faylni tahrirlang
// va `npm run mirror` ni ishga tushiring.

//
// Multilevel Speaking shkalasi: daraja ↔ ball bog'lanishi va to'rt mezondan
// yakuniy natijani chiqarish.
//
// ⚠️ Bu fayl `functions/multilevelSpeaking.js` ga NUSXALANADI (`npm run mirror`).
// Sabab IELTS ball hisobidagi bilan bir xil: ballni SERVER qo'yadi
// (`evaluateSpeaking`), natija kartasini va progress grafigini KLIENT chizadi.
// Ikkisi siljisa, o'quvchi kartada "B2" ko'rib, grafikda B1 nuqtasini ko'radi.
//
// NIMA UCHUN DARAJA EMAS, BALL SAQLANADI
// Rasmiy natija — daraja (B1/B2/C1). Lekin faqat daraja saqlansa, ikki oy
// mashq qilgan o'quvchi ekranda o'sha "B2" ni ko'raveradi va o'sish
// ko'rinmaydi. Shu sabab har mezon 0-100 uzluksiz shkalada baholanadi,
// daraja esa shu balldan KELIB CHIQADI — ikkita mustaqil haqiqat yo'q.

/** Multilevel'da beriladigan darajalar, pastdan yuqoriga. */
const ML_LEVELS = ['below_A2', 'A2', 'B1', 'B2', 'C1'];

/**
 * Har daraja 0-100 shkalada o'z oynasiga ega.
 *
 * Oynalar teng (20 ball) — bu ataylab: rasmiy imtihonning ball kesimlari
 * bizda yo'q, shuning uchun teng bo'lish "aniqlik" da'vo qilmaydigan eng
 * halol taqsimot. Rasmiy kesimlar ma'lum bo'lganda FAQAT shu jadval
 * o'zgaradi, qolgan kod tegilmaydi.
 */
const ML_LEVEL_RANGE = {
    below_A2: [0, 19],
    A2: [20, 39],
    B1: [40, 59],
    B2: [60, 79],
    C1: [80, 100],
};

/** Ekranda ko'rsatiladigan nom. */
const ML_LEVEL_LABEL = {
    below_A2: "A2 dan past",
    A2: 'A2',
    B1: 'B1',
    B2: 'B2',
    C1: 'C1',
};

/** Baholanadigan mezonlar — tartib ekranda ham shu. */
const ML_CRITERIA = ['fluency', 'lexical', 'grammar', 'pronunciation'];

const ML_CRITERION_LABEL = {
    fluency: 'Ravonlik',
    lexical: "So'z boyligi",
    grammar: 'Grammatika',
    pronunciation: 'Talaffuz',
};

/** Qiymatni kanonik daraja kodiga keltiradi; mos kelmasa `null`. */
function normalizeMlLevel(level) {
    if (typeof level !== 'string') return null;
    const key = level.trim().replace(/[\s-]+/g, '_').toLowerCase();
    if (key === 'below_a2' || key === 'a1' || key === 'belowa2') return 'below_A2';
    const up = key.toUpperCase();
    return ML_LEVELS.includes(up) ? up : null;
}

/** Darajaning tartib raqami; noma'lum bo'lsa -1. */
function mlLevelIndex(level) {
    return ML_LEVELS.indexOf(normalizeMlLevel(level) || '');
}

/** 0-100 ballni butun songa keltiradi va chegaraga siqadi. */
function clampMlScore(score) {
    const n = Number(score);
    if (!Number.isFinite(n)) return null;
    return Math.min(100, Math.max(0, Math.round(n)));
}

/** Balldan darajani chiqaradi. */
function scoreToMlLevel(score) {
    const n = clampMlScore(score);
    if (n === null) return null;
    for (const level of ML_LEVELS) {
        const [min, max] = ML_LEVEL_RANGE[level];
        if (n >= min && n <= max) return level;
    }
    return null;
}

/**
 * Ballni darajasining oynasiga siqadi.
 *
 * Model ikkala qiymatni ham qaytaradi va ular bir-biriga zid chiqishi mumkin
 * ("B2" dedi-yu, 45 ball berdi). Bunday holatda DARAJA ustun turadi: u
 * deskriptorga tayanib qo'yilgan, ball esa o'sha daraja ichidagi joyni
 * ko'rsatuvchi baho — ya'ni ikkinchi darajali qiymat.
 */
function clampScoreToMlLevel(score, level) {
    const lv = normalizeMlLevel(level);
    if (!lv) return clampMlScore(score);
    const [min, max] = ML_LEVEL_RANGE[lv];
    const n = clampMlScore(score);
    if (n === null) return Math.round((min + max) / 2);
    return Math.min(max, Math.max(min, n));
}

/** Daraja ichidagi joy, 0-100 foizda — "B2 ning boshi" yoki "B2 ning tepasi". */
function mlPositionInLevel(score, level) {
    const lv = normalizeMlLevel(level) || scoreToMlLevel(score);
    if (!lv) return null;
    const [min, max] = ML_LEVEL_RANGE[lv];
    const n = clampScoreToMlLevel(score, lv);
    return Math.round(((n - min) / (max - min)) * 100);
}

/**
 * To'rt mezondan yakuniy natija.
 *
 * Daraja — ENG PAST mezon bo'yicha. Zanjir eng zaif halqasi bo'yicha uziladi:
 * talaffuzi A2 bo'lgan nomzod imtihonda B2 ololmaydi, o'rtacha esa aynan shu
 * bitta zaif mezonni yashirib qo'yadi.
 *
 * Ball — to'rttasining o'rtachasi, lekin yakuniy darajaning oynasidan
 * chiqmaydi. Aks holda "B1" yozuvi ostida 67 ball turardi va o'quvchi
 * grafikda o'zini B2 da deb o'ylardi.
 *
 * @param {Record<string, {level?: string, score?: number}>} criteria
 * @returns {{level: string, score: number, weakest: string,
 *            criteria: Record<string, {level: string, score: number}>} | null}
 */
function aggregateMlSpeaking(criteria) {
    if (!criteria || typeof criteria !== 'object') return null;

    const resolved = {};
    for (const key of ML_CRITERIA) {
        const raw = criteria[key];
        if (!raw) return null;
        const level = normalizeMlLevel(raw.level) || scoreToMlLevel(raw.score);
        if (!level) return null;
        resolved[key] = { level, score: clampScoreToMlLevel(raw.score, level) };
    }

    let weakest = ML_CRITERIA[0];
    for (const key of ML_CRITERIA) {
        const a = mlLevelIndex(resolved[key].level);
        const b = mlLevelIndex(resolved[weakest].level);
        // Daraja teng bo'lsa ball hal qiladi — o'quvchiga ko'rsatiladigan
        // "eng zaif tomon" bitta bo'lishi kerak, aks holda har ochilganda
        // boshqa mezon chiqadi.
        if (a < b || (a === b && resolved[key].score < resolved[weakest].score)) {
            weakest = key;
        }
    }

    const level = resolved[weakest].level;
    const mean =
        ML_CRITERIA.reduce((sum, key) => sum + resolved[key].score, 0) / ML_CRITERIA.length;

    return { level, score: clampScoreToMlLevel(mean, level), weakest, criteria: resolved };
}

/**
 * Imtihon oqimi: har qism, har savol va vaqtlar.
 *
 * Bu raqamlar rasmiy interfeys yozuvlaridan va ekrandagi taymerlardan
 * olingan, ta'rifdan emas. Muhim farq: uch qism uch XIL vazifa, IELTS'dagi
 * kabi "qism raqami" bilan cheklanmaydi:
 *   1 — 6 ta qisqa savol, oxirgi uchtasi IKKI RASM asosida
 *   2 — bitta rasm + 3 ta savol, hammasi BITTA javobda
 *   3 — pros/cons jadvali, ikkala tomondan 2 tadan tanlab, muvozanatli fikr
 *
 * Shu sababli javob birligi ham har xil: 1-qismda 6 ta alohida yozuv,
 * 2 va 3-qismda bittadan. Baholash ham shunga qarab boshqacha bo'ladi.
 */
const ML_TASKS = {
    1: {
        kind: 'interview',
        // Savol chiqadi → qisqa tayyorgarlik hisobi → signal → javob.
        readySec: 5,
        prepSec: 0,
        questions: [
            { type: 'personal', answerSec: 30 },
            { type: 'personal', answerSec: 30 },
            { type: 'personal', answerSec: 30 },
            // Ikkita rasm ko'rsatiladi va uchala savol ham shu rasmlar haqida.
            // Birinchisiga ko'proq vaqt beriladi — tasvirlash savoli.
            { type: 'photo', answerSec: 45 },
            { type: 'photo', answerSec: 30 },
            { type: 'photo', answerSec: 30 },
        ],
    },
    2: {
        kind: 'photo_prompt',
        readySec: 0,
        prepSec: 60,
        // Uchala savolga BITTA uzluksiz javob.
        questions: [{ type: 'photo_bullets', answerSec: 120, bulletCount: 3 }],
    },
    3: {
        kind: 'balanced_argument',
        readySec: 0,
        prepSec: 60,
        // Pros va cons ro'yxatlaridan 2 tadan tanlab, muvozanatli fikr.
        questions: [{ type: 'pros_cons', answerSec: 120, pickPerSide: 2 }],
    },
};

/** Qismdagi `index`-savol uchun yozib olish limiti (soniya). */
function mlAnswerSeconds(part, index = 0) {
    const task = ML_TASKS[part];
    if (!task) return null;
    return task.questions[index]?.answerSec ?? null;
}

/** Qismdagi savollar soni — 1-qismda 6 ta, qolganida bitta. */
function mlQuestionCount(part) {
    return ML_TASKS[part]?.questions.length ?? 0;
}

/** Javobdan oldingi tayyorgarlik vaqti; yo'q bo'lsa 0. */
function mlPrepSeconds(part) {
    return ML_TASKS[part]?.prepSec ?? 0;
}

module.exports = { ML_LEVELS, ML_LEVEL_RANGE, ML_LEVEL_LABEL, ML_CRITERIA, ML_CRITERION_LABEL, normalizeMlLevel, mlLevelIndex, clampMlScore, scoreToMlLevel, clampScoreToMlLevel, mlPositionInLevel, aggregateMlSpeaking, ML_TASKS, mlAnswerSeconds, mlQuestionCount, mlPrepSeconds };

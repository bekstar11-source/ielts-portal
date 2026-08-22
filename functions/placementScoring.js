// functions/placementScoring.js
//
// ⚠️ AVTOMATIK NUSXA — QO'LDA TAHRIRLAMANG.
// Manba: src/utils/placementScoring.js. O'zgartirish kiritish uchun o'sha faylni tahrirlang
// va `npm run mirror` ni ishga tushiring.

//
// CEFR placement testining ballash mantig'i: javoblar → daraja.
//
// ⚠️ Bu fayl `functions/placementScoring.js` ga NUSXALANADI (`npm run mirror`).
// Ball SERVERDA qo'yiladi (javob kalitlari mehmonga berilmaydi), natija esa
// KLIENTDA chiziladi. Ikkisi bir xil funksiyani ishlatishi shart.
//
// ─── NEGA "eng ko'p to'g'ri javob" EMAS ─────────────────────────────────────
//
// Oddiy foiz ("40 tadan 28 tasi → 70% → B2") noto'g'ri natija beradi, chunki
// savollar har xil og'irlikda. A1 savollarining hammasini va C1 larning
// hammasini xato qilgan odam ham, hamma darajada yarmini bilgan odam ham bir
// xil foiz olishi mumkin — lekin ularning darajasi butunlay boshqa.
//
// Shuning uchun daraja PILLAPOYA sifatida hisoblanadi: odam faqat o'zidan
// pastdagi barcha darajalarni o'tgan bo'lsa, keyingisiga ko'tariladi. Bu
// "A2 ni bilmasdan B2 chiqib qolish" holatini yo'q qiladi.

const { CEFR_ORDER, normalizeCefr } = require("./cefr.js");

/**
 * Darajani "o'tgan" deb hisoblash uchun kerakli ulush.
 *
 * 0.6 — ataylab past emas, lekin qattiq ham emas. Placement testining maqsadi
 * imtihon qilish emas, balki o'quvchini TO'G'RI MATERIALGA yo'naltirish:
 * darajani biroz past baholash (va odam materialni yengil deb topishi)
 * yuqori baholashdan (va odam hech narsani tushunmay ketishidan) yaxshiroq.
 */
const PASS_RATIO = 0.6;

/** Daraja ishonchli baholanishi uchun undagi minimal savol soni. */
const MIN_QUESTIONS_PER_LEVEL = 3;

/**
 * Javoblarni daraja bo'yicha guruhlaydi.
 *
 * @param {Array<{level: string, correct: boolean}>} answers
 * @returns {Object} `{ A1: {correct, total, ratio}, ... }`
 */
function tallyByLevel(answers) {
    const tally = {};
    for (const a of Array.isArray(answers) ? answers : []) {
        const level = normalizeCefr(a && a.level);
        if (!level) continue;
        if (!tally[level]) tally[level] = { correct: 0, total: 0, ratio: 0 };
        tally[level].total += 1;
        if (a.correct) tally[level].correct += 1;
    }
    for (const level of Object.keys(tally)) {
        const t = tally[level];
        t.ratio = t.total > 0 ? t.correct / t.total : 0;
    }
    return tally;
}

/**
 * Placement natijasi.
 *
 * @param {Array<{level: string, correct: boolean}>} answers
 * @returns {{level: string|null, tally: Object, passed: string[], nextLevel: string|null, totalCorrect: number, totalQuestions: number}}
 */
function scorePlacement(answers) {
    const tally = tallyByLevel(answers);

    let totalCorrect = 0;
    let totalQuestions = 0;
    for (const level of Object.keys(tally)) {
        totalCorrect += tally[level].correct;
        totalQuestions += tally[level].total;
    }

    // Javob umuman bo'lmasa daraja aniqlanmaydi. `'A1'` qaytarish YOMON
    // bo'lardi: test buzilgani odamning darajasi haqidagi xulosaga
    // aylanib qolardi.
    if (totalQuestions === 0) {
        return { level: null, tally, passed: [], nextLevel: null, totalCorrect: 0, totalQuestions: 0 };
    }

    const passed = [];
    let level = null;
    let nextLevel = null;

    for (const candidate of CEFR_ORDER) {
        const t = tally[candidate];
        // Bu daraja testda umuman yo'q — pillapoyani UZMAYMIZ, shunchaki
        // o'tkazib yuboramiz. Aks holda bankda A1 savoli bo'lmasa, hamma
        // "daraja aniqlanmadi" olardi.
        if (!t) continue;

        // Savol juda kam bo'lsa natija shovqin bo'ladi: 1 tadan 1 tasi to'g'ri
        // — bu 100% emas, bu tasodif. Bunday darajani ham o'tkazib yuboramiz.
        if (t.total < MIN_QUESTIONS_PER_LEVEL) continue;

        if (t.ratio >= PASS_RATIO) {
            passed.push(candidate);
            level = candidate;
        } else {
            // Birinchi yiqilgan daraja — aynan shu o'sish nuqtasi.
            nextLevel = candidate;
            break;
        }
    }

    // Hamma daraja o'tilgan bo'lsa keyingi daraja yo'q (eng yuqorisi).
    if (!nextLevel && level) {
        const i = CEFR_ORDER.indexOf(level);
        nextLevel = i >= 0 && i < CEFR_ORDER.length - 1 ? CEFR_ORDER[i + 1] : null;
    }

    // Eng past darajadan ham o'tolmagan odam — boshlang'ich. `null` emas:
    // u testni ISHLADI, ya'ni unga aniq javob berishimiz kerak.
    if (!level) {
        const firstMeasured = CEFR_ORDER.find(
            (lv) => tally[lv] && tally[lv].total >= MIN_QUESTIONS_PER_LEVEL
        );
        level = firstMeasured ? CEFR_ORDER[0] : null;
        if (!nextLevel) nextLevel = firstMeasured || null;
    }

    return { level, tally, passed, nextLevel, totalCorrect, totalQuestions };
}

/**
 * Savollarni daraja bo'yicha aralashtirmasdan, oson→qiyin tartibda joylaydi.
 *
 * NEGA TARTIB MUHIM: boshlang'ich odam birinchi savolda C1 grammatikasini
 * ko'rsa, testni tashlab ketadi. Oson savoldan boshlash uni oxirigacha olib
 * boradi — bizga esa aynan to'liq javob to'plami kerak.
 */
function orderQuestionsByLevel(questions) {
    return (Array.isArray(questions) ? questions.slice() : []).sort((a, b) => {
        const ia = CEFR_ORDER.indexOf(normalizeCefr(a && a.level) || '');
        const ib = CEFR_ORDER.indexOf(normalizeCefr(b && b.level) || '');
        return ia - ib;
    });
}

module.exports = { PASS_RATIO, MIN_QUESTIONS_PER_LEVEL, tallyByLevel, scorePlacement, orderQuestionsByLevel };

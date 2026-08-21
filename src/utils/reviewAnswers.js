// src/utils/reviewAnswers.js
//
// Review ekranlari uchun YAGONA manba.
//
// Ilgari savollar ro'yxati va ball xulosasi uch joyda alohida yozilgan edi
// (DetailedAnswersModal, PremiumLockedReview, ResultModal.partStats) va ular
// bir-biridan chetga chiqib ketgandi — natijada bitta urinish uchun natija
// ekranida, review sahifasida va "Batafsil javoblar" oynasida UCH XIL band
// ko'rinardi. Endi hammasi shu fayl orqali `evaluateTest` bilan bir xil
// qoidalarga tayanadi.

import {
    checkAnswer,
    isMultiAnswerType,
    isChoiceQuestionType,
    scoreMultiAnswer,
    evaluateTest,
    calculateBandScore,
    getAnswerKey,
    getMultiSelectCount,
    getQuestionWeight,
    resolveOptionDisplay,
    findOptionIndex,
    getOptionText
} from './ieltsScoring.js';

const CONTAINER_KEYS = ['sections', 'questions', 'groups', 'passages', 'items', 'parts', 'content', 'rows', 'cells'];
const GROUP_ITEM_KEYS = ['questions', 'items', 'rows', 'groups', 'cells', 'content', 'parts'];

/**
 * Part practice'da qaysi passage/section baholanayotganini aniqlaydi.
 * `evaluateTest` dagi bilan AYNAN bir xil qoida — aks holda ro'yxatdagi
 * savollar soni ball hisobidagi savollar sonidan farq qilardi.
 */
const getTargetPassageId = (testData, partNumber) => {
    if (!partNumber || !testData?.passages) return null;
    const passage = testData.passages[partNumber - 1];
    return passage ? passage.id : null;
};

const isOutsideTargetPart = (obj, targetPassageId) => {
    if (!targetPassageId) return false;
    if (obj.passageId && String(obj.passageId) !== String(targetPassageId)) return true;
    if (obj.id && (obj.audio || obj.passageNumber) && String(obj.id) !== String(targetPassageId)) return true;
    return false;
};

/**
 * "Matching" turlarida yorliqni variant matniga aylantiradi:
 * "B" → "The author", "iv" → "Ways of protecting the environment".
 * Yorliqni topish `findOptionIndex` zimmasida — u ham harfli, ham rim raqamli
 * ro'yxatlarni biladi, shusiz sarlavha o'rniga rim raqamining o'zi ko'rinardi.
 */
const resolveMatchingText = (val, options) => {
    if (!val) return "";
    return String(val)
        .split(/[/|,]/)
        .map(a => a.trim())
        .filter(Boolean)
        .map(v => {
            const foundIdx = findOptionIndex(v, options);
            if (foundIdx === -1) return v;
            const opt = options[foundIdx];

            // Prefiksni kesish qoidasi `ieltsScoring.getOptionText` da — ro'yxat
            // uzatiladi, shuning uchun "B the no-eye-contact condition" kabi
            // TINISH BELGISIZ yorliq ham (ro'yxat izchil A/B/C bo'lsa) kesiladi.
            // Ilgari bu yerda qo'lda yozilgan regex bor edi va u faqat "B." /
            // "B)" ni tanirdi: review'da sarlavha o'rniga harf yopishgan matn
            // ko'rinardi.
            const base = getOptionText(opt, options);

            // "A - Museum" ko'rinishidagi tire bilan ajratilgan yorliq —
            // `getOptionText` da yo'q (u yerda "A-frame" kabi so'zlarni buzardi),
            // shu sabab bo'shliq talab qiladigan qo'shimcha qoida saqlanadi.
            return base.replace(/^\s*[A-Za-z][.)-]\s+/, '').trim() || base;
        })
        .join(' / ');
};

/**
 * Review uchun savollar ro'yxatini yig'adi.
 *
 * @param {object} testData  Xom test (javob kalitlari bilan). Kalitlarsiz
 *                           (sanitized) testda bo'sh massiv qaytadi.
 * @param {object} userAnswers
 * @param {number|null} partNumber  Part practice bo'lsa — faqat o'sha part savollari.
 * @returns {Array} `{ id, qNumber, correctAnswer, userAnswer, type, questionText,
 *                     passageId, passageTitle, isCorrect, partialText }`
 */
export const buildReviewQuestions = (testData, userAnswers = {}, partNumber = null) => {
    if (!testData || typeof testData !== 'object') return [];

    const list = [];
    const seenIds = new Set();
    const targetPassageId = getTargetPassageId(testData, partNumber);

    const passageTitleOf = (passageId) =>
        testData.passages?.find(p => String(p.id) === String(passageId))?.title || '';

    const walk = (obj, parentType, parentOptions = null) => {
        if (!obj || typeof obj !== 'object') return;
        if (isOutsideTargetPart(obj, targetPassageId)) return;

        const currentType = obj.type || parentType;
        const ownOptions = (Array.isArray(obj.options) && obj.options.length > 0) ? obj.options : null;
        const options = ownOptions || parentOptions;
        const hasOptions = Array.isArray(options) && options.length > 0;

        // MULTI-ANSWER GURUHI: butun guruh bir marta baholanadi.
        // SelectionBox javoblarni alifbo tartibida slotlarga yozadi — har bir
        // slotni alohida tekshirish to'g'ri javoblarni ham "xato" qilib ko'rsatardi.
        if (isMultiAnswerType(obj.type) && !obj.id) {
            const groupItems = [];
            const collectItems = (o) => {
                if (!o || typeof o !== 'object') return;
                if (o.id && getAnswerKey(o) !== undefined) groupItems.push(o);
                GROUP_ITEM_KEYS.forEach(sk => {
                    const child = o[sk];
                    if (!child || typeof child !== 'object') return;
                    // Massiv ichidagi massiv (`rows: [[cell]]`) ham ochilishi shart —
                    // `evaluateTest.collectItems` bilan bir xil qoida.
                    if (Array.isArray(child)) child.flat(Infinity).forEach(collectItems);
                    else collectItems(child);
                });
            };
            collectItems(obj);

            if (groupItems.length > 0) {
                const allCorrect = groupItems.map(i => getAnswerKey(i)).join(', ');
                const allUser = groupItems.map(i => userAnswers[String(i.id)] || "").join(', ');
                const weight = getMultiSelectCount(currentType)
                    || groupItems.reduce((sum, i) => sum + getQuestionWeight(i.id), 0)
                    || groupItems.length;

                const scoreRes = scoreMultiAnswer(allCorrect, allUser, weight);
                const ids = groupItems.map(i => i.id);

                list.push({
                    id: ids.join(', '),
                    qNumber: ids.join(', '),
                    correctAnswer: allCorrect,
                    userAnswer: allUser.replace(/(^|,\s*)(?=,|$)/g, '').trim(),
                    type: currentType || 'selection',
                    questionText: obj.questionText || obj.question || obj.title || '',
                    passageId: obj.passageId || '',
                    passageTitle: passageTitleOf(obj.passageId),
                    isCorrect: scoreRes.matches === scoreRes.weight,
                    partialText: (scoreRes.matches > 0 && scoreRes.matches < scoreRes.weight)
                        ? `${scoreRes.matches}/${scoreRes.weight}`
                        : null
                });

                groupItems.forEach(i => seenIds.add(String(i.id)));
                return; // guruh ichiga qayta kirmaymiz
            }
        }

        const answer = getAnswerKey(obj);
        if (obj.id && answer !== undefined) {
            const idStr = String(obj.id);
            if (!seenIds.has(idStr)) {
                seenIds.add(idStr);

                const uAns = userAnswers[idStr] ?? userAnswers[obj.id] ?? "";
                // `evaluateTest` bilan bir xil shart: ID "23-24" / "23,24" ko'p javobli.
                // `evaluateTest` bilan AYNAN bir xil shart. `getQuestionWeight` barcha
                // tire turlarini (defis, en tire, em tire) va vergulni biladi — qo'lda
                // yozilgan `includes('-')` esa en tireni o'tkazib yuborardi.
                const isMulti = isMultiAnswerType(currentType) || getQuestionWeight(idStr) > 1;

                let isCorrect = false;
                let partialText = null;

                if (isMulti) {
                    const weight = getMultiSelectCount(currentType) || getQuestionWeight(idStr);
                    const scoreRes = scoreMultiAnswer(answer, uAns, weight);
                    isCorrect = scoreRes.matches === scoreRes.weight;
                    if (scoreRes.matches > 0 && scoreRes.matches < scoreRes.weight) {
                        partialText = `${scoreRes.matches}/${scoreRes.weight}`;
                    }
                } else {
                    isCorrect = checkAnswer(
                        answer,
                        uAns,
                        isChoiceQuestionType(currentType) || hasOptions,
                        hasOptions ? options : null
                    );
                }

                let displayCorrect = answer;
                let displayUser = uAns;

                // "Choose from the list": kalit "B" harfi, talaba esa so'z tanlaydi —
                // ikkalasini ham so'z ko'rinishida ko'rsatamiz.
                if (hasOptions && !isChoiceQuestionType(currentType)) {
                    displayCorrect = resolveOptionDisplay(answer, options) || answer;
                    displayUser = resolveOptionDisplay(uAns, options) || uAns;
                }

                // Sarlavha moslashtirish ham shu yerga kiradi: talabaning javobi "iv"
                // ko'rinishida saqlanadi, review'da esa sarlavhaning o'zi ko'rinishi kerak.
                const typeLower = String(currentType || '').toLowerCase();
                const isMatchingType = typeLower.includes('matching');
                if (isMatchingType && hasOptions) {
                    if (answer) displayCorrect = resolveMatchingText(answer, options);
                    if (uAns) displayUser = resolveMatchingText(uAns, options);
                }

                list.push({
                    id: obj.id,
                    qNumber: parseInt(obj.id) || obj.id,
                    correctAnswer: displayCorrect,
                    userAnswer: displayUser,
                    type: currentType || 'input',
                    questionText: obj.questionText || obj.question || obj.title || obj.label || '',
                    passageId: obj.passageId || '',
                    passageTitle: passageTitleOf(obj.passageId),
                    isCorrect,
                    partialText
                });
            }
        }

        // Ichma-ich massivlarni ham ochamiz. Jadval qatorlari ikki xil yoziladi:
        // `rows: [{ cells: [...] }]` va `rows: [[cell, cell]]`. Ikkinchi ko'rinishda
        // qatorning O'ZI massiv bo'ladi va `walk` unda hech qanday kalit topmasdi:
        // savol ball hisobiga KIRARDI, lekin review ro'yxatida umuman ko'rinmasdi —
        // talaba xatosini ko'ra olmasdi. `evaluateTest` da bu allaqachon tuzatilgan,
        // shu sabab bu yerdagi qoida u bilan AYNAN bir xil bo'lishi shart.
        const visit = (val) => {
            if (!val || typeof val !== 'object') return;
            if (Array.isArray(val)) { val.forEach(visit); return; }
            walk(val, currentType, options);
        };
        CONTAINER_KEYS.forEach(key => visit(obj[key]));
    };

    walk(testData, null, null);

    return list.sort((a, b) => {
        const aNum = parseInt(a.id);
        const bNum = parseInt(b.id);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return String(a.id).localeCompare(String(b.id));
    });
};

/**
 * Review ekranlari uchun ball xulosasi.
 *
 * USTUVORLIK: serverda hisoblangan (va bazaga yozilgan) qiymatlar birlamchi.
 * Ball SERVERDA hisoblanadi va natija ekrani, "My Results", review header —
 * hammasi o'sha qiymatni ko'rsatadi; shuning uchun batafsil oyna ham aynan
 * shuni ko'rsatishi kerak. Klient tomonda qayta hisoblash faqat serverdan
 * qiymat kelmagan (eski natijalar) holat uchun zaxira.
 *
 * MUHIM: `correct`, `total` va `band` HAR DOIM bitta manbadan olinadi —
 * aralashtirilsa "35/38, band 7.5" kabi o'zaro zid ko'rsatkichlar chiqadi.
 *
 * @param {object}  p
 * @param {object}  p.testData
 * @param {object}  p.userAnswers
 * @param {number|null} p.partNumber   Part practice bo'lsa — part raqami.
 * @param {string|null} p.moduleType   'reading' | 'listening'. Mock'da modul turi
 *                                     `testData.type` dan ishonchliroq.
 * @param {number|null} p.score        Serverdagi to'g'ri javoblar soni.
 * @param {number|null} p.bandScore    Serverdagi band.
 * @param {number|null} p.totalQuestions Serverdagi umumiy savollar soni.
 * @param {number}  p.fallbackTotal    Hech qayerdan total topilmasa (oxirgi chora).
 */
export const getReviewScoreSummary = ({
    testData,
    userAnswers = {},
    partNumber = null,
    moduleType = null,
    score = null,
    bandScore = null,
    totalQuestions = null,
    fallbackTotal = 0
}) => {
    const type = moduleType || testData?.type || null;

    const toNum = (v) => {
        if (v === undefined || v === null || v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };

    const serverScore = toNum(score);
    const serverTotal = toNum(totalQuestions);
    const serverBand = toNum(bandScore);

    let correct = null;
    let total = null;

    // 1) Server juftligi (ball + umumiy savollar soni) — asosiy manba.
    if (serverScore !== null && serverTotal !== null && serverTotal > 0) {
        correct = Math.max(0, Math.min(serverScore, serverTotal));
        total = serverTotal;
    } else {
        // 2) Zaxira: klientda qayta hisoblash. Faqat javob kalitlari mavjud
        //    bo'lganda ishlaydi (sanitized testda `totalQ` 0 bo'ladi).
        const evaluated = evaluateTest(testData, userAnswers || {}, partNumber);
        if (evaluated.totalQ > 0) {
            correct = evaluated.correctCount;
            total = evaluated.totalQ;
        } else {
            correct = serverScore !== null ? serverScore : 0;
            total = fallbackTotal > 0 ? fallbackTotal : 0;
        }
    }

    // Band: serverdagi qiymat birlamchi, aks holda o'sha correct/total dan hisoblanadi.
    let band = serverBand !== null && serverBand > 0 ? serverBand : null;
    if (band === null && total > 0) {
        band = calculateBandScore(correct, type, total) || 0;
    }
    if (band === null) band = 0;

    return {
        correct,
        total,
        mistakes: Math.max(0, total - correct),
        band
    };
};

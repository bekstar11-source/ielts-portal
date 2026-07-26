// src/utils/ieltsScoring.js

// Rasmiy IELTS raw→band jadvallari (40 ta savol asosida), [eng kam raw ball, band] ko'rinishida.
// DIQQAT: Reading va Listening jadvallari BIR XIL EMAS. Ilgari ikkalasiga ham Listening
// jadvali qo'llanilar edi va Reading ballari bir necha chegarada 0.5 ga oshib ketardi
// (raw 32 → 7.5 o'rniga rasmiy 7.0; raw 26 → 6.0; raw 18 → 5.0; raw 15 → 5.0).
const READING_BAND_TABLE = [
    [39, 9.0], [37, 8.5], [35, 8.0], [33, 7.5], [30, 7.0], [27, 6.5], [23, 6.0], [19, 5.5],
    [15, 5.0], [13, 4.5], [10, 4.0], [8, 3.5], [6, 3.0], [4, 2.5], [2, 2.0], [1, 1.0]
];

const LISTENING_BAND_TABLE = [
    [39, 9.0], [37, 8.5], [35, 8.0], [32, 7.5], [30, 7.0], [26, 6.5], [23, 6.0], [18, 5.5],
    [16, 5.0], [13, 4.5], [11, 4.0], [8, 3.5], [6, 3.0], [4, 2.5], [2, 2.0], [1, 1.0]
];

// IELTS BAND CALCULATOR
export const calculateBandScore = (score, type, totalQuestions = 40) => {
    const t = type?.toLowerCase();
    if (t !== 'listening' && t !== 'reading') return null;

    if (!totalQuestions || totalQuestions <= 0) return 0;
    if (score <= 0) return 0;

    // Part practice (bitta passage/section) yoki nostandart savollar soni uchun xom ballni
    // 40 ta savolga proporsional keltiramiz. Ilgari 10–15 savollik testlar uchun alohida
    // "xatolar soni" jadvali ishlatilardi — u rasmiy jadvaldan ancha saxiy edi (13 tadan 9 tasi
    // to'g'ri → 7.0, proporsional ekvivalenti esa 6.5) va 15↔16 savol chegarasida band sakrardi.
    const cappedScore = Math.min(score, totalQuestions);
    const scaledScore = totalQuestions === 40
        ? cappedScore
        : Math.round((cappedScore / totalQuestions) * 40);

    const table = t === 'reading' ? READING_BAND_TABLE : LISTENING_BAND_TABLE;
    for (const [minRaw, band] of table) {
        if (scaledScore >= minRaw) return band;
    }
    return 0;
};

// OVERALL BAND CALCULATOR (Rounds to nearest 0.5)
export const calculateOverallBand = (...args) => {
    // Determine if we got an array as the first argument or rest parameters
    let scores = args;
    if (args.length === 1 && Array.isArray(args[0])) {
        scores = args[0];
    }

    // Include 0 as a valid score, but exclude null/undefined
    const validScores = scores.filter(s => (typeof s === 'number' && !isNaN(s)) && s >= 0);
    if (validScores.length === 0) return 0;

    const average = validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length;
    
    // IELTS Rounding Rules:
    // .25 rounds to .5
    // .75 rounds to next whole number
    const integerPart = Math.floor(average);
    const fractionalPart = average - integerPart;

    if (fractionalPart < 0.25) return integerPart;
    if (fractionalPart < 0.75) return integerPart + 0.5;
    return integerPart + 1;
};



// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ SINXRON SAQLASH SHART: quyidagi baholash mantiqi `functions/ieltsScoring.js`
// bilan bir xil bo'lishi kerak. Ball SERVERDA hisoblanadi, review esa shu fayldan
// foydalanadi — ular farq qilsa, talaba review'da yashil ✓ ko'rib, ball olmaydi.
// ─────────────────────────────────────────────────────────────────────────────

// COLLAPSE WHITESPACE & CLEAN
export const normalizeString = (str) => {
    return String(str || "")
        .trim()
        .toLowerCase()
        // Vergulni bo'sh joy bilan emas, hech nima bilan almashtiramiz — aks holda "9,000" kabi
        // minglik ajratkichli sonlar "9 000" ga aylanib, foydalanuvchining "9000" javobiga mos kelmay qolardi.
        .replace(/,/g, '')
        .replace(/[.'":;?!]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

// Savol turi variant-tanlash (MCQ/TFNG/Matching) asosidami, yoki erkin matn (gap-fill) asosidami?
// Faqat variant-tanlash turlarida "C" kabi bitta harf javobni "C. To'liq matn" ko'rinishidagi
// to'g'ri javobga solishtirish xavfsiz — chunki u yerda javob har doim variant harfini bildiradi.
// Gap-fill/short-answer javoblarida esa bu solishtirish xato bo'lishi mumkin (masalan to'g'ri javob
// "C. elegans" yoki "A rare bird" bo'lsa, foydalanuvchi shunchaki "C"/"A" deb yozib qo'ysa ham
// noto'g'ri ravishda "to'g'ri" deb hisoblanib qolardi).
//
// DIQQAT: turdan tashqari, guruhda `options` bo'lishi ham variant-tanlash belgisidir
// (map_labeling, options'li flow_chart). Buni `evaluateTest` hisobga oladi — shuning uchun
// review UI (options bor joyda choice rejimi) va ball hisobi bir xil qaror qabul qiladi.
export const isChoiceQuestionType = (type) => {
    if (!type) return false;
    const t = String(type).toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ');
    return t.includes('mcq') ||
           t.includes('choice') ||
           t.includes('tfng') ||
           t.includes('true false') ||
           t.includes('yesno') ||
           t.includes('yes no') ||
           t.includes('matching');
};

// Bir nechta variant belgilanadigan (checkbox) savol turlari.
// ListeningRightPane shu ro'yxat bo'yicha SelectionBox render qiladi — ro'yxat
// `isMultiAnswerType` bilan mos bo'lishi shart, aks holda javoblar alifbo tartibida
// slotlarga yozilib, har biri alohida tekshirilganda noto'g'ri "xato" chiqadi.
export const MULTI_SELECT_TYPES = [
    'selection',
    'pick_two', 'pick_three', 'pick_four', 'pick_five',
    'multi_two', 'multi_three', 'multi_four', 'multi_five',
    'multi_choice_box',
    'multiple_choice_multiple_answer'
];

export const isMultiAnswerType = (type) => {
    if (!type) return false;
    const t = String(type).toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ');

    // Explicit exclusions for types that have 'multi' but are single-answer per ID
    if (t === 'multiple choice' || t === 'mcq') return false;

    return t.includes('two choice') ||
           t.includes('three choice') ||
           t.includes('pick two') ||
           t.includes('pick three') ||
           t.includes('pick four') ||
           t.includes('pick five') ||
           t.includes('multi two') ||
           t.includes('multi three') ||
           t.includes('multi four') ||
           t.includes('multi five') ||
           t.includes('multi choice box') ||
           t.includes('multiple answer') ||
           t.includes('multi selection') ||
           t.includes('multi answer') ||
           t.includes('selection');
};

// Guruh turidan nechta variant belgilanishi kerakligini aniqlaydi (topilmasa null)
export const getMultiSelectCount = (type) => {
    if (!type) return null;
    const t = String(type).toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ');
    if (t.includes('five')) return 5;
    if (t.includes('four')) return 4;
    if (t.includes('three')) return 3;
    if (t.includes('two')) return 2;
    return null;
};

// Javob kalitini oladi. Bo'sh satr / bo'sh massiv "kalit yo'q" deb qaraladi,
// lekin raqam 0 ("0" javobi) HAQIQIY kalit hisoblanadi — avval falsy bo'lgani uchun
// bunday savollar jimgina umumiy hisobdan tushib qolardi.
export const getAnswerKey = (o) => {
    if (!o || typeof o !== 'object') return undefined;
    const KEYS = ['answer', 'correct_answer', 'correctAnswer', 'correct_answer_value'];
    for (const k of KEYS) {
        const v = o[k];
        if (v === undefined || v === null) continue;
        if (typeof v === 'string' && v.trim() === '') continue;
        if (Array.isArray(v) && v.length === 0) continue;
        return v;
    }
    return undefined;
};

// "23-24" yoki "23,24" kabi ID lar bir nechta savolni bildiradi
export const getQuestionWeight = (id) => {
    if (!id) return 1;
    const s = String(id).trim();
    const parts = s.split(/[-–—_]/).map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return Math.abs(parts[1] - parts[0]) + 1;
    }
    if (s.includes(',')) return s.split(',').length;
    return 1;
};

// Defisli yozuvlarni solishtirish uchun variantlar: "car-park" ≈ "car park" ≈ "carpark"
const hyphenVariants = (s) => {
    const spaced = s.replace(/[-–—]+/g, ' ').replace(/\s+/g, ' ').trim();
    const joined = s.replace(/[-–—]+/g, '');
    return [s, spaced, joined].filter(Boolean);
};

// To'g'ri javob kalitini muqobil variantlarga ajratadi.
// "bike/bicycle" → ["bike", "bicycle"]
// "knife and/or fork" → ["knife and/or fork", "knife", "fork", "knife and fork"]
//   (avval bu "/" bo'yicha bo'linib, talabaning "knife and" javobi TO'G'RI deb hisoblanardi)
const splitAlternatives = (raw) => {
    const s = String(raw).trim();
    const andOr = s.match(/^(.+?)\s+and\s*\/\s*or\s+(.+)$/i);
    if (andOr) {
        const a = andOr[1].trim();
        const b = andOr[2].trim();
        return [s, a, b, `${a} and ${b}`];
    }
    return s.split(/[/|]/).map(x => x.trim()).filter(Boolean);
};

// JAVOBNI TEKSHIRISH FUNKSIYASI
export const checkAnswer = (correct, user, isChoiceType = false) => {
    if (correct === undefined || correct === null) return false;

    // Massiv ko'rinishidagi kalit: har bir variant alohida tekshiriladi
    if (Array.isArray(correct)) {
        return correct.some(c => checkAnswer(c, user, isChoiceType));
    }

    const correctStr = String(correct).trim();
    const userStr = String(user || '').trim().toUpperCase();

    // Single letter check (A, B, C...)
    if (isChoiceType && userStr.length === 1 && /^[A-Z]$/.test(userStr)) {
        const match = correctStr.match(/^([A-Z])[.)\s-]/i);
        if (match && match[1].toUpperCase() === userStr) {
            return true;
        }
    }

    const rawUser = String(user || '').trim().toLowerCase();
    let cleanUser = rawUser;
    // "v. long text" muammosi (Roman numerals with dot) — FAQAT variant-tanlash turlarida.
    // Gap-fill javoblarida bu kesish to'g'ri javoblarni buzadi ("x ray", "x-ray machine", "i love it").
    if (isChoiceType && /^[ivx]+[.)\s-]/i.test(rawUser)) {
        cleanUser = rawUser.split(/[.)\s-]/)[0].trim();
    }
    cleanUser = normalizeString(cleanUser);

    if (!cleanUser) return false;

    // Qavslar ichidagi ixtiyoriy so'zlar (e.g. "in (the) school") + defis variantlari
    const checkWithOptional = (correctOption, userOption) => {
        if (!correctOption || !userOption) return false;

        const forms = [
            correctOption,
            // Qavslarni olib tashlaymiz
            correctOption.replace(/[()]/g, '').replace(/\s+/g, ' ').trim(),
            // Qavslar ichidagi so'zlar bilan birga olib tashlaymiz
            correctOption.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim()
        ];

        const userForms = new Set(hyphenVariants(userOption));
        return forms.some(f => f && hyphenVariants(f).some(v => userForms.has(v)));
    };

    const options = splitAlternatives(correctStr).map(opt => {
        const cleanOpt = opt.toLowerCase();
        if (isChoiceType && /^[ivx]+[.)\s-]/i.test(cleanOpt)) {
            return [normalizeString(cleanOpt), normalizeString(cleanOpt.split(/[.)\s-]/)[0].trim())];
        }
        return [normalizeString(cleanOpt)];
    }).flat().filter(Boolean);

    // Talabaning javobi to'liq holida ham, "/" bilan ajratilgan bo'laklari bilan ham tekshiriladi
    const userOptions = [cleanUser, ...cleanUser.split(/[/|]/).map(s => s.trim())].filter(Boolean);

    for (const uOpt of userOptions) {
        if (options.some(o => checkWithOptional(o, uOpt))) {
            return true;
        }
    }

    return false;
};

// MULTI-CHOICE JAVOBNI TEKSHIRISH (e.g. "Choose TWO letters")
export const scoreMultiAnswer = (correct, user, weight) => {
    if (!correct) return { matches: 0, weight: weight || 1 };

    // To'g'ri javoblarni ajratib olamiz (vergul, slash, pipe yoki bo'shliq orqali)
    const normalizeMulti = (str) => {
        if (!str) return [];
        const s = String(Array.isArray(str) ? str.join(', ') : str).trim();

        // Single letters split (A, B, C) - Only if items are clearly single letters
        // MUHIM: BARCHA bo'laklar harf/roman bo'lgandagina bu yo'l ishlatiladi. Aks holda
        // "a big house, small car" kabi matnli javoblardan faqat "a" qolib, qolgani yo'qolardi.
        if (/^[A-Z, /|\s]+$/i.test(s)) {
            const tokens = s.split(/[,/|\s]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
            const allLabels = tokens.length > 0 && tokens.every(p => p.length === 1 || /^[ivx]+$/i.test(p));
            if (allLabels) return tokens;
        }

        // Standard split by common delimiters
        const parts = s.split(/[,/|]/).map(item => item.trim().toLowerCase()).filter(Boolean);

        // "A. Museum" / "iv) text" kabi prefiksli variantlardan faqat harfni ajratamiz.
        // Ajratkich sifatida FAQAT tinish belgisi ("." yoki ")") qabul qilinadi — bo'sh joy yoki
        // defis bo'lsa, "a big house" kabi matnli javoblar "a" ga qisqarib ketardi.
        return parts.map(p => {
            const match = p.match(/^([a-z]|[ivx]+)\s*[.)]/i);
            if (match) {
                return match[1].toLowerCase();
            }
            return p;
        });
    };

    const correctArr = normalizeMulti(correct);
    const userArr = normalizeMulti(user);

    // User javobidagi dublikatlarni olib tashlaymiz
    const uniqueUser = Array.from(new Set(userArr));

    let matches = 0;
    uniqueUser.forEach(u => {
        if (correctArr.includes(u)) {
            matches++;
        }
    });

    const finalWeight = weight || correctArr.length;
    const matchesCount = Math.min(matches, finalWeight);
    return { matches: matchesCount, weight: finalWeight };
};

// ─────────────────────────────────────────────────────────────────────────────
// YAGONA BAHOLASH DVIGATELI
// Ilgari uchta alohida implementatsiya bor edi (submit, review modal, mock exam) —
// ular bir-biridan farq qilib, bitta urinish uchun uch xil ball chiqarardi.
// ─────────────────────────────────────────────────────────────────────────────
export const evaluateTest = (testData, userAnswers = {}, partNumber = null) => {
    let correctCount = 0;
    let totalQ = 0;
    const mistakes = [];
    const missingKeys = [];   // talaba javob bergan, lekin javob kaliti yo'q savollar
    const scoredIds = new Set();

    if (!testData || typeof testData !== 'object') {
        return { correctCount: 0, totalQ: 0, band: 0, mistakes, missingKeys };
    }

    let targetPassageId = null;
    if (partNumber && testData.passages && testData.passages[partNumber - 1]) {
        targetPassageId = testData.passages[partNumber - 1].id;
    }

    const walk = (obj, parentType, parentHasOptions) => {
        if (!obj || typeof obj !== 'object') return;

        // Skip questions and passages not belonging to the targeted part in part practice
        if (targetPassageId) {
            if (obj.passageId && String(obj.passageId) !== String(targetPassageId)) return;
            if (obj.id && (obj.audio || obj.passageNumber) && String(obj.id) !== String(targetPassageId)) return;
        }

        const currentType = String(obj.type || parentType || "").toLowerCase();
        // `options` bo'lgan guruh — variant-tanlash guruhi (map_labeling, options'li flow_chart).
        // Review UI ham aynan shu qoidaga tayanadi, shuning uchun ikkalasi bir xil natija beradi.
        const hasOptions = parentHasOptions || (Array.isArray(obj.options) && obj.options.length > 0);
        const isChoice = isChoiceQuestionType(currentType) || hasOptions;

        if (isMultiAnswerType(obj.type) && !obj.id) {
            const groupItems = [];
            const collectItems = (o) => {
                if (!o || typeof o !== 'object') return;
                if (o.id && getAnswerKey(o) !== undefined) groupItems.push(o);
                ['questions', 'items', 'rows', 'groups', 'cells', 'content', 'parts'].forEach(sk => {
                    if (o[sk] && Array.isArray(o[sk])) o[sk].forEach(collectItems);
                    else if (o[sk] && typeof o[sk] === 'object') collectItems(o[sk]);
                });
            };
            collectItems(obj);

            if (groupItems.length > 0) {
                const allCorrect = groupItems.map(i => getAnswerKey(i)).join(', ');
                const allUser = groupItems.map(i => userAnswers[String(i.id)] || "").join(', ');

                // Weight: tur nomidagi son (pick_two → 2), bo'lmasa ID larning umumiy og'irligi.
                // ID "23-24" ko'rinishida bo'lsa, u 2 ta savolni bildiradi.
                let weight = getMultiSelectCount(currentType);
                if (!weight) {
                    weight = groupItems.reduce((sum, i) => sum + getQuestionWeight(i.id), 0) || groupItems.length;
                }

                const result = scoreMultiAnswer(allCorrect, allUser, weight);
                correctCount += result.matches;
                totalQ += result.weight;

                if (result.matches < result.weight && allUser.trim()) {
                    mistakes.push({ questionId: groupItems.map(i => i.id).join(', '), userResponse: allUser, correctAnswer: allCorrect, isMulti: true });
                }
                groupItems.forEach(i => scoredIds.add(String(i.id).trim()));
                return;
            }
        }

        const itemAns = getAnswerKey(obj);
        if (obj.id && itemAns !== undefined) {
            const idStr = String(obj.id).trim();
            if (!scoredIds.has(idStr)) {
                scoredIds.add(idStr);
                const userResp = userAnswers[idStr] || "";
                const weight = getQuestionWeight(idStr);

                if (isMultiAnswerType(currentType) || idStr.includes('-') || idStr.includes(',')) {
                    const result = scoreMultiAnswer(itemAns, userResp, weight);
                    correctCount += result.matches;
                    totalQ += result.weight;
                    if (result.matches < result.weight && String(userResp).trim()) {
                        mistakes.push({ questionId: idStr, userResponse: userResp, correctAnswer: itemAns });
                    }
                } else {
                    totalQ++;
                    if (checkAnswer(itemAns, userResp, isChoice)) correctCount++;
                    else if (String(userResp).trim()) mistakes.push({ questionId: idStr, userResponse: userResp, correctAnswer: itemAns });
                }
            }
        } else if (obj.id && itemAns === undefined) {
            // Talaba javob bergan, lekin javob kaliti yo'q — bu test tuzishdagi xato.
            // Bunday savol umumiy hisobga kirmaydi, shuning uchun band sun'iy ko'tariladi.
            const idStr = String(obj.id).trim();
            const resp = userAnswers[idStr];
            if (resp !== undefined && resp !== null && String(resp).trim() !== '' && !missingKeys.includes(idStr)) {
                missingKeys.push(idStr);
            }
        }

        ['sections', 'questions', 'groups', 'passages', 'items', 'parts', 'content', 'rows', 'cells'].forEach(key => {
            const val = obj[key];
            if (val && Array.isArray(val)) val.forEach(child => walk(child, currentType, hasOptions));
            else if (val && typeof val === 'object') walk(val, currentType, hasOptions);
        });
    };

    walk(testData, null, false);

    const band = calculateBandScore(correctCount, testData.type || 'reading', totalQ);

    return { correctCount, totalQ, band, mistakes, missingKeys };
};

// UTILITY TO CALCULATE SCORE FOR A SECTION (READING/LISTENING)
// `evaluateTest` ustidagi yupqa qobiq — ilgari bu alohida (va farqli) implementatsiya edi.
export const calculateSectionScore = (testData, sectionAnswers) => {
    const { correctCount, totalQ } = evaluateTest(testData, sectionAnswers || {});
    return {
        correct: correctCount,
        total: totalQ || 40 // Default to 40 if not found
    };
};

// VAQT FORMATLASH (MM:SS)
export const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

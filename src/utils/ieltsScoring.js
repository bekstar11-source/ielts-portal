// src/utils/ieltsScoring.js

// IELTS BAND CALCULATOR
export const calculateBandScore = (score, type, totalQuestions = 40) => {
    const t = type?.toLowerCase();

    if (t === 'listening' || t === 'reading') {
        if (!totalQuestions || totalQuestions <= 0) return 0;
        if (score <= 0) return 0;

        // Part testlar uchun (masalan, bitta passage 13-14 savol yoki listening qismi 10 savol)
        // Xatolar soniga ko'ra band hisoblanadi (scaling orqali gapi-shashlik bo'lmasligi uchun)
        if (totalQuestions >= 10 && totalQuestions <= 15) {
            const mistakes = totalQuestions - score;
            if (mistakes <= 0) return 9.0;
            if (mistakes === 1) return 8.5;
            if (mistakes === 2) return 8.0;
            if (mistakes === 3) return 7.5;
            if (mistakes === 4) return 7.0;
            if (mistakes === 5) return 6.5;
            if (mistakes === 6) return 6.0;
            if (mistakes === 7) return 5.5;
            if (mistakes === 8) return 5.0;
            if (mistakes === 9) return 4.5;
            if (mistakes === 10) return 4.0;
            if (mistakes === 11) return 3.5;
            if (mistakes === 12) return 3.0;
            if (mistakes === 13) return 2.5;
            if (mistakes === 14) return 2.0;
            return 1.0;
        }

        // Standart testlar (40 ta savol) yoki boshqa o'lchamdagi testlar uchun scaling
        let scaledScore;
        if (totalQuestions === 40) {
            scaledScore = score;
        } else if (totalQuestions === 20) {
            scaledScore = Math.round((score / 20) * 40);
        } else {
            // Nostandart savollar soni: eng yaqin qiymatga o'tkazamiz
            scaledScore = Math.round((score / totalQuestions) * 40);
        }

        // Rasmiy IELTS band jadvali (40 ta asosida)
        if (scaledScore >= 39) return 9.0;
        if (scaledScore >= 37) return 8.5;
        if (scaledScore >= 35) return 8.0;
        if (scaledScore >= 32) return 7.5;
        if (scaledScore >= 30) return 7.0;
        if (scaledScore >= 26) return 6.5;
        if (scaledScore >= 23) return 6.0;
        if (scaledScore >= 18) return 5.5;
        if (scaledScore >= 16) return 5.0;
        if (scaledScore >= 13) return 4.5;
        if (scaledScore >= 10) return 4.0;
        if (scaledScore >= 8)  return 3.5;
        if (scaledScore >= 6)  return 3.0;
        if (scaledScore >= 4)  return 2.5;
        if (scaledScore >= 2)  return 2.0;
        if (scaledScore >= 1)  return 1.0;
        return 0;
    }
    return null;
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

// JAVOBNI TEKSHIRISH FUNKSIYASI
export const checkAnswer = (correct, user, isChoiceType = false) => {
    if (correct === undefined || correct === null) return false;

    // Support single letter answers matched against prefix-style correct answers (e.g., user: "C", correct: "C. Text")
    // Faqat variant-tanlash (MCQ/TFNG/Matching) turlarida yoqiladi — gap-fill javoblarida yolg'on-ijobiy xato bermasligi uchun.
    const correctStr = String(correct).trim();
    const userStr = String(user || '').trim().toUpperCase();
    if (isChoiceType && userStr.length === 1 && /^[A-Z]$/.test(userStr)) {
        const match = correctStr.match(/^([A-Z])[\.\)\s]/i);
        if (match && match[1].toUpperCase() === userStr) {
            return true;
        }
    }

    // 1. Tozalash
    let cleanCorrect = normalizeString(correct);
    
    // 2. "v. long text" muammosini hal qilish (Roman numerals with dot)
    const rawUser = String(user || '').trim().toLowerCase();
    let cleanUser = rawUser;
    if (/^[ivx]+[\.\)\s]/.test(rawUser)) {
        cleanUser = rawUser.split(/[\.\)\s]/)[0].trim();
    }
    cleanUser = normalizeString(cleanUser);

    if (!cleanUser) return false;

    // 3. Qavslar ichidagi ixtiyoriy so'zlar (e.g. "in (the) school")
    // Biz ixtiyoriy so'zlarni olib tashlangan va bor holatini tekshiramiz
    const checkWithOptional = (correctStr, userStr) => {
        if (correctStr === userStr) return true;
        
        // Qavslarni olib tashlaymiz (e.g. "in (the) school" -> "in the school")
        const withoutParens = correctStr.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
        if (withoutParens === userStr) return true;

        // Qavslar ichidagi so'zlar bilan birga olib tashlaymiz (e.g. "in (the) school" -> "in school")
        const withoutWords = correctStr.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
        if (withoutWords === userStr) return true;

        return false;
    };

    // 4. Slash (/) yoki Pipe (|) tekshiruvi (Alternative answers)
    const options = cleanCorrect.split(/[/|]/).map(s => s.trim());
    
    // Agar user bir nechta javobni slash bilan yozgan bo'lsa (e.g. user: "a / b")
    const userOptions = cleanUser.split(/[/|]/).map(s => s.trim());

    // User yozgan har qanday variant to'g'ri javoblardan biriga mos kelsa
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
        const s = String(str).trim();
        
        // Single letters split (A, B, C) - Only if items are clearly single letters
        if (/^[A-Z, /|\s]+$/i.test(s)) {
            const parts = s.split(/[,/|\s]+/).map(p => p.trim().toLowerCase()).filter(p => p.length === 1 || /^[ivx]+$/i.test(p));
            if (parts.length > 0) return parts;
        }

        // Standard split by common delimiters
        return s.split(/[,/|]/).map(item => item.trim().toLowerCase()).filter(Boolean);
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
           t.includes('multi selection') || 
           t.includes('multi answer') ||
           t.includes('selection');
};

// VAQT FORMATLASH (MM:SS)
export const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// UTILITY TO CALCULATE SCORE FOR A SECTION (READING/LISTENING)
export const calculateSectionScore = (testData, sectionAnswers) => {
    let correctCount = 0;
    let totalQ = 0;
    const scoredIds = new Set();

    const getWeight = (id) => {
        if (!id) return 1;
        const s = String(id).trim();
        const parts = s.split(/[\-–—_]/).map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return Math.abs(parts[1] - parts[0]) + 1;
        }
        if (s.includes(',')) {
            return s.split(',').length;
        }
        return 1;
    };

    const isMultiAnswer = isMultiAnswerType;

    const walk = (obj, parentType) => {
        if (!obj) return;
        const currentType = obj.type || parentType;

        // MULTI-ANSWER GROUP SCORING (to handle shuffling)
        // If this is a container (group) and is a multi-answer type, process all children at once
        if (isMultiAnswerType(obj.type) && !obj.id) {
            const groupItems = [];
            const collectItems = (o) => {
                const ans = o.answer || o.correct_answer || o.correctAnswer || o.correct_answer_value;
                if (o.id && ans) {
                    groupItems.push(o);
                }
                const subKeys = ['questions', 'items', 'rows', 'groups', 'cells', 'content', 'parts'];
                for (const sk of subKeys) {
                    if (o[sk] && Array.isArray(o[sk])) {
                        o[sk].forEach(collectItems);
                    }
                }
            };
            collectItems(obj);

            if (groupItems.length > 0) {
                const allCorrect = groupItems.map(i => i.answer || i.correct_answer || i.correctAnswer || i.correct_answer_value).join(', ');
                const allUser = groupItems.map(i => sectionAnswers[i.id] || "").join(', ');
                
                // Weight ni aniqlash (Default: itemlar soni)
                let weight = groupItems.length;
                const t = String(obj.type).toLowerCase();
                if (t.includes('five')) weight = 5;
                else if (t.includes('four')) weight = 4;
                else if (t.includes('three')) weight = 3;
                else if (t.includes('two')) weight = 2;

                const result = scoreMultiAnswer(allCorrect, allUser, weight);
                correctCount += result.matches;
                totalQ += result.weight;

                groupItems.forEach(i => scoredIds.add(String(i.id)));
                return; // Stop recursion for this group
            }
        }

        const answer = obj.answer || obj.correct_answer || obj.correctAnswer || obj.correct_answer_value;
        if (obj.id && answer) {
            const id = obj.id;
            const idStr = String(id);

            if (scoredIds.has(idStr)) return;

            if (isMultiAnswer(currentType)) {
                const weight = getWeight(id);
                const userResp = sectionAnswers[idStr] || sectionAnswers[id] || "";
                const result = scoreMultiAnswer(answer, userResp, weight);
                correctCount += result.matches;
                totalQ += result.weight;
                scoredIds.add(idStr);
            } else {
                const userResp = sectionAnswers[idStr] || sectionAnswers[id] || "";
                const isCorrect = checkAnswer(answer, userResp, isChoiceQuestionType(currentType));
                if (isCorrect) correctCount++;
                totalQ++;
                scoredIds.add(idStr);
            }
        }

        const CONTAINER_KEYS = ['sections', 'questions', 'groups', 'passages', 'items', 'parts', 'content', 'rows', 'cells'];
        for (const key of CONTAINER_KEYS) {
            const val = obj[key];
            if (val && Array.isArray(val)) {
                val.forEach(child => walk(child, currentType));
            } else if (val && typeof val === 'object') {
                walk(val, currentType);
            }
        }
    };

    // Entry points
    walk(testData);

    // Fallbacks if testData top-level property check is still needed
    if (testData.questions && !scoredIds.size) {
        testData.questions.forEach(q => walk(q, q.type));
    }
    if (testData.passages && !scoredIds.size) {
        testData.passages.forEach(p => walk(p, null));
    }

    return {
        correct: correctCount,
        total: totalQ || 40 // Default to 40 if not found
    };
};
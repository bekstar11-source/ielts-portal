// src/utils/ieltsScoring.js

// IELTS BAND CALCULATOR
export const calculateBandScore = (score, type, totalQuestions = 40) => {
    const t = type?.toLowerCase();

    if (t === 'listening' || t === 'reading') {
        if (!totalQuestions || totalQuestions <= 0) return 0;

        // Faqat 20 yoki 40 ta savollik testlar qabul qilinadi
        // 20 talik → 40 talik tizimga o'tkaziladi
        // Boshqa son → null (noto'g'ri test uzunligi)
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
export const calculateOverallBand = (...scores) => {
    const validScores = scores.filter(s => typeof s === 'number' && s > 0);
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
const normalizeString = (str) => {
    return String(str || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' '); // Collapse multiple spaces to one
};

// JAVOBNI TEKSHIRISH FUNKSIYASI
export const checkAnswer = (correct, user) => {
    if (correct === undefined || correct === null) return false;

    // 1. Tozalash
    let cleanCorrect = normalizeString(correct);
    let cleanUser = normalizeString(user);

    if (!cleanUser) return false;

    // 2. "v. long text" muammosini hal qilish (Roman numerals with dot)
    if (/^[ivx]+\./.test(cleanUser)) {
        cleanUser = cleanUser.split('.')[0].trim();
    }

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
        // Har bir harfni (A-Z) alohida ajratib olishga harakat qilamiz agar bu harflar bo'lsa
        if (/^[A-Z, /|\s]+$/i.test(str)) {
            return str.replace(/[,/|\s]/g, '').toLowerCase().split('');
        }
        return String(str).split(/[,/|]/).map(s => s.trim().toLowerCase()).filter(Boolean);
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
    return { matches: Math.min(matches, finalWeight), weight: finalWeight };
};

// VAQT FORMATLASH (MM:SS)
export const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};
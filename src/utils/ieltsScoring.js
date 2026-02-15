// src/utils/ieltsScoring.js

// IELTS BAND CALCULATOR
export const calculateBandScore = (score, type, totalQuestions = 40) => {
    const t = type?.toLowerCase();

    if (t === 'listening' || t === 'reading') {
        let finalScore = score;

        // Agar test to'liq bo'lmasa (masalan, 35 dan kam savol bo'lsa),
        // ballni 40 talik shkalaga proporsional o'tkazamiz.
        if (totalQuestions > 0 && totalQuestions < 35) {
            finalScore = Math.round((score / totalQuestions) * 40);
        }

        // Standart jadval (40 talik shkala bo'yicha)
        if (finalScore >= 39) return 9.0;
        if (finalScore >= 37) return 8.5;
        if (finalScore >= 35) return 8.0;
        if (finalScore >= 32) return 7.5;
        if (finalScore >= 30) return 7.0;
        if (finalScore >= 26) return 6.5;
        if (finalScore >= 23) return 6.0;
        if (finalScore >= 18) return 5.5;
        if (finalScore >= 16) return 5.0;
        if (finalScore >= 13) return 4.5;
        if (finalScore >= 10) return 4.0;
        return 3.5;
    }
    return null;
};

// JAVOBNI TEKSHIRISH FUNKSIYASI
export const checkAnswer = (correct, user) => {
    if (correct === undefined || correct === null) return false;

    // 1. Tozalash (Trim + Lowercase)
    let cleanCorrect = String(correct).trim().toLowerCase();
    let cleanUser = String(user || "").trim().toLowerCase();

    // 2. "v. long text" muammosini hal qilish
    if (/^[ivx]+\./.test(cleanUser)) {
        cleanUser = cleanUser.split('.')[0].trim();
    }

    // 3. Slash (/) yoki Pipe (|) tekshiruvi
    if (cleanCorrect.includes('/')) {
        const options = cleanCorrect.split('/').map(s => s.trim());
        return options.includes(cleanUser);
    }
    if (cleanCorrect.includes('|')) {
        const options = cleanCorrect.split('|').map(s => s.trim());
        return options.includes(cleanUser);
    }

    // 4. Oddiy tekshiruv
    return cleanCorrect === cleanUser;
};

// VAQT FORMATLASH (MM:SS)
export const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};
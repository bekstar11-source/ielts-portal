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
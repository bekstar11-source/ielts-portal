// src/utils/ieltsScoring.js

// IELTS BAND CALCULATOR
export const calculateBandScore = (score, type, totalQuestions = 40) => {
    const t = type?.toLowerCase();

    if (t === 'listening' || t === 'reading') {
        if (!totalQuestions || totalQuestions <= 0) return 0;

        // Agar test to'liq 40 ta savoldan iborat bo'lsa, rasmiy IELTS jadvalidan foydalanish
        if (totalQuestions === 40) {
            if (score >= 39) return 9.0;
            if (score >= 37) return 8.5;
            if (score >= 35) return 8.0;
            if (score >= 32) return 7.5;
            if (score >= 30) return 7.0;
            if (score >= 26) return 6.5;
            if (score >= 23) return 6.0;
            if (score >= 18) return 5.5;
            if (score >= 16) return 5.0;
            if (score >= 13) return 4.5;
            if (score >= 10) return 4.0;
            return score > 0 ? 3.5 : 0;
        }

        // Agar savollar soni 40 tadan farq qilsa, berilgan savollar soniga nisbatan 
        // 9 ballik tizimda to'g'ridan to'g'ri baholash:
        let rawBand = (score / totalQuestions) * 9;

        // 0.5 ga karrali qilib yaxlitlash
        let band = Math.round(rawBand * 2) / 2;

        return Math.min(Math.max(band, 0), 9.0);
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
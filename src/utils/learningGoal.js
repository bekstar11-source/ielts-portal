// src/utils/learningGoal.js
//
// Foydalanuvchining O'QUV MAQSADI — portalning yangi asosiy o'qi.
//
// ─── NEGA KERAK ─────────────────────────────────────────────────────────────
//
// Portal butunlay IELTS band'i atrofida qurilgan edi: onboarding maqsadli band
// va imtihon sanasini so'rardi, dashboard bandni ko'rsatardi, Library faqat
// IELTS bo'limlarini berardi. Ingliz tilini endi o'rganayotgan odam birinchi
// ekrandayoq "bu men uchun emas" degan xulosaga kelardi.
//
// `goal` — shu ayriqni belgilaydigan YAGONA maydon. U onboarding'da nima
// so'ralishini, dashboard nimani ko'rsatishini va qaysi materiallar tavsiya
// qilinishini hal qiladi.
//
// ─── ESKI FOYDALANUVCHILAR ──────────────────────────────────────────────────
//
// Mavjud hisoblarda `goal` maydoni YO'Q. Ular IELTS portaliga ro'yxatdan
// o'tishgan, shuning uchun maydon bo'lmasa `ielts` deb qaraladi — bu hozirgi
// xatti-harakatni AYNAN saqlaydi va migratsiya talab qilmaydi.

/** Mumkin bo'lgan maqsadlar. Firestore'da `users/{uid}.goal` sifatida saqlanadi. */
export const GOALS = {
    IELTS: 'ielts',
    GENERAL: 'general',
    UNSURE: 'unsure',
};

const VALID_GOALS = new Set(Object.values(GOALS));

/**
 * Onboarding'dagi daraja javobini CEFR'ga o'giradi.
 *
 * ⚠️ Onboarding tugmalaridagi `val` qiymatlari bilan AYNAN mos bo'lishi shart
 * (`src/pages/auth/Onboarding.jsx` → `renderStepLevel`).
 */
export const CEFR_BY_CURRENT_LEVEL = {
    'Beginner': 'A2',
    'Intermediate': 'B1',
    'Upper-Intermediate': 'B2',
    'Advanced': 'C1',
};

/**
 * Foydalanuvchining maqsadi.
 *
 * Noma'lum yoki yo'q qiymat → `ielts` (yuqoridagi "eski foydalanuvchilar"
 * izohiga qarang).
 */
export function getGoal(userData) {
    const raw = userData?.goal;
    return VALID_GOALS.has(raw) ? raw : GOALS.IELTS;
}

/**
 * IELTS'ga xos ekranlar (maqsadli band, imtihon sanasi, mock, band tahlili)
 * ko'rsatilsinmi?
 *
 * "Hali bilmayman" javobini bergan odam ham IELTS'ni KO'RADI — biz uni
 * yo'ldan chetlatmoqchi emasmiz, faqat majburlamaymiz. Shuning uchun bu
 * yerda faqat sof `general` chiqarib tashlanadi.
 */
export function showsIeltsContent(userData) {
    return getGoal(userData) !== GOALS.GENERAL;
}

/**
 * Onboarding'da maqsadli band va imtihon sanasi SO'RALSINMI?
 *
 * Bu `showsIeltsContent` dan qat'iyroq: hali qaror qilmagan odamdan ham
 * "maqsadli band" so'rash ma'nosiz — uning javobi bo'lmaydi va u shunchaki
 * tasodifiy raqam tanlaydi (keyin bu butun statistikani buzadi).
 */
export function asksIeltsTarget(userData) {
    return getGoal(userData) === GOALS.IELTS;
}

/** Onboarding javobidan CEFR darajasi. Noma'lum bo'lsa `null`. */
export function toCefrLevel(currentLevel) {
    return CEFR_BY_CURRENT_LEVEL[currentLevel] || null;
}

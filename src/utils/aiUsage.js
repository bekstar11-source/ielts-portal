/**
 * AI limitlarining KLIENTDAGI nusxasi.
 *
 * ⚠️ Raqamlar `functions/speakingQuota.js` bilan bir xil bo'lishi shart —
 * bu yerdagi hisob faqat UI (Sozlamalar > Obuna sahifasidagi "AI limitlari"
 * kartasi) uchun. Haqiqiy cheklov serverda, tranzaksiya ichida qo'yiladi.
 */

import { getTier, isStaff } from './subscription';

/** Speaking AI baholashining tarif bo'yicha kunlik limiti. */
export const SPEAKING_DAILY_LIMITS = {
    free: 5,
    standard: 20,
    pro: 50,
};

export const SPEAKING_STAFF_DAILY_LIMIT = 200;

/** Toshkent vaqti bo'yicha kun kaliti — server bilan bir xil formatda. */
export function todayKey(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tashkent',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
}

/** @returns {number} shu foydalanuvchi uchun kunlik speaking limiti */
export function speakingDailyLimit(userData) {
    if (isStaff(userData)) return SPEAKING_STAFF_DAILY_LIMIT;
    return SPEAKING_DAILY_LIMITS[getTier(userData)] ?? SPEAKING_DAILY_LIMITS.free;
}

/**
 * `users/{uid}/usage/speaking` hujjatidan bugungi sarfni o'qiydi.
 * Kun almashgan bo'lsa hisoblagich nolga qaytadi — serverdagi mantiq bilan bir xil.
 *
 * @param {object|null} usageDoc  hujjat ma'lumoti (yo'q bo'lsa null)
 * @param {object} userData
 * @returns {{ used: number, limit: number, remaining: number, total: number }}
 */
export function getSpeakingUsage(usageDoc, userData) {
    const limit = speakingDailyLimit(userData);
    const day = todayKey();
    const used = usageDoc && usageDoc.day === day ? Number(usageDoc.count) || 0 : 0;
    return {
        used,
        limit,
        remaining: Math.max(limit - used, 0),
        total: Number(usageDoc?.total) || 0,
    };
}

/** Toshkent yarim tunigacha qolgan vaqt — "limit qachon yangilanadi" matni uchun. */
export function timeUntilReset(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Tashkent',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    const minutesLeft = 24 * 60 - (hour * 60 + minute);
    return {
        hours: Math.floor(minutesLeft / 60),
        minutes: minutesLeft % 60,
    };
}

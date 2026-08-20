/**
 * Audio vaqtlarining YAGONA manbasi.
 *
 * Ilgari admin (CreateTest) va o'quvchi (TestSolving) tomonlari vaqtni
 * mustaqil ravishda o'qir/yozardi va bir-biriga mos kelmasdi:
 *   - admin `Math.floor` bilan butun soniyagacha qirqardi (har chegarada ~1s yo'qolardi);
 *   - admin parser'i faqat `mm:ss` ni tushunardi, player esa `hh:mm:ss` ni ham.
 * Endi ikkala tomon ham shu yerdagi funksiyalardan foydalanadi.
 */

// Vaqtni saqlashda necha kasr xona qoldiriladi. Bir o'nlik ~0.1s aniqlik beradi —
// bu inson eshitmaydigan farq, lekin `mm:ss` maydonida hali ham o'qilarli.
const STORED_DECIMALS = 1;

/**
 * "7:30", "7:30.4", "1:07:30" yoki 450 → soniya (float).
 * Noto'g'ri qiymat uchun 0 qaytaradi.
 */
export const parseAudioTime = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;

    const str = String(val).trim();
    if (str === '') return 0;

    if (str.includes(':')) {
        // Eng o'ngdagi bo'lak — soniya, undan chapga daqiqa, keyin soat.
        const parts = str.split(':');
        let total = 0;
        for (const part of parts) {
            const n = Number(part);
            total = total * 60 + (Number.isFinite(n) ? n : 0);
        }
        return total;
    }

    const n = Number(str);
    return Number.isFinite(n) ? n : 0;
};

/**
 * Soniya → "m:ss". Ko'rsatish uchun (kasr qismisiz).
 */
export const formatAudioTime = (seconds) => {
    if (seconds === undefined || seconds === null || seconds === '') return '';
    const s = Number(seconds);
    if (!Number.isFinite(s)) return '';
    const sign = s < 0 ? '-' : '';
    const abs = Math.abs(s);
    const min = Math.floor(abs / 60);
    const sec = Math.floor(abs % 60);
    return `${sign}${min}:${String(sec).padStart(2, '0')}`;
};

/**
 * Soniya → saqlash uchun "m:ss.d" (kasr qismi 0 bo'lsa — oddiy "m:ss").
 * `Math.floor` o'rniga shu ishlatiladi: chegara aniq qayerda belgilangan bo'lsa,
 * o'quvchi audiosi ham xuddi o'sha yerda kesiladi.
 */
export const formatAudioTimePrecise = (seconds) => {
    if (seconds === undefined || seconds === null || seconds === '') return '';
    const s = Number(seconds);
    if (!Number.isFinite(s)) return '';
    const rounded = Math.max(0, roundAudioTime(s));
    const min = Math.floor(rounded / 60);
    const sec = rounded - min * 60;
    const secStr = Number.isInteger(sec)
        ? String(sec).padStart(2, '0')
        : sec.toFixed(STORED_DECIMALS).padStart(2 + 1 + STORED_DECIMALS, '0');
    return `${min}:${secStr}`;
};

/** Saqlanadigan aniqlikka yaxlitlash — float xatolari to'planib ketmasligi uchun. */
export const roundAudioTime = (seconds) => {
    const s = Number(seconds);
    if (!Number.isFinite(s)) return 0;
    const factor = 10 ** STORED_DECIMALS;
    return Math.round(s * factor) / factor;
};

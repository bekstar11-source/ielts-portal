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

/**
 * Admin kiritgan matnni TEKSHIRIB o'qiydi.
 *
 * `parseAudioTime` hech qachon xato qaytarmaydi — u o'quvchi tomonida shunday
 * kerak (yomon qiymat imtihonni to'xtatmasligi shart). Lekin admin tomonida
 * jimgina 0 ga aylantirish aynan shu bug'ning manbai edi: "6;05" yozilsa,
 * maydon to'ldirilgandek ko'rinardi, imtihon esa 0-soniyadan boshlanardi.
 *
 * @returns {{valid: boolean, empty: boolean, seconds: number, reason: string}}
 */
export const parseAudioTimeInput = (raw) => {
    if (raw === undefined || raw === null) return { valid: false, empty: true, seconds: 0, reason: 'empty' };
    const str = String(raw).trim().replace(',', '.');
    if (str === '') return { valid: false, empty: true, seconds: 0, reason: 'empty' };

    const parts = str.split(':');
    if (parts.length > 3) return { valid: false, empty: false, seconds: 0, reason: 'format' };

    let total = 0;
    for (let i = 0; i < parts.length; i++) {
        const piece = parts[i];
        const isLast = i === parts.length - 1;
        // Kasr qismi faqat eng oxirgi (soniya) bo'lagida bo'lishi mumkin.
        const pattern = isLast ? /^\d+(\.\d+)?$/ : /^\d+$/;
        if (!pattern.test(piece)) return { valid: false, empty: false, seconds: 0, reason: 'format' };
        const n = Number(piece);
        // "6:75" — daqiqa/soniya 60 dan oshmaydi. Bunday qiymat deyarli har doim
        // xato yozuv, jimgina 7:15 ga aylantirilsa admin sezmay qoladi.
        if (i > 0 && n >= 60) return { valid: false, empty: false, seconds: 0, reason: 'range' };
        total = total * 60 + n;
    }

    return { valid: true, empty: false, seconds: roundAudioTime(total), reason: '' };
};

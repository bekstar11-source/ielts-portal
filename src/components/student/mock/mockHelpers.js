/**
 * /mock sahifasining umumiy yordamchilari.
 *
 * Vizual til bitta joyda: yagona sirt (`CARD_CLS`), yupqa hairline chegara,
 * urg'u faqat `warm-primary` da. Sana bilan ishlashda esa hamma joyda bir xil
 * "normalizatsiya" ishlatiladi — ilgari har bir komponent `new Date(...)` ni
 * o'zicha chaqirib, noto'g'ri qiymatda `Invalid Date` chiqarardi.
 */

export const CARD_CLS =
    'rounded-2xl border border-warm-hairline dark:border-white/10 bg-white dark:bg-warm-dark-elevated';

export const MUTED_CLS = 'text-warm-muted dark:text-warm-on-dark-soft';

/** Firestore Timestamp, ISO satr yoki Date — hammasi Date yoki null ga keltiriladi. */
export function toDate(value) {
    if (!value) return null;
    if (typeof value === 'object' && typeof value.toDate === 'function') {
        const fromTs = value.toDate();
        return Number.isNaN(fromTs.getTime()) ? null : fromTs;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Bugundan boshlab kunlar farqi: 0 = bugun, 1 = ertaga, manfiy = o'tib ketgan. */
export function daysUntil(date) {
    if (!date) return null;
    return Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
}

export function isSameDay(a, b) {
    return Boolean(a && b) && startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function formatDate(date, lang, options) {
    if (!date) return '—';
    return date.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'en-GB', options || {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Ro'yxatni tartiblash uchun mock'ning "asosiy" sanasi.
 * Ilgari faqat `startDate` ishlatilardi va u bo'lmagan yozuvlar `NaN` berib,
 * saralashni butunlay buzardi.
 */
export function mockSortDate(mock) {
    return (
        toDate(mock.scheduledDate) ||
        toDate(mock.completedAt) ||
        toDate(mock.submittedAt) ||
        toDate(mock.startDate) ||
        new Date(0)
    );
}

/** Ball qiymatini bir xil ko'rinishga keltiradi (0 ham haqiqiy ball). */
export function formatBand(value) {
    if (value === undefined || value === null || value === '') return '—';
    const num = Number(value);
    return Number.isNaN(num) ? '—' : num.toFixed(1);
}

/**
 * TRF raqami natija ID sidan barqaror hosil qilinadi — har render'da
 * o'zgarib turmasligi uchun tasodifiylik ishlatilmaydi.
 */
export function buildTrfNumber(mock, fullName) {
    const seed = String(mock.resultId || mock.id || mock.mockKey || 'CANDIDATE');
    const hash = Array.from(seed)
        .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7)
        .toString(36)
        .toUpperCase()
        .padStart(6, '0')
        .slice(0, 6);
    const initials = (fullName || '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'CAN';
    return `26UZ${hash}${initials}004A`;
}

/** Rejalashtirilgan sanani odam o'qiydigan qisqa yorliqqa aylantiradi. */
export function scheduleLabel(date, t, lang) {
    if (!date) return { text: t('mock.notScheduled'), tone: 'muted' };
    const diff = daysUntil(date);
    if (diff < 0) return { text: t('mock.overdue'), tone: 'warning' };
    if (diff === 0) return { text: t('mock.today'), tone: 'accent' };
    if (diff === 1) return { text: t('mock.tomorrow'), tone: 'accent' };
    if (diff <= 14) return { text: t('mock.daysLeft').replace('{count}', diff), tone: 'muted' };
    return { text: formatDate(date, lang, { day: 'numeric', month: 'short', year: 'numeric' }), tone: 'muted' };
}

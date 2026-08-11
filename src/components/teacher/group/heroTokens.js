/**
 * Guruh hero'ining ranglari, o'lchamlari va sof yordamchi funksiyalari.
 *
 * Komponentdan ajratilgan: `GroupHero.jsx` faqat komponent eksport qiladi,
 * shunda Vite'ning fast-refresh'i ishlashda davom etadi.
 */

/**
 * Dizayn palitrasi. Bu ekran o'z sirtiga ega — ranglar tailwind mavzusidan
 * emas, shu yerdan olinadi, shuning uchun yorug'/qorong'i rejimda bir xil
 * ko'rinadi (dizayn ataylab bitta issiq palitraga bog'langan).
 */
export const HERO_COLORS = {
    canvas: '#f1eee9',
    dark: '#17171a',
    orange: '#f2683c',
    orangeDeep: '#d2481a',
    orangeSoft: '#ffb59a',
    bone: '#f5f1eb',
    stone: '#5c5751',
    stoneLight: '#a8a29a',
    muted: '#8a8580',
};

/** Holatga qarab chiziq, plitka va tanlov ramkasi ranglari. */
export const TONES = {
    toza: {
        bar: HERO_COLORS.bone,
        ring: HERO_COLORS.bone,
        dot: HERO_COLORS.bone,
        tile: 'rgba(255,255,255,.06)',
        tileHover: 'rgba(255,255,255,.12)',
        label: 'rgba(255,255,255,.5)',
        pct: HERO_COLORS.bone,
    },
    qarzdor: {
        bar: HERO_COLORS.stone,
        ring: HERO_COLORS.stoneLight,
        dot: HERO_COLORS.stone,
        tile: 'rgba(255,255,255,.06)',
        tileHover: 'rgba(255,255,255,.12)',
        label: 'rgba(255,255,255,.5)',
        pct: 'rgba(255,255,255,.6)',
    },
    yozib: {
        bar: HERO_COLORS.orange,
        ring: HERO_COLORS.orange,
        dot: HERO_COLORS.orange,
        tile: 'rgba(242,104,60,.16)',
        tileHover: 'rgba(242,104,60,.26)',
        label: HERO_COLORS.orangeSoft,
        pct: HERO_COLORS.orange,
    },
};

/** Hero shu masofada (px) to'liq yig'ilib bo'ladi. */
export const COLLAPSE_RANGE = 220;

export const clamp01 = (n) => Math.max(0, Math.min(1, n));
export const px = (n) => `${n}px`;

/**
 * Dars vaqti ("10:00") va hozirgi paytdan sanoq matnini tuzadi.
 * Dars boshlangandan keyingi 90 daqiqa "davom etmoqda" deb hisoblanadi.
 *
 * @param {string}   lessonTime "HH:MM"
 * @param {Date}     now
 * @param {Function} t          tarjima funksiyasi
 */
export function buildCountdown(lessonTime, now, t) {
    const [h, m] = String(lessonTime || '').split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return '';

    const minsLeft = h * 60 + m - (now.getHours() * 60 + now.getMinutes());
    if (minsLeft <= 0) {
        return minsLeft > -90
            ? t('teacher.groupDetail.lessonOngoing')
            : t('teacher.groupDetail.lessonFinished');
    }

    const hours = Math.floor(minsLeft / 60);
    const mins = minsLeft % 60;
    const hourPart = hours ? `${hours} ${t('teacher.groupDetail.hourShort')} ` : '';
    return `${hourPart}${mins} ${t('teacher.groupDetail.minutesLeft')}`;
}

// src/utils/listeningSegments.js
//
// Listening part chegaralarini AYNAN imtihondagidek hisoblaydi.
//
// Admin sahifasi va o'quvchi pleyeri bir xil ma'lumotni boshqacha o'qigani uchun
// "belgilangan soniya" bilan "imtihonda eshitilgan joy" farq qilardi:
//   - bo'sh maydon admin uchun "audio oxirigacha", imtihon uchun esa
//     `450 * partIndex` (eski 7:30 lik standart bo'lak) degani edi;
//   - "6;05" kabi noto'g'ri yozuv admin ko'zida to'ldirilgan maydon,
//     imtihonda esa 0-soniya bo'lib qolardi.
// Endi ikkala savolga ham shu fayl javob beradi va admin xuddi shu javobni
// ekranda ko'radi.

import { parseAudioTime, parseAudioTimeInput, roundAudioTime, formatAudioTimePrecise } from './audioTime.js';

/**
 * Vaqt kiritilmagan partlar uchun eski (legacy) taxmin: har part 7:30.
 * `TestSolving/TestHeader.jsx` va `useMockExam.js` shu qiymatga tayanadi —
 * shuning uchun bu yerda ham AYNAN shu son bo'lishi shart.
 */
export const LEGACY_PART_SECONDS = 450;

/** Chegara farqi shundan kichik bo'lsa — bir xil nuqta deb qaraladi. */
export const BOUNDARY_EPSILON = 0.05;

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

/**
 * Bitta partning imtihonda qaysi soniyadan qaysi soniyagacha o'ynashini qaytaradi.
 * `fileDuration` berilsa, "tugash belgilanmagan" holati ham haqiqiy soniyaga
 * aylantiriladi (imtihonda audio oxirigacha ketadi).
 */
export const resolvePartBounds = (passage, index, fileDuration = 0) => {
    const p = passage || {};
    // Partning O'Z audiosi bo'lsa, imtihon uni 0 dan boshlaydi; umumiy (yagona)
    // audioda esa eski 7:30 lik taxminga tushadi.
    const hasOwnAudio = !!p.audio;
    const fallbackStart = hasOwnAudio ? 0 : index * LEGACY_PART_SECONDS;
    const fallbackEnd = hasOwnAudio ? 0 : (index + 1) * LEGACY_PART_SECONDS;

    const start = isBlank(p.startTime) ? fallbackStart : parseAudioTime(p.startTime);
    const rawEnd = isBlank(p.endTime) ? fallbackEnd : parseAudioTime(p.endTime);

    // Pleyer qoidasi: tugash boshlanishdan katta bo'lmasa, kesish YO'Q —
    // audio faylning oxirigacha o'ynaydi.
    const cuts = rawEnd > start;
    const end = cuts ? rawEnd : (fileDuration > start ? fileDuration : 0);

    const silence = Number(p.extraSilentTime) || 0;
    return {
        start: roundAudioTime(start),
        end: roundAudioTime(end),
        cuts,
        usesFallbackStart: isBlank(p.startTime),
        usesFallbackEnd: isBlank(p.endTime),
        silence: silence > 0 ? silence : 0,
        // O'quvchi ko'radigan part davomiyligi — sukunat bilan birga.
        duration: end > start ? roundAudioTime(end - start + (silence > 0 ? silence : 0)) : 0,
    };
};

const issue = (level, code, message) => ({ level, code, message });

/**
 * Barcha partlarni tekshiradi: yozuv xatolari, bo'shliq/ustma-ustlik,
 * audio uzunligidan chiqib ketish.
 *
 * @param {Array} passages
 * @param {number} partCount
 * @param {{fileDuration?: number}} opts
 * @returns {Array<{index, start, end, issues, ...}>}
 */
export const analyzeListeningParts = (passages = [], partCount = 4, opts = {}) => {
    const fileDuration = Number(opts.fileDuration) || 0;
    const list = [];

    for (let i = 0; i < partCount; i++) {
        const p = passages[i] || {};
        const bounds = resolvePartBounds(p, i, fileDuration);
        const startInput = parseAudioTimeInput(p.startTime);
        const endInput = parseAudioTimeInput(p.endTime);
        const issues = [];

        if (!startInput.valid && !startInput.empty) {
            issues.push(issue('error', 'start-invalid',
                `Boshlash vaqti noto'g'ri yozilgan ("${p.startTime}"). Imtihonda ${formatAudioTimePrecise(bounds.start)} dan boshlanadi.`));
        } else if (bounds.usesFallbackStart) {
            issues.push(issue(bounds.start > 0 ? 'error' : 'warning', 'start-empty',
                bounds.start > 0
                    ? `Boshlash kiritilmagan — imtihon eski standart bo'yicha ${formatAudioTimePrecise(bounds.start)} dan boshlaydi.`
                    : `Boshlash kiritilmagan — audio boshidan o'ynaydi.`));
        }

        if (!endInput.valid && !endInput.empty) {
            issues.push(issue('error', 'end-invalid',
                `Tugash vaqti noto'g'ri yozilgan ("${p.endTime}").`));
        } else if (bounds.usesFallbackEnd) {
            issues.push(issue(!bounds.cuts && bounds.end === 0 ? 'warning' : 'error', 'end-empty',
                bounds.cuts
                    ? `Tugash kiritilmagan — imtihon eski standart bo'yicha ${formatAudioTimePrecise(bounds.end)} da to'xtaydi.`
                    : `Tugash kiritilmagan — audio oxirigacha o'ynaydi.`));
        } else if (!bounds.cuts) {
            issues.push(issue('error', 'end-before-start',
                `Tugash vaqti boshlanishdan keyin bo'lishi kerak — hozir kesish ishlamaydi, audio oxirigacha o'ynaydi.`));
        }

        if (fileDuration > 0) {
            if (bounds.start >= fileDuration) {
                issues.push(issue('error', 'start-beyond-file',
                    `Boshlash audio uzunligidan (${formatAudioTimePrecise(fileDuration)}) tashqarida — part umuman eshitilmaydi.`));
            } else if (bounds.cuts && bounds.end > fileDuration + BOUNDARY_EPSILON) {
                issues.push(issue('error', 'end-beyond-file',
                    `Tugash audio uzunligidan (${formatAudioTimePrecise(fileDuration)}) uzunroq — part erta tugaydi.`));
            }
        }

        list.push({ index: i, ...bounds, startInput, endInput, issues });
    }

    // Qo'shni partlar chegarasi: bo'shliq eshitilmay qolgan gapga, ustma-ustlik
    // esa takrorlangan gapga olib keladi.
    for (let i = 0; i < list.length - 1; i++) {
        const cur = list[i];
        const next = list[i + 1];
        if (!cur.cuts || next.start <= 0) continue;
        if (cur.usesFallbackEnd || next.usesFallbackStart) continue;

        const delta = roundAudioTime(next.start - cur.end);
        if (delta > BOUNDARY_EPSILON) {
            const msg = `Part ${i + 1} tugashi bilan Part ${i + 2} boshlanishi orasida ${delta.toFixed(1)}s bo'shliq bor — bu joy imtihonda umuman eshitilmaydi.`;
            cur.issues.push(issue('warning', 'gap-after', msg));
            cur.gapAfter = delta;
            next.gapBefore = delta;
        } else if (delta < -BOUNDARY_EPSILON) {
            const overlap = Math.abs(delta);
            const msg = `Part ${i + 1} va Part ${i + 2} ${overlap.toFixed(1)}s ustma-ust tushgan — bu joy ikki marta eshitiladi.`;
            cur.issues.push(issue('error', 'overlap-after', msg));
            cur.overlapAfter = overlap;
            next.overlapBefore = overlap;
        }
    }

    return list;
};

/** Eng og'ir daraja: 'error' | 'warning' | null. */
export const worstIssueLevel = (issues = []) => {
    if (issues.some(i => i.level === 'error')) return 'error';
    if (issues.some(i => i.level === 'warning')) return 'warning';
    return null;
};

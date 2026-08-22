// src/utils/multilevelTest.js
//
// Multilevel Speaking test hujjatini imtihon oqimiga aylantiradi.
//
// Firestore'dagi hujjat qismlar bo'yicha guruhlangan (admin shunday
// to'ldiradi), o'quvchi esa savollarni KETMA-KET ko'radi. Shu ikki shakl
// orasidagi yagona ko'prik — mana shu fayl. Baholash chaqiruvi har savol
// uchun o'z kontekstini talab qiladi (rasm yo'llari, uchta savol, pros/cons),
// shuning uchun u kontekst har bir savolga shu yerda yopishtiriladi.
//
// Faqat klient uchun: server savol ro'yxatini qurmaydi, unga har safar
// bitta savolning konteksti keladi.

import { ML_TASKS } from './multilevelSpeaking.js';

/** Multilevel testlari saqlanadigan kolleksiya. */
export const MULTILEVEL_TESTS = 'multilevelSpeakingTests';

/** Bo'sh bo'lmagan satrlar ro'yxati. */
function cleanList(value) {
    return (Array.isArray(value) ? value : [])
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);
}

/**
 * Test hujjatidan savollar ro'yxatini quradi.
 *
 * Har savolda `index` bor va u MUHIM: 1-qismda javob vaqti savolga qarab
 * farq qiladi (rasm savoliga 45 s, qolganiga 30 s), ya'ni qism raqami
 * yolg'iz o'zi yetarli emas.
 *
 * @param {object} test
 * @returns {Array<{id: string, text: string, part: 1|2|3, index: number,
 *                  photoPaths?: string[], bullets?: string[], prosCons?: object,
 *                  kind: string}>}
 */
export function buildMultilevelQuestions(test) {
    if (!test) return [];
    const out = [];

    // 1-qism: uchta shaxsiy savol, keyin ikkita rasm bo'yicha uchta savol.
    const part1 = test.part1 || {};
    const personal = cleanList(part1.personal);
    const photoQuestions = cleanList(part1.photoQuestions);
    const part1Photos = cleanList(part1.photoPaths);

    personal.forEach((text, i) => {
        out.push({ id: `p1-personal-${i}`, text, part: 1, index: i, kind: 'personal' });
    });
    photoQuestions.forEach((text, i) => {
        out.push({
            id: `p1-photo-${i}`,
            text,
            part: 1,
            // Rasm savollari shaxsiylardan KEYIN turadi, shuning uchun indeks
            // ham shundan davom etadi — vaqt jadvali shunga tayanadi.
            index: personal.length + i,
            photoPaths: part1Photos,
            kind: 'photo',
        });
    });

    // 2-qism: bitta rasm, uchta savol, bitta javob.
    const part2 = test.part2 || {};
    const bullets = cleanList(part2.bullets);
    if (bullets.length > 0 || part2.photoPath) {
        out.push({
            id: 'p2',
            text: part2.prompt || 'Look at the photograph.',
            part: 2,
            index: 0,
            photoPaths: part2.photoPath ? [part2.photoPath] : [],
            bullets,
            kind: 'photo_bullets',
        });
    }

    // 3-qism: pros/cons jadvali.
    const part3 = test.part3 || {};
    const pros = cleanList(part3.pros);
    const cons = cleanList(part3.cons);
    if (pros.length > 0 && cons.length > 0) {
        out.push({
            id: 'p3',
            text: part3.topic || '',
            part: 3,
            index: 0,
            prosCons: { topic: part3.topic || '', pros, cons },
            kind: 'pros_cons',
        });
    }

    return out;
}

/**
 * Test to'liq to'ldirilganmi.
 *
 * Admin panelda saqlashdan oldin ishlatiladi: yarim to'ldirilgan test
 * o'quvchiga chiqib, o'rtasida tugab qolgandan ko'ra, saqlanmagani yaxshi.
 * Xabarlar ekranda ko'rsatiladi, shuning uchun o'zbekcha.
 */
export function validateMultilevelTest(test) {
    const problems = [];
    const part1 = test?.part1 || {};
    const part2 = test?.part2 || {};
    const part3 = test?.part3 || {};

    const expectedPersonal = ML_TASKS[1].questions.filter((q) => q.type === 'personal').length;
    const expectedPhoto = ML_TASKS[1].questions.filter((q) => q.type === 'photo').length;

    if (cleanList(part1.personal).length !== expectedPersonal) {
        problems.push(`1-qism: ${expectedPersonal} ta shaxsiy savol kerak.`);
    }
    if (cleanList(part1.photoQuestions).length !== expectedPhoto) {
        problems.push(`1-qism: rasm bo'yicha ${expectedPhoto} ta savol kerak.`);
    }
    if (cleanList(part1.photoPaths).length === 0) {
        problems.push("1-qism: kamida bitta rasm yuklang.");
    }

    if (!part2.photoPath) problems.push("2-qism: rasm yuklanmagan.");
    if (cleanList(part2.bullets).length !== ML_TASKS[2].questions[0].bulletCount) {
        problems.push(`2-qism: ${ML_TASKS[2].questions[0].bulletCount} ta savol kerak.`);
    }

    const need = ML_TASKS[3].questions[0].pickPerSide;
    if (!part3.topic) problems.push('3-qism: mavzu yozilmagan.');
    // Tanlash imkoni bo'lishi uchun har tomonda tanlanadiganidan KO'P punkt
    // bo'lishi kerak — aks holda "ikkitasini tanlang" degan vazifa yo'q.
    if (cleanList(part3.pros).length <= need) {
        problems.push(`3-qism: Pros ro'yxatida ${need + 1} tadan kam punkt.`);
    }
    if (cleanList(part3.cons).length <= need) {
        problems.push(`3-qism: Cons ro'yxatida ${need + 1} tadan kam punkt.`);
    }

    return problems;
}

// src/utils/tableQuestions.js
//
// Table completion (`table_completion` / `table`) savollari jadval katakchalari
// ichida yashiringan: guruhda `items`/`questions` bo'lmasligi mumkin, savollar esa
// `rows → cells → (id | parts | content)` zanjirida turadi.
//
// Bu zanjirni ilgari har bir joy (footer navigatsiyasi, savol sanagich, admin
// validator, statistika) alohida yozardi va har biri boshqacha xato qilardi —
// natijada bitta jadval savoli bir joyda ko'rinib, boshqasida yo'qolib ketardi:
// talaba javob yozadigan katakcha footerda ko'rinmasdi, "40 ta savol" hisobiga
// kirmasdi, ball hisobida esa maxrajdan tushib qolardi.
//
// Shuning uchun katakchani "savol"ga aylantirish qoidasi FAQAT shu yerda yozilgan.
// Qoidalar renderer (`ListeningInterface/types/Completion.jsx`) bilan bir xil:
// u ham `isMixed` bayrog'iga ISHONMAYDI, balki `parts` mavjudligiga qaraydi.

/**
 * Qator katakchalarini qaytaradi. Qator ikki xil yoziladi:
 *   `[cell, cell]`            — massiv ko'rinishi
 *   `{ cells: [cell, cell] }` — obyekt ko'rinishi
 * Ikkalasi ham bazada uchraydi, shuning uchun ikkalasi ham qo'llab-quvvatlanadi.
 */
export const getRowCells = (row) => {
    if (!row) return [];
    if (Array.isArray(row)) return row;
    if (Array.isArray(row.cells)) return row.cells;
    return [];
};

/**
 * Bitta katakchadagi savol elementlarini qaytaradi (savol bo'lmasa — bo'sh massiv).
 *
 * ⚠️ `isMixed` bayrog'i TEKSHIRILMAYDI: JSON larda u ko'pincha qo'yilmagan, lekin
 * katakchada `parts` bor. Renderer bunday katakchani baribir input bilan chizadi,
 * shuning uchun sanoq ham uni savol deb bilishi shart — aks holda talaba javob
 * yoza oladigan, lekin hech qayerda hisoblanmaydigan katakcha paydo bo'lardi.
 */
export const getCellQuestions = (cell) => {
    if (!cell || typeof cell !== 'object') return [];

    // 1. Bitta katakchada bir nechta savol: { isMultiQuestion: true, content: [...] }
    if (cell.isMultiQuestion && Array.isArray(cell.content)) {
        return cell.content.filter(Boolean);
    }

    // 2. Matn + input aralash katakcha: { parts: [{type:'text'}, {type:'input', id}] }
    if (Array.isArray(cell.parts)) {
        const inputs = cell.parts.filter(p => p && p.type === 'input' && p.id != null);
        if (inputs.length > 0) return inputs;
    }

    // 3. Oddiy savol katakchasi (matn ichida `[INPUT]` bo'lishi ham mumkin).
    if (cell.id != null) return [cell];

    return [];
};

/** `rows` dagi barcha savol elementlari (tartibi jadvaldagidek). */
export const extractTableQuestions = (rows) => {
    if (!Array.isArray(rows)) return [];
    const out = [];
    rows.forEach(row => {
        getRowCells(row).forEach(cell => {
            getCellQuestions(cell).forEach(q => out.push(q));
        });
    });
    return out;
};

/**
 * Guruh jadvalmi? `type` har doim ham to'g'ri yozilmaydi (ba'zi JSON larda
 * `note_completion` deb turib ichida `rows` bo'ladi), shuning uchun tuzilmaga
 * qaraymiz — `rows` bor bo'lsa, bu jadval.
 */
export const hasTableRows = (group) => Boolean(group && Array.isArray(group.rows) && group.rows.length > 0);

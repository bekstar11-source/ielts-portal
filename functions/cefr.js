// functions/cefr.js
//
// ⚠️ AVTOMATIK NUSXA — QO'LDA TAHRIRLAMANG.
// Manba: src/utils/cefr.js. O'zgartirish kiritish uchun o'sha faylni tahrirlang
// va `npm run mirror` ni ishga tushiring.

//
// CEFR darajalari bo'yicha umumiy lug'at va taqqoslash.
//
// ⚠️ Bu fayl `functions/cefr.js` ga NUSXALANADI (`npm run mirror`). Sabab:
// darajani KLIENT ham (qaysi maqolani ko'rsatish), SERVER ham (placement
// natijasini hisoblash) aniqlaydi. Ikkisi bir-biridan siljisa, o'quvchi
// natijada "B1" ko'rib, materiallarda B2 oladi.

/** Pastdan yuqoriga. Taqqoslash shu tartibga tayanadi. */
const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** Foydalanuvchiga ko'rsatiladigan qisqa nom. */
const CEFR_LABEL = {
    A1: 'A1 — Boshlang\'ich',
    A2: 'A2 — Elementar',
    B1: 'B1 — O\'rta',
    B2: 'B2 — O\'rtadan yuqori',
    C1: 'C1 — Ilg\'or',
    C2: 'C2 — Erkin',
};

/** Qiymatni kanonik CEFR kodiga keltiradi; mos kelmasa `null`. */
function normalizeCefr(level) {
    const up = String(level == null ? '' : level).trim().toUpperCase();
    return CEFR_ORDER.includes(up) ? up : null;
}

/** Daraja tartibidagi indeks; noma'lum bo'lsa `-1`. */
function cefrIndex(level) {
    return CEFR_ORDER.indexOf(normalizeCefr(level) || '');
}

/**
 * Darajani berilgan ro'yxatdagi eng mos qiymatga keltiradi.
 *
 * NEGA: maqolalar faqat B1/B2/C1 da mavjud, lekin foydalanuvchi A2 bo'lishi
 * mumkin. Bunday odamga "sizga material yo'q" deyish o'rniga eng past mavjud
 * darajani beramiz. Yuqori tomonda ham xuddi shunday (C2 → C1).
 *
 * Aniq mos kelmagan oraliq daraja PASTGA yaxlitlanadi — o'quvchiga
 * ko'tarolmaydigan matn berishdan ko'ra biroz yengilrog'i xavfsiz.
 */
function clampCefr(level, available) {
    if (!Array.isArray(available) || available.length === 0) return null;
    const idx = cefrIndex(level);
    if (idx === -1) return null;

    const ranked = available
        .map((lv) => ({ lv, i: cefrIndex(lv) }))
        .filter((x) => x.i !== -1)
        .sort((a, b) => a.i - b.i);
    if (ranked.length === 0) return null;

    if (idx <= ranked[0].i) return ranked[0].lv;
    if (idx >= ranked[ranked.length - 1].i) return ranked[ranked.length - 1].lv;

    let best = ranked[0].lv;
    for (const x of ranked) if (x.i <= idx) best = x.lv;
    return best;
}

/** `a` darajasi `b` dan yuqorimi? Noma'lum qiymatlar uchun `false`. */
function isHigherCefr(a, b) {
    const ia = cefrIndex(a);
    const ib = cefrIndex(b);
    return ia !== -1 && ib !== -1 && ia > ib;
}

module.exports = { CEFR_ORDER, CEFR_LABEL, normalizeCefr, cefrIndex, clampCefr, isHigherCefr };

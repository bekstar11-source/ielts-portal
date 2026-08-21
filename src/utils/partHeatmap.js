// src/utils/partHeatmap.js
//
// Reading passage'lari va Listening bo'limlari kesimidagi aniqlik.
//
// NEGA BU ALOHIDA MA'LUMOT
// ────────────────────────
// Savol turlari kesimi "qaysi ko'nikma yetishmayapti" deb aytadi. Bo'limlar
// kesimi esa butunlay boshqa savolga javob beradi: "testning qayerida qulayapman".
// Ikkalasi bir-birini almashtira olmaydi — bir xil savol turi P1 da 90%, P3 da
// 45% bo'lishi mumkin va bu bilim emas, chidamlilik yoki vaqt muammosi.
//
// XULOSANI NIMAGA SOLISHTIRAMIZ
// ─────────────────────────────
// "P3 eng past" degan gap o'z-o'zicha hech nima anglatmaydi: IELTS'da P1 eng
// oson, P3 eng qiyin qilib tuzilgan va deyarli har bir o'quvchida shunday
// bo'ladi. Ma'lumot beradigan narsa — KUTILGANDAN og'ish. Bizda hozircha boshqa
// o'quvchilar bilan solishtirish yo'q (u Faza 4 da), shuning uchun o'quvchining
// O'Z o'rtachasi tayanch qilib olinadi:
//
//   • Birinchi bo'lim o'rtachadan past — bu qiyinlik emas. P1/S1 eng oson qism,
//     va u yerdagi pastlik deyarli har doim e'tibor yoki imlo muammosi.
//   • Oxirgi bo'lim keskin past — vaqt yetmagan yoki charchagan. Bu mashq emas,
//     rejim muammosi va tavsiya ham butunlay boshqacha.
//
// Ikkala qoida ham o'quvchining o'z ma'lumotidan chiqadi, ya'ni tashqi tayanch
// talab qilmaydi va yolg'on gapirmaydi.

/** Bo'lim rang berishga arziydigan minimal savol soni. */
export const MIN_PART_SAMPLE = 10;

/** Birinchi bo'lim "past" deb belgilanishi uchun o'rtachadan qancha orqada bo'lishi kerak. */
const EARLY_GAP = 5;

/** Oxirgi bo'lim "keskin past" deb belgilanishi uchun kerakli farq. */
const FINAL_GAP = 10;

/** IELTS'da Reading 3 ta passage, Listening 4 ta bo'limdan iborat. */
const EXPECTED_PARTS = { reading: 3, listening: 4 };

function accuracyOf(part) {
  const total = Number(part?.total) || 0;
  if (total <= 0) return null;
  const wrong = Math.min(Math.max(Number(part?.wrong) || 0, 0), total);
  return Math.round(((total - wrong) / total) * 100);
}

/**
 * Bitta ko'nikma uchun xulosa. `null` — aytadigan aniq gap yo'q.
 *
 * Faqat BITTA xulosa qaytariladi: ikkitasini birga ko'rsatish o'quvchini
 * ikkiga bo'ladi, va oxirgi bo'lim muammosi odatda jiddiyroq.
 */
function findInsight(parts, reference) {
  if (reference === null || parts.length < 3) return null;

  const usable = parts.filter((p) => p.reliable);
  if (usable.length < 2) return null;

  const last = parts[parts.length - 1];
  if (last.reliable && last.accuracy !== null && last.accuracy <= reference - FINAL_GAP) {
    return { kind: 'finalDrop', part: last.index, gap: reference - last.accuracy };
  }

  const first = parts[0];
  if (first.reliable && first.accuracy !== null && first.accuracy <= reference - EARLY_GAP) {
    return { kind: 'earlyWeak', part: first.index, gap: reference - first.accuracy };
  }

  return null;
}

/**
 * @param {object} byPart Jamlanmadagi `{ reading: [...], listening: [...] }`
 * @param {object} [options]
 * @param {object} [options.reference] Ko'nikma bo'yicha tayanch aniqlik
 *        (`{ reading: 68, listening: 72 }`). Bo'lmasa xulosa chiqarilmaydi.
 * @returns {{rows: Array, hasData: boolean}}
 */
export function buildPartHeatmap(byPart, { reference = {} } = {}) {
  const rows = Object.entries(byPart || {})
    .filter(([skill]) => EXPECTED_PARTS[skill])
    .map(([skill, list]) => {
      const raw = Array.isArray(list) ? list : [];
      // Kutilgan uzunlikkacha to'ldiramiz: ishlanmagan bo'lim ham o'z o'rnida
      // ko'rinishi kerak, aks holda "P1 va P3" qatori "P1 va P2" bo'lib ko'rinardi.
      const length = Math.max(raw.length, EXPECTED_PARTS[skill]);

      const parts = Array.from({ length }, (_, i) => {
        const total = Number(raw[i]?.total) || 0;
        return {
          index: i + 1,
          total,
          wrong: Math.min(Math.max(Number(raw[i]?.wrong) || 0, 0), total),
          accuracy: accuracyOf(raw[i]),
          reliable: total >= MIN_PART_SAMPLE
        };
      });

      return {
        skill,
        parts,
        insight: findInsight(parts, reference[skill] ?? null),
        hasAny: parts.some((p) => p.total > 0)
      };
    })
    .filter((row) => row.hasAny);

  return { rows, hasData: rows.length > 0 };
}

export default buildPartHeatmap;

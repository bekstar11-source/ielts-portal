// src/utils/bandImpact.js
//
// "Bu xatolar sizga qancha turdi" — foizni BALLGA aylantiradi.
//
// Analitika sahifasi ilgari "xatolaringizning 40% imlo" deb aytardi. Bu to'g'ri,
// lekin o'quvchi uchun harakatga undamaydigan ma'lumot: 40% ko'pmi? Imlo mashqiga
// bir hafta ajratishga arziydimi? Yagona ishonarli javob — band.
//
// HISOB
// ─────
// "Yaqin marra" xatolari (imlo, birlik/ko'plik, so'z shakli, ortiqcha so'z) —
// bular o'quvchi javobni BILGAN, faqat yozilishida adashgan holatlar. Agar
// ularning hammasi to'g'ri yozilganda edi, xom ball shuncha ko'p bo'lardi:
//
//   hozirgi band   = band(correct,            skill, total)
//   mumkin bo'lgan = band(correct + nearMiss, skill, total)
//
// `calculateBandScore` nostandart savol sonini 40 ga proporsional keltiradi,
// shuning uchun umrbod yig'indi ("354 tadan 250 tasi") ham to'g'ri ishlaydi va
// natija "o'rtacha testda" degan ma'noni beradi.
//
// NIMA UCHUN OVERALL BAND KO'RSATILMAYDI
// ──────────────────────────────────────
// IELTS overall — to'rtta modulning o'rtachasi. Bu yerda faqat Reading va
// Listening bor (Writing/Speaking xatolari boshqa tabiatda va bu hisobga
// kirmaydi), shuning uchun "umumiy bandingiz +0.5" degan da'vo yolg'on bo'lardi.
// Har bir ko'nikma alohida ko'rsatiladi.

import { calculateBandScore } from './ieltsScoring.js';

/**
 * Xulosa chiqarish uchun minimal savol soni.
 *
 * 40 dan past bo'lsa hisob bitta testdan ham kamiga tayanadi va bitta omadli
 * urinish band chegarasini kesib o'tib, o'quvchiga asossiz va'da berardi.
 */
export const MIN_QUESTIONS_FOR_IMPACT = 40;

/**
 * Ko'nikmalar kesimidan ball ta'sirini hisoblaydi.
 *
 * @param {Array<{skill: string, total: number, correct: number, nearMiss: number}>} skills
 * @returns {{rows: Array, best: object|null, totalNearMiss: number}}
 *          `best` — eng katta yutuq beradigan ko'nikma; ta'sir yo'q bo'lsa `null`.
 */
export function computeBandImpact(skills) {
  const rows = (Array.isArray(skills) ? skills : [])
    .map((entry) => {
      const total = Number(entry?.total) || 0;
      const correct = Number(entry?.correct) || 0;
      if (total < MIN_QUESTIONS_FOR_IMPACT) return null;

      // Jamlanmada ham qisilgan, lekin bu yerda ham himoya qo'yamiz: hisob
      // to'g'ridan-to'g'ri o'quvchiga ko'rsatiladigan va'daga aylanadi.
      const nearMiss = Math.max(0, Math.min(Number(entry?.nearMiss) || 0, total - correct));
      if (nearMiss === 0) return null;

      const current = calculateBandScore(correct, entry.skill, total);
      const potential = calculateBandScore(correct + nearMiss, entry.skill, total);
      // `calculateBandScore` reading/listening dan boshqa turga `null` qaytaradi.
      if (current === null || potential === null) return null;

      return {
        skill: entry.skill,
        current,
        potential,
        gain: Math.round((potential - current) * 2) / 2,
        nearMiss,
        mistakes: Math.max(0, Number(entry?.mistakes) || total - correct),
        total
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.gain - a.gain || b.nearMiss - a.nearMiss);

  const best = rows.find((row) => row.gain > 0) || null;

  return {
    rows,
    best,
    totalNearMiss: rows.reduce((sum, row) => sum + row.nearMiss, 0)
  };
}

export default computeBandImpact;

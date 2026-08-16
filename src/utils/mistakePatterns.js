// src/utils/mistakePatterns.js
//
// Xatoning TURI emas, SABABINI aniqlaydi.
//
// `typeStats` "Matching Headings da 48%" deb aytadi — lekin nima qilish kerakligini
// aytmaydi. Amalda o'quvchining xatolari bir nechta juda aniq guruhga bo'linadi va
// har biri butunlay boshqa mashqni talab qiladi:
//
//   • "goverment" ← javobni BILGAN, imloda adashgan. Grammatika mashqi kerak emas.
//   • "childs"    ← ko'plik shakli. Bitta qoida, 10 daqiqada tuzatiladi.
//   • "the museum" (kalit "museum", limit 1 word) ← so'z limitini o'qimagan.
//   • "TRUE" ↔ "NOT GIVEN" ← matnda yo'q ma'lumotni "bor" deb o'ylagan; eng ko'p
//     uchraydigan va eng qimmatga tushadigan xato.
//   • butunlay boshqa javob ← savolni yoki matnni tushunmagan.
//
// Shu ajratuv bo'lmasa, o'quvchi "Reading ni ko'proq ishla" degan foydasiz maslahat
// oladi. Shu bilan — "xatolaringizning 40% imlo, javoblarni bilasiz" deb aytish mumkin.

import { normalizeString } from './ieltsScoring';

/** Xato sabablari — UI shu tartibda ko'rsatadi (eng oson tuzatiladigani birinchi). */
export const MISTAKE_PATTERNS = [
  'spelling',        // imlo — javob to'g'ri, yozilishi xato
  'singular_plural', // birlik/ko'plik
  'word_form',       // so'z shakli (analyse / analysis)
  'extra_words',     // ortiqcha so'z — so'z limitidan oshgan
  'wrong_option',    // variant tanlash turlarida noto'g'ri variant
  'no_answer',       // javobsiz qoldirilgan — vaqt yetmagan
  'off_target'       // butunlay boshqa javob — tushunmagan
];

/** "Deyarli to'g'ri" deb hisoblanadigan sabablar — bular band ni eng tez ko'taradi. */
export const NEAR_MISS_PATTERNS = ['spelling', 'singular_plural', 'word_form', 'extra_words'];

/** Variant tanlash oilalari — bu yerda imlo tahlili ma'nosiz. */
const CHOICE_FAMILIES = new Set([
  'multiple_choice',
  'true_false_ng',
  'yes_no_ng',
  'headings',
  'matching',
  'map_diagram'
]);

/**
 * Damerau–Levenshtein (optimal string alignment) masofasi.
 *
 * Oddiy Levenshtein o'rniga ataylab shu ishlatiladi: eng ko'p uchraydigan imlo
 * xatosi — ikki harfning o'rin almashuvi ("recieve" ← "receive"). Levenshtein uni
 * 2 ga baholaydi va u so'z shakli xatosi bilan bir xil og'irlikda ko'rinadi;
 * transpozitsiyani 1 deb hisoblasak, imlo va so'z shaklini ajratish mumkin bo'ladi.
 *
 * Javoblar bir necha so'zdan iborat, shuning uchun to'liq matritsa ham arzon.
 */
function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const d = Array.from({ length: rows }, (_, i) => {
    const row = new Array(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j += 1) d[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i][j - 1] + 1, d[i - 1][j] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * Javob kalitini solishtirish mumkin bo'lgan variantlar ro'yxatiga yoyadi.
 * Kalit massiv ham, "museum/gallery" ko'rinishidagi satr ham bo'lishi mumkin.
 */
export function expandAnswerVariants(correctAnswer) {
  const out = [];
  const push = (val) => {
    const s = String(val ?? '').trim();
    if (!s) return;
    // "/" va "|" — muqobil javoblar ajratkichi. Vergul esa javobning o'zida
    // uchraydi ("9,000"), shuning uchun ajratkich sifatida ishlatilmaydi.
    s.split(/[/|]/).forEach((part) => {
      const p = part.trim();
      if (p) out.push(p);
    });
  };

  if (Array.isArray(correctAnswer)) correctAnswer.forEach(push);
  else push(correctAnswer);

  return out;
}

/** Kalit variantlaridan foydalanuvchi javobiga eng yaqinini tanlaydi. */
function closestVariant(userNorm, variants) {
  let best = null;
  let bestDist = Infinity;
  variants.forEach((variant) => {
    const norm = normalizeString(variant);
    if (!norm) return;
    const dist = editDistance(userNorm, norm);
    if (dist < bestDist) {
      bestDist = dist;
      best = { raw: variant, norm, dist };
    }
  });
  return best;
}

/**
 * Noto'g'ri ko'pliklar. Qo'shimchani kesish bilan "children" hech qachon "child"
 * ga kelmaydi — natijada eng ko'p uchraydigan ko'plik xatolari "so'z shakli" deb
 * noto'g'ri tasniflanardi. Ro'yxat IELTS javoblarida real uchraydiganlar bilan
 * cheklangan.
 */
const IRREGULAR_PLURALS = {
  children: 'child', men: 'man', women: 'woman', people: 'person',
  feet: 'foot', teeth: 'tooth', mice: 'mouse', geese: 'goose',
  criteria: 'criterion', phenomena: 'phenomenon', data: 'datum',
  media: 'medium', lives: 'life', wives: 'wife', knives: 'knife',
  leaves: 'leaf', shelves: 'shelf', halves: 'half', wolves: 'wolf'
};

/** So'zni birlik shakliga keltiradi ("boxes" → "box", "children" → "child"). */
function stripPlural(word) {
  if (IRREGULAR_PLURALS[word]) return IRREGULAR_PLURALS[word];
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('es') && word.length > 3) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 2) return word.slice(0, -1);
  return word;
}

function sameIgnoringPlural(a, b) {
  const at = a.split(' ');
  const bt = b.split(' ');
  if (at.length !== bt.length) return false;
  return at.every((token, i) => stripPlural(token) === stripPlural(bt[i]));
}

/**
 * Bitta xatoning sababini aniqlaydi.
 *
 * @param {{userResponse: any, correctAnswer: any, questionType?: string}} mistake
 * @returns {{pattern: string|null, userText: string, correctText: string, distance: number|null}}
 *          `pattern === null` — sabab aniqlanmadi, yozuv ko'rsatilmasligi kerak.
 */
export function classifyMistake(mistake) {
  const variants = expandAnswerVariants(mistake?.correctAnswer);
  const correctText = variants.join(' / ');

  const rawUser = Array.isArray(mistake?.userResponse)
    ? mistake.userResponse.join(', ')
    : String(mistake?.userResponse ?? '');
  const userText = rawUser.trim();

  const base = { userText, correctText, distance: null };

  if (!userText) return { ...base, pattern: 'no_answer' };

  // Variant tanlash turlarida "imlo xatosi" degan tushuncha yo'q — tanlov noto'g'ri.
  if (CHOICE_FAMILIES.has(mistake?.questionType)) {
    return { ...base, pattern: 'wrong_option' };
  }

  const userNorm = normalizeString(userText);
  if (!userNorm) return { ...base, pattern: 'no_answer' };

  const match = closestVariant(userNorm, variants);
  if (!match) return { ...base, pattern: 'off_target' };

  const withDist = { ...base, distance: match.dist };

  // Javob kalitning biror variantiga AYNAN teng. Bu holda xatoning sababini tushuntirib
  // bo'lmaydi (ehtimol ko'p javobli savolning boshqa slotidagi nomuvofiqlik) va
  // "javobingiz: gallery → to'g'risi: museum/gallery" ko'rinishi o'quvchini
  // chalg'itadi. Shuning uchun `null` qaytariladi — chaqiruvchi bunday yozuvni tashlaydi.
  if (match.dist === 0) return { ...withDist, pattern: null };

  if (sameIgnoringPlural(userNorm, match.norm)) {
    return { ...withDist, pattern: 'singular_plural' };
  }

  const userTokens = userNorm.split(' ');
  const correctTokens = match.norm.split(' ');

  // Kalitning barcha so'zlari javobda bor, lekin ortiqcha so'z ham qo'shilgan —
  // deyarli har doim so'z limitini ("NO MORE THAN TWO WORDS") o'qimaslik oqibati.
  if (userTokens.length > correctTokens.length) {
    const userSet = new Set(userTokens.map(stripPlural));
    if (correctTokens.every((tok) => userSet.has(stripPlural(tok)))) {
      return { ...withDist, pattern: 'extra_words' };
    }
  }

  // Bir so'zli javoblarda o'zak bir xil, oxiri boshqa → so'z shakli xatosi.
  if (userTokens.length === 1 && correctTokens.length === 1) {
    const stem = Math.min(4, Math.min(userNorm.length, match.norm.length));
    if (
      stem >= 4 &&
      userNorm.slice(0, stem) === match.norm.slice(0, stem) &&
      userNorm !== match.norm
    ) {
      // O'zak bir xil bo'lgan bir so'zli javoblarda chegara qattiqroq: bitta belgi
      // farqi (yoki o'rin almashuvi) — qalam xatosi, undan kattasi esa deyarli
      // har doim boshqa so'z shakli ("analyse" ← "analysis", masofa 2).
      return { ...withDist, pattern: match.dist <= 1 ? 'spelling' : 'word_form' };
    }
  }

  // Uzunroq javoblarda 1–2 belgilik farq — imlo (typo).
  const longest = Math.max(userNorm.length, match.norm.length);
  if (longest >= 4 && match.dist <= 2) {
    return { ...withDist, pattern: 'spelling' };
  }

  return { ...withDist, pattern: 'off_target' };
}

/**
 * Xatolar ro'yxatini sabablar kesimida yig'adi.
 *
 * @param {Array} mistakes `classifyMistake` natijasi qo'shilgan xatolar
 * @returns {{counts: Object, rows: Array, total: number, nearMissCount: number, nearMissShare: number|null, dominant: string|null}}
 */
export function summarizePatterns(mistakes) {
  const counts = {};
  (mistakes || []).forEach((m) => {
    if (!m?.pattern) return;
    counts[m.pattern] = (counts[m.pattern] || 0) + 1;
  });

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  const rows = MISTAKE_PATTERNS
    .filter((p) => counts[p] > 0)
    .map((p) => ({
      pattern: p,
      count: counts[p],
      share: total > 0 ? Math.round((counts[p] / total) * 100) : 0,
      nearMiss: NEAR_MISS_PATTERNS.includes(p)
    }))
    .sort((a, b) => b.count - a.count);

  const nearMissCount = NEAR_MISS_PATTERNS.reduce((sum, p) => sum + (counts[p] || 0), 0);

  return {
    counts,
    rows,
    total,
    nearMissCount,
    nearMissShare: total > 0 ? Math.round((nearMissCount / total) * 100) : null,
    dominant: rows[0]?.pattern || null
  };
}

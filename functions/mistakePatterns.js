// functions/mistakePatterns.js
//
// ⚠️ AVTOMATIK NUSXA — QO'LDA TAHRIRLAMANG.
// Manba: src/utils/mistakePatterns.js. O'zgartirish kiritish uchun o'sha faylni tahrirlang
// va `npm run mirror` ni ishga tushiring.

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
//   • "TRUE" (kalit "NOT GIVEN") ← matnda yo'q ma'lumotni "bor" deb o'ylagan;
//     eng ko'p uchraydigan va eng qimmatga tushadigan IELTS xatosi.
//   • "NOT GIVEN" (kalit "TRUE") ← ma'lumot MATNDA BOR, lekin parafraza ostida
//     yashiringani uchun topilmagan. Yuqoridagining teskarisi va butunlay
//     boshqa mashq talab qiladi.
//   • butunlay boshqa javob ← savolni yoki matnni tushunmagan.
//
// Shu ajratuv bo'lmasa, o'quvchi "Reading ni ko'proq ishla" degan foydasiz maslahat
// oladi. Shu bilan — "xatolaringizning 40% imlo, javoblarni bilasiz" deb aytish mumkin.

const { normalizeString } = require("./ieltsScoring.js");

/** Xato sabablari — UI shu tartibda ko'rsatadi (eng oson tuzatiladigani birinchi). */
const MISTAKE_PATTERNS = [
  'spelling',        // imlo — javob to'g'ri, yozilishi xato
  'singular_plural', // birlik/ko'plik
  'word_form',       // so'z shakli (analyse / analysis)
  'extra_words',     // ortiqcha so'z — so'z limitidan oshgan
  'tf_flip',         // TRUE ↔ FALSE — mazmunni teskari o'qigan
  'ng_missed',       // kalit TRUE/FALSE, javob NOT GIVEN — matndagini topa olmagan
  'ng_overclaim',    // kalit NOT GIVEN, javob TRUE/FALSE — yo'q narsani "bor" degan
  'wrong_option',    // qolgan variant tanlash turlarida noto'g'ri variant
  'no_answer',       // javobsiz qoldirilgan — vaqt yetmagan
  'off_target'       // butunlay boshqa javob — tushunmagan
];

/** "Deyarli to'g'ri" deb hisoblanadigan sabablar — bular band ni eng tez ko'taradi. */
const NEAR_MISS_PATTERNS = ['spelling', 'singular_plural', 'word_form', 'extra_words'];

/**
 * TRUE/FALSE/NOT GIVEN va YES/NO/NOT GIVEN oilalari.
 *
 * Ular ham variant tanlash, lekin "noto'g'ri variant" degan yorliq bu yerda
 * hech nima aytmaydi: uchta javobning qaysi juftligi almashgani UCH XIL
 * muammoni bildiradi va uch xil mashq talab qiladi. Shu sabab bu oilalar
 * umumiy `wrong_option` yo'lidan OLDIN tekshiriladi.
 */
const TFNG_FAMILIES = new Set(['true_false_ng', 'yes_no_ng']);

/**
 * Javobni uchta ma'noviy holatdan biriga keltiradi.
 *
 * TRUE va YES bir xil ma'noni bildiradi (matn tasdiqlaydi), FALSE va NO ham
 * (matn rad etadi) — shuning uchun ikkala oila bitta mantiq bilan ishlanadi.
 * Bazada javoblar "TRUE"/"NOT GIVEN" ko'rinishida normallashtirilgan, lekin
 * eski yozuvlarda "T"/"NG" qisqartmalari ham uchraydi.
 *
 * Oddiy obyekt emas, `Map`: `normalizeString` natijasi "constructor" kabi
 * satr bo'lib chiqsa, obyektdan meros qolgan xossa topilib, javob noto'g'ri
 * tasniflanardi.
 */
const TFNG_SLOTS = new Map([
  ['t', 'affirm'], ['true', 'affirm'], ['y', 'affirm'], ['yes', 'affirm'],
  ['f', 'deny'], ['false', 'deny'], ['n', 'deny'], ['no', 'deny'],
  ['ng', 'unknown'], ['not given', 'unknown'], ['notgiven', 'unknown']
]);

function tfngSlot(value) {
  const norm = normalizeString(value);
  return norm ? TFNG_SLOTS.get(norm) || null : null;
}

/**
 * T/F/NG xatosining aniq turini aniqlaydi.
 *
 * @returns {string|null} naqsh nomi, yoki `null` — javoblardan biri tanilmadi
 *          (u holda chaqiruvchi umumiy `wrong_option` ga tushadi).
 */
function classifyTfngMistake(userText, variants) {
  const user = tfngSlot(userText);
  const correct = variants.map(tfngSlot).find(Boolean) || null;
  if (!user || !correct || user === correct) return null;

  // Kalit NOT GIVEN, javob esa TRUE yoki FALSE: matnda yo'q ma'lumot "topilgan".
  // Deyarli har doim sabab — matndagi o'xshash mavzuni savol bilan tenglashtirish.
  if (correct === 'unknown') return 'ng_overclaim';

  // Teskarisi: ma'lumot matnda BOR, lekin parafraza ostida topilmagan.
  if (user === 'unknown') return 'ng_missed';

  // TRUE ↔ FALSE: joyi topilgan, mazmuni teskari o'qilgan. Odatda "all/some",
  // "always/often" kabi cheklovchi so'z e'tibordan qolganda sodir bo'ladi.
  return 'tf_flip';
}

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
function expandAnswerVariants(correctAnswer) {
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
function classifyMistake(mistake) {
  const variants = expandAnswerVariants(mistake?.correctAnswer);
  const correctText = variants.join(' / ');

  const rawUser = Array.isArray(mistake?.userResponse)
    ? mistake.userResponse.join(', ')
    : String(mistake?.userResponse ?? '');
  const userText = rawUser.trim();

  const base = { userText, correctText, distance: null };

  if (!userText) return { ...base, pattern: 'no_answer' };

  // T/F/NG oilalari umumiy "noto'g'ri variant"dan oldin: qaysi juftlik
  // almashgani aniq muammoni ko'rsatadi.
  if (TFNG_FAMILIES.has(mistake?.questionType)) {
    const tfng = classifyTfngMistake(userText, variants);
    if (tfng) return { ...base, pattern: tfng };
  }

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
function summarizePatterns(mistakes) {
  const counts = {};
  (mistakes || []).forEach((m) => {
    if (!m?.pattern) return;
    counts[m.pattern] = (counts[m.pattern] || 0) + 1;
  });
  return summarizePatternCounts(counts);
}

/**
 * Xuddi `summarizePatterns` kabi, lekin xatolar ro'yxati emas, TAYYOR SANOQ
 * qabul qiladi.
 *
 * Kerak bo'lgan sabab: analitika jamlanmasida (`analyticsSummaries/{uid}`)
 * sabablar allaqachon sanab qo'yilgan — xatolarning o'zi esa faqat "Xatolar
 * jurnali" ochilganda yuklanadi. Ikkala yo'l bir xil shakl qaytarishi shart,
 * aks holda UI ikki xil ma'lumot manbaiga moslashishi kerak bo'lardi.
 *
 * @param {Object<string, number>} counts
 */
function summarizePatternCounts(counts) {
  const safe = counts || {};
  const total = Object.values(safe).reduce((sum, n) => sum + (Number(n) || 0), 0);

  const rows = MISTAKE_PATTERNS
    .filter((p) => safe[p] > 0)
    .map((p) => ({
      pattern: p,
      count: safe[p],
      share: total > 0 ? Math.round((safe[p] / total) * 100) : 0,
      nearMiss: NEAR_MISS_PATTERNS.includes(p)
    }))
    .sort((a, b) => b.count - a.count);

  const nearMissCount = NEAR_MISS_PATTERNS.reduce((sum, p) => sum + (safe[p] || 0), 0);

  return {
    counts: safe,
    rows,
    total,
    nearMissCount,
    nearMissShare: total > 0 ? Math.round((nearMissCount / total) * 100) : null,
    dominant: rows[0]?.pattern || null
  };
}

module.exports = { MISTAKE_PATTERNS, NEAR_MISS_PATTERNS, expandAnswerVariants, classifyMistake, summarizePatterns, summarizePatternCounts };

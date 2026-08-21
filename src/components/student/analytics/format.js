// Analitika bo'limlarining umumiy formatlash yordamchilari.
//
// `ui.jsx` dan ataylab ajratilgan: komponent fayli faqat komponent eksport qilishi
// kerak (react-refresh talabi), aks holda tahrirlashda butun modul qayta yuklanadi.

/**
 * Aniqlik foizining rang kodi.
 *
 * Chegaralar sahifa bo'ylab BIR XIL bo'lishi shart: bitta bo'limda 72% sariq,
 * boshqasida yashil ko'rinsa, o'quvchi ranglarga ishonishni to'xtatadi.
 */
export function accuracyTone(accuracy) {
  if (accuracy === null || accuracy === undefined) {
    return { bar: 'bg-warm-muted-soft', text: 'text-warm-muted' };
  }
  if (accuracy < 60) return { bar: 'bg-warm-error', text: 'text-warm-error' };
  if (accuracy < 75) return { bar: 'bg-warm-warning', text: 'text-warm-warning' };
  return { bar: 'bg-warm-success', text: 'text-warm-success' };
}

/** Sana — qisqa va joriy tilda ("12-avg" / "12 Aug"). */
export function formatShortDate(date, lang) {
  if (!date) return '';
  try {
    return date.toLocaleDateString(lang === 'en' ? 'en-GB' : 'uz-UZ', {
      day: 'numeric',
      month: 'short'
    });
  } catch {
    return '';
  }
}

/**
 * Xatoning aniq sababini bitta qisqa jumlaga siqadi.
 *
 * `mistakePatterns.<pattern>.advice` UMUMIY maslahat beradi ("so'z limitiga
 * e'tibor bering") va u naqshlar bo'limida bir marta ko'rsatiladi. Jurnaldagi
 * har bir qatorga uni takrorlash foydasiz — o'quvchi bir xil matnni yigirma
 * marta o'qiydi. Bu yerda esa AYNAN SHU xato haqida gapiriladi: "kalitda 1 ta
 * so'z, siz 3 ta yozgansiz".
 *
 * Kalitlar statik ro'yxatda — `mistakeReasonKeys` testi ularning ikkala tilda
 * ham mavjudligini tekshiradi.
 *
 * @returns {{key: string, count?: number}|null} sabab, yoki aytadigan aniq
 *          gap bo'lmasa `null` (u holda qator sabab qatorisiz chiziladi).
 */
export const MISTAKE_REASON_KEYS = {
  spelling: 'analytics.whySpelling',
  singular_plural: 'analytics.whyPlural',
  word_form: 'analytics.whyWordForm',
  extra_words: 'analytics.whyExtraWords',
  ng_overclaim: 'analytics.whyNgOverclaim',
  ng_missed: 'analytics.whyNgMissed',
  tf_flip: 'analytics.whyTfFlip',
  no_answer: 'analytics.whyNoAnswer'
};

const wordCount = (text) =>
  String(text || '').trim().split(/\s+/).filter(Boolean).length;

export function mistakeReason(row) {
  const key = Object.prototype.hasOwnProperty.call(MISTAKE_REASON_KEYS, row?.pattern)
    ? MISTAKE_REASON_KEYS[row.pattern]
    : null;
  if (!key) return null;

  if (row.pattern === 'spelling') {
    // Masofa yo'q bo'lsa aniq gap ham yo'q — umumiy "imlo" yorlig'i qatorda
    // allaqachon turibdi.
    return row.distance > 0 ? { key, count: row.distance } : null;
  }

  if (row.pattern === 'extra_words') {
    // Kalit bir necha variantli bo'lishi mumkin ("museum / gallery") — so'z
    // limitini birinchisidan olamiz, ular bir xil uzunlikda bo'ladi.
    const need = wordCount(String(row.correctText || '').split(' / ')[0]);
    return need > 0 ? { key, count: need } : null;
  }

  return { key };
}

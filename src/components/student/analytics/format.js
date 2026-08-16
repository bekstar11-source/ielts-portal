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

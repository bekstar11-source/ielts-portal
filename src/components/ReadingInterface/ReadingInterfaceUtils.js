/**
 * Utility functions for ReadingInterface
 */

export const HL_STORAGE_PREFIX = "reading_rp_hl_";
export const NOTES_STORAGE_PREFIX = "reading_notes_";

export const loadFromStorage = (key, defaultValue = {}) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("Storage is full or inaccessible", e);
  }
};

/**
 * Automatically detects the passage label suffix based on question numbers
 */
export const detectPassageLabelSuffix = (testData, activePassage) => {
  if (!testData || !testData.passages) return activePassage + 1;
  
  const currentPassageId = testData.passages[activePassage]?.id;
  const questions = testData.questions?.filter(g => String(g.passageId) === String(currentPassageId)) || [];
  
  let minId = Infinity;
  const checkId = (idStr) => {
      if (!idStr) return;
      const matches = String(idStr).match(/\d+/g);
      if (matches) matches.forEach(m => {
          const num = parseInt(m);
          if (num < minId) minId = num;
      });
  };

  questions.forEach(group => {
      checkId(group.id);
      group.items?.forEach(item => checkId(item.id));
      group.questions?.forEach(q => checkId(q.id));
      group.groups?.forEach(g => (g.items || g.questions)?.forEach(it => checkId(it.id)));
  });

  if (minId !== Infinity) {
      if (minId <= 13) return 1;
      if (minId <= 26) return 2;
      return 3;
  }
  return testData.passages[activePassage]?.partNumber ?? (activePassage + 1);
};

// ─────────────────────────────────────────────────────────────────────────────
// MATCHING GURUHLARINI TASNIFLASH — YAGONA MANBA
// Ilgari bu mantiq uchta joyda uch xil yozilgan edi (chap panel, o'ng panel, DnD hook).
// Natijada "match information to paragraphs" turidagi guruh uchun chap panel drop-zone
// (rim raqamli), o'ng panel esa boshqa UI (harfli) chizib, ikkalasi BIR XIL q.id ga
// turlicha qiymat yozardi. Endi hamma shu ikki funksiyaga tayanadi.
// ─────────────────────────────────────────────────────────────────────────────
const lower = (v) => String(v || "").toLowerCase();

/**
 * "Choose the correct heading for each paragraph" — sarlavhalarni moslashtirish.
 * Chap panelga drop-zone chiziladigan yagona tur.
 */
export const isMatchingHeadingsGroup = (group) => {
  if (!group) return false;
  const type = lower(group.type);
  const instr = lower(group.instruction);
  return type.includes('matching') && (type.includes('heading') || instr.includes('heading'));
};

/**
 * "Which paragraph contains the following information?" — ma'lumot/xususiyatni
 * paragrafga moslashtirish. Sarlavha moslashtirish HAR DOIM ustunlik qiladi,
 * chunki uning ko'rsatmasida ham "paragraph" so'zi uchraydi.
 */
export const isMatchingParagraphGroup = (group) => {
  if (!group || isMatchingHeadingsGroup(group)) return false;
  const type = lower(group.type);
  const instr = lower(group.instruction);
  return type.includes('matching') && (
    type.includes('paragraph') ||
    instr.includes('paragraph') ||
    instr.includes('contain') ||
    instr.includes('mention')
  );
};

/**
 * Finds the matching headings group for a passage
 */
export const findMatchingHeadingsGroup = (passageQuestions) => {
  return (passageQuestions || []).find(isMatchingHeadingsGroup);
};

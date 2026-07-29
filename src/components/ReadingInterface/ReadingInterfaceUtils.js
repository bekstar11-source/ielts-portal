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
 * Bitta savol ID sidan savol raqam(lar)ini ajratadi.
 *
 * FAQAT sof raqamli ("14") yoki raqamli diapazon ("14-15", "14–15") ID lar qabul qilinadi.
 * Ilgari ID dan BARCHA raqamlar olinardi, shuning uchun "g1"/"grp3"/"loc_7" kabi texnik
 * guruh ID lari savol raqami deb sanalib, passage raqami va "questions X–Y" sarlavhasi
 * noto'g'ri chiqardi.
 */
export const parseQuestionNumbers = (idStr) => {
  if (idStr === undefined || idStr === null) return [];
  const s = String(idStr).trim();

  const single = s.match(/^\d+$/);
  if (single) return [parseInt(s, 10)];

  const range = s.match(/^(\d+)\s*[-–—_]\s*(\d+)$/);
  if (range) {
    const from = parseInt(range[1], 10);
    const to = parseInt(range[2], 10);
    const nums = [];
    for (let n = Math.min(from, to); n <= Math.max(from, to); n++) nums.push(n);
    return nums;
  }

  // "14, 15" ko'rinishidagi ID lar
  if (s.includes(',')) {
    const parts = s.split(',').map(p => p.trim());
    if (parts.length > 1 && parts.every(p => /^\d+$/.test(p))) {
      return parts.map(p => parseInt(p, 10));
    }
  }

  return [];
};

/**
 * Guruh (va uning ichki elementlari) qamrab olgan barcha savol raqamlari.
 */
export const collectGroupQuestionNumbers = (group) => {
  if (!group) return [];
  const nums = [];

  const addFrom = (item) => {
    if (!item) return;
    nums.push(...parseQuestionNumbers(item.id));
    if (item.number !== undefined) nums.push(...parseQuestionNumbers(item.number));
  };

  // Guruhning o'z ID si ham savol raqami bo'lishi mumkin (masalan "14-15")
  addFrom(group);
  if (group.startNumber !== undefined) nums.push(...parseQuestionNumbers(group.startNumber));
  if (group.endNumber !== undefined) nums.push(...parseQuestionNumbers(group.endNumber));

  group.items?.forEach(addFrom);
  group.questions?.forEach(addFrom);
  group.groups?.forEach(sub => {
    addFrom(sub);
    (sub.items || sub.questions)?.forEach(addFrom);
  });
  group.rows?.forEach(row => {
    const cells = Array.isArray(row) ? row : (row.cells || []);
    cells.forEach(cell => {
      addFrom(cell);
      cell.content?.forEach(addFrom);
      cell.parts?.forEach(addFrom);
    });
  });

  return nums.filter(n => !isNaN(n));
};

/**
 * Automatically detects the passage label suffix based on question numbers
 */
export const detectPassageLabelSuffix = (testData, activePassage) => {
  if (!testData || !testData.passages) return activePassage + 1;

  const currentPassageId = testData.passages[activePassage]?.id;
  const questions = testData.questions?.filter(g => String(g.passageId) === String(currentPassageId)) || [];

  const nums = questions.flatMap(collectGroupQuestionNumbers);

  if (nums.length > 0) {
      const minId = Math.min(...nums);
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

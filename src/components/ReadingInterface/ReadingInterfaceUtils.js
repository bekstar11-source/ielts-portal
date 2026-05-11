/**
 * Utility functions for ReadingInterface
 */

export const HL_STORAGE_PREFIX = "reading_rp_hl_";
export const NOTES_STORAGE_PREFIX = "reading_notes_";

export const loadFromStorage = (key, defaultValue = {}) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const saveToStorage = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
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

/**
 * Finds the matching headings group for a passage
 */
export const findMatchingHeadingsGroup = (passageQuestions) => {
  return passageQuestions.find(g => {
    const gt = String(g.type || "").toLowerCase();
    const gi = String(g.instruction || "").toLowerCase();
    return gt.includes('matching') && (
      gi.includes('heading') || gt.includes('heading') ||
      (g.options && g.options.some(opt => {
        const t = String(typeof opt === 'object' ? opt.text : opt).toLowerCase();
        return t.length > 15;
      }) && gi.includes('paragraph'))
    );
  });
};

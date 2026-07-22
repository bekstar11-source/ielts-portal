import { getQuestionTypesFromQuestions } from '../components/admin/CreateTest/CreateTestUtils';

const normalizeTypeList = (arr) =>
  Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];

/** Question type labels for practice cards (reading, listening, etc.) */
export const deriveQuestionTypesForCard = (test) => {
  if (!test) return [];

  const partNum = test.partNumber ?? test.part_number ?? null;

  if (partNum != null && test.parts) {
    const partTypes = normalizeTypeList(test.parts[`part${partNum}`]?.qTypes);
    if (partTypes.length) return partTypes;
  }

  const direct = normalizeTypeList(test.questionTypes);
  if (direct.length) return direct;

  if (test.parts && typeof test.parts === 'object') {
    const aggregated = new Set();
    Object.values(test.parts).forEach((p) => {
      normalizeTypeList(p?.qTypes).forEach((t) => aggregated.add(t));
    });
    if (aggregated.size) return Array.from(aggregated);
  }

  if (test.passages && typeof test.passages === 'object') {
    const aggregated = new Set();
    Object.values(test.passages).forEach((p) => {
      normalizeTypeList(p?.qTypes).forEach((t) => aggregated.add(t));
    });
    if (aggregated.size) return Array.from(aggregated);
  }

  const questions = test.questions;
  if (Array.isArray(questions) && questions.length > 0) {
    if (partNum != null && test.parts) {
      const passageId = test.parts[`part${partNum}`]?.id;
      if (passageId) {
        const filtered = questions.filter(
          (q) => String(q.passageId) === String(passageId)
        );
        const partTypes = getQuestionTypesFromQuestions(filtered);
        if (partTypes.length) return partTypes;
      }
    }
    return getQuestionTypesFromQuestions(questions);
  }

  return [];
};

export const mergeTestsLogic = (selectedTestObjects, mergeTitle) => {
    const testType = selectedTestObjects[0]?.type || "reading";

    let passageGroups = [];
    let taskGroups = [];

    // Helper to extract a number from string/object to sort by
    const extractSortNumber = (title, id, parentTitle) => {
        // Try specific indicators first (e.g. "passage 1", "part 2", "task 3")
        const specificRegex = /(?:passage|part|task|section|pt|p|t)\s*(\d+)/i;
        
        let match = String(title || "").match(specificRegex);
        if (match) return parseInt(match[1], 10);

        match = String(id || "").match(specificRegex);
        if (match) return parseInt(match[1], 10);

        match = String(parentTitle || "").match(specificRegex);
        if (match) return parseInt(match[1], 10);

        // Try any number
        match = String(title || "").match(/\d+/);
        if (match) return parseInt(match[0], 10);

        match = String(id || "").match(/\d+/);
        if (match) return parseInt(match[0], 10);

        match = String(parentTitle || "").match(/\d+/);
        if (match) return parseInt(match[0], 10);

        return 999;
    };

    selectedTestObjects.forEach((test) => {
        if (testType === 'writing') {
            const writingTasks = test.writingTasks || [];
            writingTasks.forEach((task) => {
                const sortOrder = extractSortNumber(task.title, task.id, test.title);
                taskGroups.push({ task, sortOrder });
            });
        } else {
            const passages = test.passages || [];
            const questions = test.questions || [];
            const keywords = test.keywordTable || [];

            passages.forEach((passage) => {
                const passageQuestions = questions.filter(
                    q => String(q.passageId) === String(passage.id)
                );
                const passageKeywords = keywords.filter(
                    kw => String(kw.passageId) === String(passage.id)
                );

                const sortOrder = extractSortNumber(passage.title, passage.id, test.title);
                passageGroups.push({
                    passage,
                    questions: passageQuestions,
                    keywords: passageKeywords,
                    sortOrder
                });
            });
        }
    });

    // Sort the groups based on sortOrder
    if (testType === 'writing') {
        taskGroups.sort((a, b) => a.sortOrder - b.sortOrder);
    } else {
        passageGroups.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    // Reconstruct combined data and apply new IDs
    let combinedPassages = [];
    let combinedQuestions = [];
    let combinedKeywords = [];
    let combinedWritingTasks = [];

    let questionIdCounter = 1;

    if (testType === 'writing') {
        taskGroups.forEach((group, idx) => {
            const newId = idx + 1;
            combinedWritingTasks.push({
                ...group.task,
                id: String(newId),
                title: `Task ${newId}`
            });
        });
    } else {
        passageGroups.forEach((group, idx) => {
            const newPassageId = String(idx + 1);

            // Re-index passage
            combinedPassages.push({
                ...group.passage,
                id: newPassageId,
                partNumber: idx + 1
            });

            // Re-index questions and update their passageId
            const mappedQuestions = group.questions.map(questionGroup => {
                const walkAndReindex = (obj) => {
                    if (!obj || typeof obj !== 'object') return obj;
                    if (Array.isArray(obj)) return obj.map(walkAndReindex);
                    let updated = { ...obj };
                    if (updated.passageId) {
                        updated.passageId = newPassageId;
                    }
                    
                    if (updated.id && !Array.isArray(updated.items) && !Array.isArray(updated.questions)) {
                        const idStr = String(updated.id);
                        if (/^\d+$/.test(idStr)) {
                            updated.id = String(questionIdCounter++);
                        } else if (/^\d+\s*[\-–_]\s*\d+$/.test(idStr)) {
                            const parts = idStr.split(/[\-–_]/);
                            const start = parseInt(parts[0], 10);
                            const end = parseInt(parts[1], 10);
                            if (!isNaN(start) && !isNaN(end)) {
                                const count = Math.abs(end - start) + 1;
                                const newStart = questionIdCounter;
                                const newEnd = questionIdCounter + count - 1;
                                updated.id = `${newStart}-${newEnd}`;
                                questionIdCounter += count;
                            }
                        } else if (/^(\d+\s*,\s*)+\d+$/.test(idStr)) {
                            const parts = idStr.split(',');
                            const newIds = parts.map(() => String(questionIdCounter++));
                            updated.id = newIds.join(',');
                        }
                    }
                    
                    for (const key of ['items', 'questions', 'groups', 'rows', 'cells', 'content', 'parts']) {
                        if (updated[key]) updated[key] = walkAndReindex(updated[key]);
                    }
                    return updated;
                };

                return walkAndReindex({
                    ...questionGroup,
                    passageId: newPassageId
                });
            });

            combinedQuestions = [...combinedQuestions, ...mappedQuestions];

            // Re-index keywords and update their passageId
            const mappedKeywords = group.keywords.map(kw => ({
                ...kw,
                passageId: newPassageId
            }));
            combinedKeywords = [...combinedKeywords, ...mappedKeywords];
        });
    }

    return {
        title: mergeTitle,
        type: testType,
        difficulty: "medium",
        passages: combinedPassages,
        questions: combinedQuestions,
        keywordTable: combinedKeywords,
        writingTasks: combinedWritingTasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
};

export const clearTestStorage = (userId, testId, partNumber = null, keepHighlightsAndNotes = false) => {
    if (!testId) return;

    // 1. Remove draft answers & modes (localStorage)
    const suffix = partNumber ? `_part_${partNumber}` : '';
    localStorage.removeItem(`draft_${userId}_${testId}${suffix}`);
    localStorage.removeItem(`mode_${userId}_${testId}${suffix}`);

    // Also remove general drafts just in case
    localStorage.removeItem(`draft_${userId}_${testId}`);
    localStorage.removeItem(`mode_${userId}_${testId}`);

    // 2. Remove session answers (localStorage)
    localStorage.removeItem(`ielts_reading_session_${testId}`);
    localStorage.removeItem(`ielts_writing_session_${testId}`);

    if (!keepHighlightsAndNotes) {
        // 3. Remove reading highlights & notes (localStorage)
        localStorage.removeItem(`reading_rp_hl_${testId}`);
        localStorage.removeItem(`reading_highlights_${testId}`);
        localStorage.removeItem(`reading_notes_${testId}`);

        // 4. Remove passage-specific HTML states (localStorage)
        for (let i = 0; i <= 10; i++) {
            localStorage.removeItem(`reading_session_${testId}_passage_${i}`);
        }
    }

    // 5. Remove timer & listening highlights (sessionStorage)
    sessionStorage.removeItem(`timer_${userId}_${testId}${suffix}`);
    sessionStorage.removeItem(`timer_${userId}_${testId}`);

    if (!keepHighlightsAndNotes) {
        for (let i = 0; i <= 10; i++) {
            sessionStorage.removeItem(`listening_hl_${testId}_p${i}`);
        }
    }
};

export const qTypeMatchesSelected = (testType, selectedTypes) => {
    if (!testType) return false;
    if (!selectedTypes || selectedTypes.length === 0) return true;

    const typeMap = {
        'mcq': 'MCQ', 'multiple_choice': 'MCQ', 'gap_fill': 'GAP FILL',
        'notes_completion': 'NOTES', 'summary_completion': 'SUMMARY',
        'table_completion': 'TABLE', 'flow_chart_completion': 'FLOW CHART',
        'map_labeling': 'MAP', 'matching': 'MATCHING',
        'true_false_not_given': 'TRUE/FALSE/NG', 'true_false': 'TRUE/FALSE/NG',
        'tfng': 'TRUE/FALSE/NG', 'yes_no_not_given': 'YES/NO/NG',
        'yes_no': 'YES/NO/NG', 'ynng': 'YES/NO/NG',
        'short_answer': 'SHORT ANSWER', 'sentence_completion': 'SENTENCE',
        'diagram_labeling': 'DIAGRAM', 'heading_matching': 'HEADINGS',
        'paragraph_matching': 'PARA MATCH',
    };

    const clean = (str) => String(str || "").trim().toUpperCase().replace(/_/g, ' ');
    
    const rawTypeLower = String(testType).trim().toLowerCase();
    const resolvedType = typeMap[rawTypeLower] || clean(testType);
    
    const normType = clean(resolvedType);
    const cleanSelected = selectedTypes.map(clean);
    
    if (cleanSelected.includes(normType)) return true;
    
    const titleCaseGroups = {
        'COMPLETION': ['GAP FILL', 'SUMMARY', 'NOTES', 'TABLE', 'FLOW CHART', 'SENTENCE', 'FORM'],
        'TABLE COMPLETION': ['TABLE'],
        'FLOW CHART': ['FLOW CHART'],
        'MULTIPLE CHOICE': ['MCQ', 'SHORT ANSWER', 'MULTI CHOICE'],
        'SHORT ANSWER': ['SHORT ANSWER'],
        'MATCHING': ['MATCHING', 'PARA MATCH'],
        'MATCHING HEADINGS': ['HEADINGS'],
        'TFNG/YNNG': ['TRUE/FALSE/NG', 'YES/NO/NG'],
        'MAP/DIAGRAM': ['MAP', 'PLAN', 'DIAGRAM']
    };
    
    for (const [groupName, dbTypes] of Object.entries(titleCaseGroups)) {
        const isGroupSelected = cleanSelected.includes(groupName);
        const isDbTypesSelected = dbTypes.some(dbType => cleanSelected.includes(dbType));
        
        const isTypeInGroup = dbTypes.includes(normType);
        const isTypeGroupName = normType === groupName;
        
        if ((isGroupSelected || isDbTypesSelected) && (isTypeInGroup || isTypeGroupName)) {
            return true;
        }
    }
    
    return false;
};

export const getActualQuestionCount = (test, partNumber = null) => {
    if (!test) return 0;

    const partNum = partNumber ?? test.partNumber ?? test.part_number ?? null;
    if (partNum == null && test.totalQuestions) return test.totalQuestions;

    let items = test.questions || test.sections;
    if (!items || !Array.isArray(items)) {
        // Fallback if no questions array
        const type = test.type?.toLowerCase() || "";
        if (partNum != null) {
            return type === 'reading' ? 13 : 10;
        }
        const titleLower = test.title?.toLowerCase() || "";
        const isFull = titleLower.includes('full') || titleLower.includes('/') || (test.passages && test.passages.length > 1);
        if (type === 'reading') return isFull ? 40 : 13;
        if (type === 'listening') return isFull ? 40 : 10;
        return 40;
    }

    // If partNum is specified, filter questions by the corresponding passage/part ID
    if (partNum != null) {
        let passageId = null;
        if (test.parts && test.parts[`part${partNum}`]) {
            passageId = test.parts[`part${partNum}`].id;
        } else {
            const passages = test.passages || [];
            passageId = passages[partNum - 1]?.id;
        }

        if (passageId) {
            items = items.filter(q => String(q.passageId) === String(passageId));
        }
    }

    const ids = new Set();
    const extract = (obj) => {
        if (!obj) return;
        if (obj.id) {
            const idStr = String(obj.id);
            if (/^\d+\s*[\-–_]\s*\d+$/.test(idStr)) {
                const parts = idStr.split(/[\-–_]/);
                const start = parseInt(parts[0], 10);
                const end = parseInt(parts[1], 10);
                if (!isNaN(start) && !isNaN(end)) {
                    for (let n = Math.min(start, end); n <= Math.max(start, end); n++) {
                        ids.add(n);
                    }
                }
            } else if (/^(\d+\s*,\s*)+\d+$/.test(idStr)) {
                idStr.split(',').forEach(p => {
                    const num = parseInt(p, 10);
                    if (!isNaN(num)) ids.add(num);
                });
            } else if (!isNaN(parseInt(idStr))) {
                ids.add(parseInt(idStr));
            }
        }
        if (obj.rows && Array.isArray(obj.rows)) {
            obj.rows.forEach(row => {
                const cells = Array.isArray(row) ? row : (row.cells || []);
                cells.forEach(cell => {
                    if (!cell) return;
                    if (cell.id && !cell.isMultiQuestion && !cell.isMixed) {
                        extract(cell);
                    }
                    if (cell.isMultiQuestion && Array.isArray(cell.content)) {
                        cell.content.forEach(extract);
                    }
                    if (cell.isMixed && Array.isArray(cell.parts)) {
                        cell.parts.forEach(part => {
                            if (part && part.type === 'input') {
                                extract(part);
                            }
                        });
                    }
                });
            });
        }
        if (Array.isArray(obj.items)) obj.items.forEach(extract);
        if (Array.isArray(obj.questions)) obj.questions.forEach(extract);
        if (Array.isArray(obj.groups)) obj.groups.forEach(extract);
    };

    items.forEach(extract);
    
    const count = ids.size;
    if (count > 0) return count;

    // Fallback if no specific integer IDs were found
    if (partNum != null) {
        const type = test.type?.toLowerCase() || "";
        return type === 'reading' ? 13 : 10;
    }
    const type = test.type?.toLowerCase() || "";
    const titleLower = test.title?.toLowerCase() || "";
    const isFull = titleLower.includes('full') || titleLower.includes('/') || (test.passages && test.passages.length > 1);
    if (type === 'reading') return isFull ? 40 : 13;
    if (type === 'listening') return isFull ? 40 : 10;
    return 40;
};

/**
 * Derives the passage/part number of a test using several prioritized heuristics:
 * 1. Explicit prop from parent
 * 2. Direct fields on the test object (passageNumber, passage_number)
 * 3. Match from keys in passages object
 * 4. Regex match from title (e.g., "Passage 1")
 * 5. Minimum question ID range (Q1-13 = P1, Q14-26 = P2, Q27-40 = P3)
 * 6. Index in set
 * 7. Difficulty fallback (easy = 1, medium = 2, hard = 3)
 */
export const getPassageNum = (test, passageNumberProp = null, indexInSet = null) => {
  if (!test) return null;

  // 1. Explicit prop from parent (highest priority)
  if (passageNumberProp != null) return Number(passageNumberProp);

  // 2. Direct fields on the test object
  if (test.passageNumber) return Number(test.passageNumber);
  if (test.passage_number) return Number(test.passage_number);

  // 3. Check if passage key exists in test.passages (e.g. if key is passage1/passage2/passage3)
  if (test.passages && typeof test.passages === 'object') {
    const keys = Object.keys(test.passages);
    if (keys.length === 1) {
      const match = keys[0].match(/passage(\d)/i);
      if (match) return Number(match[1]);
    }
  }

  // 4. Derive from title (e.g. "Passage 1", "Passage 2", "Passage 3")
  const title = test.title?.toLowerCase() || '';
  const titleMatch = title.match(/passage\s*:?\s*(\d)/i) || title.match(/\bp\s*(\d)\b/i);
  if (titleMatch) return Number(titleMatch[1]);

  // 5. Derive from minimum question ID (IELTS: Q1-13=P1, Q14-26=P2, Q27-40=P3)
  if (test.questions && Array.isArray(test.questions) && test.questions.length > 0) {
    const ids = [];
    const extractIds = (obj) => {
      if (!obj) return;
      if (obj.id && !isNaN(parseInt(obj.id))) ids.push(parseInt(obj.id));
      if (Array.isArray(obj.items)) obj.items.forEach(extractIds);
      if (Array.isArray(obj.questions)) obj.questions.forEach(extractIds);
      if (Array.isArray(obj.groups)) obj.groups.forEach(extractIds);
    };
    test.questions.forEach(extractIds);
    if (ids.length > 0) {
      const minId = Math.min(...ids);
      if (minId <= 13) return 1;
      if (minId <= 26) return 2;
      if (minId <= 40) return 3;
    }
  }

  // 6. Index in set (as fallback)
  if (indexInSet != null) return indexInSet + 1;

  // 7. Difficulty field mapping for Reading Single Passages (lowest priority/weak fallback)
  if (test.type === 'reading') {
    const diff = String(test.difficulty || '').toLowerCase();
    if (diff === 'easy') return 1;
    if (diff === 'medium') return 2;
    if (diff === 'hard') return 3;
  }

  return null;
};

export const Q_TYPE_LABELS = {
    mcq: 'MCQ', multiple_choice: 'MCQ', gap_fill: 'Gap Fill',
    notes_completion: 'Notes', summary_completion: 'Summary',
    table_completion: 'Table', flow_chart_completion: 'Flow Chart',
    map_labeling: 'Map', matching: 'Matching',
    true_false_not_given: 'T/F/NG', true_false: 'T/F/NG', tfng: 'T/F/NG',
    yes_no_not_given: 'Y/N/NG', yes_no: 'Y/N/NG', ynng: 'Y/N/NG',
    short_answer: 'Short Ans', sentence_completion: 'Sentence',
    diagram_labeling: 'Diagram', heading_matching: 'Headings',
    paragraph_matching: 'Para Match',
};

export const formatQType = (t) => Q_TYPE_LABELS[t?.toLowerCase?.()] ?? t;

/** Returns array of { label, qTypes } for reading passages */
export const getReadingPassages = (test) => {
    if (!test) return [];
    const raw = test.passages;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : Object.values(raw);
    return arr.map((p, i) => ({
        label: `Passage ${i + 1}`,
        title: p?.title ?? null,
        qTypes: Array.isArray(p?.qTypes) ? p.qTypes : [],
        qCount: p?.questions?.length ?? p?.questionCount ?? null,
    }));
};

/** Returns array of { label, qTypes } for listening parts */
export const getListeningParts = (test) => {
    if (!test) return [];
    const raw = test.parts;
    if (!raw || typeof raw !== 'object') return [];
    return Object.entries(raw)
        .sort(([a], [b]) => {
            // numeric sort: part1 < part2 < part10
            const na = parseInt(a.replace(/\D/g, ''), 10);
            const nb = parseInt(b.replace(/\D/g, ''), 10);
            return (isNaN(na) || isNaN(nb)) ? a.localeCompare(b) : na - nb;
        })
        .map(([key, part], i) => ({
            label: `Part ${i + 1}`,
            qTypes: Array.isArray(part?.qTypes) ? part.qTypes : [],
            qCount: part?.questions?.length ?? part?.questionCount ?? null,
        }));
};

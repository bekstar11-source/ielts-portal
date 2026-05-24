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
                        if (/^\d+$/.test(String(updated.id))) {
                            updated.id = String(questionIdCounter++);
                        }
                    }
                    
                    for (const key of ['items', 'questions', 'groups']) {
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

export const clearTestStorage = (userId, testId, partNumber = null) => {
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

    // 3. Remove reading highlights & notes (localStorage)
    localStorage.removeItem(`reading_rp_hl_${testId}`);
    localStorage.removeItem(`reading_highlights_${testId}`);
    localStorage.removeItem(`reading_notes_${testId}`);

    // 4. Remove passage-specific HTML states (localStorage)
    for (let i = 0; i <= 10; i++) {
        localStorage.removeItem(`reading_session_${testId}_passage_${i}`);
    }

    // 5. Remove timer & listening highlights (sessionStorage)
    sessionStorage.removeItem(`timer_${userId}_${testId}${suffix}`);
    sessionStorage.removeItem(`timer_${userId}_${testId}`);
    for (let i = 0; i <= 10; i++) {
        sessionStorage.removeItem(`listening_hl_${testId}_p${i}`);
    }
};

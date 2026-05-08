export const mergeTestsLogic = (selectedTestObjects, mergeTitle) => {
    let combinedPassages = [];
    let combinedQuestions = [];
    let combinedKeywords = [];
    let passageIdOffset = 0;
    let questionIdCounter = 1;

    selectedTestObjects.forEach((test) => {
        const passages = test.passages || [];
        const questions = test.questions || [];
        const keywords = test.keywordTable || [];

        const passageIdMap = {};
        const mappedPassages = passages.map((p, pIdx) => {
            const newId = passageIdOffset + pIdx + 1;
            passageIdMap[String(p.id)] = String(newId);
            return { ...p, id: String(newId), partNumber: passageIdOffset + pIdx + 1 };
        });

        const mappedQuestions = questions.map(group => {
            let questionIdCounterLocal = questionIdCounter;
            
            const walkAndReindex = (obj) => {
                if (!obj || typeof obj !== 'object') return obj;
                if (Array.isArray(obj)) return obj.map(walkAndReindex);
                let updated = { ...obj };
                if (updated.passageId && passageIdMap[String(updated.passageId)]) {
                    updated.passageId = passageIdMap[String(updated.passageId)];
                }
                
                // Simplified reindexing for this utility
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

            return walkAndReindex({ ...group, passageId: passageIdMap[String(group.passageId)] || group.passageId });
        });

        combinedPassages = [...combinedPassages, ...mappedPassages];
        combinedQuestions = [...combinedQuestions, ...mappedQuestions];
        combinedKeywords = [...combinedKeywords, ...keywords.map(kw => ({ ...kw, passageId: passageIdMap[String(kw.passageId)] || kw.passageId }))];
        passageIdOffset += passages.length;
    });

    return {
        title: mergeTitle,
        type: selectedTestObjects[0]?.type,
        difficulty: "medium",
        passages: combinedPassages,
        questions: combinedQuestions,
        keywordTable: combinedKeywords,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
};

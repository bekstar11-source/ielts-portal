import { calculateBandScore, checkAnswer, scoreMultiAnswer, isMultiAnswerType } from "../../utils/ieltsScoring";

export function useTestScoring() {
    const calculateScore = (test, userAnswers) => {
        let correctCount = 0;
        let totalQ = 0;
        let mistakes = [];
        const scoredIds = new Set();

        const getWeight = (id) => {
            if (!id) return 1;
            const s = String(id).trim();
            const parts = s.split(/[\-–—_]/).map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                return Math.abs(parts[1] - parts[0]) + 1;
            }
            if (s.includes(',')) return s.split(',').length;
            return 1;
        };

        const walk = (obj, parentType) => {
            if (!obj || typeof obj !== 'object') return;
            const currentType = String(obj.type || parentType || "").toLowerCase();
            const getAnswer = (o) => o?.answer || o?.correct_answer || o?.correctAnswer || o?.correct_answer_value;

            if (isMultiAnswerType(obj.type) && !obj.id) {
                const groupItems = [];
                const collectItems = (o) => {
                    if (!o || typeof o !== 'object') return;
                    const ans = getAnswer(o);
                    if (o.id && ans) groupItems.push(o);
                    ['questions', 'items', 'rows', 'groups', 'cells', 'content', 'parts'].forEach(sk => {
                        if (o[sk] && Array.isArray(o[sk])) o[sk].forEach(collectItems);
                        else if (o[sk]) collectItems(o[sk]);
                    });
                };
                collectItems(obj);

                if (groupItems.length > 0) {
                    const allCorrect = groupItems.map(i => getAnswer(i)).join(', ');
                    const allUser = groupItems.map(i => userAnswers[String(i.id)] || "").join(', ');
                    let weight = groupItems.length;
                    if (currentType.includes('three')) weight = 3;
                    else if (currentType.includes('two')) weight = 2;

                    const result = scoreMultiAnswer(allCorrect, allUser, weight);
                    correctCount += result.matches;
                    totalQ += result.weight;

                    if (result.matches < result.weight && allUser.trim()) {
                        mistakes.push({ questionId: groupItems.map(i => i.id).join(', '), userResponse: allUser, correctAnswer: allCorrect, isMulti: true });
                    }
                    groupItems.forEach(i => scoredIds.add(String(i.id).trim()));
                    return;
                }
            }

            const itemAns = getAnswer(obj);
            if (obj.id && itemAns) {
                const idStr = String(obj.id).trim();
                if (!scoredIds.has(idStr)) {
                    scoredIds.add(idStr);
                    const userResp = userAnswers[idStr] || "";
                    const weight = getWeight(idStr);

                    if (isMultiAnswerType(currentType) || idStr.includes('-') || idStr.includes(',')) {
                        const result = scoreMultiAnswer(itemAns, userResp, weight);
                        correctCount += result.matches;
                        totalQ += result.weight;
                        if (result.matches < result.weight && userResp.trim()) {
                            mistakes.push({ questionId: idStr, userResponse: userResp, correctAnswer: itemAns });
                        }
                    } else {
                        totalQ++;
                        if (checkAnswer(itemAns, userResp)) correctCount++;
                        else if (userResp.trim()) mistakes.push({ questionId: idStr, userResponse: userResp, correctAnswer: itemAns });
                    }
                }
            }

            ['sections', 'questions', 'groups', 'passages', 'items', 'parts', 'content', 'rows', 'cells'].forEach(key => {
                const val = obj[key];
                if (val && Array.isArray(val)) val.forEach(child => walk(child, currentType));
                else if (val && typeof val === 'object') walk(val, currentType);
            });
        };

        walk(test);

        const band = calculateBandScore(correctCount, test.type, totalQ);
        return { correctCount, totalQ, band, mistakes };
    };

    return { calculateScore };
}

// functions/ieltsScoring.js

// IELTS BAND CALCULATOR
const calculateBandScore = (score, type, totalQuestions = 40) => {
    const t = type?.toLowerCase();

    if (t === 'listening' || t === 'reading') {
        if (!totalQuestions || totalQuestions <= 0) return 0;

        let scaledScore;
        if (totalQuestions === 40) {
            scaledScore = score;
        } else if (totalQuestions === 20) {
            scaledScore = Math.round((score / 20) * 40);
        } else {
            scaledScore = Math.round((score / totalQuestions) * 40);
        }

        if (scaledScore >= 39) return 9.0;
        if (scaledScore >= 37) return 8.5;
        if (scaledScore >= 35) return 8.0;
        if (scaledScore >= 32) return 7.5;
        if (scaledScore >= 30) return 7.0;
        if (scaledScore >= 26) return 6.5;
        if (scaledScore >= 23) return 6.0;
        if (scaledScore >= 18) return 5.5;
        if (scaledScore >= 16) return 5.0;
        if (scaledScore >= 13) return 4.5;
        if (scaledScore >= 10) return 4.0;
        if (scaledScore >= 8)  return 3.5;
        if (scaledScore >= 6)  return 3.0;
        if (scaledScore >= 4)  return 2.5;
        if (scaledScore >= 2)  return 2.0;
        if (scaledScore >= 1)  return 1.0;
        return 0;
    }
    return null;
};

// OVERALL BAND CALCULATOR (Rounds to nearest 0.5)
const calculateOverallBand = (...args) => {
    let scores = args;
    if (args.length === 1 && Array.isArray(args[0])) {
        scores = args[0];
    }

    const validScores = scores.filter(s => (typeof s === 'number' && !isNaN(s)) && s >= 0);
    if (validScores.length === 0) return 0;

    const average = validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length;
    
    const integerPart = Math.floor(average);
    const fractionalPart = average - integerPart;

    if (fractionalPart < 0.25) return integerPart;
    if (fractionalPart < 0.75) return integerPart + 0.5;
    return integerPart + 1;
};

// COLLAPSE WHITESPACE & CLEAN
const normalizeString = (str) => {
    return String(str || "")
        .trim()
        .toLowerCase()
        .replace(/[.,'":;?!( )]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

// JAVOBNI TEKSHIRISH FUNKSIYASI
const checkAnswer = (correct, user) => {
    if (correct === undefined || correct === null) return false;

    let cleanCorrect = normalizeString(correct);
    let cleanUser = normalizeString(user);

    if (!cleanUser) return false;

    if (/^[ivx]+\./.test(cleanUser)) {
        cleanUser = cleanUser.split('.')[0].trim();
    }

    const checkWithOptional = (correctStr, userStr) => {
        if (correctStr === userStr) return true;
        
        const withoutParens = correctStr.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
        if (withoutParens === userStr) return true;

        const withoutWords = correctStr.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
        if (withoutWords === userStr) return true;

        return false;
    };

    const options = cleanCorrect.split(/[/|]/).map(s => s.trim());
    const userOptions = cleanUser.split(/[/|]/).map(s => s.trim());

    for (const uOpt of userOptions) {
        if (options.some(o => checkWithOptional(o, uOpt))) {
            return true;
        }
    }

    return false;
};

// MULTI-CHOICE JAVOBNI TEKSHIRISH
const scoreMultiAnswer = (correct, user, weight) => {
    if (!correct) return { matches: 0, weight: weight || 1 };
    
    const normalizeMulti = (str) => {
        if (!str) return [];
        const s = String(str).trim();
        
        if (/^[A-Z, /|\s]+$/i.test(s)) {
            const parts = s.split(/[,/|\s]+/).map(p => p.trim().toLowerCase()).filter(p => p.length === 1);
            if (parts.length > 0) return parts;
        }

        return s.split(/[,/|]/).map(item => item.trim().toLowerCase()).filter(Boolean);
    };

    const correctArr = normalizeMulti(correct);
    const userArr = normalizeMulti(user);
    const uniqueUser = Array.from(new Set(userArr));

    let matches = 0;
    uniqueUser.forEach(u => {
        if (correctArr.includes(u)) {
            matches++;
        }
    });
    
    const finalWeight = weight || correctArr.length;
    const matchesCount = Math.min(matches, finalWeight);
    return { matches: matchesCount, weight: finalWeight };
};

const isMultiAnswerType = (type) => {
    if (!type) return false;
    const t = String(type).toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ');
    
    if (t === 'multiple choice' || t === 'mcq') return false;

    return t.includes('two choice') || 
           t.includes('three choice') || 
           t.includes('pick two') || 
           t.includes('pick three') || 
           t.includes('pick four') || 
           t.includes('pick five') || 
           t.includes('multi selection') || 
           t.includes('multi answer') ||
           t.includes('selection');
};

// FULL EVALUATION ENGINE (Returns score, total, band, and mistake records)
const evaluateTest = (testData, userAnswers) => {
    let correctCount = 0;
    let totalQ = 0;
    let mistakes = [];
    const scoredIds = new Set();

    const getWeight = (id) => {
        if (!id) return 1;
        const s = String(id).trim();
        if (s.includes('-')) {
            const parts = s.split('-').map(n => parseInt(n));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                return Math.abs(parts[1] - parts[0]) + 1;
            }
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

    walk(testData);

    const type = testData.type || 'reading';
    const band = calculateBandScore(correctCount, type, totalQ);

    return { correctCount, totalQ, band, mistakes };
};

module.exports = {
    calculateBandScore,
    calculateOverallBand,
    normalizeString,
    checkAnswer,
    scoreMultiAnswer,
    isMultiAnswerType,
    evaluateTest
};

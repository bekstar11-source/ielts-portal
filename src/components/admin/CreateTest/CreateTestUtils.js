/**
 * Utility functions for CreateTest page
 */

export const getFileNameFromUrl = (url) => {
    try {
        if (!url) return '';
        const decoded = decodeURIComponent(url);
        const fullName = decoded.split('?')[0].split('/').pop();
        return fullName.substring(fullName.indexOf('_') + 1) || fullName;
    } catch (e) {
        return 'Fayl';
    }
};

export const toMMSS = (seconds) => {
    if (seconds === undefined || seconds === null || seconds === "") return "";
    const s = Number(seconds);
    if (isNaN(s)) return seconds;
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

export const processTime = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'string' && val.includes(':')) {
        const parts = val.split(':');
        return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
    }
    return Number(val) || 0;
};

export const detectSectionFromQuestions = (testType, questions) => {
    if (!questions || !Array.isArray(questions) || questions.length === 0) return null;
    
    let minId = Infinity;
    let maxId = -Infinity;

    const extractIds = (q) => {
        const idStr = String(q.id || "");
        const matches = idStr.match(/\d+/g);
        if (matches) {
            matches.forEach(m => {
                const num = parseInt(m);
                if (num < minId) minId = num;
                if (num > maxId) maxId = num;
            });
        }
        if (q.items) q.items.forEach(extractIds);
        if (q.questions) q.questions.forEach(extractIds);
        if (q.groups) q.groups.forEach(extractIds);
    };

    questions.forEach(extractIds);

    if (minId === Infinity) return null;

    if (testType === 'reading') {
        if (minId <= 1 && maxId >= 35) return 'medium'; 
        if (minId <= 13) return 'easy';
        if (minId <= 26) return 'medium';
        return 'hard';
    } else if (testType === 'listening') {
        if (minId <= 1 && maxId >= 35) return 'full';
        if (minId <= 10) return 'part 1';
        if (minId <= 20) return 'part 2';
        if (minId <= 30) return 'part 3';
        return 'part 4';
    }
    return null;
};

export const sanitizePayload = (obj) => {
    if (obj === null || obj === undefined) return null;
    if (typeof obj === 'number' && isNaN(obj)) return 0;
    if (typeof obj !== 'object' || obj instanceof Date) return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => {
            if (Array.isArray(item)) {
                return { cells: sanitizePayload(item) };
            }
            return sanitizePayload(item);
        }).filter(v => v !== undefined);
    }

    const cleaned = {};
    Object.keys(obj).forEach(key => {
        const value = sanitizePayload(obj[key]);
        if (value !== undefined) cleaned[key] = value;
    });
    return cleaned;
};

export const checkDuplicateTest = async (testData, existingTests) => {
    const normalize = (val) => String(val || "").trim().toLowerCase();
    let isDuplicate = false;
    let duplicateTitle = "";

    for (let existing of existingTests) {
        // CHECK 1: Exact Title Match
        const t1 = normalize(testData.title);
        const t2 = normalize(existing.title);
        if (t1.length >= 5 && t1 === t2) {
            isDuplicate = true;
            duplicateTitle = existing.title;
            break;
        }

        // CHECK 2: Passage Content Match
        if ((testData.type === 'reading' || testData.type === 'listening') &&
            testData.passages?.length > 0 && existing.passages?.length > 0) {

            let passageDuplicate = false;
            for (let i = 0; i < Math.min(testData.passages.length, existing.passages.length); i++) {
                const p1 = testData.passages[i];
                const p2 = existing.passages[i];

                const tit1 = normalize(p1?.title || "");
                const tit2 = normalize(p2?.title || "");
                const con1 = normalize(p1?.content || "").substring(0, 200);
                const con2 = normalize(p2?.content || "").substring(0, 200);

                const isGenericTitle = (s) => !s || s.length < 5 || /^(part|passage|section)\s*\d*$/i.test(s.trim());

                if (!isGenericTitle(tit1) && tit1 === tit2) {
                    passageDuplicate = true;
                    break;
                }
                if (con1.length > 80 && con1 === con2) {
                    passageDuplicate = true;
                    break;
                }
                const au1 = (p1?.audio || "").trim();
                const au2 = (p2?.audio || "").trim();
                if (au1.length > 10 && au1 === au2) {
                    passageDuplicate = true;
                    break;
                }
            }
            if (passageDuplicate) {
                isDuplicate = true;
                duplicateTitle = existing.title || "o'xshash kontent";
                break;
            }
        }

        // CHECK 3: Question Content Match
        if (testData.questions?.length > 0 && existing.questions?.length > 0) {
            const q1 = testData.questions;
            const q2 = existing.questions;
            if (q1.length === q2.length) {
                const ids1 = q1.slice(0, 5).map(q => normalize(q.id)).join(',');
                const ids2 = q2.slice(0, 5).map(q => normalize(q.id)).join(',');

                if (ids1 === ids2 && ids1.length > 0) {
                    let matchCount = 0;
                    let validTexts = 0;
                    for (let i = 0; i < Math.min(q1.length, q2.length, 5); i++) {
                        const txt1 = normalize(q1[i]?.instruction || q1[i]?.question || q1[i]?.text || q1[i]?.sentence || "");
                        const txt2 = normalize(q2[i]?.instruction || q2[i]?.question || q2[i]?.text || q2[i]?.sentence || "");
                        if (txt1.length > 15) {
                            validTexts++;
                            if (txt1.substring(0, 60) === txt2.substring(0, 60)) matchCount++;
                        }
                    }
                    const isNumericIds = ids1.split(',').every(s => s && !isNaN(Number(s)));
                    if (isNumericIds) {
                        if (validTexts >= 2 && matchCount >= validTexts) {
                            isDuplicate = true;
                            duplicateTitle = existing.title || "o'xshash savollar";
                            break;
                        }
                    } else if (validTexts > 0 && matchCount >= Math.ceil(validTexts * 0.8)) {
                        isDuplicate = true;
                        duplicateTitle = existing.title || "o'xshash IDlar";
                        break;
                    }
                }
            }
        }
    }

    return { isDuplicate, duplicateTitle };
};
export const getQuestionTypesFromQuestions = (questions) => {
    if (!questions || !Array.isArray(questions)) return [];
    
    const types = new Set();
    const mapType = (t) => {
        if (!t) return null;
        const lower = t.toLowerCase();
        if (lower.includes('multiple_choice') || lower.includes('multi_choice') || lower.includes('selection') || lower.includes('pick_')) return 'Multiple Choice';
        if (lower.includes('matching_headings')) return 'Matching Headings';
        if (lower.includes('true_false') || lower.includes('yes_no')) return 'TFNG/YNNG';
        if (lower.includes('matching')) return 'Matching';
        if (lower.includes('table')) return 'Table Completion';
        if (lower.includes('note') || lower.includes('gap_fill') || lower.includes('sentence') || lower.includes('summary') || lower.includes('form')) return 'Completion';
        if (lower.includes('flow_chart') || lower.includes('flowchart')) return 'Flow Chart';
        if (lower.includes('map_labeling') || lower.includes('diagram')) return 'Map/Diagram';
        if (lower.includes('short_answer')) return 'Short Answer';
        return t.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    questions.forEach(q => {
        if (q.type) { const m = mapType(q.type); if (m) types.add(m); }
        if (q.items) q.items.forEach(it => { if (it.type) { const m = mapType(it.type); if (m) types.add(m); } });
        if (q.questions) q.questions.forEach(it => { if (it.type) { const m = mapType(it.type); if (m) types.add(m); } });
        if (q.groups) q.groups.forEach(g => { if (g.type) { const m = mapType(g.type); if (m) types.add(m); } });
    });

    return Array.from(types);
};

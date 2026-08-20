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

// Vaqt bilan ishlash faqat bitta joyda — src/utils/audioTime.js da. Admin va
// o'quvchi tomonlari bir xil parser/format ishlatishi shart, aks holda partlar
// chegarasi soniyalab surilib ketadi.
export { parseAudioTime as processTime, formatAudioTimePrecise as toMMSS, formatAudioTime, roundAudioTime } from "../../../utils/audioTime";

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

const normalizeTitle = (title) => {
    return String(title || "")
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
        .replace(/\s+/g, " ")
        .trim();
};

const normalizeContent = (content) => {
    return String(content || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
};

const extractAllQuestions = (questionsArray) => {
    const result = [];
    if (!questionsArray || !Array.isArray(questionsArray)) return result;
    
    const traverse = (q) => {
        if (!q) return;
        if (q.question || q.instruction || q.text || q.sentence || q.id) {
            result.push(q);
        }
        if (q.items && Array.isArray(q.items)) q.items.forEach(traverse);
        if (q.questions && Array.isArray(q.questions)) q.questions.forEach(traverse);
        if (q.groups && Array.isArray(q.groups)) q.groups.forEach(traverse);
    };
    questionsArray.forEach(traverse);
    return result;
};

const isGenericQuestionText = (text) => {
    if (!text || text.length < 15) return true;
    const genericRegexes = [
        /choose the correct/i,
        /write no more than/i,
        /write your answers/i,
        /in boxes/i,
        /on your answer sheet/i,
        /complete the/i,
        /true\s*false/i,
        /yes\s*no/i,
        /not given/i,
        /one word only/i,
        /two words only/i,
        /three words only/i,
        /no more than/i
    ];
    return genericRegexes.some(rx => rx.test(text));
};

const cleanAudioUrl = (url) => {
    if (!url) return "";
    return String(url).split('?')[0].split('#')[0].trim();
};

export const checkDuplicateTest = async (testData, existingTests) => {
    const t1 = normalizeTitle(testData.title);
    let isDuplicate = false;
    let duplicateTitle = "";

    for (let existing of existingTests) {
        // CHECK 1: Exact Title Match (Normalized)
        const t2 = normalizeTitle(existing.title);
        if (t1.length >= 3 && t1 === t2) {
            isDuplicate = true;
            duplicateTitle = existing.title;
            break;
        }

        // CHECK 2: Passage Content Match (Cross-passage comparison)
        if ((testData.type === 'reading' || testData.type === 'listening') &&
            testData.passages?.length > 0 && existing.passages?.length > 0) {

            let passageDuplicate = false;
            for (let p1 of testData.passages) {
                const tit1 = normalizeTitle(p1?.title || "");
                const con1 = normalizeContent(p1?.content || "").substring(0, 300);
                const au1 = cleanAudioUrl(p1?.audio || p1?.audioUrl || "");

                for (let p2 of existing.passages) {
                    const tit2 = normalizeTitle(p2?.title || "");
                    const con2 = normalizeContent(p2?.content || "").substring(0, 300);
                    const au2 = cleanAudioUrl(p2?.audio || p2?.audioUrl || "");

                    const isGenericTitle = (s) => !s || s.length < 5 || /^(part|passage|section|reading|listening)\s*\d*$/i.test(s.trim());

                    // A: Title match (non-generic)
                    if (tit1 && tit2 && !isGenericTitle(tit1) && !isGenericTitle(tit2) && tit1 === tit2) {
                        passageDuplicate = true;
                        break;
                    }
                    // B: Content match
                    if (con1.length > 80 && con2.length > 80 && con1 === con2) {
                        passageDuplicate = true;
                        break;
                    }
                    // C: Audio match
                    if (au1.length > 10 && au2.length > 10 && au1 === au2) {
                        passageDuplicate = true;
                        break;
                    }
                }
                if (passageDuplicate) break;
            }

            if (passageDuplicate) {
                isDuplicate = true;
                duplicateTitle = existing.title || "o'xshash matn/part";
                break;
            }
        }

        // CHECK 3: Question Content Match
        if (testData.questions?.length > 0 && existing.questions?.length > 0) {
            const list1 = extractAllQuestions(testData.questions)
                .map(q => normalizeContent(q.question || q.text || q.sentence || q.instruction || ""))
                .filter(t => !isGenericQuestionText(t));
                
            const list2 = extractAllQuestions(existing.questions)
                .map(q => normalizeContent(q.question || q.text || q.sentence || q.instruction || ""))
                .filter(t => !isGenericQuestionText(t));

            const minQuestionsToCheck = Math.min(list1.length, list2.length);

            if (minQuestionsToCheck >= 3) {
                let matches = 0;
                const set2 = new Set(list2);
                for (let text of list1) {
                    if (set2.has(text)) {
                        matches++;
                    } else {
                        // Check fuzzy match (e.g. prefix match for longer texts)
                        for (let t2 of list2) {
                            if (text.length > 25 && t2.length > 25) {
                                if (text.substring(0, 50) === t2.substring(0, 50)) {
                                    matches++;
                                    break;
                                }
                            }
                        }
                    }
                }

                const overlapRatio = matches / minQuestionsToCheck;
                if (overlapRatio >= 0.6) {
                    isDuplicate = true;
                    duplicateTitle = existing.title || "o'xshash savollar";
                    break;
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

export const getPassageOrPartNum = (p, idx, kind, questions = []) => {
    if (!p) return idx + 1;

    // 1. Derive from questions if available (highest priority for IELTS standard)
    if (kind === 'reading' && Array.isArray(questions) && questions.length > 0) {
        // Filter questions belonging to this passage
        const passageQuestions = questions.filter(
            q => String(q.passageId) === String(p.id)
        );
        if (passageQuestions.length > 0) {
            const ids = [];
            const extractIds = (obj) => {
                if (!obj) return;
                if (obj.id && !isNaN(parseInt(obj.id))) ids.push(parseInt(obj.id));
                if (Array.isArray(obj.items)) obj.items.forEach(extractIds);
                if (Array.isArray(obj.questions)) obj.questions.forEach(extractIds);
                if (Array.isArray(obj.groups)) obj.groups.forEach(extractIds);
            };
            passageQuestions.forEach(extractIds);
            if (ids.length > 0) {
                const minId = Math.min(...ids);
                if (minId <= 13) return 1;
                if (minId <= 26) return 2;
                return 3;
            }
        }
    }

    if (kind === 'listening' && Array.isArray(questions) && questions.length > 0) {
        // Filter questions belonging to this part
        const partQuestions = questions.filter(
            q => String(q.passageId) === String(p.id)
        );
        if (partQuestions.length > 0) {
            const ids = [];
            const extractIds = (obj) => {
                if (!obj) return;
                if (obj.id && !isNaN(parseInt(obj.id))) ids.push(parseInt(obj.id));
                if (Array.isArray(obj.items)) obj.items.forEach(extractIds);
                if (Array.isArray(obj.questions)) obj.questions.forEach(extractIds);
                if (Array.isArray(obj.groups)) obj.groups.forEach(extractIds);
            };
            partQuestions.forEach(extractIds);
            if (ids.length > 0) {
                const minId = Math.min(...ids);
                if (minId <= 10) return 1;
                if (minId <= 20) return 2;
                if (minId <= 30) return 3;
                return 4;
            }
        }
    }

    // 2. Fallback to parsing the ID
    const idNum = Number(p.id);
    if (!Number.isNaN(idNum)) {
        if (idNum >= 100) return idNum - 100 + 1;
        if (idNum >= 1 && idNum <= (kind === 'listening' ? 4 : 3)) return idNum;
    }
    const idStr = p.id != null ? String(p.id) : '';
    const idMatch = idStr.match(/_(\d+)/) || idStr.match(/-(\d+)/) || idStr.match(/(\d+)/);
    if (idMatch) {
        const num = parseInt(idMatch[1], 10);
        if (num >= 1 && num <= (kind === 'listening' ? 4 : 3)) return num;
    }

    // 3. Fallback to title matching
    const titlePattern = kind === 'listening' ? /Part\s*(\d+)/i : /Passage\s*(\d+)/i;
    const titleMatch = p.title?.match(titlePattern) || p.title?.match(/(\d+)/);
    if (titleMatch) {
        const num = parseInt(titleMatch[1], 10);
        if (num >= 1 && num <= (kind === 'listening' ? 4 : 3)) return num;
    }

    return idx + 1;
};


import { getQuestionTypesFromQuestions } from '../components/admin/CreateTest/CreateTestUtils.js';
import { collectQuestionNumbers } from './ieltsScoring.js';

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

// ---------------------------------------------------------------------------
// Testlarni birlashtirish (merge)
// ---------------------------------------------------------------------------

// Sarlavha/id ichidan tartib raqamini ajratib olish (e.g. "Passage 2" -> 2)
const extractSortNumber = (title, id, parentTitle) => {
    // Avval aniq ko'rsatkichlar (e.g. "passage 1", "part 2", "task 3")
    const specificRegex = /(?:passage|part|task|section|pt|p|t)\s*(\d+)/i;

    let match = String(title || "").match(specificRegex);
    if (match) return parseInt(match[1], 10);

    match = String(id || "").match(specificRegex);
    if (match) return parseInt(match[1], 10);

    match = String(parentTitle || "").match(specificRegex);
    if (match) return parseInt(match[1], 10);

    // Aks holda — istalgan raqam
    match = String(title || "").match(/\d+/);
    if (match) return parseInt(match[0], 10);

    match = String(id || "").match(/\d+/);
    if (match) return parseInt(match[0], 10);

    match = String(parentTitle || "").match(/\d+/);
    if (match) return parseInt(match[0], 10);

    return 999;
};

const RANGE_ID_RE = /^\d+\s*[-–—_]\s*\d+$/;
const LIST_ID_RE = /^(\d+\s*,\s*)+\d+$/;

// Savol id'sidagi eng kichik raqam — guruhlarni asl tartibida saralash uchun
const firstQuestionNumber = (node) => {
    let min = Infinity;
    const walk = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) { obj.forEach(walk); return; }
        const idStr = String(obj.id ?? "");
        const nums = idStr.match(/\d+/g);
        if (nums) nums.forEach(n => { const v = parseInt(n, 10); if (v < min) min = v; });
        ['items', 'questions', 'groups', 'rows', 'cells', 'content', 'parts'].forEach(k => {
            if (obj[k]) walk(obj[k]);
        });
    };
    walk(node);
    return min === Infinity ? 9999 : min;
};

// Guruh ichidagi eski raqamlarni yangisiga almashtirish (instruction matni uchun).
// Faqat shu guruhga tegishli raqamlar almashadi — sana/yil kabi begona
// raqamlarga tegilmaydi.
const renumberText = (text, numberMap) => {
    if (!text || typeof text !== 'string' || numberMap.size === 0) return text;
    return text.replace(/\d+/g, (m) => {
        const mapped = numberMap.get(parseInt(m, 10));
        return mapped != null ? String(mapped) : m;
    });
};

const spanLabel = (numbers) => {
    if (!numbers.length) return null;
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    return min === max ? String(min) : `${min}–${max}`;
};

// Bitta test ichidagi passage'larni o'z tartibida qaytaradi
const orderPassagesWithinTest = (test) => {
    const passages = (test.passages || []).map((passage, passageIndex) => ({
        passage,
        passageIndex,
        sortOrder: extractSortNumber(passage.title, passage.id, test.title)
    }));

    const partNums = passages.map(p => Number(p.passage.partNumber));
    const allValid = partNums.every(n => Number.isFinite(n) && n > 0);
    const allUnique = new Set(partNums).size === partNums.length;
    if (allValid && allUnique) {
        return [...passages].sort(
            (a, b) => Number(a.passage.partNumber) - Number(b.passage.partNumber)
        );
    }
    return passages;
};

/**
 * Birlashtirishdan oldingi "reja": qaysi passage/task qaysi tartibda ketadi.
 * Admin UI shu ro'yxatni ko'rsatadi va tartibni o'zgartira oladi.
 */
export const buildMergePlan = (selectedTestObjects = []) => {
    const types = Array.from(
        new Set(selectedTestObjects.map(t => t?.type).filter(Boolean))
    );
    const testType = types[0] || "reading";
    const warnings = [];

    if (types.length > 1) {
        warnings.push(`Turli xil test turlari tanlangan (${types.join(", ")}). Faqat bir xil turdagi testlarni birlashtiring.`);
    }

    const units = [];

    selectedTestObjects.forEach((test, testIndex) => {
        if (!test) return;
        if (testType === 'writing') {
            (test.writingTasks || []).forEach((task, taskIndex) => {
                units.push({
                    key: `t${testIndex}:u${taskIndex}`,
                    testIndex,
                    unitIndex: taskIndex,
                    testTitle: test.title || "Untitled",
                    title: task.title || `Task ${taskIndex + 1}`,
                    questionCount: 1,
                    sortOrder: extractSortNumber(task.title, task.id, test.title)
                });
            });
        } else {
            const questions = test.questions || [];
            orderPassagesWithinTest(test).forEach(({ passage, passageIndex, sortOrder }) => {
                const passageQuestions = questions.filter(
                    q => String(q.passageId) === String(passage.id)
                );
                units.push({
                    key: `t${testIndex}:u${passageIndex}`,
                    testIndex,
                    unitIndex: passageIndex,
                    testTitle: test.title || "Untitled",
                    title: passage.title || `Passage ${passageIndex + 1}`,
                    questionCount: passageQuestions.reduce(
                        (sum, g) => sum + countQuestionSlots(g), 0
                    ),
                    hasQuestions: passageQuestions.length > 0,
                    sortOrder
                });
            });
        }
    });

    // Testlar orasidagi tartib: har bir testning eng kichik sortOrder'i bo'yicha.
    // Shu bilan "Passage 1 / Passage 2 / Passage 3" alohida testlari to'g'ri
    // tartibda ketadi, ko'p passageli testlar esa BO'LINMAYDI —
    // ilgari ular bir-birining ichiga aralashib ketardi (A1, B1, A2, B2...).
    const minSortByTest = new Map();
    units.forEach(u => {
        const cur = minSortByTest.get(u.testIndex);
        if (cur == null || u.sortOrder < cur) minSortByTest.set(u.testIndex, u.sortOrder);
    });

    const testOrder = Array.from(minSortByTest.keys()).sort((a, b) => {
        const diff = minSortByTest.get(a) - minSortByTest.get(b);
        return diff !== 0 ? diff : a - b;
    });

    const ordered = [];
    testOrder.forEach(testIndex => {
        units.filter(u => u.testIndex === testIndex).forEach(u => ordered.push(u));
    });

    if (testType === 'reading' && ordered.length > 3) {
        warnings.push(`${ordered.length} ta passage birlashtirilmoqda — standart IELTS Reading testida 3 ta bo'ladi.`);
    }
    if (testType === 'listening' && ordered.length > 4) {
        warnings.push(`${ordered.length} ta part birlashtirilmoqda — standart IELTS Listening testida 4 ta bo'ladi.`);
    }
    const emptyUnits = ordered.filter(u => u.questionCount === 0);
    if (emptyUnits.length) {
        warnings.push(`Savolsiz bo'lim(lar): ${emptyUnits.map(u => u.title).join(", ")}.`);
    }

    return { type: testType, types, units: ordered, warnings };
};

// Guruh ichidagi haqiqiy savollar sonini hisoblash
export const countQuestionSlots = (group) => {
    let count = 0;
    const walk = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) { obj.forEach(walk); return; }
        const nested = ['items', 'questions', 'groups', 'rows', 'cells', 'content', 'parts']
            .filter(k => Array.isArray(obj[k]));
        if (nested.length === 0) {
            const idStr = String(obj.id ?? "");
            if (RANGE_ID_RE.test(idStr)) {
                const [a, b] = idStr.split(/[-–—_]/).map(s => parseInt(s, 10));
                if (!isNaN(a) && !isNaN(b)) count += Math.abs(b - a) + 1;
            } else if (LIST_ID_RE.test(idStr)) {
                count += idStr.split(',').length;
            } else if (/^\d+$/.test(idStr)) {
                count += 1;
            }
            return;
        }
        nested.forEach(k => walk(obj[k]));
    };
    walk(group);
    return count;
};

export const mergeTestsLogic = (selectedTestObjects, mergeTitle, options = {}) => {
    const plan = buildMergePlan(selectedTestObjects);
    const testType = plan.type;

    // Admin UI'dan kelgan qo'lda tartib (key'lar ro'yxati) — bo'lmasa avtomatik reja
    let units = plan.units;
    if (Array.isArray(options.order) && options.order.length) {
        const byKey = new Map(plan.units.map(u => [u.key, u]));
        const picked = options.order.map(k => byKey.get(k)).filter(Boolean);
        // Rejada bor, lekin tartibda tushib qolganlari oxiriga qo'shiladi
        const pickedKeys = new Set(picked.map(u => u.key));
        units = [...picked, ...plan.units.filter(u => !pickedKeys.has(u.key))];
    }

    const combinedPassages = [];
    let combinedQuestions = [];
    const combinedKeywords = [];
    const combinedWritingTasks = [];

    if (testType === 'writing') {
        units.forEach((unit, idx) => {
            const task = (selectedTestObjects[unit.testIndex]?.writingTasks || [])[unit.unitIndex];
            if (!task) return;
            const newId = idx + 1;
            combinedWritingTasks.push({
                ...task,
                id: String(newId),
                title: `Task ${newId}`
            });
        });
    } else {
        let questionIdCounter = 1;
        // `${eskiPassageId}::${eskiSavolRaqami}` -> yangi savol raqami
        const keywordNumberMap = new Map();

        units.forEach((unit, idx) => {
            const sourceTest = selectedTestObjects[unit.testIndex];
            if (!sourceTest) return;
            const passage = (sourceTest.passages || [])[unit.unitIndex];
            if (!passage) return;

            const newPassageId = String(idx + 1);
            const oldPassageId = String(passage.id);

            combinedPassages.push({
                ...passage,
                id: newPassageId,
                partNumber: idx + 1,
                originalId: passage.originalId ?? passage.id,
                sourceTestId: sourceTest.id || null
            });

            // Savol guruhlarini asl raqamlanishi bo'yicha saralaymiz —
            // Firestore massivdagi tartib har doim ham to'g'ri bo'lavermaydi.
            const passageQuestions = (sourceTest.questions || [])
                .filter(q => String(q.passageId) === oldPassageId)
                .map((group, i) => ({ group, i, order: firstQuestionNumber(group) }))
                .sort((a, b) => (a.order - b.order) || (a.i - b.i))
                .map(x => x.group);

            const mappedQuestions = passageQuestions.map(questionGroup => {
                // Shu guruhdagi eski raqam -> yangi raqam
                const numberMap = new Map();
                const assignedNumbers = [];

                const assign = (oldNum) => {
                    const newNum = questionIdCounter++;
                    if (Number.isFinite(oldNum)) numberMap.set(oldNum, newNum);
                    assignedNumbers.push(newNum);
                    return newNum;
                };

                const CHILD_KEYS = ['items', 'questions', 'groups', 'rows', 'cells', 'content', 'parts'];

                const walkAndReindex = (obj) => {
                    if (!obj || typeof obj !== 'object') return obj;
                    if (Array.isArray(obj)) return obj.map(walkAndReindex);
                    const updated = { ...obj };
                    if (updated.passageId) updated.passageId = newPassageId;

                    // AVVAL bolalar: ular savol berdimi?
                    //
                    // Ilgari bu yerda oddiy `hasChildren` tekshiruvi turardi va
                    // "bolasi bor ⇒ konteyner" deb qaralardi. Lekin jadval
                    // katakchasida `id` bor-u `parts` faqat MATNDAN iborat
                    // bo'lishi mumkin: u haqiqiy savol (renderer ham,
                    // `getCellQuestions` ham shunday biladi), lekin konteyner
                    // deb hisoblanib QAYTA RAQAMLANMASDI. Birlashtirilgan
                    // testda ikkala manbadagi katakcha ham eski `id` bilan
                    // qolib, savollar bir-birini bosib ketardi — yarmi ball
                    // hisobidan tushib qolardi.
                    const before = assignedNumbers.length;
                    for (const key of CHILD_KEYS) {
                        if (updated[key]) updated[key] = walkAndReindex(updated[key]);
                    }
                    const childrenAssigned = assignedNumbers.length - before;

                    if (updated.id != null && childrenAssigned === 0) {
                        const idStr = String(updated.id);
                        if (/^\d+$/.test(idStr)) {
                            updated.id = String(assign(parseInt(idStr, 10)));
                        } else if (RANGE_ID_RE.test(idStr)) {
                            const parts = idStr.split(/[-–—_]/);
                            const start = parseInt(parts[0], 10);
                            const end = parseInt(parts[1], 10);
                            if (!isNaN(start) && !isNaN(end)) {
                                const lo = Math.min(start, end);
                                const hi = Math.max(start, end);
                                const newIds = [];
                                for (let n = lo; n <= hi; n++) newIds.push(assign(n));
                                const sep = idStr.includes('–') ? '–' : (idStr.includes('—') ? '—' : '-');
                                updated.id = `${newIds[0]}${sep}${newIds[newIds.length - 1]}`;
                            }
                        } else if (LIST_ID_RE.test(idStr)) {
                            updated.id = idStr
                                .split(',')
                                .map(part => String(assign(parseInt(part.trim(), 10))))
                                .join(',');
                        }
                    }

                    return updated;
                };

                const result = walkAndReindex({
                    ...questionGroup,
                    passageId: newPassageId
                });

                // Guruh sarlavhasi/id'si ("Questions 1–6") ham yangi raqamlarga
                // moslashtiriladi — ilgari eski raqamlar qolib ketardi.
                const label = spanLabel(assignedNumbers);
                if (label) {
                    const oldGroupId = String(questionGroup.id ?? "");
                    if (!oldGroupId || /^\d+$/.test(oldGroupId) || RANGE_ID_RE.test(oldGroupId) || LIST_ID_RE.test(oldGroupId)) {
                        result.id = label;
                    }
                    // instruction ichidagi eski raqamlar ("Questions 1–6",
                    // "in boxes 1–6 on your answer sheet") ham yangilanadi
                    const oldGroupNums = (oldGroupId.match(/\d+/g) || []).map(n => parseInt(n, 10));
                    if (oldGroupNums.length === 2 && !numberMap.has(oldGroupNums[0])) {
                        // Guruh id oralig'i item'lar bilan mos kelmasa ham,
                        // chetki raqamlarni yangi oraliqqa bog'laymiz
                        numberMap.set(oldGroupNums[0], Math.min(...assignedNumbers));
                        numberMap.set(oldGroupNums[1], Math.max(...assignedNumbers));
                    }
                    ['instruction', 'instructions'].forEach(field => {
                        if (typeof result[field] === 'string') {
                            result[field] = renumberText(result[field], numberMap);
                        }
                    });
                }

                // keywordTable savol raqamlariga bog'langan — mapping'ni saqlaymiz
                numberMap.forEach((newNum, oldNum) => {
                    keywordNumberMap.set(`${oldPassageId}::${oldNum}`, newNum);
                });

                return result;
            });

            combinedQuestions = [...combinedQuestions, ...mappedQuestions];

            // Keyword jadvali: passageId va questionId yangilanadi
            (sourceTest.keywordTable || [])
                .filter(kw => String(kw.passageId) === oldPassageId)
                .forEach(kw => {
                    const mapped = { ...kw, passageId: newPassageId };
                    const oldQid = parseInt(String(kw.questionId ?? ""), 10);
                    if (Number.isFinite(oldQid)) {
                        const newQid = keywordNumberMap.get(`${oldPassageId}::${oldQid}`);
                        if (newQid != null) mapped.questionId = String(newQid);
                    }
                    combinedKeywords.push(mapped);
                });
        });
    }

    // Manba testlardan saqlanib qoladigan maydonlar
    const difficulties = Array.from(
        new Set(selectedTestObjects.map(t => t?.difficulty).filter(Boolean))
    );

    const merged = {
        title: mergeTitle,
        type: testType,
        difficulty: difficulties.length === 1 ? difficulties[0] : "medium",
        passages: combinedPassages,
        questions: combinedQuestions,
        keywordTable: combinedKeywords,
        writingTasks: combinedWritingTasks,
        isExclusive: selectedTestObjects.some(t => t?.isExclusive) || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (testType === 'listening') {
        // Har bir part o'z audiosini olib qoladi; umumiy audio faqat bitta
        // manba bo'lganda mos keladi.
        const audios = Array.from(
            new Set(selectedTestObjects.map(t => t?.audioUrl || t?.audio_url).filter(Boolean))
        );
        if (audios.length === 1) merged.audioUrl = audios[0];
    }

    return merged;
};

export const MAX_TEST_PARTS = 10;

// Bitta urinishga (full test yoki aniq bir part) tegishli barcha kalitlar.
// Suffiks — full test uchun '', part uchun `_part_N`.
export const testStorageSuffix = (partNumber = null) => (partNumber ? `_part_${partNumber}` : '');

export const clearTestStorage = (userId, testId, partNumber = null, keepHighlightsAndNotes = false) => {
    if (!testId) return;

    const suffix = testStorageSuffix(partNumber);

    // MUHIM: faqat shu urinishning kalitlarini o'chiramiz.
    // Ilgari bu yerda suffikssiz (full test) kalitlar ham so'zsiz o'chirilardi —
    // shu sababli bitta partni topshirish yoki "Start Fresh" qilish to'liq testning
    // javoblarini va vaqtini yo'q qilib yuborardi.
    const clearScope = (scopeSuffix) => {
        // Draft javoblar & rejim (localStorage)
        localStorage.removeItem(`draft_${userId}_${testId}${scopeSuffix}`);
        localStorage.removeItem(`mode_${userId}_${testId}${scopeSuffix}`);
        // Interfeys ichidagi session javoblari (localStorage)
        localStorage.removeItem(`ielts_reading_session_${testId}${scopeSuffix}`);
        localStorage.removeItem(`ielts_writing_session_${testId}${scopeSuffix}`);
        // Taymer (sessionStorage)
        sessionStorage.removeItem(`timer_${userId}_${testId}${scopeSuffix}`);
    };

    // Full test va har bir part — mustaqil urinishlar (alohida taymer, alohida
    // natija). Shuning uchun ular bir-birining holatini tozalamaydi.
    clearScope(suffix);

    if (!keepHighlightsAndNotes) {
        if (partNumber) {
            // Part rejimida faqat shu passage/part holatini tozalaymiz —
            // umumiy highlight/notes bloblari full testga ham tegishli.
            const idx = partNumber - 1;
            localStorage.removeItem(`reading_session_${testId}_passage_${idx}`);
            sessionStorage.removeItem(`listening_hl_${testId}_p${idx}`);
        } else {
            localStorage.removeItem(`reading_rp_hl_${testId}`);
            localStorage.removeItem(`reading_highlights_${testId}`);
            localStorage.removeItem(`reading_notes_${testId}`);

            for (let i = 0; i <= MAX_TEST_PARTS; i++) {
                localStorage.removeItem(`reading_session_${testId}_passage_${i}`);
                sessionStorage.removeItem(`listening_hl_${testId}_p${i}`);
            }
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

    let items = test.questions || test.sections;

    // USTUVORLIK: kontent → saqlangan son → taxmin.
    //
    // Ilgari saqlangan `totalQuestions` kontentdan USTUN turardi va hisob
    // umuman bajarilmasdi — test tahrirlangandan keyin eskirgan son ko'rinib
    // qolardi. Kontent bor bo'lsa, haqiqat o'sha.
    if (partNum == null && Number(test.totalQuestions) > 0 && (!items || !Array.isArray(items))) {
        return Number(test.totalQuestions);
    }

    if (!items || !Array.isArray(items)) {
        // ⚠️ TAXMIN. Bu yerga faqat `questions` ham, saqlangan `totalQuestions`
        // ham bo'lmaganda tushiladi — ya'ni `totalQuestions` maydoni
        // qo'shilishidan OLDIN yozilgan eski `tests_metadata` hujjatlari uchun.
        // Yangi va tahrirlangan testlarda bu yo'l ishlamaydi.
        // Eski hujjatlarni to'ldirish uchun: `npm run backfill:question-counts`.
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

    // Savol raqamlarini yig'ish qoidasi `ieltsScoring.collectQuestionNumbers` da —
    // `evaluateTest` bilan AYNI daraxt yuruvchisi. Ilgari bu yerda alohida yuruvchi
    // bor edi va u `parts` / `content` / `cells` / `sections` ga kirmasdi: jadval
    // ichidagi va aralash katakchadagi savollar kartochkadagi songa kirmay,
    // "39 ta savol" ko'rinardi — ball esa 40 tadan hisoblanardi.
    const ids = collectQuestionNumbers({ questions: items });

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

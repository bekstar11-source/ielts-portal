/**
 * TestDoctor — test JSON'i ustida ishlaydigan yordamchi vositalar:
 *  · jsonOffsetForPath — validatsiya xatosini JSON matnidagi aniq joyiga bog'laydi
 *  · autoFixTest       — mexanik xatolarni (ID, javob formati, passageId) avtomatik tuzatadi
 *  · buildAnswerKey    — 40 ta javobni bitta ro'yxatga yig'adi
 *  · applyAnswerMap    — tashqaridan kiritilgan javoblarni JSON'ga tarqatadi
 */
import { isNonScoredItem } from "./TestValidator";

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

/* ------------------------------------------------------------------ */
/*  JSON matnida yo'l (path) bo'yicha offset topish                    */
/* ------------------------------------------------------------------ */

// path: ['questions', 2, 'items', 5] → matndagi belgi indeksi (topilmasa null)
export function jsonOffsetForPath(text, path) {
    if (!text || !Array.isArray(path) || path.length === 0) return null;

    let i = 0;
    const n = text.length;

    const ws = () => { while (i < n && /\s/.test(text[i])) i++; };

    const skipString = () => {
        i++; // ochuvchi "
        while (i < n) {
            if (text[i] === '\\') { i += 2; continue; }
            if (text[i] === '"') { i++; return; }
            i++;
        }
    };

    const skipContainer = () => {
        const open = text[i];
        const close = open === '{' ? '}' : ']';
        let depth = 0;
        while (i < n) {
            const c = text[i];
            if (c === '"') { skipString(); continue; }
            if (c === open) { depth++; i++; continue; }
            if (c === close) { depth--; i++; if (depth === 0) return; continue; }
            i++;
        }
    };

    const skipValue = () => {
        ws();
        const c = text[i];
        if (c === '"') return skipString();
        if (c === '{' || c === '[') return skipContainer();
        while (i < n && !/[,\]}\s]/.test(text[i])) i++;
    };

    const seek = (segs) => {
        ws();
        if (segs.length === 0) return i;
        const key = segs[0];
        const rest = segs.slice(1);

        if (typeof key === 'string') {
            if (text[i] !== '{') return -1;
            i++;
            while (i < n) {
                ws();
                if (text[i] === '}') return -1;
                if (text[i] !== '"') return -1;
                const ks = i;
                skipString();
                let name;
                try { name = JSON.parse(text.slice(ks, i)); } catch { return -1; }
                ws();
                if (text[i] !== ':') return -1;
                i++;
                if (name === key) return seek(rest);
                skipValue();
                ws();
                if (text[i] === ',') { i++; continue; }
                return -1;
            }
            return -1;
        }

        if (text[i] !== '[') return -1;
        i++;
        let idx = 0;
        while (i < n) {
            ws();
            if (text[i] === ']') return -1;
            if (idx === key) return seek(rest);
            skipValue();
            ws();
            if (text[i] === ',') { i++; idx++; continue; }
            return -1;
        }
        return -1;
    };

    const offset = seek(path);
    return offset >= 0 ? offset : null;
}

export const lineOfOffset = (text, offset) =>
    text.slice(0, offset).split("\n").length;

/* ------------------------------------------------------------------ */
/*  Umumiy yordamchilar                                                */
/* ------------------------------------------------------------------ */

const ANSWER_KEYS = ['answer', 'correct_answer', 'correctAnswer', 'correct_answer_value'];

export const readAnswer = (q) => {
    for (const k of ANSWER_KEYS) {
        if (q[k] !== undefined && q[k] !== null && String(q[k]).trim() !== '') return q[k];
    }
    return undefined;
};

const writeAnswer = (q, value) => {
    const existing = ANSWER_KEYS.filter(k => q[k] !== undefined);
    if (existing.length === 0) { q.answer = value; return; }
    existing.forEach(k => { q[k] = value; });
};

const groupKind = (type) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('true') || t.includes('tfng')) return 'tfng';
    if (t.includes('yes_no') || t.includes('ynng')) return 'ynng';
    if (t.includes('multiple') || t.includes('choice') || t.includes('mcq')) return 'mcq';
    return 'other';
};

// Guruhlar → ichidagi baholanadigan savollar (tartib bo'yicha)
export function collectScoredItems(questions) {
    const out = [];
    (questions || []).forEach((group, gIdx) => {
        const push = (container, containerKey, extra = []) => {
            (container || []).forEach((q, iIdx) => {
                if (isNonScoredItem(q, iIdx)) return;
                out.push({ q, group, gIdx, path: ['questions', gIdx, ...extra, containerKey, iIdx] });
            });
        };
        if (group.items) push(group.items, 'items');
        else if (group.questions) push(group.questions, 'questions');
        if (Array.isArray(group.groups)) {
            group.groups.forEach((sub, sIdx) => {
                if (sub.items) push(sub.items, 'items', ['groups', sIdx]);
                else if (sub.questions) push(sub.questions, 'questions', ['groups', sIdx]);
            });
        }
    });
    return out;
}

const optionLabelOf = (opt, idx) => {
    if (opt && typeof opt === 'object') return String(opt.label || LETTERS[idx] || '').toUpperCase().trim();
    const str = String(opt || '').trim();
    const m = str.match(/^([A-Za-z])[.)\s]/);
    return m ? m[1].toUpperCase() : (LETTERS[idx] || 'A');
};

const optionTextOf = (opt) => {
    if (opt && typeof opt === 'object') return String(opt.text || '').toUpperCase().trim();
    const str = String(opt || '').trim();
    const m = str.match(/^[A-Za-z][.)\s]\s*(.*)$/);
    return (m ? m[1] : str).toUpperCase().trim();
};

/* ------------------------------------------------------------------ */
/*  AVTO-TUZATISH                                                      */
/* ------------------------------------------------------------------ */

export const FIX_DEFS = [
    // renumber sukut bo'yicha o'chiq: faqat bitta passage ustida ishlanayotgan bo'lsa
    // (masalan savollar 14 dan boshlansa) qayta raqamlash testni buzib qo'yadi.
    { key: 'renumber', label: "Savol raqamlarini qayta tartiblash", hint: "1 dan boshlab ketma-ket ID beriladi — to'liq testda ishlating", defaultOn: false },
    { key: 'trimAnswers', label: "Javoblardagi ortiqcha bo'shliqlarni olib tashlash", hint: "Bosh/oxirgi bo'shliq va ikki karra probel", defaultOn: true },
    { key: 'normalizeTFNG', label: "TRUE/FALSE/NOT GIVEN javoblarini to'g'rilash", hint: "T, f, not_given → TRUE, FALSE, NOT GIVEN", defaultOn: true },
    { key: 'mcqLetters', label: "Multiple choice javoblarini harfga keltirish", hint: "\"B) London\" → \"B\"", defaultOn: true },
    { key: 'passageIds', label: "Yetishmayotgan passageId'larni biriktirish", hint: "Savol raqamiga qarab mos passage tanlanadi", defaultOn: true },
];

const passageIndexForQuestionId = (num, type, passageCount) => {
    if (!num || !Number.isFinite(num)) return null;
    if (type === 'listening') {
        const idx = num <= 10 ? 0 : num <= 20 ? 1 : num <= 30 ? 2 : 3;
        return Math.min(idx, passageCount - 1);
    }
    const idx = num <= 13 ? 0 : num <= 26 ? 1 : 2;
    return Math.min(idx, passageCount - 1);
};

/**
 * @param {object} parsed  JSON.parse(jsonInput) natijasi
 * @param {object} opts    { type, enabled: {fixKey: bool} }
 * @returns {{ result: object, changes: Array<{key,label,count,samples:string[]}> }}
 */
export function autoFixTest(parsed, { type = 'reading', enabled = null } = {}) {
    const data = JSON.parse(JSON.stringify(parsed || {}));
    const on = (key) => (enabled ? !!enabled[key] : true);
    const changes = [];
    const record = (key, label, sample) => {
        let entry = changes.find(c => c.key === key);
        if (!entry) { entry = { key, label, count: 0, samples: [] }; changes.push(entry); }
        entry.count++;
        if (entry.samples.length < 4 && sample) entry.samples.push(sample);
    };

    const scored = collectScoredItems(data.questions);

    // 1. Ketma-ket raqamlash
    if (on('renumber')) {
        scored.forEach(({ q }, i) => {
            const next = i + 1;
            const current = q.id;
            if (String(current ?? '') !== String(next)) {
                record('renumber', "Savol raqamlari", `${current ?? '—'} → ${next}`);
                q.id = next;
            }
        });
    }

    // 2–4. Javoblar ustida ishlash
    scored.forEach(({ q, group }) => {
        const kind = groupKind(group.type);
        let answer = readAnswer(q);
        if (answer === undefined) return;

        if (on('trimAnswers') && typeof answer === 'string') {
            const cleaned = answer.replace(/\s+/g, ' ').trim();
            if (cleaned !== answer) {
                record('trimAnswers', "Bo'shliqlar tozalandi", `"${answer}" → "${cleaned}"`);
                writeAnswer(q, cleaned);
                answer = cleaned;
            }
        }

        if (on('normalizeTFNG') && (kind === 'tfng' || kind === 'ynng') && typeof answer === 'string') {
            const raw = answer.toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
            const map = kind === 'tfng'
                ? { T: 'TRUE', TRUE: 'TRUE', F: 'FALSE', FALSE: 'FALSE', NG: 'NOT GIVEN', 'NOT GIVEN': 'NOT GIVEN', NOTGIVEN: 'NOT GIVEN' }
                : { Y: 'YES', YES: 'YES', N: 'NO', NO: 'NO', NG: 'NOT GIVEN', 'NOT GIVEN': 'NOT GIVEN', NOTGIVEN: 'NOT GIVEN' };
            const fixed = map[raw];
            if (fixed && fixed !== answer) {
                record('normalizeTFNG', "TFNG/YNNG javoblari", `${q.id ?? '?'}: "${answer}" → "${fixed}"`);
                writeAnswer(q, fixed);
                answer = fixed;
            }
        }

        if (on('mcqLetters') && kind === 'mcq' && typeof answer === 'string') {
            const options = (Array.isArray(q.options) && q.options) || (Array.isArray(group.options) && group.options) || [];
            if (options.length) {
                const labels = options.map(optionLabelOf);
                const texts = options.map(optionTextOf);
                const upper = answer.toUpperCase().trim();
                let fixed = null;
                const prefix = upper.match(/^([A-Z])[.)\s]/);
                if (prefix && labels.includes(prefix[1])) fixed = prefix[1];
                else if (!labels.includes(upper)) {
                    const byText = texts.findIndex(t => t && t === upper.replace(/^[A-Z][.)\s]\s*/, ''));
                    if (byText >= 0) fixed = labels[byText];
                }
                if (fixed && fixed !== answer) {
                    record('mcqLetters', "Multiple choice javoblari", `${q.id ?? '?'}: "${answer}" → "${fixed}"`);
                    writeAnswer(q, fixed);
                }
            }
        }
    });

    // 5. passageId biriktirish
    if (on('passageIds') && Array.isArray(data.passages) && data.passages.length > 0) {
        const validIds = data.passages.map(p => String(p?.id));
        (data.questions || []).forEach((group, gIdx) => {
            const pid = group.passageId;
            const missing = pid === undefined || pid === null || pid === '';
            const invalid = !missing && !validIds.includes(String(pid));
            if (!missing && !invalid) return;

            const ids = collectScoredItems([group])
                .map(({ q }) => parseInt(String(q.id).match(/\d+/)?.[0], 10))
                .filter(Number.isFinite);
            if (ids.length === 0) return;

            const idx = passageIndexForQuestionId(Math.min(...ids), type, data.passages.length);
            if (idx === null || !data.passages[idx]) return;
            const newId = data.passages[idx].id;
            if (newId === undefined || newId === null) return;

            record('passageIds', "passageId biriktirildi", `Guruh #${gIdx + 1}: ${missing ? "yo'q" : pid} → ${newId}`);
            group.passageId = newId;
        });
    }

    return { result: data, changes };
}

/* ------------------------------------------------------------------ */
/*  JAVOBLAR KALITI                                                    */
/* ------------------------------------------------------------------ */

export function buildAnswerKey(testData) {
    const rows = collectScoredItems(testData?.questions).map(({ q, group, path }) => ({
        id: q.id,
        answer: readAnswer(q),
        type: group.type || '',
        path
    }));

    const seen = new Map();
    rows.forEach(r => seen.set(String(r.id), (seen.get(String(r.id)) || 0) + 1));

    return rows.map(r => ({
        ...r,
        missing: r.answer === undefined || String(r.answer).trim() === '',
        duplicate: !!r.id && seen.get(String(r.id)) > 1
    }));
}

/* ------------------------------------------------------------------ */
/*  JAVOBLARNI OMMAVIY KIRITISH                                        */
/* ------------------------------------------------------------------ */

// "1. TRUE", "2) glass", "3 - museum", "4: A" yoki raqamsiz qatorlar
export function parseAnswerText(raw) {
    const entries = [];
    const lines = String(raw || '')
        .split(/[\n;]+/)
        .map(l => l.trim())
        .filter(Boolean);

    let autoIndex = 0;
    lines.forEach(line => {
        const m = line.match(/^(\d{1,3})\s*[.):\-–]?\s+(.+)$/) || line.match(/^(\d{1,3})\s*[.):\-–]\s*(.+)$/);
        if (m) {
            entries.push({ id: Number(m[1]), answer: m[2].replace(/\s+/g, ' ').trim() });
        } else {
            autoIndex++;
            entries.push({ id: null, answer: line.replace(/\s+/g, ' ').trim(), auto: autoIndex });
        }
    });

    // Hech qaysi qatorda raqam bo'lmasa — tartib bo'yicha 1..N deb qabul qilamiz
    if (entries.length && entries.every(e => e.id === null)) {
        entries.forEach((e, i) => { e.id = i + 1; });
    }
    return entries.filter(e => e.id !== null && e.answer);
}

// Kiritilgan javoblarni parsed JSON'ga qo'llaydi
export function applyAnswerEntries(parsed, entries) {
    const data = JSON.parse(JSON.stringify(parsed || {}));
    const scored = collectScoredItems(data.questions);
    const byId = new Map();
    scored.forEach(({ q }) => { if (q.id !== undefined && q.id !== null) byId.set(String(q.id), q); });

    const applied = [];
    const skipped = [];
    entries.forEach(({ id, answer }) => {
        const q = byId.get(String(id));
        if (!q) { skipped.push(id); return; }
        const before = readAnswer(q);
        if (String(before ?? '') === answer) return;
        writeAnswer(q, answer);
        applied.push({ id, before, after: answer });
    });

    return { result: data, applied, skipped };
}

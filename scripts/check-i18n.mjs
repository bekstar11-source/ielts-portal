#!/usr/bin/env node
/**
 * Tarjima kalitlarini tekshiradi: kodda chaqirilgan har bir `t('...')`
 * `src/locales/translations.js` da haqiqatan bormi?
 *
 * NEGA KERAK: `t()` topilmagan kalit uchun KALIT YO'LINING O'ZINI qaytaradi.
 * Ya'ni noto'g'ri yozilgan kalit hech qanday xato bermaydi — u shunchaki
 * ekranda "teacher.results.colDate" bo'lib ko'rinadi va buni faqat o'sha
 * sahifani ochgan odam sezadi. Bir vaqtlar o'qituvchi panelida 100+ shunday
 * matn to'planib qolgan edi.
 *
 * Ishlatish:
 *   npm run check:i18n              # butun src/
 *   npm run check:i18n -- src/pages/teacher
 *
 * Chiqish kodi: xato topilsa 1, aks holda 0 (CI uchun).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRANSLATIONS_FILE = path.join(ROOT, 'src/locales/translations.js');

const { translations } = await import(new URL('../src/locales/translations.js', import.meta.url));

/** Tarjimalar mavjud bo'lgan tillar; birinchisi — asosiy (zaxira) til. */
const [BASE_LANG, ...OTHER_LANGS] = Object.keys(translations);

// ── Fayllarni yig'ish ───────────────────────────────────────────────────────

const SOURCE_EXT = new Set(['.js', '.jsx']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git']);

function collectFiles(target, acc = []) {
    const stat = fs.statSync(target);
    if (stat.isFile()) {
        if (SOURCE_EXT.has(path.extname(target)) && path.resolve(target) !== TRANSLATIONS_FILE) acc.push(target);
        return acc;
    }
    for (const entry of fs.readdirSync(target)) {
        if (SKIP_DIRS.has(entry)) continue;
        collectFiles(path.join(target, entry), acc);
    }
    return acc;
}

// ── `t(...)` chaqiruvlarini ajratish ────────────────────────────────────────

const IDENT_CHAR = /[A-Za-z0-9_$.]/;

/**
 * `open` — ochiluvchi qavs indeksi. Qavslar va satrlarni hisobga olib,
 * yopiluvchi qavs indeksini qaytaradi (topilmasa -1).
 *
 * Sanoq ataylab CHAQIRUV JOYIDAN boshlanadi: fayl bo'ylab yagona o'tish
 * qilib bo'lmaydi, chunki o'zbekcha matnlardagi apostrof ("o'quvchi") JSX
 * ichida satr ochilgandek ko'rinadi va butun hisobni chalg'itadi.
 */
function findClosingParen(src, open) {
    let depth = 0;
    let quote = null;
    for (let i = open; i < src.length; i++) {
        const ch = src[i];
        if (quote) {
            if (ch === '\\') i++;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
        if (ch === '(') depth++;
        else if (ch === ')') { depth--; if (depth === 0) return i; }
    }
    return -1;
}

/**
 * Chaqiruvdan keyin `.replace(` keladimi — ya'ni o'rin egallari qo'lda
 * to'ldiriladimi. Kodda ko'p uchraydigan
 *   `(t('kalit') || 'zaxira').replace('{n}', n)`
 * shaklida nuqta `t(...)` dan emas, uni O'RAB turgan qavsdan keyin keladi,
 * shuning uchun bir necha daraja tashqariga chiqib ham qaraymiz.
 */
function followedByReplace(src, callIndex) {
    let start = callIndex;
    for (let level = 0; level < 5; level++) {
        const close = findClosingParen(src, src.indexOf('(', start));
        if (close === -1) return false;
        let j = close + 1;
        while (j < src.length && /\s/.test(src[j])) j++;
        if (src.startsWith('.replace(', j)) return true;

        // Bir daraja tashqariga: chaqiruvdan oldin darhol `(` turibdimi?
        let k = start - 1;
        while (k >= 0 && /\s/.test(src[k])) k--;
        if (src[k] !== '(') return false;
        start = k;
    }
    return false;
}

/**
 * O'rin egallarini o'zi to'ldiradigan yordamchi funksiyalar:
 * `fill(t('kalit'), { count })` ham `.replace` bilan bir xil ma'noni beradi.
 * Yangi shunday yordamchi paydo bo'lsa — nomini shu yerga qo'shish kifoya.
 */
const FORMATTER_WRAPPERS = new Set(['fill', 'format', 'interpolate']);

/** Chaqiruv `fill(...)` kabi formatlovchi funksiya ichidami. */
function wrappedByFormatter(src, callIndex) {
    let k = callIndex - 1;
    while (k >= 0 && /\s/.test(src[k])) k--;
    if (src[k] !== '(') return false;
    k--;
    while (k >= 0 && /\s/.test(src[k])) k--;
    let end = k;
    while (k >= 0 && /[A-Za-z0-9_$]/.test(src[k])) k--;
    return FORMATTER_WRAPPERS.has(src.slice(k + 1, end + 1));
}

/** Argumentlar matnini yuqori darajadagi vergullar bo'yicha bo'ladi. */
function splitArgs(argsText) {
    const parts = [];
    let depth = 0;
    let quote = null;
    let current = '';
    for (let i = 0; i < argsText.length; i++) {
        const ch = argsText[i];
        if (quote) {
            current += ch;
            if (ch === '\\') { current += argsText[++i] ?? ''; }
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === "'" || ch === '"' || ch === '`') { quote = ch; current += ch; continue; }
        if ('([{'.includes(ch)) depth++;
        else if (')]}'.includes(ch)) depth--;
        if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue; }
        current += ch;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

/**
 * Izoh bo'lgan qatorlar (1 dan boshlab indekslanadi).
 *
 * Izohlardagi namunalar ham `t('a.b')` ko'rinishida yozilgani uchun ular
 * tekshiruvga tushmasligi kerak — aks holda hujjatdagi misol "yo'q kalit"
 * bo'lib hisobotni ifloslantiradi.
 */
function commentLines(src) {
    const marked = new Set();
    let inBlock = false;
    src.split('\n').forEach((raw, index) => {
        const line = raw.trim();
        if (inBlock) {
            marked.add(index + 1);
            if (line.includes('*/')) inBlock = false;
            return;
        }
        if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*') || line.startsWith('{/*')) {
            marked.add(index + 1);
            if ((line.startsWith('/*') || line.startsWith('{/*')) && !line.includes('*/')) inBlock = true;
        }
    });
    return marked;
}

/** Fayldagi `const NAME = 'qiymat';` juftliklari — shablon kalitlar uchun. */
function collectStringConsts(src) {
    const map = new Map();
    for (const m of src.matchAll(/\b(?:const|let|var)\s+(\w+)\s*=\s*(['"])((?:\\.|(?!\2).)*)\2\s*;/g)) {
        map.set(m[1], m[3]);
    }
    return map;
}

/**
 * Birinchi argumentdan kalit yo'lini oladi.
 * `'a.b'` → "a.b";  `` `${cw}.title` `` → const qiymati bilan yechiladi.
 * Yechib bo'lmasa `null`.
 */
function readKey(arg, consts) {
    const quoted = arg.match(/^(['"])((?:\\.|(?!\1).)*)\1$/);
    if (quoted) return quoted[2];

    const template = arg.match(/^`([^`]*)`$/);
    if (!template) return null;

    let out = template[1];
    let resolved = true;
    out = out.replace(/\$\{([^}]+)\}/g, (_, expr) => {
        const name = expr.trim();
        if (consts.has(name)) return consts.get(name);
        resolved = false;
        return '';
    });
    return resolved ? out : null;
}

const isStringLiteral = (arg) => /^(['"`])/.test(arg || '');
const isObjectLiteral = (arg) => (arg || '').startsWith('{');

/** Obyekt literalidan yuqori darajadagi kalit nomlari. */
function objectKeys(arg) {
    const inner = arg.slice(1, -1);
    return new Set([...splitArgs(inner)].map((pair) => pair.split(':')[0].trim().replace(/^\.\.\./, '')));
}

function resolveKey(root, keys) {
    let current = root;
    for (const key of keys) {
        if (current === null || current === undefined || current[key] === undefined) return undefined;
        current = current[key];
    }
    return current;
}

// ── Tekshiruv ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const errorsOnly = argv.includes('--errors-only');
const targets = argv.filter((a) => !a.startsWith('-'));
const roots = targets.length ? targets : ['src'];

const problems = [];   // { file, line, level, key, message }
let callCount = 0;

for (const root of roots) {
    for (const file of collectFiles(path.resolve(ROOT, root))) {
        const src = fs.readFileSync(file, 'utf8');
        if (!src.includes('t(')) continue;

        const consts = collectStringConsts(src);
        const comments = commentLines(src);
        const rel = path.relative(ROOT, file);
        const lineAt = (index) => src.slice(0, index).split('\n').length;
        const add = (index, level, key, message) => problems.push({
            file: rel, line: lineAt(index), level, key, message,
        });

        for (let i = 0; i < src.length - 1; i++) {
            if (src[i] !== 't' || src[i + 1] !== '(') continue;
            if (i > 0 && IDENT_CHAR.test(src[i - 1])) continue;
            if (comments.has(lineAt(i))) continue;

            const close = findClosingParen(src, i + 1);
            if (close === -1) continue;

            const args = splitArgs(src.slice(i + 2, close));
            const key = readKey(args[0], consts);
            if (key === null) {
                // Faqat haqiqiy shablon kalitlar haqida ogohlantiramiz.
                if (args[0]?.startsWith('`')) add(i, 'warn', args[0], "kalitni statik aniqlab bo'lmadi");
                continue;
            }
            if (!key.includes('.')) continue;   // `t(someVar)` yoki tarjima bo'lmagan chaqiruv
            callCount++;

            const hasFallback = isStringLiteral(args[1]);
            const paramsArg = isObjectLiteral(args[1]) ? args[1] : (isObjectLiteral(args[2]) ? args[2] : null);
            const manualReplace = followedByReplace(src, i) || wrappedByFormatter(src, i);

            const parts = key.split('.');
            const baseValue = resolveKey(translations[BASE_LANG], parts);

            if (baseValue === undefined) {
                if (hasFallback) add(i, 'warn', key, `${BASE_LANG} tarjimasi yo'q (zaxira matn ishlatilmoqda)`);
                else add(i, 'error', key, `${BASE_LANG} tarjimasi yo'q — ekranda kalit yo'li chiqadi`);
                continue;
            }

            if (typeof baseValue !== 'string') {
                if (Array.isArray(baseValue)) continue;   // massivlar ataylab olinadi
                add(i, 'error', key, 'kalit matn emas, bo\'lim (obyekt) — ekranga chiqarib bo\'lmaydi');
                continue;
            }

            const placeholders = [...baseValue.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
            if (placeholders.length && !manualReplace) {
                const given = paramsArg ? objectKeys(paramsArg) : new Set();
                const missing = placeholders.filter((p) => !given.has(p));
                if (missing.length) {
                    add(i, 'error', key, `o'rin egallari to'ldirilmagan: ${missing.map((p) => `{${p}}`).join(', ')}`);
                }
            }

            for (const lang of OTHER_LANGS) {
                if (resolveKey(translations[lang], parts) === undefined) {
                    add(i, 'warn', key, `${lang} tarjimasi yo'q (${BASE_LANG} matni ko'rinadi)`);
                }
            }
        }
    }
}

// ── Hisobot ────────────────────────────────────────────────────────────────

const errors = problems.filter((p) => p.level === 'error');
const warnings = problems.filter((p) => p.level === 'warn');

const shown = errorsOnly ? errors : problems;

const byFile = new Map();
for (const p of shown) {
    if (!byFile.has(p.file)) byFile.set(p.file, []);
    byFile.get(p.file).push(p);
}

for (const [file, list] of [...byFile.entries()].sort()) {
    console.log(`\n${file}`);
    for (const p of list.sort((a, b) => a.line - b.line)) {
        const mark = p.level === 'error' ? '✗' : '!';
        console.log(`  ${mark} ${String(p.line).padStart(4)}  ${p.key}  —  ${p.message}`);
    }
}

console.log(
    `\n${callCount} ta tarjima chaqiruvi tekshirildi` +
    ` · ${errors.length} xato · ${warnings.length} ogohlantirish`
);

process.exit(errors.length ? 1 : 0);

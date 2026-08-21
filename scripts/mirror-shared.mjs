// scripts/mirror-shared.mjs
//
// `src/utils/` dagi ba'zi fayllar serverda ham AYNAN bir xil ishlashi shart:
// savol turlarini kanonik nomga keltirish va xato sababini aniqlash. Agar klient
// va server tasnifi bir-biridan siljisa, yig'ilgan statistika ikkiga bo'linadi —
// o'quvchi bir xil savol turini ikki xil qator sifatida ko'radi.
//
// `functions/` CommonJS, `src/` esa ESM. Shu sabab nusxa qo'lda ko'chirilardi va
// tabiiyki eskirardi. Bu skript nusxani generatsiya qiladi:
//
//   npm run mirror
//
// Fayllarni QO'LDA tahrirlash kerak emas — klient faylini o'zgartiring va
// skriptni qayta ishga tushiring. `--check` bayrog'i bilan nusxa eskirganini
// tekshiradi (CI uchun) va o'zgartirish kiritmaydi.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Nusxalanadigan fayllar: `src/utils/<name>` → `functions/<name>`. */
const MIRRORED = [
  // Ball hisobi. Server (`submitTestAnswers`, `submitMockExam`, `trial`) ball
  // qo'yadi, klient esa AYNI shu fayl bilan review chizadi. Ikkisi siljisa,
  // talaba review'da yashil ✓ ko'rib, ball olmaydi — portaldagi eng qimmat bug.
  'ieltsScoring.js',
  'questionTypes.js',
  'mistakePatterns.js',
  'isoWeek.js',
  'writingErrors.js',
  'timingAnalysis.js'
];

const BANNER = (name) =>
  `// functions/${name}\n` +
  `//\n` +
  `// ⚠️ AVTOMATIK NUSXA — QO'LDA TAHRIRLAMANG.\n` +
  `// Manba: src/utils/${name}. O'zgartirish kiritish uchun o'sha faylni tahrirlang\n` +
  `// va \`npm run mirror\` ni ishga tushiring.\n`;

/**
 * ESM manbani CommonJS ga o'giradi.
 *
 * Ataylab to'liq transpiler emas: nusxalanadigan fayllar sof yordamchi modullar
 * (default export yo'q, dinamik import yo'q). Kutilmagan konstruksiya uchrasa,
 * jim o'girish o'rniga xato beriladi — sekin siljigan buzuq nusxadan ko'ra
 * to'xtab qolgan build yaxshi.
 */
function toCommonJs(source, name) {
  if (/export\s+default/.test(source)) {
    throw new Error(`${name}: "export default" nusxalashda qo'llab-quvvatlanmaydi.`);
  }

  // Manba faylining birinchi qatoridagi yo'l izohi ("// src/utils/x.js") nusxada
  // noto'g'ri manzilni ko'rsatardi — banner uni allaqachon aytib turibdi.
  let out = source.replace(new RegExp(`^// src/utils/${name}\\n`), '');

  // `import { a, b } from './x';` → `const { a, b } = require("./x");`
  out = out.replace(
    /^import\s+\{([^}]+)\}\s+from\s+['"](\.[^'"]+)['"];?$/gm,
    (_, names, from) => `const {${names}} = require("${from}");`
  );

  const leftoverImport = out.match(/^\s*import\s.+$/m);
  if (leftoverImport) {
    throw new Error(`${name}: o'girib bo'lmaydigan import — ${leftoverImport[0].trim()}`);
  }

  // Eksport nomlarini yig'amiz va `export ` prefiksini olib tashlaymiz.
  const exported = [];
  out = out.replace(/^export\s+(const|let|function)\s+([A-Za-z0-9_$]+)/gm, (_, kind, id) => {
    exported.push(id);
    return `${kind} ${id}`;
  });

  if (exported.length === 0) {
    throw new Error(`${name}: eksport topilmadi — nusxa bo'sh bo'lib qolardi.`);
  }

  return `${BANNER(name)}\n${out.trimEnd()}\n\nmodule.exports = { ${exported.join(', ')} };\n`;
}

const check = process.argv.includes('--check');
let stale = 0;

for (const name of MIRRORED) {
  const src = path.join(ROOT, 'src', 'utils', name);
  const dest = path.join(ROOT, 'functions', name);

  const generated = toCommonJs(readFileSync(src, 'utf8'), name);
  let current = null;
  try {
    current = readFileSync(dest, 'utf8');
  } catch {
    /* nusxa hali yo'q */
  }

  if (current === generated) {
    console.log(`✓ functions/${name} — dolzarb`);
    continue;
  }

  if (check) {
    console.error(`✗ functions/${name} — eskirgan. \`npm run mirror\` ni ishga tushiring.`);
    stale += 1;
    continue;
  }

  writeFileSync(dest, generated);
  console.log(`→ functions/${name} — yangilandi`);
}

if (stale > 0) process.exit(1);

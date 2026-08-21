// scripts/backfill-question-counts.mjs
//
// `tests_metadata` hujjatlarida savollar soni SAQLANMAGAN edi. Kartochkalar
// esa uni ko'rsatishi kerak, shuning uchun `getActualQuestionCount` sarlavhaga
// qarab TAXMIN qilardi:
//
//     title.includes('full') ? 40 : 13
//
// Ya'ni o'quvchi ko'rgan "13 ta savol" yozuvi haqiqiy son emas edi. Bundan
// tashqari o'sha son testlarni "full" va "part" ro'yxatlariga ajratishda ham
// ishlatiladi (`> 14`), ya'ni taxmin filtrga ham ta'sir qilardi.
//
// Endi `useTestEditor.compileMetadata` sonni saqlash paytida yozadi. Bu skript
// esa ALLAQACHON mavjud hujjatlarni to'ldiradi: har bir `tests` hujjatidagi
// savollarni sanab, mos `tests_metadata` hujjatiga `totalQuestions` yozadi.
//
//   # A varianti (gcloud bor bo'lsa):
//   export GCLOUD_ACCESS_TOKEN=$(gcloud auth print-access-token)
//   # B varianti (service-account kaliti bilan):
//   export GOOGLE_APPLICATION_CREDENTIALS=/yo'l/serviceAccountKey.json
//
//   npm run backfill:question-counts -- --dry-run   # NIMA o'zgarishini ko'rish
//   npm run backfill:question-counts                # yozish
//
// ⚠️ `--dry-run` SIZ ishga tushirilganda hujjatlarga YOZADI. Avval quruq
// yurishni ko'rib chiqing.

import { createRequire } from 'node:module';
import { collectQuestionNumbers } from '../src/utils/ieltsScoring.js';

const PROJECT = 'ielts-portal-v1';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const DRY = process.argv.includes('--dry-run');

async function getToken() {
  if (process.env.GCLOUD_ACCESS_TOKEN) return process.env.GCLOUD_ACCESS_TOKEN;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const require = createRequire(new URL('../functions/package.json', import.meta.url));
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/datastore'] });
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();
    if (token) return token;
  }
  console.error('Autentifikatsiya topilmadi. Quyidagilardan birini bajaring:');
  console.error('  export GCLOUD_ACCESS_TOKEN=$(gcloud auth print-access-token)');
  console.error("  export GOOGLE_APPLICATION_CREDENTIALS=/yo'l/serviceAccountKey.json");
  process.exit(1);
}

const unpack = (v) => {
  if (!v || typeof v !== 'object') return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(unpack);
  if (v.mapValue !== undefined) {
    const out = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = unpack(val);
    return out;
  }
  return null;
};

async function api(token, path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);
  return res.json();
}

async function* allDocs(token, collectionName) {
  let pageToken;
  do {
    const q = new URLSearchParams({ pageSize: '50' });
    if (pageToken) q.set('pageToken', pageToken);
    const page = await api(token, `/${collectionName}?${q}`);
    for (const doc of page.documents || []) yield doc;
    pageToken = page.nextPageToken;
  } while (pageToken);
}

async function run() {
  const token = await getToken();

  // 1) Har bir testdagi haqiqiy savollar sonini hisoblaymiz.
  const counts = new Map();
  let scanned = 0;
  for await (const doc of allDocs(token, 'tests')) {
    const id = doc.name.split('/').pop();
    const questions = unpack(doc.fields?.questions);
    if (!Array.isArray(questions)) continue;
    scanned += 1;
    const n = collectQuestionNumbers({ questions }).size;
    if (n > 0) counts.set(id, n);
  }
  console.log(`\n\`tests\` skanerlandi: ${scanned} | savollari sanaldi: ${counts.size}\n`);

  // 2) Mos `tests_metadata` hujjatlarini yangilaymiz.
  let written = 0, already = 0, missing = 0, wrong = 0;
  for await (const doc of allDocs(token, 'tests_metadata')) {
    const id = doc.name.split('/').pop();
    const real = counts.get(id);
    if (real === undefined) { missing += 1; continue; }

    const stored = unpack(doc.fields?.totalQuestions);
    if (stored === real) { already += 1; continue; }
    if (stored != null && stored !== real) {
      wrong += 1;
      console.log(`  ~ ${id}: saqlangan ${stored} → haqiqiy ${real}`);
    } else {
      console.log(`  + ${id}: ${real}`);
    }

    if (!DRY) {
      await api(token, `/tests_metadata/${id}?updateMask.fieldPaths=totalQuestions`, {
        method: 'PATCH',
        body: JSON.stringify({ fields: { totalQuestions: { integerValue: String(real) } } })
      });
    }
    written += 1;
  }

  console.log(`\n${DRY ? '[QURUQ YURISH — hech nima yozilmadi]' : '[YOZILDI]'}`);
  console.log(`  yangilanadi/yangilandi : ${written}`);
  console.log(`  allaqachon to'g'ri     : ${already}`);
  console.log(`  noto'g'ri son edi      : ${wrong}`);
  console.log(`  \`tests\` da topilmadi   : ${missing}`);
  if (DRY) console.log('\nYozish uchun `--dry-run` siz qayta ishga tushiring.\n');
}

run().catch((e) => { console.error(e.message); process.exit(1); });

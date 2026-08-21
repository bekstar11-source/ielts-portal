// scripts/audit-question-types.mjs
//
// `group.type` — bazada sxemasiz erkin matn. Registrni (`questionTypeRegistry`)
// taxmin bilan to'ldirish xavfli: yo'q turni qo'shmaslik guruhni renderer'siz
// qoldiradi, noto'g'ri turni qo'shish esa savolni NOTO'G'RI renderer'ga beradi.
// Ikkalasi ham jim buziladi.
//
// Shu sabab avval DALIL: bu skript `tests` kolleksiyasidagi barcha testlarni
// o'qib, uchraydigan har bir `type` ni sanaydi va registrga solishtiradi.
//
//   # A varianti (gcloud bor bo'lsa):
//   export GCLOUD_ACCESS_TOKEN=$(gcloud auth print-access-token)
//   # B varianti (service-account kaliti bilan):
//   export GOOGLE_APPLICATION_CREDENTIALS=/yo'l/serviceAccountKey.json
//
//   npm run audit:types            # xulosa
//   npm run audit:types -- --json  # to'liq JSON (fixture yozish uchun)
//
// Faqat O'QIYDI — hech narsa yozmaydi.

import { createRequire } from 'node:module';
import { resolveListeningRenderer, normalizeTypeKey } from '../src/utils/questionTypeRegistry.js';
import { isMultiAnswerType } from '../src/utils/ieltsScoring.js';
import { canonicalQuestionType } from '../src/utils/questionTypes.js';

const PROJECT = 'ielts-portal-v1';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

/**
 * Access token oladi.
 *
 * Ikki yo'l bor, chunki hamma mashinada `gcloud` o'rnatilmagan. Ikkinchi yo'l
 * `google-auth-library` ni `functions/node_modules` dan oladi — u firebase-admin
 * bilan birga allaqachon o'rnatilgan, shuning uchun yangi bog'liqlik kerak emas.
 */
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
  console.error('  export GOOGLE_APPLICATION_CREDENTIALS=/yo\'l/serviceAccountKey.json');
  process.exit(1);
}

/** Firestore REST qiymatini oddiy JS qiymatiga ochadi. */
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

async function fetchPage(token, pageToken) {
  const url = new URL(`${BASE}/tests`);
  url.searchParams.set('pageSize', '50');
  if (pageToken) url.searchParams.set('pageToken', pageToken);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Guruh ichida savol elementi bormi? Registrga qo'shish qaroriga ta'sir qiladi:
 * savolsiz dekorativ guruhni tur sifatida ro'yxatga olish shart emas.
 */
const countItems = (group) => {
  let n = 0;
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (o.id != null) n += 1;
    ['questions', 'items', 'groups', 'rows', 'cells', 'content', 'parts'].forEach((k) => walk(o[k]));
  };
  ['questions', 'items', 'groups', 'rows'].forEach((k) => walk(group[k]));
  return n;
};

const hasOptionsDeep = (group) => {
  let found = false;
  const walk = (o) => {
    if (found || !o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (Array.isArray(o.options) && o.options.length > 0) { found = true; return; }
    ['questions', 'items', 'groups'].forEach((k) => walk(o[k]));
  };
  walk(group);
  return found;
};

async function run() {
  const token = await getToken();
  const stats = new Map(); // normalizedType -> { raw:Set, skill:{}, groups, items, withOptions, tests:Set }
  let scanned = 0;
  let pageToken;

  do {
    const page = await fetchPage(token, pageToken);
    for (const doc of page.documents || []) {
      const testId = doc.name.split('/').pop();
      const f = doc.fields || {};
      const skill = String(unpack(f.type) || 'unknown').toLowerCase();
      const groups = unpack(f.questions);
      if (!Array.isArray(groups)) continue;
      scanned += 1;

      for (const g of groups) {
        if (!g || typeof g !== 'object') continue;
        const raw = g.type ?? '';
        const key = normalizeTypeKey(raw) || '(bo\'sh)';
        if (!stats.has(key)) {
          stats.set(key, { raw: new Set(), skill: {}, groups: 0, items: 0, withOptions: 0, tests: new Set() });
        }
        const s = stats.get(key);
        s.raw.add(String(raw));
        s.skill[skill] = (s.skill[skill] || 0) + 1;
        s.groups += 1;
        s.items += countItems(g);
        if (hasOptionsDeep(g)) s.withOptions += 1;
        s.tests.add(testId);
      }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  const rows = [...stats.entries()]
    .map(([key, s]) => ({
      type: key,
      rawForms: [...s.raw],
      skills: s.skill,
      groups: s.groups,
      items: s.items,
      withOptions: s.withOptions,
      tests: s.tests.size,
      renderer: resolveListeningRenderer(key),
      multiSelect: isMultiAnswerType(key),
      family: canonicalQuestionType(key)
    }))
    .sort((a, b) => b.groups - a.groups);

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ scanned, rows }, null, 2));
    return;
  }

  console.log(`\nSkanerlangan test: ${scanned}\n`);
  console.log('TUR'.padEnd(26), 'GURUH'.padStart(6), 'SAVOL'.padStart(6), 'OPT'.padStart(5), '  LISTENING RENDERER   TAHLIL OILASI');
  console.log('-'.repeat(100));
  for (const r of rows) {
    const rend = r.multiSelect ? 'SelectionBox' : (r.renderer ?? '❌ TANILMAYDI');
    const fam = r.family === 'other' ? '⚠️ other' : r.family;
    console.log(
      r.type.padEnd(26),
      String(r.groups).padStart(6),
      String(r.items).padStart(6),
      String(r.withOptions).padStart(5),
      '  ' + rend.padEnd(20),
      fam
    );
  }

  // Listening testlarda uchraydigan, lekin dispatcher tanimaydigan turlar —
  // aynan shular talabaga javob maydonisiz ko'rinadi.
  const broken = rows.filter(
    (r) => (r.skills.listening || 0) > 0 && !r.multiSelect && r.renderer === null
  );
  if (broken.length) {
    console.log('\n❌ LISTENING DISPATCHER TANIMAYDIGAN TURLAR:');
    for (const r of broken) {
      console.log(
        `   "${r.type}" — ${r.skills.listening} guruh, ${r.items} savol, ${r.tests} testda` +
        `${r.withOptions ? '' : ' — VARIANTLAR YO\'Q (javob maydonisiz chiziladi!)'}`
      );
      console.log(`      xom yozuvlar: ${r.rawForms.map((x) => JSON.stringify(x)).join(', ')}`);
    }
  } else {
    console.log('\n✓ Listening turlarining hammasini dispatcher taniydi.');
  }

  const otherFamily = rows.filter((r) => r.family === 'other');
  if (otherFamily.length) {
    console.log('\n⚠️  XATOLAR TAHLILIDA "other" OILASIGA TUSHADIGAN TURLAR:');
    for (const r of otherFamily) {
      console.log(`   "${r.type}" — ${r.groups} guruh, ${r.items} savol`);
    }
  }
  console.log('');
}

run().catch((e) => { console.error(e.message); process.exit(1); });

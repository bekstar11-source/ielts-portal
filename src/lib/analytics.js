// src/lib/analytics.js
//
// Yagona analitika qatlami. Ikki vazifasi bor:
//
//   1. GA4 (Firebase Analytics) ga funnel event'larini yuborish;
//   2. reklama atributsiyasini (utm_*, gclid, fbclid, referrer) saqlash — shunda
//      ro'yxatdan o'tgan foydalanuvchini QAYSI reklama olib kelganini bilamiz.
//      GA4 ning o'z atributsiyasi bor, lekin u bizning Firestore'dagi
//      `users/{uid}` hujjati bilan bog'lanmaydi; "qaysi kampaniya PUL TO'LOVCHI
//      mijoz keltirdi" degan savolga faqat shu saqlangan nusxa javob beradi.
//
// Analytics sozlanmagan bo'lsa (VITE_FIREBASE_MEASUREMENT_ID yo'q) hech narsa
// buzilmaydi: `track()` jimgina no-op bo'ladi, atributsiya esa baribir
// saqlanaveradi — ya'ni measurementId keyin qo'shilsa, tarixiy lead'lar
// manbasi yo'qolmaydi.

import app from '../firebase/firebase';

const MEASUREMENT_ID = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
const DEV = import.meta.env.DEV;

const STORAGE_KEY = 'englev_attribution';

/** URL'dan o'qiladigan atributsiya parametrlari. */
const PARAM_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'gclid', 'fbclid', 'ref',
];

// ─── Firebase Analytics (lazy) ──────────────────────────────────────────────
//
// Dinamik import: measurementId sozlanmagan bo'lsa `firebase/analytics` bundle
// umuman yuklanmaydi. Promise keshlanadi, shuning uchun `track()` chaqiriqlari
// tartibi ham saqlanadi (hammasi bitta promise'ga `.then` qilinadi).

let analyticsPromise = null;

function getAnalytics() {
  if (!MEASUREMENT_ID) return Promise.resolve(null);
  if (!analyticsPromise) {
    analyticsPromise = (async () => {
      const mod = await import('firebase/analytics');
      if (!(await mod.isSupported())) return null;
      // measurementId `firebase.js` config'ida bo'lmasa ham shu yerda beriladi.
      const instance = mod.initializeAnalytics(app, {
        config: { send_page_view: false },
      });
      return { instance, logEvent: mod.logEvent, setUserProperties: mod.setUserProperties };
    })().catch((err) => {
      console.warn('[analytics] ishga tushmadi:', err);
      return null;
    });
  }
  return analyticsPromise;
}

// ─── Yordamchilar ───────────────────────────────────────────────────────────

/** GA4 parametr qiymatlari 100 belgidan oshmasligi kerak. */
function trunc(value) {
  return String(value).slice(0, 100);
}

/** `undefined`/`null` maydonlarni olib tashlaydi — GA4 ham, Firestore ham ularni yoqtirmaydi. */
function clean(obj) {
  const out = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    out[k] = typeof v === 'number' || typeof v === 'boolean' ? v : trunc(v);
  });
  return out;
}

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function writeStore(value) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* private mode — atributsiya yo'qoladi, ilova ishlayveradi */
  }
}

// ─── Atributsiya ────────────────────────────────────────────────────────────

/**
 * URL'dagi kampaniya parametrlarini o'qib saqlaydi.
 *
 * BIRINCHI teginish (`first`) hech qachon qayta yozilmaydi — odam reklamadan
 * kelib, keyin bir necha marta to'g'ridan-to'g'ri qaytsa ham, uni olib kelgan
 * kampaniya shu bo'lib qoladi. OXIRGI teginish (`last`) esa har yangi
 * kampaniya parametrida yangilanadi.
 *
 * `main.jsx` da bir marta chaqiriladi.
 */
export function captureAttribution() {
  if (typeof window === 'undefined') return;

  const search = new URLSearchParams(window.location.search);
  const touch = {};
  PARAM_KEYS.forEach((key) => {
    const value = search.get(key);
    if (value) touch[key] = trunc(value);
  });

  const hasCampaign = Object.keys(touch).length > 0;
  const stamp = {
    ...touch,
    referrer: document.referrer ? trunc(document.referrer) : undefined,
    landingPath: trunc(window.location.pathname),
    at: new Date().toISOString(),
  };

  const stored = readStore();

  if (!stored) {
    // Kampaniya parametri bo'lmasa ham yozamiz: organik/to'g'ridan-to'g'ri
    // trafikni ham manba sifatida ajrata olishimiz kerak.
    writeStore({ first: clean(stamp), last: clean(stamp) });
    return;
  }

  if (hasCampaign) {
    writeStore({ ...stored, last: clean(stamp) });
  }
}

/** Saqlangan atributsiya (`{ first, last }`) yoki `null`. */
export function getAttribution() {
  return readStore();
}

/**
 * `users/{uid}` hujjatiga yoziladigan yassi ko'rinish.
 *
 * Firestore ichma-ich map'larni indekslashda noqulay, shuning uchun bir qavat:
 * `source/medium/campaign` — birinchi teginish, `lastSource/lastCampaign` —
 * oxirgisi (ular farq qilsagina yoziladi).
 */
export function getAttributionForProfile() {
  const stored = readStore();
  if (!stored) return null;

  const first = stored.first || {};
  const last = stored.last || {};

  const profile = {
    source: first.utm_source || (first.gclid ? 'google' : '') || (first.fbclid ? 'facebook' : '') || 'direct',
    medium: first.utm_medium,
    campaign: first.utm_campaign,
    content: first.utm_content,
    term: first.utm_term,
    referrer: first.referrer,
    landingPath: first.landingPath,
    firstSeenAt: first.at,
  };

  if (last.utm_source && last.utm_source !== first.utm_source) {
    profile.lastSource = last.utm_source;
    profile.lastCampaign = last.utm_campaign;
    profile.lastSeenAt = last.at;
  }

  return clean(profile);
}

/** Har bir event'ga qo'shiladigan manba maydonlari. */
function attributionParams() {
  const stored = readStore();
  const first = stored?.first || {};
  return clean({
    source: first.utm_source || (first.gclid ? 'google' : '') || (first.fbclid ? 'facebook' : '') || 'direct',
    medium: first.utm_medium,
    campaign: first.utm_campaign,
  });
}

// ─── Event yuborish ─────────────────────────────────────────────────────────

/**
 * Funnel event'ini yuboradi. Hech qachon xato tashlamaydi — analitika
 * mahsulot oqimini yiqitmasligi shart.
 *
 * @param {string} name   GA4 event nomi (snake_case, ≤40 belgi)
 * @param {object} params qo'shimcha parametrlar
 */
export function track(name, params = {}) {
  try {
    const payload = { ...attributionParams(), ...clean(params) };

    if (DEV) console.debug('[analytics]', name, payload);

    getAnalytics().then((a) => {
      if (a) a.logEvent(a.instance, name, payload);
    });
  } catch (err) {
    if (DEV) console.warn('[analytics] track xatosi:', err);
  }
}

/** Foydalanuvchi xususiyatlari (segmentatsiya uchun). */
export function setAnalyticsUserProps(props) {
  try {
    const payload = clean(props);
    getAnalytics().then((a) => {
      if (a) a.setUserProperties(a.instance, payload);
    });
  } catch {
    /* e'tiborsiz */
  }
}

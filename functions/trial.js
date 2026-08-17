// functions/trial.js
//
// Landing page'dagi BEPUL TRIAL: ro'yxatdan o'tmagan mehmon (guest) bitta
// Reading bo'lagi va bitta Listening bo'lagini ishlaydi, natijasini ko'radi va
// shartni bajarsa ro'yxatdan o'tishda chegirma oladi.
//
// ─── NEGA HAMMASI SERVERDA ──────────────────────────────────────────────────
//
// Loyihada allaqachon shunga o'xshash oqim bor — `useDiagnosticLogic` — lekin
// u testni Firestore'dan TO'G'RIDAN-TO'G'RI o'qiydi va ballni KLIENTDA
// hisoblaydi. Ro'yxatdan o'tgan o'quvchi uchun bu shunchaki noqulaylik, guest
// uchun esa ochiq eshik: DevTools ochgan odam javob kalitlarini ko'rib band 9
// olardi va chegirmani bir zumda "yutib" olardi.
//
// Shuning uchun bu yerda:
//   • test faqat `sanitizeObject` dan o'tib beriladi (javoblar olib tashlanadi)
//   • ball FAQAT serverda hisoblanadi (`evaluateTest`)
//   • natija `trial_results/{uid}` ga Admin SDK bilan yoziladi, klient bu
//     hujjatga umuman tegolmaydi (firestore.rules)
//
// ─── NEGA CHEGIRMA DARHOL BERILMAYDI ────────────────────────────────────────
//
// Anonim sessiyada `users/{uid}` hujjati YO'Q, ya'ni `signupDiscount` ni
// yozadigan joy ham yo'q. Bundan tashqari anonim uid — bepul va cheksiz:
// chegirmani o'sha zahoti bersak, u hech qanday shaxsga bog'lanmagan bo'lardi.
//
// Shuning uchun trial natijasi `trial_results/{uid}` da SAQLANIB turadi va
// chegirma faqat ro'yxatdan o'tgandan keyin (`claimTrialReward`) beriladi.
// Klientda anonim hisob `linkWithCredential` bilan haqiqiy hisobga
// AYLANTIRILADI — `uid` o'zgarmaydi, shuning uchun natija o'z-o'zidan
// ko'chadi va alohida "natijani ko'chirish" mexanizmi kerak emas.
//
// ─── OCHIQ QOLGAN TESHIK (ataylab) ──────────────────────────────────────────
//
// Anonim uid bepul, ya'ni trialni cheksiz qayta yechib oxiri band 7 olish
// mumkin. Buni yopishga urinmaymiz: chegirma baribir TO'LOV paytida
// `discount_claims` reyestriga uriladi (telegramId + telefon raqami), ya'ni
// bir shaxs uni baribir bir marta ishlata oladi. Trialni qayta yechish
// odamning o'z vaqtini yeydi, sizga esa zarar keltirmaydi.

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { sanitizeObject } = require("./getSanitizedTest");
const { evaluateTest, calculateOverallBand } = require("./ieltsScoring");
const { grantSignupDiscount, DISCOUNT_CONFIG } = require("./signupDiscount");

/** Telegram HTML parse_mode uchun — ism/email ichidagi `<` xabarni buzmasin. */
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Trial sozlamalari: `config/trial` hujjati. Admin uni redeploysiz o'zgartiradi. */
const TRIAL_CONFIG_PATH = { collection: "config", doc: "trial" };

const DEFAULT_CONFIG = {
  enabled: false,
  /**
   * Chegirma uchun kerak bo'ladigan eng kam overall band.
   *
   * `0` — trialni YAKUNLAGAN har kim chegirma oladi: chegirma NATIJAGA emas,
   * HARAKATGA bog'langan. Sabab: band 7 shartida trafikning katta qismi
   * (band 5–6 dagi o'quvchilar — aynan eng ko'p mashq kerak bo'lgan va eng
   * uzoq obuna bo'ladigan segment) quruq qaytardi va birinchi tajribasi
   * "uddalay olmadim" bo'lardi. Kuchli o'quvchilar esa arzon narxda kirardi.
   *
   * Musobaqa elementini yo'qotmaslik uchun natija sahifasi baribir band
   * ballni va zaif savol turlarini ko'rsatadi.
   *
   * Qiymatni `config/trial` hujjatidan o'zgartirish mumkin — kod qayta
   * deploy qilinmaydi. Masalan `7` qo'yilsa eski (natijaga bog'langan) model
   * qaytadi va natija sahifasi "band 7 gacha N ball qoldi" ko'rinishiga o'tadi.
   */
  minOverallBand: 0,
  discountPercent: DISCOUNT_CONFIG.percent,
  discountDays: DISCOUNT_CONFIG.days,
  /**
   * Chegirma necha OYNI qoplaydi.
   *
   * ⚠️ Bu maydon bir vaqtning o'zida MIGRATSIYA BAYROG'I ham — pastdagi
   * `normalizeDiscountConfig` ga qarang.
   */
  discountCycles: DISCOUNT_CONFIG.cycles,
  /**
   * ⚠️ Bu yerdagi testlar BITTA BO'LAKLI hujjatlar bo'lishi shart (Parts
   * to'plamidagi kabi: bitta passage / bitta section). Trialda part bo'yicha
   * filtrlash YO'Q — hujjat qanday bo'lsa shundayligicha ishlanadi, xuddi
   * diagnostikadagi kabi. To'liq test ID si qo'yilsa guest 40 ta savolga
   * duch keladi.
   */
  stages: {
    reading: { testId: null, durationSeconds: 1200 },
    listening: { testId: null, durationSeconds: 1800 },
  },
};

const STAGES = ["reading", "listening"];

/**
 * Chegirma sozlamalarini saqlangan hujjatdan xavfsiz o'qiydi.
 *
 * ⚠️ MUAMMO: chegirma ilgari BIR MARTALIK edi va `config/trial` da 50%
 * turardi. Endi u dastlabki 2 OYNI qoplaydi — o'sha eski 50% saqlanib qolsa
 * har bir yangi o'quvchi 50% × 2 oy olardi, ya'ni deploydan keyin narx
 * jimgina yarmiga tushardi. Buni "admin qo'lda o'zgartirsin" deb qoldirib
 * bo'lmaydi: unutilsa zarar darhol va sezilmasdan boshlanadi.
 *
 * YECHIM: `discountCycles` bir vaqtda ham sozlama, ham MIGRATSIYA BAYROG'I.
 * U yo'q bo'lsa hujjat ko'p oylik modeldan oldin yozilgan, demak undagi foiz
 * ham eski modelga tegishli — bunday hujjatning butun chegirma bloki
 * e'tiborsiz qoldiriladi va koddagi qiymatlar ishlaydi. Admin panelidan
 * bir marta saqlansa `discountCycles` yoziladi va sozlama yana kuchga kiradi.
 *
 * Xuddi shu naqsh `signupDiscount.js` dagi `offerCycles` da ham bor: maydon
 * yo'qligi "eski model" degani.
 */
function normalizeDiscountConfig(data) {
  const cycles = Number(data.discountCycles);
  if (!(cycles > 0)) {
    return {
      discountPercent: DISCOUNT_CONFIG.percent,
      discountDays: DISCOUNT_CONFIG.days,
      discountCycles: DISCOUNT_CONFIG.cycles,
    };
  }
  return {
    discountPercent: Number(data.discountPercent) || DISCOUNT_CONFIG.percent,
    discountDays: Number(data.discountDays) || DISCOUNT_CONFIG.days,
    discountCycles: cycles,
  };
}

async function loadTrialConfig(db) {
  const snap = await db.collection(TRIAL_CONFIG_PATH.collection).doc(TRIAL_CONFIG_PATH.doc).get();
  if (!snap.exists) return { ...DEFAULT_CONFIG };
  const data = snap.data() || {};
  return {
    ...DEFAULT_CONFIG,
    ...data,
    ...normalizeDiscountConfig(data),
    stages: { ...DEFAULT_CONFIG.stages, ...(data.stages || {}) },
  };
}

/**
 * Trial bosqichi uchun testni qaytaradi (javob kalitlarisiz).
 *
 * Anonim sessiyaga ham ochiq — aynan shu uning maqsadi. Lekin faqat
 * `config/trial` da ko'rsatilgan test ID lariga: klient qaysi testni
 * so'rashini TANLAY OLMAYDI, faqat bosqich nomini yuboradi.
 */
async function getTrialTest(data, context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sessiya boshlanmagan.");
  }

  const stage = String((data && data.stage) || "").toLowerCase();
  if (!STAGES.includes(stage)) {
    throw new functions.https.HttpsError("invalid-argument", "Noma'lum bosqich.");
  }

  const db = admin.firestore();
  const config = await loadTrialConfig(db);

  if (!config.enabled) {
    throw new functions.https.HttpsError("failed-precondition", "Bepul test hozircha yopiq.");
  }

  const stageConfig = config.stages[stage] || {};
  if (!stageConfig.testId) {
    throw new functions.https.HttpsError("failed-precondition", `"${stage}" bosqichi sozlanmagan.`);
  }

  const testSnap = await db.collection("tests").doc(stageConfig.testId).get();
  if (!testSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Test topilmadi.");
  }

  // Javob kalitlari shu yerda olib tashlanadi — `getSanitizedTest` bilan
  // BIR XIL funksiya orqali.
  const sanitized = sanitizeObject({ id: testSnap.id, ...testSnap.data() });

  return {
    stage,
    test: sanitized,
    durationSeconds: Number(stageConfig.durationSeconds) || 1200,
    totalStages: STAGES.length,
    stageIndex: STAGES.indexOf(stage) + 1,
  };
}

/**
 * Ikkala bosqich javoblarini baholaydi va natijani saqlaydi.
 *
 * Javoblar bir martada yuboriladi (klient bosqichlar orasida ularni
 * localStorage'da saqlab turadi) — shunda overall band bitta joyda, bitta
 * chaqiruvda hisoblanadi va oraliq holatni server tomonda boshqarish kerak
 * bo'lmaydi.
 */
async function submitTrial(data, context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sessiya boshlanmagan.");
  }

  const uid = context.auth.uid;
  const db = admin.firestore();
  const config = await loadTrialConfig(db);

  if (!config.enabled) {
    throw new functions.https.HttpsError("failed-precondition", "Bepul test hozircha yopiq.");
  }

  const answers = (data && data.answers) || {};
  const timeSpent = (data && data.timeSpent) || {};

  const modules = [];
  for (const stage of STAGES) {
    const stageConfig = config.stages[stage] || {};
    if (!stageConfig.testId) continue;

    const testSnap = await db.collection("tests").doc(stageConfig.testId).get();
    if (!testSnap.exists) continue;

    const testData = { id: testSnap.id, ...testSnap.data() };
    const { correctCount, totalQ, band, typeStats } = evaluateTest(testData, answers[stage] || {});

    modules.push({
      stage,
      testTitle: testData.title || null,
      score: correctCount,
      totalQuestions: totalQ,
      band: band || 0,
      // Zaif tomonlarni ko'rsatish uchun — natija sahifasidagi asosiy
      // sotuv argumenti aynan shu (savol turlari bo'yicha taqsimot).
      typeStats: typeStats || {},
      timeSpent: Number(timeSpent[stage]) || 0,
    });
  }

  if (modules.length === 0) {
    throw new functions.https.HttpsError("failed-precondition", "Trial testlari sozlanmagan.");
  }

  const overallBand = calculateOverallBand(modules.map((m) => m.band));
  const minBand = Number(config.minOverallBand) || 0;
  const rewardEarned = overallBand >= minBand;

  const result = {
    uid,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    modules,
    overallBand,
    minOverallBand: minBand,
    rewardEarned,
    rewardClaimed: false,
    discountPercent: config.discountPercent,
    discountDays: config.discountDays,
    // Natija hujjatiga ham yoziladi: mukofot keyinroq (ro'yxatdan o'tgach)
    // olinadi va o'sha paytda AYNAN shu shartlar qo'llanishi kerak.
    discountCycles: config.discountCycles,
  };

  // `set` (merge emas): qayta yechilsa natija to'liq almashadi. `rewardClaimed`
  // ham nolga qaytadi — lekin bu xavfli emas, chunki chegirma haqiqatda
  // `users/{uid}.signupDiscount` da yashaydi va u yerda takroriy berish
  // `grantSignupDiscount` ichida to'siladi.
  await db.collection("trial_results").doc(uid).set(result);

  return {
    modules,
    overallBand,
    minOverallBand: minBand,
    rewardEarned,
    discountPercent: config.discountPercent,
  };
}

/**
 * Trial mukofotini (chegirmani) haqiqiy hisobga o'tkazadi.
 *
 * Ro'yxatdan o'tish YAKUNLANGANDAN keyin klient chaqiradi. Anonim hisob
 * `linkWithCredential` bilan yangilangani uchun `uid` o'sha-o'sha — natija
 * hujjati o'z-o'zidan topiladi.
 *
 * Anonim sessiyadan chaqirilsa rad etiladi: chegirma faqat haqiqiy hisobga
 * beriladi (aks holda u hech qanday shaxsga bog'lanmagan bo'lardi).
 */
async function claimTrialReward(data, context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Avtorizatsiyadan o'tilmagan.");
  }

  const provider = context.auth.token &&
    context.auth.token.firebase &&
    context.auth.token.firebase.sign_in_provider;
  if (provider === "anonymous") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Chegirmani olish uchun ro'yxatdan o'tish kerak."
    );
  }

  const uid = context.auth.uid;
  const db = admin.firestore();
  const trialRef = db.collection("trial_results").doc(uid);
  const trialSnap = await trialRef.get();

  if (!trialSnap.exists) {
    return { granted: false, reason: "no_trial" };
  }

  const trial = trialSnap.data();
  if (!trial.rewardEarned) {
    return { granted: false, reason: "not_earned", overallBand: trial.overallBand };
  }
  if (trial.rewardClaimed) {
    return { granted: false, reason: "already_claimed" };
  }

  const outcome = await grantSignupDiscount(db, uid, {
    percent: trial.discountPercent || DISCOUNT_CONFIG.percent,
    days: trial.discountDays || DISCOUNT_CONFIG.days,
    cycles: trial.discountCycles || DISCOUNT_CONFIG.cycles,
    sourceResultId: `trial_${uid}`,
  });

  if (outcome.granted) {
    await trialRef.update({
      rewardClaimed: true,
      rewardClaimedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Adminga bildirishnoma — trialdan kelgan chegirmali yangi hisob.
    // Xatosi chegirmani YIQITMASLIGI shart, shuning uchun to'liq o'raladi.
    try {
      const { notifyAdmin } = require("./telegramBot");
      const userSnap = await db.collection("users").doc(uid).get();
      const u = userSnap.exists ? userSnap.data() : {};
      const percent = trial.discountPercent || DISCOUNT_CONFIG.percent;
      const days = trial.discountDays || DISCOUNT_CONFIG.days;
      const band = Number(trial.overallBand);

      await notifyAdmin(
        `🎁 <b>Trial chegirmasi berildi</b>\n\n` +
        `👤 ${escapeHtml(u.fullName || "Noma'lum")}\n` +
        `✉️ ${escapeHtml(u.email || u.phoneNumber || "—")}\n` +
        `📊 Trial band: <b>${Number.isFinite(band) ? band.toFixed(1) : "—"}</b>\n` +
        `💸 Chegirma: <b>${percent}%</b> (${days} kun amal qiladi)\n` +
        `🆔 <code>${escapeHtml(uid)}</code>`
      );
    } catch (err) {
      console.warn("Trial chegirmasi bo'yicha adminga xabar yuborilmadi:", err);
    }
  }

  return { ...outcome, overallBand: trial.overallBand, percent: trial.discountPercent };
}

module.exports = { getTrialTest, submitTrial, claimTrialReward, STAGES };

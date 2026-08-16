// functions/signupDiscount.js
//
// Ro'yxatdan o'tish chegirmasi: berish, haqlilikni tekshirish va sarflash.
//
// ─── NEGA IKKI HUJJAT ───────────────────────────────────────────────────────
//
//   users/{uid}.signupDiscount   → TAKLIF  ("sizda 30% bor, 7 kun amal qiladi")
//   discount_claims/{key}        → SARFLASH reyestri (sanoqchi)
//
// Taklif `uid` ga bog'langan, chunki uni UI da ko'rsatish kerak. Lekin faqat
// shunga tayanib bo'lmaydi: o'quvchi yangi email bilan yangi hisob ochsa
// `uid` almashadi va chegirma qaytadan tug'iladi — ya'ni har oy yangi hisob
// ochib arzon narxda qolish mumkin bo'lardi.
//
// Reyestr kaliti shuning uchun SHAXSGA bog'langan:
//   tg_{telegramId}   — to'lov HAR DOIM bot orqali o'tadi (Pricing.jsx dagi
//                       `openPaymentBot` boshqa yo'l qoldirmaydi), ya'ni bu
//                       kalit har safar mavjud bo'ladi
//   ph_{phoneNumber}  — Telegram almashtirib, eski raqamni ulaganlarga qarshi
//
// Ochiq qoladigan teshik: YANGI SIM + YANGI Telegram. Bu qasddan yopilmagan —
// SIM narxi (~20 ming so'm) chegirmadan tejaladigan summaga yaqin, ya'ni
// hujum iqtisodiy jihatdan deyarli foydasiz. Qat'iyroq to'siq kerak bo'lsa
// keyingi qatlam — chekdagi karta raqamini reyestrga qo'shish.
//
// ─── NEGA SANOQCHI, "BOR/YO'Q" EMAS ─────────────────────────────────────────
//
// Chegirma endi BIR MARTALIK emas — u obunaning dastlabki 3 OYINI qoplaydi:
//
//   monthly → har to'lov 1 oyni yeydi, ya'ni 3 ta chegirmali to'lov
//   tri     → bitta to'lov 90 kunni qoplaydi, ya'ni 3 oyni BIRDANIGA yeydi
//
// Shuning uchun reyestrda hujjat mavjudligi yetarli emas: `cyclesRemaining`
// qancha oy qolganini saytadi va tasdiqlash paytida kamayadi. Hujjat
// mavjudligiga tayangan eski mantiq (`tx.create` yiqilishi) faqat BIRINCHI
// tsikl uchun saqlanib qoldi — u yerda poyga himoyasi sifatida hamon ideal.
//
// ─── NEGA KETMA-KETLIK SHARTI ───────────────────────────────────────────────
//
// `maxGapDays` bo'lmasa o'quvchi 1-oyni yanvarda, 2-oyni iyunda, 3-oyni
// dekabrda to'lardi va "birinchi xarid chegirmasi" bir yilga cho'zilardi.
// To'lovlar ketma-ket bo'lishi shart; uzilsa qolgan oylar yonadi.
//
// ─── NEGA SARFLASH TASDIQLASH PAYTIDA ───────────────────────────────────────
//
// `handlePaymentStart` faqat karta raqamini KO'RSATADI — odam pul to'lamasligi
// ham mumkin. Agar chegirma o'sha yerda "yoqib yuborilsa", fikridan qaytgan
// o'quvchi taklifini bekorga yo'qotardi. Shuning uchun u yerda faqat TEKSHIRUV
// bo'ladi, sarflash esa admin ✅ tugmasini bosganda, tranzaksiya ichida.

const admin = require("firebase-admin");
const { getPlanPrice, applyDiscount, BILLING_DAYS } = require("./pricing");

/** Chegirma sozlamalari — bitta joyda. */
const DISCOUNT_CONFIG = {
  /**
   * 50% emas, 30%.
   *
   * Chegirma endi bitta to'lovga emas, uchta oyga tarqaladi (pastdagi
   * `cycles`), ya'ni jami yon berish 50% × 1 oydan ancha katta. 30% da
   * standard monthly 24 500 bo'ladi — psixologik to'siqni yorib o'tadi,
   * lekin 3 oylik jami tushum (73 500) eski bir martalik tri chegirmasidan
   * (44 500) yuqori qoladi.
   */
  percent: 30,
  /**
   * Taklif necha kun amal qiladi.
   *
   * 48 soat emas, 7 kun: to'lov QO'LDA ishlaydi (kartaga o'tkazma + chek +
   * admin tasdig'i). Dam olish kunlariga to'g'ri kelgan 48 soatlik taklif
   * o'quvchi aybisiz yonib ketardi va bu qo'llab-quvvatlashga shikoyat bo'lib
   * qaytardi.
   *
   * ⚠️ Bu muddat faqat BIRINCHI to'lovni chegaralaydi. Zanjir boshlangach
   * uni `maxGapDays` boshqaradi — aks holda 2-oy to'lovi 7-kunda yonib
   * ketardi va chegirma amalda bir martalik bo'lib qolardi.
   */
  days: 7,
  /**
   * Chegirma necha OYNI qoplaydi.
   *
   * "3 ta to'lov" emas, "3 oy" — chunki tri bitta to'lovda 90 kunni yopadi.
   * Oyda hisoblash ikkala davrni bir o'lchovga keltiradi va monthly↔tri
   * aralashtirilganda ham hisob buzilmaydi.
   */
  cycles: 3,
  /**
   * Ikki to'lov orasidagi eng katta tanaffus.
   *
   * 30 emas, 45: to'lov qo'lda, o'quvchi bir-ikki kun kechikishi normal.
   * Qattiq 30 kun `days: 7` bilan bir xil xatoga olib borardi — halol
   * o'quvchining chegirmasi o'z aybisiz yonardi va bu shikoyat bo'lib
   * qaytardi.
   */
  maxGapDays: 45,
  /**
   * Chegirma endi HAR IKKALA davrda ishlaydi.
   *
   * Ilgari faqat `tri` edi (Variant A) — sababi "1 oylikka berilsa foyda har
   * oy takrorlanadi" degan xavf. Uni `cycles: 3` yopdi: hujum tsikli baribir
   * 3 oy, ya'ni tri dagidan tez emas. Buning evaziga eng katta to'siq —
   * 89 000 ni bir zarbada to'lash — olib tashlandi.
   *
   * Narx narvoni buzilmaydi: tri chegirmali oyiga 20 766, monthly 24 500 —
   * tri hamon arzonroq, ya'ni monthly tri ni yemaydi.
   */
  eligibleBillings: ["monthly", "tri"],
};

/** `checkDiscountEligibility` qaytaradigan sabablar. */
const REASON = {
  OK: "ok",
  NO_OFFER: "no_offer",
  EXPIRED: "expired",
  USED: "used",
  BILLING_NOT_ELIGIBLE: "billing_not_eligible",
  ALREADY_CLAIMED: "already_claimed",
  EXISTING_SUBSCRIBER: "existing_subscriber",
  UNKNOWN_PLAN: "unknown_plan",
  /** Zanjir uzilgan: oxirgi to'lovdan `maxGapDays` dan ko'p o'tgan. */
  CHAIN_EXPIRED: "chain_expired",
  /** Qolgan oylar tanlangan davrni qoplamaydi (masalan 1 oy qoldi, tri tanlandi). */
  INSUFFICIENT_CYCLES: "insufficient_cycles",
};

/** Tranzaksiya ichida chegirma allaqachon sarflangan bo'lsa tashlanadigan xato. */
const DISCOUNT_ALREADY_CLAIMED = "DISCOUNT_ALREADY_CLAIMED";

/** Firestore Timestamp / ISO / Date → Date (yoki null). */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") {
    try {
      const d = value.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Raqamdan boshqa hamma narsani olib tashlaydi (handleAuthContact bilan bir xil). */
function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") return null;
  const clean = phone.replace(/\D/g, "");
  return clean.length >= 9 ? clean : null;
}

/**
 * Tanlangan davr necha OYNI yeydi.
 *
 * `BILLING_DAYS` dan hisoblanadi (30 → 1, 90 → 3), qo'lda yozilgan jadval
 * emas: obuna muddati o'zgarsa sanoqchi o'zi ergashsin.
 */
function monthsForBilling(billing) {
  const days = BILLING_DAYS[billing];
  return typeof days === "number" ? Math.max(1, Math.round(days / 30)) : null;
}

/**
 * Taklif necha oyni qoplaydi.
 *
 * ⚠️ Eski takliflarda (30% dan oldin berilgan, `cycles` maydonisiz) javob 1 —
 * ya'ni AYNAN eski xatti-harakat: bir martalik chegirma. Ularga 3 oy berish
 * va'da qilinganidan ko'proq bo'lardi va 50% × 3 oy juda qimmatga tushardi.
 */
function offerCycles(offer) {
  const n = Number(offer && offer.cycles);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Reyestr hujjatlariga havolalar.
 * `phRef` telefon raqami noma'lum bo'lsa `null` bo'ladi — bu normal holat
 * (email bilan ro'yxatdan o'tgan foydalanuvchida `phoneNumber` bo'lmasligi
 * mumkin; `tgRef` esa har doim bor, chunki to'lov bot orqali o'tadi).
 */
function getClaimRefs(db, telegramId, phoneNumber) {
  const cleanPhone = normalizePhone(phoneNumber);
  return {
    tgRef: db.collection("discount_claims").doc(`tg_${telegramId}`),
    phRef: cleanPhone
      ? db.collection("discount_claims").doc(`ph_${cleanPhone}`)
      : null,
    cleanPhone,
  };
}

/**
 * Reyestr snapshot'laridan sanoqchi holatini chiqaradi.
 *
 * ⚠️ `tg_` va `ph_` MUSTAQIL hujjatlar, lekin sanoq UMUMIY bo'lishi shart.
 * Aks holda: o'quvchi 1-oyni Telegram A bilan to'laydi (`tg_A` = 2 qoldi),
 * keyin Telegram B ga o'tadi — `tg_B` umuman yo'q, ya'ni yangi 3 oy. Shuning
 * uchun qolgan oy — ikkalasining MINIMUMI, sarflangan oy esa MAKSIMUMI.
 *
 * Eski (sanoqchisiz) claim hujjatlarida `cyclesRemaining` yo'q → 0 bo'lib
 * o'qiladi, ya'ni "chegirma sarflangan". Bu ham aynan eski xatti-harakat.
 */
function resolveClaimState(claimSnaps, totalCycles) {
  const docs = (claimSnaps || [])
    .filter((s) => s && s.exists)
    .map((s) => s.data() || {});

  if (docs.length === 0) {
    return { started: false, used: 0, remaining: totalCycles, lastCycleAt: null };
  }

  const remaining = Math.min(...docs.map((d) => Number(d.cyclesRemaining) || 0));
  const used = Math.max(...docs.map((d) => Number(d.cyclesUsed) || 0));
  const lastCycleAt = docs
    .map((d) => toDate(d.lastCycleAt) || toDate(d.claimedAt))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;

  return { started: true, used, remaining: Math.max(0, remaining), lastCycleAt };
}

/** Oxirgi to'lovdan `maxGapDays` dan ko'p o'tganmi (zanjir uzilganmi). */
function isChainBroken(lastCycleAt, maxGapDays = DISCOUNT_CONFIG.maxGapDays) {
  if (!lastCycleAt) return false;
  const gapMs = Date.now() - lastCycleAt.getTime();
  return gapMs > maxGapDays * 86400000;
}

/**
 * BIRINCHI tsikl uchun reyestr hujjati.
 * Keyingi tsikllarda `buildClaimCycleUpdate` ishlatiladi.
 */
function buildClaimDoc({ uid, telegramId, phoneNumber, planId, billing, percent, originalPrice, finalPrice, cyclesTotal, cyclesUsed }) {
  const used = Number(cyclesUsed) || 1;
  const total = Number(cyclesTotal) || DISCOUNT_CONFIG.cycles;
  return {
    claimedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastCycleAt: admin.firestore.FieldValue.serverTimestamp(),
    uid: uid || null,
    telegramId: String(telegramId),
    phoneNumber: normalizePhone(phoneNumber),
    planId: planId || null,
    billing: billing || null,
    percent: percent || 0,
    originalPrice: originalPrice || 0,
    finalPrice: finalPrice || 0,
    cyclesTotal: total,
    cyclesUsed: used,
    cyclesRemaining: Math.max(0, total - used),
  };
}

/**
 * KEYINGI tsikllar uchun reyestr yangilanishi.
 *
 * `cyclesRemaining` `increment` bilan emas, hisoblangan qiymat bilan
 * yoziladi: `tg_` va `ph_` ajralib qolgan bo'lsa (biri eski, biri yangi)
 * ikkalasi ham UMUMIY holatga tenglashsin.
 */
function buildClaimCycleUpdate({ uid, planId, billing, percent, originalPrice, finalPrice, used, remaining }) {
  return {
    lastCycleAt: admin.firestore.FieldValue.serverTimestamp(),
    cyclesUsed: used,
    cyclesRemaining: Math.max(0, remaining),
    uid: uid || null,
    planId: planId || null,
    billing: billing || null,
    percent: percent || 0,
    originalPrice: originalPrice || 0,
    finalPrice: finalPrice || 0,
  };
}

/**
 * Foydalanuvchiga chegirma TAKLIFINI beradi.
 *
 * Guest trial (Reading Passage 1 + Listening Section) yakunlangandan keyin
 * chaqiriladi. Trial hali qurilmagani uchun modul ataylab mustaqil: hozir uni
 * qo'lda ham chaqirsa bo'ladi, keyin `submitTestAnswers` dan ulanadi.
 *
 * Takroriy chaqiruv YANGI taklif bermaydi — aks holda trialni qayta-qayta
 * yechib, muddati tugagan chegirmani cheksiz yangilash mumkin bo'lardi.
 *
 * @returns {Promise<{granted: boolean, reason?: string}>}
 */
async function grantSignupDiscount(db, uid, options = {}) {
  const {
    percent = DISCOUNT_CONFIG.percent,
    days = DISCOUNT_CONFIG.days,
    cycles = DISCOUNT_CONFIG.cycles,
    sourceResultId = null,
  } = options;

  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) return { granted: false, reason: "user_not_found" };

  const userData = snap.data() || {};

  // Ilgari to'lov qilganlar bu taklifga kirmaydi — bu "birinchi xarid"
  // chegirmasi. ⚠️ Bu shart faqat TAKLIF BERISHDA qoladi; `checkDiscountEligibility`
  // dan olib tashlangan, chunki 2-oyga kelib `subscriptionStart` albatta bor.
  if (userData.subscriptionStart) {
    return { granted: false, reason: REASON.EXISTING_SUBSCRIBER };
  }

  const existing = userData.signupDiscount;
  if (existing && existing.status === "used") {
    return { granted: false, reason: REASON.USED };
  }
  // Amaldagi taklif bor — muddatini cho'zib yubormaymiz.
  if (existing && existing.status === "active") {
    const end = toDate(existing.expiresAt);
    if (end && end.getTime() > Date.now()) {
      return { granted: false, reason: "already_active" };
    }
  }

  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  await userRef.update({
    signupDiscount: {
      percent,
      status: "active",
      grantedAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromDate(expires),
      sourceResultId,
      eligibleBillings: DISCOUNT_CONFIG.eligibleBillings,
      // Sanoqchi. `users` hujjatidagi nusxa faqat KO'RSATISH uchun (Pricing.jsx);
      // haqiqiy hisob `discount_claims` da, chunki u shaxsga bog'langan.
      cycles,
      cyclesUsed: 0,
      cyclesRemaining: cycles,
    },
  });

  return { granted: true };
}

/**
 * Chegirma shu to'lovga qo'llanadimi.
 *
 * FAQAT O'QIYDI — hech narsani o'zgartirmaydi va hech narsani "yoqib
 * yubormaydi". `sendSubscriptionInvoice` da narxni ko'rsatish uchun ishlatiladi.
 *
 * Qaytadigan `cycles` — shu to'lov necha oyni yeydi (monthly 1, tri 3).
 * `cycleNumber`/`cyclesTotal` bot xabarida "2/3-oy" deb ko'rsatiladi.
 *
 * `upsell` maydoni ESKI takliflar uchun saqlanib qoldi: ular `["tri"]` bilan
 * yozilgan, ya'ni 1 oylik tanlagan o'sha o'quvchilar hamon 3 oylikka
 * yo'naltirilishi kerak. Yangi takliflarda bu tarmoq ishlamaydi.
 */
async function checkDiscountEligibility(db, uid, telegramId, planId, billing) {
  const originalPrice = getPlanPrice(planId, billing);
  const base = {
    eligible: false,
    percent: 0,
    originalPrice,
    finalPrice: originalPrice,
    cycles: 0,
    cyclesRemaining: 0,
    upsell: null,
  };

  if (originalPrice === null) {
    return { ...base, reason: REASON.UNKNOWN_PLAN };
  }

  const months = monthsForBilling(billing);
  if (months === null) {
    return { ...base, reason: REASON.UNKNOWN_PLAN };
  }

  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.exists ? userSnap.data() : {};

  const offer = userData.signupDiscount;
  if (!offer || offer.status !== "active") {
    return { ...base, reason: offer && offer.status === "used" ? REASON.USED : REASON.NO_OFFER };
  }

  const percent = Number(offer.percent) || DISCOUNT_CONFIG.percent;
  const totalCycles = offerCycles(offer);
  const allowedBillings = Array.isArray(offer.eligibleBillings)
    ? offer.eligibleBillings
    : DISCOUNT_CONFIG.eligibleBillings;

  // Reyestr — bu yerda `uid` emas, SHAXS tekshiriladi.
  const { tgRef, phRef } = getClaimRefs(db, telegramId, userData.phoneNumber);
  const claimSnaps = await Promise.all([tgRef.get(), phRef ? phRef.get() : Promise.resolve(null)]);
  const state = resolveClaimState(claimSnaps, totalCycles);

  const expiresAt = toDate(offer.expiresAt);

  if (!state.started) {
    // ─── BIRINCHI to'lov ───
    // Taklif oynasi (7 kun) faqat shu yerda ishlaydi.
    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
      return { ...base, reason: REASON.EXPIRED };
    }
    // Zanjir hali boshlanmagan, lekin odam allaqachon obunachi — demak bu
    // "birinchi xarid" emas.
    if (userData.subscriptionStart) {
      return { ...base, reason: REASON.EXISTING_SUBSCRIBER };
    }
  } else {
    // ─── DAVOM ETAYOTGAN zanjir ───
    // Bu yerda `expiresAt` ni tekshirmaymiz — u birinchi xaridni chegaralaydi,
    // 2-oyni emas. O'rniga tanaffus tekshiriladi.
    if (isChainBroken(state.lastCycleAt)) {
      return { ...base, reason: REASON.CHAIN_EXPIRED };
    }
  }

  if (state.remaining <= 0) {
    return { ...base, reason: REASON.ALREADY_CLAIMED };
  }

  if (!allowedBillings.includes(billing)) {
    // Chegirma haqiqiy, faqat boshqa davrga tegishli (eski takliflar).
    // Botga upsell beramiz — quruq "ishlamaydi" bilan qaytarmaymiz.
    const upsellBilling = allowedBillings[0];
    const upsellOriginal = getPlanPrice(planId, upsellBilling);
    return {
      ...base,
      reason: REASON.BILLING_NOT_ELIGIBLE,
      cyclesRemaining: state.remaining,
      upsell: upsellOriginal === null ? null : {
        billing: upsellBilling,
        percent,
        originalPrice: upsellOriginal,
        finalPrice: applyDiscount(upsellOriginal, percent),
        expiresAt,
      },
    };
  }

  if (state.remaining < months) {
    // Masalan: 2 ta monthly to'langan (1 oy qoldi), endi tri tanlandi.
    // Qolgan 1 oy bilan 3 oylik paketni chegirma qilib bo'lmaydi — aks holda
    // o'quvchi qolganidan ko'p oyni chegirmada olardi.
    return {
      ...base,
      reason: REASON.INSUFFICIENT_CYCLES,
      cyclesRemaining: state.remaining,
    };
  }

  return {
    eligible: true,
    reason: REASON.OK,
    percent,
    originalPrice,
    finalPrice: applyDiscount(originalPrice, percent),
    expiresAt,
    // Shu to'lov necha oyni yeydi va hisobot uchun raqamlar.
    cycles: months,
    cyclesRemaining: state.remaining,
    cyclesTotal: totalCycles,
    cycleNumber: state.used + 1,
    upsell: null,
  };
}

/**
 * Adminlar uchun callable o'ram — chegirmani qo'lda berish.
 *
 * Guest trial hali qurilmagani uchun ayni paytda bu YAGONA kirish nuqtasi:
 * u bo'lmasa butun oqimni (bot narxi → tasdiqlash → reyestr) sinab ko'rib
 * bo'lmaydi. Trial qurilgach `submitTestAnswers` ham shu `grantSignupDiscount`
 * ni chaqiradi — bu callable esa qo'llab-quvvatlash vositasi bo'lib qoladi
 * (masalan o'quvchining taklifi nohaq yonib ketgan holat).
 */
async function grantSignupDiscountCallable(data, context) {
  const functions = require("firebase-functions");
  const db = admin.firestore();

  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Avtorizatsiyadan o'tilmagan.");
  }

  const callerSnap = await db.collection("users").doc(context.auth.uid).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Bu amal faqat admin uchun.");
  }

  const { uid, percent, days, cycles } = data || {};
  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "`uid` kiritilishi shart.");
  }

  return grantSignupDiscount(db, uid, {
    percent: percent || DISCOUNT_CONFIG.percent,
    days: days || DISCOUNT_CONFIG.days,
    cycles: cycles || DISCOUNT_CONFIG.cycles,
    sourceResultId: null,
  });
}

module.exports = {
  DISCOUNT_CONFIG,
  grantSignupDiscountCallable,
  DISCOUNT_ALREADY_CLAIMED,
  REASON,
  toDate,
  normalizePhone,
  monthsForBilling,
  offerCycles,
  getClaimRefs,
  resolveClaimState,
  isChainBroken,
  buildClaimDoc,
  buildClaimCycleUpdate,
  grantSignupDiscount,
  checkDiscountEligibility,
};

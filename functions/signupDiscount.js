// functions/signupDiscount.js
//
// Ro'yxatdan o'tish chegirmasi: berish, haqlilikni tekshirish va sarflash.
//
// ─── NEGA IKKI HUJJAT ───────────────────────────────────────────────────────
//
//   users/{uid}.signupDiscount   → TAKLIF  ("sizda 20% bor, 7 kun amal qiladi")
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
// Chegirma endi BIR MARTALIK emas — u obunaning dastlabki 2 OYINI qoplaydi:
//
//   monthly → har to'lov 1 oyni yeydi, ya'ni 2 ta chegirmali to'lov
//   tri     → bitta to'lov 90 kunni (3 oyni) yeydi, ya'ni 2 oylik chegirma
//             unga YETMAYDI — shuning uchun `eligibleBillings` da `tri` yo'q
//
// Shuning uchun reyestrda hujjat mavjudligi yetarli emas: `cyclesRemaining`
// qancha oy qolganini saytadi va tasdiqlash paytida kamayadi. Hujjat
// mavjudligiga tayangan eski mantiq (`tx.create` yiqilishi) faqat BIRINCHI
// tsikl uchun saqlanib qoldi — u yerda poyga himoyasi sifatida hamon ideal.
//
// ─── NEGA KETMA-KETLIK SHARTI ───────────────────────────────────────────────
//
// `maxGapDays` bo'lmasa o'quvchi 1-oyni yanvarda, 2-oyni dekabrda to'lardi va
// "birinchi xarid chegirmasi" bir yilga cho'zilardi.
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
   * 30% emas, 20%.
   *
   * Chegirma endi BITTA oyni qoplaydi (pastdagi `cycles: 1`), ya'ni eski
   * 30% × 2 oy modeliga qaraganda jami yon berish keskin kamaydi: standard
   * monthly 28 000 bo'ladi va ikkinchi oydan boshlab to'liq narx ishlaydi.
   * Taklif hamon "test yechdim → arzonlashdi" degan aniq va'da bo'lib qoladi,
   * lekin tushumning bir oyi butunlay saqlanadi.
   */
  percent: 20,
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
   * "1 ta to'lov" emas, "1 oy" — o'lchov OY, chunki davrlar (30/90 kun)
   * shu o'lchovda taqqoslanadi va monthly↔tri aralashtirilganda ham hisob
   * buzilmaydi.
   *
   * 2 emas 1: chegirma birinchi oyga beriladi, keyingi oylar to'liq narxda.
   * `clampCycles` shu qiymatni YUQORI CHEGARA sifatida ham ishlatadi, ya'ni
   * `config/trial.discountCycles` da qolib ketgan eski 2 (yoki 3) avtomatik
   * 1 ga qisiladi.
   */
  cycles: 1,
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
   * Chegirma FAQAT 1 oylik davrda ishlaydi.
   *
   * Sabab arifmetik, siyosiy emas: `cycles: 1` — chegirma 1 oyni qoplaydi,
   * `tri` esa bitta to'lovda 3 oyni yeydi. Ya'ni tri ga chegirma berish
   * va'da qilingandan ikki oy ko'p yon berish bo'lardi (`checkDiscountEligibility`
   * ham buni `INSUFFICIENT_CYCLES` bilan rad etardi). Shuning uchun tri
   * ro'yxatda umuman turmaydi — o'quvchi rad javob o'rniga darhol ishlaydigan
   * 1 oylik variantni (upsell tugmasi) ko'radi.
   *
   * 3 oylik paket o'z tejamkorligi (−20%) bilan qoladi.
   */
  eligibleBillings: ["monthly"],
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
 * Chegirmali oylar soni uchun YUQORI CHEGARA.
 *
 * ⚠️ NEGA KERAK: oy soni ikki joyda yashaydi — koddagi `DISCOUNT_CONFIG.cycles`
 * va Firestore'dagi `config/trial.discountCycles` (admin redeploysiz
 * o'zgartirishi uchun). Saqlangan qiymat koddagisidan USTUN edi, shuning uchun
 * `discountPercent` 30 ga yangilanganda `discountCycles` eski 3 da qolib
 * ketgani yetarli bo'ldi: sayt ham, bot ham har bir yangi o'quvchiga 3 oy
 * 30% berib turdi — ya'ni bir oylik tushum jimgina yo'qolardi. Bunday xato
 * hech qanday xato xabari bermaydi, shuning uchun ARIFMETIK jihatdan
 * to'silishi kerak.
 *
 * Chegirmani 2 oydan ko'proq qilish endi koddagi `DISCOUNT_CONFIG.cycles` ni
 * o'zgartirishni talab qiladi — bu ataylab: ko'proq yon berish qarori
 * ko'rib chiqilishi kerak, unutilgan Firestore maydoni orqali o'tib
 * ketmasligi shart.
 */
/**
 * Foizni koddagi `DISCOUNT_CONFIG.percent` bilan CHEGARALAYDI.
 *
 * ⚠️ NEGA KERAK: `clampCycles` bilan bir xil sabab. Foiz ham ikki joyda
 * yashaydi — koddagi `DISCOUNT_CONFIG.percent` va Firestore'dagi
 * `config/trial.discountPercent`. Saqlangan qiymat koddagisidan USTUN edi,
 * shuning uchun kodda 30 → 20 qilinsa ham, `config/trial` da qolib ketgan
 * eski 30 har bir yangi o'quvchiga jimgina 30% berib turardi.
 *
 * Chegirmani 20% dan oshirish endi ataylab kod o'zgartirishni talab qiladi;
 * admin `config/trial` orqali uni faqat PASAYTIRA oladi.
 */
function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.round(n), DISCOUNT_CONFIG.percent);
}

function clampCycles(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.round(n), DISCOUNT_CONFIG.cycles);
}

/**
 * Taklif necha oyni qoplaydi.
 *
 * ⚠️ Eski takliflarda (30% dan oldin berilgan, `cycles` maydonisiz) javob 1 —
 * ya'ni AYNAN eski xatti-harakat: bir martalik chegirma. Ularga bir necha oy
 * berish va'da qilinganidan ko'proq bo'lardi va 50% × 2 oy qimmatga tushardi.
 *
 * Yuqori chegara `clampCycles` da: `cycles: 3` bilan yozilgan takliflar ham
 * 2 oy sifatida o'qiladi, aks holda sayt 2 deb ko'rsatib, bot 3 oy chegirma
 * berardi.
 */
function offerCycles(offer) {
  const n = Number(offer && offer.cycles);
  return Number.isFinite(n) && n > 0 ? clampCycles(n) : 1;
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
 * Aks holda: o'quvchi 1-oyni Telegram A bilan to'laydi (`tg_A` = 1 qoldi),
 * keyin Telegram B ga o'tadi — `tg_B` umuman yo'q, ya'ni yangi 2 oy. Shuning
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
  // Reyestrda `cyclesTotal: 3` bilan boshlangan zanjirlar bor (eski
  // `config/trial` qiymati). `totalCycles` allaqachon 2 ga cheklangan, shuning
  // uchun QOLGAN oy ham shundan oshmasligi kerak — aks holda 1 oyni ishlatgan
  // o'quvchiga sayt "yana 1 oy" deb ko'rsatib, bot 2 oy berardi.
  const cappedRemaining = Math.min(remaining, Math.max(0, totalCycles - used));
  const lastCycleAt = docs
    .map((d) => toDate(d.lastCycleAt) || toDate(d.claimedAt))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;

  return { started: true, used, remaining: Math.max(0, cappedRemaining), lastCycleAt };
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
 * `force: true` — SHU shartni chetlab o'tadi (faqat admin callable'idan).
 * Kerak bo'lgan holat: sozlama o'zgardi (masalan 3 oy → 2 oy), lekin allaqachon
 * berilgan takliflarda eski raqam muzlab qolgan va sayt "dastlabki 3 oy" deb
 * ko'rsatib turadi. Trial oqimi buni HECH QACHON ishlatmaydi — aks holda
 * o'quvchi testni qayta yechib taklifini cheksiz yangilardi.
 *
 * ⚠️ `force` sanoqchini (`discount_claims`) tozalamaydi: allaqachon
 * ISHLATILGAN oylar reyestrda qoladi, ya'ni bu bilan chegirmani "qayta
 * to'ldirib" bo'lmaydi. Shuning uchun `status: "used"` shartida u ham to'xtaydi.
 *
 * @returns {Promise<{granted: boolean, reason?: string}>}
 */
async function grantSignupDiscount(db, uid, options = {}) {
  const {
    percent = DISCOUNT_CONFIG.percent,
    days = DISCOUNT_CONFIG.days,
    cycles: rawCycles = DISCOUNT_CONFIG.cycles,
    sourceResultId = null,
    force = false,
  } = options;

  // Chaqiruvchi (trial config yoki admin callable'i) qancha so'rasa ham,
  // taklifda `DISCOUNT_CONFIG.cycles` dan ko'p oy yozilmaydi — `clampCycles`
  // izohiga qarang. `|| DISCOUNT_CONFIG.cycles`: 0 yoki chalkash qiymat
  // chegirmasiz taklif tug'dirmasin.
  const cycles = clampCycles(rawCycles) || DISCOUNT_CONFIG.cycles;

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
  // Amaldagi taklif bor — muddatini cho'zib yubormaymiz (`force` dan tashqari).
  if (!force && existing && existing.status === "active") {
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
 * `cycleNumber`/`cyclesTotal` bot xabarida "2/2-oy" deb ko'rsatiladi.
 *
 * `upsell` — chegirma haqiqiy, lekin tanlangan davrga tegishli emas. Yangi
 * takliflarda bu 3 oylik tanlagan o'quvchini 1 oylikka yo'naltiradi; eski
 * (`["tri"]` bilan yozilgan) takliflarda esa aksincha.
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
    // Chegirma haqiqiy, faqat boshqa davrga tegishli — odatda o'quvchi
    // 3 oylikni tanlagan, chegirma esa 1 oylikda ishlaydi.
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
    // Yangi takliflarda `tri` yuqoridagi shartda to'xtaydi; bu tarmoq ESKI
    // (`["monthly","tri"]`) takliflar uchun qoladi: 1 oy qolgan holda tri
    // tanlansa, qolganidan ko'p oyni chegirmada berib bo'lmaydi.
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

  const { uid, percent, days, cycles, force } = data || {};
  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "`uid` kiritilishi shart.");
  }

  return grantSignupDiscount(db, uid, {
    percent: percent || DISCOUNT_CONFIG.percent,
    days: days || DISCOUNT_CONFIG.days,
    cycles: cycles || DISCOUNT_CONFIG.cycles,
    sourceResultId: null,
    // Amaldagi taklifni yangi sozlama bilan qayta yozish — sozlama
    // o'zgargandan keyin eski raqam ("dastlabki 3 oy") qotib qolmasligi uchun.
    force: force === true,
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
  clampCycles,
  clampPercent,
  offerCycles,
  getClaimRefs,
  resolveClaimState,
  isChainBroken,
  buildClaimDoc,
  buildClaimCycleUpdate,
  grantSignupDiscount,
  checkDiscountEligibility,
};

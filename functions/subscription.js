/**
 * Obuna mantiqining SERVER tomondagi nusxasi.
 * ⚠️ `src/utils/subscription.js` bilan bir xil bo'lishi shart.
 * Klientdagi nusxa faqat UI uchun; haqiqiy ruxsat shu yerda hal qilinadi.
 */

/** Firestore Timestamp / ISO string / Date — barchasini Date ga keltiradi. */
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
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function getSubscriptionEnd(userData) {
  return toDate(userData && userData.subscriptionEnd);
}

function isStaff(userData) {
  return !!userData && (userData.role === "admin" || userData.role === "teacher");
}

function isGrouped(userData) {
  return !!(userData && userData.groupId && userData.groupId !== "none");
}

/** Muddatni hisobga olmagan xom tarif. Legacy `premium`/`isPremium` → `standard`. */
function getRawTier(userData) {
  if (!userData) return "free";
  if (userData.accountType === "pro" || userData.isPro === true) return "pro";
  if (
    userData.accountType === "standard" ||
    userData.accountType === "premium" ||
    userData.isPremium === true
  ) {
    return "standard";
  }
  return "free";
}

/** `subscriptionEnd` yo'q bo'lsa (admin qo'lda bergan) — o'tmagan deb qaraladi. */
function isSubscriptionExpired(userData) {
  const end = getSubscriptionEnd(userData);
  if (!end) return false;
  return end.getTime() <= Date.now();
}

/** Muddatni hisobga olgan haqiqiy tarif. */
function getTier(userData) {
  const raw = getRawTier(userData);
  if (raw === "free") return "free";
  if (isSubscriptionExpired(userData)) return "free";
  return raw;
}

function hasActiveSubscription(userData) {
  return getTier(userData) !== "free";
}

/**
 * Premium kontent uchun umumiy ruxsat (guruh a'zoligi bu yerga KIRMAYDI —
 * guruh o'quvchisiga faqat biriktirilgan testlar ochiladi).
 */
function canAccessPremiumContent(userData) {
  if (!userData) return false;
  if (isStaff(userData)) return true;
  return hasActiveSubscription(userData);
}

function meetsTier(userData, requiredTier) {
  if (!requiredTier || requiredTier === "free") return true;
  if (isStaff(userData)) return true;
  const tier = getTier(userData);
  if (requiredTier === "pro") return tier === "pro";
  if (requiredTier === "standard") return tier === "pro" || tier === "standard";
  return true;
}

/**
 * Testning "ko'lami": bitta passage/section (part) mi, to'liq test mi, to'plam mi.
 *
 * Bazada bu alohida maydon sifatida saqlanmaydi, shuning uchun tuzilmadan
 * aniqlaymiz — Practice sahifalari ham xuddi shu qoidaga tayanadi:
 *   • Reading — bitta passage li hujjat "part", ko'p passage li hujjat "full".
 *   • Listening — bitta hujjatda `parts` (part1..part4) bo'ladi; `partNumber`
 *     ko'rsatilgan bo'lsa "part", ko'rsatilmasa butun test ishlanadi → "full".
 *
 * @param {object} test
 * @param {number|string|null} partNumber  URL dagi `?part=N` (bo'lsa)
 * @returns {'part'|'full'|'set'}
 */
function getTestScope(test, partNumber = null) {
  if (!test) return 'part';
  if (test.isSet) return 'set';

  // Ro'yxatni tuzgan joy ko'lamni aniq bilsa (masalan kolleksiyaning
  // "Full Tests" bo'limi), shu bayroqni qo'yadi. Tuzilmadan taxmin qilishga
  // tayanib qolmaymiz: `tests_metadata` da `passages` bo'lmasa, full test
  // jimgina "part" deb qaralib, Standard'ga ochilib ketardi.
  if (test.isFullTest) return 'full';

  if (partNumber !== null && partNumber !== undefined && String(partNumber).trim() !== '') {
    return 'part';
  }

  const countEntries = (value) => {
    if (!value) return 0;
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'object') return Object.keys(value).length;
    return 0;
  };

  const type = String(test.type || '').toLowerCase();
  if (type === 'listening') {
    return countEntries(test.parts) > 1 ? 'full' : 'part';
  }

  return countEntries(test.passages) > 1 ? 'full' : 'part';
}

/**
 * Testni ochish uchun MINIMAL tarif.
 *
 * Qoida ikki qismdan iborat:
 *   1. To'liq test va to'plamlar — HAR DOIM Pro. Admin kolleksiyani "standard"
 *      qilib qo'ygan bo'lsa ham: to'plam ichidagi full testni faqat Pro ishlaydi.
 *   2. PART testlar — darajani ADMIN belgilaydi. Kolleksiyaning `accessTier` i
 *      nima bo'lsa, ichidagi part testlar ham o'sha darajada. Ya'ni "standard"
 *      kolleksiyadagi part testni Standard o'quvchi ham yechadi, "pro"
 *      kolleksiyadagisini esa faqat Pro — lekin ikkalasi ham Parts sahifasida
 *      ko'rinib turadi, ustida tegishli yorliq bilan.
 *
 * ⚠️ Bu funksiya `functions/subscription.js` dagi nusxasi bilan bir xil bo'lishi
 * shart — server (`getSanitizedTest`) aynan shu qoidaga tayanadi.
 *
 * @returns {'free'|'standard'|'pro'}
 */
function getRequiredTier(test, partNumber = null) {
  if (!test) return 'free';

  const scope = getTestScope(test, partNumber);
  if (scope === 'full' || scope === 'set') return 'pro';

  const colTier = test.collectionAccessTier;
  if (colTier === 'free' || colTier === 'standard' || colTier === 'pro') return colTier;

  if (test.isFree) return 'free';

  const type = String(test.type || '').toLowerCase();
  if (type === 'reading' || type === 'listening') return 'standard';

  // Writing/Speaking hozircha obuna bilan cheklanmagan.
  return 'free';
}

/**
 * Tarif bo'yicha testni ochish mumkinmi.
 *
 * DIQQAT: bu faqat TARIF bo'yicha qaror. O'qituvchi biriktirgan yoki mock
 * tarkibidagi testlar alohida yo'l bilan ochiladi — shuning uchun `false`
 * "ruxsat yo'q" degani emas, "tarif yetarli emas" degani.
 */
function tierAllowsTest(userData, test, partNumber = null) {
  if (isStaff(userData)) return true;
  return meetsTier(userData, getRequiredTier(test, partNumber));
}

module.exports = {
  toDate,
  getSubscriptionEnd,
  isStaff,
  isGrouped,
  getRawTier,
  isSubscriptionExpired,
  getTier,
  hasActiveSubscription,
  canAccessPremiumContent,
  meetsTier,
  getTestScope,
  getRequiredTier,
  tierAllowsTest,
};

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
};

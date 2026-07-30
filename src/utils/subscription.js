/**
 * Obuna (subscription) bo'yicha YAGONA manba.
 *
 * Ilgari tarif tekshiruvi 4 xil joyda 4 xil yozilgan edi (AuthContext,
 * useDailyLimit.checkLimit, useDailyLimit.incrementUsage, getSanitizedTest) va
 * ular bir-biriga mos kelmasdi — masalan `isPremium: true` bo'lgan foydalanuvchi
 * hech qachon muddati tugamasdi, lekin kontentga kira olardi.
 *
 * ⚠️ Bu fayldagi mantiq `functions/subscription.js` bilan bir xil bo'lishi shart.
 * Klientdagi tekshiruv faqat UI uchun — haqiqiy himoya serverda.
 */

/** Firestore Timestamp / ISO string / Date — barchasini Date ga keltiradi. */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') {
    try {
      const d = value.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function getSubscriptionEnd(userData) {
  return toDate(userData?.subscriptionEnd);
}

export function isStaff(userData) {
  return userData?.role === 'admin' || userData?.role === 'teacher';
}

/** Foydalanuvchi o'qituvchi guruhiga biriktirilganmi. */
export function isGrouped(userData) {
  return Boolean(userData?.groupId && userData.groupId !== 'none');
}

/**
 * Hujjatdagi maydonlardan xom tarifni o'qiydi (muddatni hisobga olmaydi).
 * Legacy `premium` / `isPremium` — `standard` deb qaraladi.
 * @returns {'pro'|'standard'|'free'}
 */
export function getRawTier(userData) {
  if (!userData) return 'free';
  if (userData.accountType === 'pro' || userData.isPro === true) return 'pro';
  if (
    userData.accountType === 'standard' ||
    userData.accountType === 'premium' ||
    userData.isPremium === true
  ) {
    return 'standard';
  }
  return 'free';
}

/**
 * Obuna muddati o'tganmi.
 * `subscriptionEnd` umuman yo'q bo'lsa (admin qo'lda bergan tariflar) — o'tmagan
 * deb qaraladi, aks holda mavjud foydalanuvchilar birdaniga bloklanib qolardi.
 */
export function isSubscriptionExpired(userData) {
  const end = getSubscriptionEnd(userData);
  if (!end) return false;
  return end.getTime() <= Date.now();
}

/**
 * Muddatni hisobga olgan holdagi haqiqiy tarif.
 * @returns {'pro'|'standard'|'free'}
 */
export function getTier(userData) {
  const raw = getRawTier(userData);
  if (raw === 'free') return 'free';
  if (isSubscriptionExpired(userData)) return 'free';
  return raw;
}

/** Pullik va hozir amal qilayotgan obunasi bormi (xodimlar bu yerga kirmaydi). */
export function hasActiveSubscription(userData) {
  return getTier(userData) !== 'free';
}

/**
 * Premium kontent (Reading / Listening) uchun umumiy ruxsat.
 *
 * ⚠️ Guruhga a'zolikning O'ZI bu yerda ruxsat bermaydi — server
 * (`getSanitizedTest`) ham shunday ishlaydi: guruh o'quvchisiga faqat
 * BIRIKTIRILGAN testlar ochiladi. Aks holda UI qulfni ochib, test ochilganda
 * server "permission-denied" qaytarardi.
 * Biriktirilgan testlar uchun `hasDirectAssignment` / `isAssignedItem` ishlating.
 */
export function canAccessPremiumContent(userData) {
  if (!userData) return false;
  if (isStaff(userData)) return true;
  return hasActiveSubscription(userData);
}

/**
 * Ro'yxatdagi element o'qituvchi/guruh tomonidan biriktirilganmi.
 * `useStudentData` biriktirilgan testlarga `isAssignment: true` qo'yadi.
 */
export function isAssignedItem(item) {
  if (!item) return false;
  return Boolean(item.isAssignment || item.groupId || item.isMock || item.mockKey);
}

/**
 * Testning `collectionAccessTier` darajasiga yetadimi.
 * @param {object} userData
 * @param {'free'|'standard'|'pro'|undefined} requiredTier
 */
export function meetsTier(userData, requiredTier) {
  if (!requiredTier || requiredTier === 'free') return true;
  if (isStaff(userData)) return true;
  const tier = getTier(userData);
  if (requiredTier === 'pro') return tier === 'pro';
  if (requiredTier === 'standard') return tier === 'pro' || tier === 'standard';
  return true;
}

/** Ushbu test aynan shu foydalanuvchiga biriktirilganmi (guruhsiz, lokal tekshiruv). */
export function hasDirectAssignment(userData, testId) {
  if (!userData || !testId) return false;
  const id = String(testId).trim();
  const assigned = userData.assignedTests || [];
  if (assigned.some((a) => String(a?.id ?? a).trim() === id)) return true;

  const mocks = userData.mockTests || [];
  return mocks.some((m) => {
    const sub = m?.subTests || {};
    return sub.reading === id || sub.listening === id || sub.writing === id;
  });
}

/** ProfileSidebar kabi UI joylari uchun ko'rsatiladigan yorliq. */
export function getTierLabel(userData) {
  const tier = getTier(userData);
  if (tier === 'pro') return 'PRO obuna';
  if (tier === 'standard') return 'Standard obuna';
  return 'Bepul tarif';
}
